import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindManyOptions,
  Repository,
} from 'typeorm';
import { UserService } from '../../user/user.service';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { OrderType } from '../../common/enums/order-type.enum';
import { MatchCreationData } from 'src/common/interfaces/match-creation-data.interface';
import { QueueService } from '../../queue/queue.service';
import Decimal from 'decimal.js';
import { Order } from '../../order/entities/order.entity';
import { Match } from '../..//match/entities/match.entity';
import { MatchService } from '../../match/match.service';
import { WebsocketService } from '../../websocket/websocket.service';

// Assumindo a definição das taxas em algum lugar (ConfigService seria ideal)
const FEE_MAKER = 0.005; // 0.5%
const FEE_TAKER = 0.003; // 0.3%

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private userService: UserService,
    private readonly queueService: QueueService,
    private matchService: MatchService,
    private websocketService: WebsocketService,
  ) {}

  async resolveMatch(match: Match): Promise<void> {
    this.logger.log('Resolving match...', match);
    this.logger.log('##########################################');

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const takerMatch = await this.getTakerMatch(
        match.id,
        queryRunner.manager,
      );

      if (!takerMatch) {
        await queryRunner.commitTransaction();
        return;
      }

      const takerOrder = takerMatch.order;

      const makerMatch = await this.getMakerMatch(
        takerOrder,
        takerMatch.id,
        queryRunner.manager,
      );

      if (!makerMatch) {
        await queryRunner.commitTransaction();
        return;
      }

      const makerOrder = makerMatch.order;

      const tradeAmount = Decimal.min(takerMatch.amount, makerMatch.amount);

      this.logger.log(
        `Trade amount: ${tradeAmount.toString()}, Maker order amount: ${makerMatch.amount.toString()}`,
      );

      if (tradeAmount.gt(0)) {
        let takerFee = new Decimal(0);
        let makerFee = new Decimal(0);

        // Calcular taxas baseadas na moeda de pagamento
        if (takerOrder.type === OrderType.BUY) {
          takerFee = tradeAmount.mul(takerOrder.price).mul(FEE_TAKER);
          makerFee = tradeAmount.mul(takerOrder.price).mul(FEE_MAKER);
        } else {
          takerFee = tradeAmount.mul(FEE_TAKER);
          makerFee = tradeAmount.mul(FEE_MAKER);
        }

        await this.userService.executeTrade(
          takerOrder.userId,
          makerOrder.userId,
          takerOrder.type,
          tradeAmount,
          makerOrder.price,
          queryRunner.manager,
        );

        // Atualizar quantidades preenchidas (negociada) nas Orders originais
        takerOrder.filled = takerOrder.filled.add(tradeAmount);
        makerOrder.filled = makerOrder.filled.add(tradeAmount);
        const remainingAmount = takerOrder.amount.sub(takerOrder.filled);
        const remainingMakerAmount = makerOrder.amount.sub(makerOrder.filled);

        await queryRunner.manager.save(Order, takerOrder);
        await queryRunner.manager.save(Order, makerOrder);

        // Atualizar os Matches para indicar a correspondência
        takerMatch.amount = tradeAmount;
        takerMatch.counterOrderId = makerOrder.id;
        takerMatch.makerId = makerOrder.userId;
        takerMatch.takerFee = takerFee;
        await queryRunner.manager.save(Match, takerMatch);

        makerMatch.counterOrderId = takerOrder.id;
        makerMatch.makerId = makerMatch.order.userId;
        makerMatch.amount = tradeAmount;
        makerMatch.makerFee = makerFee;
        await queryRunner.manager.save(Match, makerMatch);

        await this.handleRemainingMakerAmount(
          makerOrder,
          makerMatch,
          remainingMakerAmount,
          queryRunner.manager,
        );

        await this.handleRemainingTakerAmount(
          takerOrder,
          takerMatch,
          remainingAmount,
          queryRunner.manager,
        );
      }

      await queryRunner.commitTransaction();
      this.websocketService.emitUserOrderMatched(takerMatch.id, takerMatch);
      this.websocketService.emitUserOrderMatched(makerMatch.id, makerMatch);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        'Failed to resolve match: ' + error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  private async getTakerMatch(
    matchId: number,
    manager: EntityManager,
  ): Promise<Match | null> {
    const currentMatch = await manager.findOne(Match, {
      where: { id: matchId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!currentMatch || currentMatch.counterOrderId !== null) {
      return null;
    }

    const order = await manager.findOne(Order, {
      where: { id: currentMatch.orderId },
    });

    if (!order) {
      throw new InternalServerErrorException(
        `Order with ID ${currentMatch.orderId} not found.`,
      );
    }

    currentMatch.order = order;
    return currentMatch;
  }

  private async getMakerMatch(
    takerOrder: Order,
    takerMatchId: number,
    manager: EntityManager,
  ): Promise<Match | null> {
    const price = new Decimal(takerOrder.price);

    const matches = await manager
      .createQueryBuilder(Match, 'match')
      .innerJoinAndSelect('match.order', 'order')
      .setLock('pessimistic_write')
      .where('match.orderId != :takerOrderId', {
        takerOrderId: takerOrder.id ?? -1,
      })
      .andWhere('match.counterOrderId IS NULL')
      .andWhere('match.takerId != :takerUserId', {
        takerUserId: takerOrder.userId ?? -1,
      })
      .andWhere('order.type = :expectedType', {
        expectedType:
          takerOrder.type === OrderType.BUY ? OrderType.SELL : OrderType.BUY,
      })
      .andWhere('order.baseCurrency = :baseCurrency', {
        baseCurrency: takerOrder.quoteCurrency,
      })
      .andWhere('order.quoteCurrency = :quoteCurrency', {
        quoteCurrency: takerOrder.baseCurrency,
      })
      .andWhere(
        takerOrder.type === OrderType.BUY
          ? 'match.price <= :price'
          : 'match.price >= :price',
        { price: price.toNumber() },
      )
      .orderBy('match.createdAt', 'ASC')
      .getMany();

    return matches.length > 0 ? matches[0] : null;
  }

  private async handleRemainingMakerAmount(
    makerOrder: Order,
    makerMatch: Match,
    remainingMakerAmount: Decimal,
    manager: EntityManager,
  ): Promise<void> {
    if (
      remainingMakerAmount.gt('0.00000001') &&
      makerOrder.status !== OrderStatus.PARTIALLY_FILLED
    ) {
      makerOrder.status = OrderStatus.PARTIALLY_FILLED;
      await manager.save(Order, makerOrder);

      const newRemainingMakerMatch: MatchCreationData = {
        orderId: makerMatch.orderId,
        takerId: makerMatch.takerId,
        amount: remainingMakerAmount,
        price: makerMatch.order.price,
      };

      await this.matchService.createMatch(
        newRemainingMakerMatch,
        manager,
        makerMatch.takerId,
      );
    }

    if (remainingMakerAmount.lte('0.00000001')) {
      makerOrder.status = OrderStatus.COMPLETED;
      await manager.save(Order, makerOrder);
    }
  }

  private async handleRemainingTakerAmount(
    takerOrder: Order,
    takerMatch: Match,
    remainingAmount: Decimal,
    manager: EntityManager,
  ): Promise<void> {
    if (
      remainingAmount.gt('0.00000001') &&
      takerOrder.status !== OrderStatus.PARTIALLY_FILLED
    ) {
      takerOrder.status = OrderStatus.PARTIALLY_FILLED;
      await manager.save(Order, takerOrder);

      const newRemainingMatch: MatchCreationData = {
        orderId: takerMatch.orderId,
        takerId: takerMatch.takerId,
        amount: remainingAmount,
        price: takerMatch.order.price,
      };

      const newMatch = await this.matchService.createMatch(
        newRemainingMatch,
        manager,
        takerMatch.takerId,
      );

      await this.queueService.sendMessageMatching(newMatch);
    }

    if (remainingAmount.lte('0.00000001')) {
      takerOrder.status = OrderStatus.COMPLETED;
      await manager.save(Order, takerOrder);
    }
  }

  async findActiveOrdersByUserId(userId: number): Promise<Order[]> {
    try {
      const activeOrders = await this.orderRepository.find({
        where: { userId: userId, status: OrderStatus.ACTIVE }, // Ou inclua PARTIALLY_FILLED se necessário
      });

      if (!activeOrders || activeOrders.length === 0) {
        return []; // Retorna um array vazio se não houver ordens ativas
      }

      return activeOrders;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Falha ao recuperar ordens ativas.',
      );
    }
  }

  async findOrderHistoryByUserId(
    userId: number,
    limit?: number,
    offset?: number,
    sort?: string,
    order?: 'ASC' | 'DESC',
  ): Promise<Order[]> {
    try {
      const findOptions: FindManyOptions = {
        where: { userId: userId },
      };

      if (limit) {
        findOptions.take = limit;
      }
      if (offset) {
        findOptions.skip = offset;
      }
      if (sort) {
        findOptions.order = { [sort]: order || 'ASC' }; // Default order is ASC
      }

      const orderHistory = await this.orderRepository.find(findOptions);

      if (!orderHistory || orderHistory.length === 0) {
        return []; // Retorna um array vazio se não houver histórico de ordens
      }

      return orderHistory;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Falha ao recuperar o histórico de ordens.',
      );
    }
  }
}

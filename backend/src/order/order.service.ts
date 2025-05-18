import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import Decimal from 'decimal.js';
import { User } from '../user/entities/user.entity';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { OrderStatus } from '../common/enums/order-status.enum';
import { MatchCreationData } from '../common/interfaces/match-creation-data.interface';
import { OrderType } from '../common/enums/order-type.enum';
import { Currency } from '../common/enums/currency-enum';
import { MatchService } from '../match/match.service';
import { Match } from '../match/entities/match.entity';
import { WebsocketService } from '../websocket/websocket.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private userService: UserService,
    private matchService: MatchService,
    private websocketService: WebsocketService,
  ) {}

  /**
   *
   * @param userId
   * @returns
   */
  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['user'],
      where: { userId, status: OrderStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * @param userId - ID do usuário que está criando a ordem.
   * @param createOrderDto - DTO com os detalhes da ordem (tipo, volume, preço).
   * @returns Promise<Order> - A ordem criada.
   * @throws BadRequestException se o saldo for insuficiente.
   * @throws InternalServerErrorException em caso de outros erros transacionais ou de busca.
   */
  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new InternalServerErrorException(
          'Usuário não encontrado ao criar ordem.',
        );
      }

      const hasSufficientBalance = this.userService.checkAvailableBalance(
        user,
        createOrderDto.type,
        Number(createOrderDto.amount),
        Number(createOrderDto.price),
      );

      if (!hasSufficientBalance) {
        throw new BadRequestException(
          'Saldo disponível insuficiente para esta ordem.',
        );
      }

      await this.userService.reserveBalance(
        userId,
        createOrderDto.type,
        new Decimal(createOrderDto.amount),
        new Decimal(createOrderDto.price),
        queryRunner.manager,
      );

      const newOrder = this.orderRepository.create({
        userId: userId,
        type: createOrderDto.type,
        amount: createOrderDto.amount,
        price: createOrderDto.price,
        status: OrderStatus.ACTIVE,
        filled: 0,
        baseCurrency:
          createOrderDto.type === OrderType.BUY ? Currency.USD : Currency.BTC,
        quoteCurrency:
          createOrderDto.type === OrderType.BUY ? Currency.BTC : Currency.USD,
      });

      const savedOrder = await queryRunner.manager.save(Order, newOrder);

      //  Chamada ao createMatch
      const matchCreationData: MatchCreationData = {
        orderId: savedOrder.id,
        takerId: userId,
        amount: savedOrder.amount,
        price: savedOrder.price,
      };

      await this.matchService.createMatch(
        matchCreationData,
        queryRunner.manager,
        userId,
      );

      await queryRunner.commitTransaction();
      this.websocketService.emitUserOrderCreated(userId, newOrder);
      return savedOrder; // Retorna a ordem criada
    } catch (err) {
      // --- Lógica de erro na transação ---
      await queryRunner.rollbackTransaction(); // Faz rollback em caso de qualquer erro
      this.logger.error(
        '[ExchangeService] Transaction failed for createOrder:',
        err.message,
        err.stack,
      ); // Loga o erro

      // Relança o erro para ser tratado pelo Controller/Global Exception Filter
      if (
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Erro inesperado ao processar a criação da ordem.',
      );
    } finally {
      // --- Lógica de finalização da transação ---
      await queryRunner.release(); // Sempre libera o QueryRunner
    }
  }

  /**
   *
   * @param userId
   * @param orderId
   * @returns
   */
  async cancelOrder(userId: number, orderId: number): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderToCancel = await queryRunner.manager.findOne(Order, {
        where: { id: orderId, userId: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!orderToCancel) {
        throw new NotFoundException(
          `Ordem com ID ${orderId} não encontrada para o usuário ${userId}.`,
        );
      }

      if (
        orderToCancel.status === OrderStatus.COMPLETED ||
        orderToCancel.status === OrderStatus.CANCELLED
      ) {
        return orderToCancel; // Já está completa ou cancelada, não precisa fazer nada
      }

      // Liberar saldo provisionado
      if (
        orderToCancel.status === OrderStatus.ACTIVE ||
        orderToCancel.status === OrderStatus.PARTIALLY_FILLED
      ) {
        const amountToRelease = orderToCancel.amount.sub(orderToCancel.filled);
        const price = orderToCancel.price;
        await this.userService.releaseReservedBalance(
          userId,
          orderToCancel.type,
          amountToRelease,
          price,
          queryRunner.manager,
        );
      }

      // Atualizar o status da ordem para CANCELLED
      orderToCancel.status = OrderStatus.CANCELLED;
      await queryRunner.manager.save(Order, orderToCancel);

      // Remover Matches ativos associados a esta ordem
      await queryRunner.manager.delete(Match, {
        orderId: orderId,
        counterOrderId: IsNull(),
      });

      await queryRunner.commitTransaction();
      return orderToCancel;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `Falha ao cancelar a ordem ${orderId}: ${error}`,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async getOrderHistoryByUserId(userId: number): Promise<Order[]> {
    return await this.orderRepository.find({
      relations: ['user'],
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getOrderBook(): Promise<any> {
    // Buscar ordens de compra ATIVAS com saldo pendente
    const activeBuyOrders = await this.orderRepository.find({
      where: {
        type: OrderType.BUY,
        status: OrderStatus.ACTIVE,
        amount: MoreThan(0),
      },
      order: { price: 'DESC' },
    });

    // Buscar ordens de venda ATIVAS com saldo pendente
    const activeSellOrders = await this.orderRepository.find({
      where: {
        type: OrderType.SELL,
        status: OrderStatus.ACTIVE,
        amount: MoreThan(0),
      },
      order: { price: 'ASC' },
    });

    // Agregando as ordens ativas por preço, incluindo saldo e status
    const aggregatedBuyOrders = this.aggregateOrders(activeBuyOrders);
    const aggregatedSellOrders = this.aggregateOrders(activeSellOrders);

    return {
      buy: aggregatedBuyOrders,
      sell: aggregatedSellOrders,
    };
  }

  private aggregateOrders(orders: Order[]): any[] {
    const aggregatedOrders: Record<
      string,
      { totalAmount: Decimal; orders: Order[] }
    > = {};

    for (const order of orders) {
      if (!aggregatedOrders[order.price.toString()]) {
        aggregatedOrders[order.price.toString()] = {
          totalAmount: new Decimal(0),
          orders: [],
        };
      }
      aggregatedOrders[order.price.toString()].totalAmount = aggregatedOrders[
        order.price.toString()
      ].totalAmount.plus(order.amount);
      aggregatedOrders[order.price.toString()].orders.push(order); // Store the order
    }

    return Object.keys(aggregatedOrders).map((price) => ({
      price: new Decimal(price),
      totalAmount: aggregatedOrders[price].totalAmount, // Mantém como Decimal
      orders: aggregatedOrders[price].orders.map((order) => ({
        id: order.id,
        amount: order.amount,
        status: order.status,
        // Adicione outros campos que você deseja exibir
      })),
    }));
  }
}

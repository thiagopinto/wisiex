import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Order } from '../order/entities/order.entity';
import { Match } from './entities/match.entity';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, MoreThan, Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { QueueService } from '../queue/queue.service';
import { MatchCreationData } from '../common/interfaces/match-creation-data.interface';
import { OrderType } from '../common/enums/order-type.enum';
import { MarketStats } from '../common/interfaces/market-stats.interface';
import { WebsocketService } from '../websocket/websocket.service';
import { OrderStatus } from '../common/enums/order-status.enum';
import { MatchBookItemDto } from './dto/match-book-item.dto';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private userService: UserService,
    private readonly queueService: QueueService,
    private websocketService: WebsocketService,
  ) {}
  async createMatch(
    matchData: MatchCreationData,
    entityManager: EntityManager,
    userId: number,
  ): Promise<Match> {
    try {
      const match = this.matchRepository.create({
        orderId: matchData.orderId,
        counterOrderId: null,
        takerId: matchData.takerId,
        makerId: null,
        amount: matchData.amount,
        price: matchData.price,
        takerFee: null,
        makerFee: null,
      });
      const newMatch = await entityManager.save(match);
      // Enviar mensagem para a fila de matching
      await this.queueService.sendMessageMatching(newMatch);
      this.websocketService.emitUserOrderMatched(userId, newMatch);
      return newMatch;
    } catch (error) {
      console.error('Error creating match:', error);
      throw new InternalServerErrorException('Failed to create match');
    }
  }

  async getLatestMatches(limit: number = 10): Promise<Match[]> {
    return await this.matchRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getMarketStats(): Promise<MarketStats> {
    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const lastMatch = await this.matchRepository.findOne({
        order: { createdAt: 'DESC' },
      });

      // Volume BTC em 24h
      const volumeBTCResult = await this.matchRepository
        .createQueryBuilder('match')
        .select('SUM(match.amount)', 'volume')
        .where('match.createdAt BETWEEN :start AND :end', {
          start: twentyFourHoursAgo,
          end: now,
        })
        .getRawOne();

      // Volume USD em 24h (amount * price)
      const volumeUSDResult = await this.matchRepository
        .createQueryBuilder('match')
        .select('SUM(match.amount * match.price)', 'volume')
        .where('match.createdAt BETWEEN :start AND :end', {
          start: twentyFourHoursAgo,
          end: now,
        })
        .getRawOne();

      // Preço mais alto
      const highResult = await this.orderRepository
        .createQueryBuilder('order')
        .select('MAX(order.price)', 'high')
        .where('order.type = :type', { type: OrderType.BUY })
        .andWhere('order.createdAt BETWEEN :start AND :end', {
          start: twentyFourHoursAgo,
          end: now,
        })
        .getRawOne();

      // Preço mais baixo
      const lowResult = await this.orderRepository
        .createQueryBuilder('order')
        .select('MIN(order.price)', 'low')
        .where('order.type = :type', { type: OrderType.SELL })
        .andWhere('order.createdAt BETWEEN :start AND :end', {
          start: twentyFourHoursAgo,
          end: now,
        })
        .getRawOne();

      return {
        ultimoPreco: lastMatch ? lastMatch.price.toNumber() : 0,
        volumeBTC: parseFloat(String(volumeBTCResult?.volume ?? '0')),
        volumeUSD: parseFloat(String(volumeUSDResult?.volume ?? '0')),
        alta: parseFloat(String(highResult?.high ?? '0')),
        baixa: parseFloat(String(lowResult?.low ?? '0')),
      };
    } catch (error) {
      console.error('[MarketService] Erro em getMarketStats:', error);
      throw new InternalServerErrorException(
        'Falha ao obter estatísticas do mercado.',
      );
    }
  }

  async getMatchBook(): Promise<{
    buy: MatchBookItemDto[];
    sell: MatchBookItemDto[];
  }> {
    // Buscar os Matches que representam ordens de compra ATIVAS ou PARCIALMENTE PREENCHIDAS
    const activeBuyMatches = await this.matchRepository.find({
      relations: ['order', 'order.user'],
      where: {
        order: {
          type: OrderType.BUY,
          status: In([OrderStatus.ACTIVE, OrderStatus.PARTIALLY_FILLED]),
          amount: MoreThan(0),
        },
      },
      order: { price: 'DESC' },
    });

    // Buscar os Matches que representam ordens de venda ATIVAS ou PARCIALMENTE PREENCHIDAS
    const activeSellMatches = await this.matchRepository.find({
      relations: ['order', 'order.user'],
      where: {
        order: {
          type: OrderType.SELL,
          status: In([OrderStatus.ACTIVE, OrderStatus.PARTIALLY_FILLED]),
          amount: MoreThan(0),
        },
      },
      order: { price: 'ASC' },
    });

    // Retornar os Matches sem agregação
    const buyMatches: MatchBookItemDto[] =
      this.mapMatchesForOrderBook(activeBuyMatches);
    const sellMatches: MatchBookItemDto[] =
      this.mapMatchesForOrderBook(activeSellMatches);

    return {
      buy: buyMatches,
      sell: sellMatches,
    };
  }

  private mapMatchesForOrderBook(matches: Match[]): MatchBookItemDto[] {
    return matches.map((match) => {
      const matchBookItem = new MatchBookItemDto();
      matchBookItem.price = match.price;
      matchBookItem.amount = match.amount;
      matchBookItem.orderId = match.order.id;
      matchBookItem.orderAmount = match.order.amount;
      matchBookItem.orderStatus = match.order.status;
      matchBookItem.user = match.order.user.username;
      return matchBookItem;
    });
  }
}

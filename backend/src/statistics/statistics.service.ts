import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { OrderType } from '../common/enums/order-type.enum';
import { Match } from '../match/entities/match.entity';
import { Order } from '../order/entities/order.entity';
import { Repository, MoreThanOrEqual } from 'typeorm';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async getGlobalMatches(limit?: number): Promise<any[]> {
    try {
      const matches = await this.matchRepository.find({
        select: ['price', 'amount', 'createdAt'],
        relations: ['order'], // Assuming you have a relation with Order
        order: { createdAt: 'DESC' },
        take: limit,
      });

      return matches.map((match) => ({
        preco: match.price,
        volume: match.amount,
        tipo: match.order.type, // Assuming Order has a 'type' field
        dataHora: match.createdAt,
      }));
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Falha ao obter os matches globais.',
      );
    }
  }

  async getGlobalStatistics(): Promise<any> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const matchesLast24Hours = await this.matchRepository.find({
      where: { createdAt: MoreThanOrEqual(twentyFourHoursAgo) },
    });

    const btcVolume = matchesLast24Hours.reduce(
      (sum, match) => sum.plus(match.amount),
      new Decimal(0),
    );
    const usdVolume = matchesLast24Hours.reduce(
      (sum, match) =>
        sum.plus(new Decimal(match.amount).mul(new Decimal(match.price))),
      new Decimal(0),
    );

    const lastMatch = await this.matchRepository.find({
      // Use find e take
      where: { createdAt: MoreThanOrEqual(twentyFourHoursAgo) },
      order: { createdAt: 'DESC' },
    });
    const lastPrice =
      lastMatch.length > 0 ? lastMatch[0].price : new Decimal(0); // Verifique se há resultados

    const highOrder = await this.orderRepository.findOne({
      where: {
        type: OrderType.BUY,
        createdAt: MoreThanOrEqual(twentyFourHoursAgo),
      },
      order: { price: 'DESC' },
    });
    const high = highOrder ? highOrder.price : new Decimal(0);

    const lowOrder = await this.orderRepository.findOne({
      where: {
        type: OrderType.BUY,
        createdAt: MoreThanOrEqual(twentyFourHoursAgo),
      },
      order: { price: 'ASC' },
    });
    const low = lowOrder ? lowOrder.price : new Decimal(0);

    return {
      lastPrice: lastPrice.toString(),
      btcVolume: btcVolume.toString(),
      usdVolume: usdVolume.toString(),
      high: high.toString(),
      low: low.toString(),
    };
  }
}

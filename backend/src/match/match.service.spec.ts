import { Test, TestingModule } from '@nestjs/testing';
import { MatchService } from './match.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from '../order/entities/order.entity';
import { Match } from './entities/match.entity';
import { DataSource, In, MoreThan, Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { QueueService } from '../queue/queue.service';
import { WebsocketService } from '../websocket/websocket.service';
import { InternalServerErrorException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { OrderStatus } from '../common/enums/order-status.enum';
import { OrderType } from '../common/enums/order-type.enum';

describe('MatchService', () => {
  let service: MatchService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let matchRepository: jest.Mocked<Repository<Match>>;
  let queueService: jest.Mocked<QueueService>;
  let websocketService: jest.Mocked<WebsocketService>;

  const mockDataSource = {
    createQueryRunner: () => ({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        findOne: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(Match),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(),
            })),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: UserService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: QueueService,
          useValue: {
            sendMessageMatching: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: WebsocketService,
          useValue: {
            emitUserOrderMatched: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get<MatchService>(MatchService);
    orderRepository = module.get(getRepositoryToken(Order));
    matchRepository = module.get(getRepositoryToken(Match));
    queueService = module.get(QueueService);
    websocketService = module.get(WebsocketService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMatch', () => {
    it('should successfully create a match and emit events', async () => {
      const matchData = {
        orderId: 1,
        takerId: 1,
        amount: new Decimal('1'),
        price: new Decimal('50000'),
      };
      const userId = 1;
      const mockMatch = {
        id: 1,
        ...matchData,
        counterOrderId: null,
        makerId: null,
        takerFee: null,
        makerFee: null,
      };

      const mockEntityManager = {
        save: jest.fn().mockResolvedValue(mockMatch),
      };

      const result = await service.createMatch(
        matchData,
        mockEntityManager as any,
        userId,
      );

      expect(result).toEqual(mockMatch);
      expect(queueService.sendMessageMatching).toHaveBeenCalledWith(mockMatch);
      expect(websocketService.emitUserOrderMatched).toHaveBeenCalledWith(
        userId,
        mockMatch,
      );
    });

    it('should throw InternalServerErrorException when database operation fails', async () => {
      const matchData = {
        orderId: 1,
        takerId: 1,
        amount: new Decimal('1'),
        price: new Decimal('50000'),
      };
      const userId = 1;

      const mockEntityManager = {
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      await expect(
        service.createMatch(matchData, mockEntityManager as any, userId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getLatestMatches', () => {
    it('should return an array of matches ordered by creation date', async () => {
      const mockMatches = [
        {
          id: 1,
          price: new Decimal('50000'),
          amount: new Decimal('1'),
          createdAt: new Date('2023-01-01'),
        },
        {
          id: 2,
          price: new Decimal('51000'),
          amount: new Decimal('0.5'),
          createdAt: new Date('2023-01-02'),
        },
      ];

      matchRepository.find.mockResolvedValue(mockMatches as any);

      const result = await service.getLatestMatches(2);

      expect(result).toEqual(mockMatches);
      expect(matchRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 2,
      });
    });

    it('should return empty array when no matches exist', async () => {
      matchRepository.find.mockResolvedValue([]);

      const result = await service.getLatestMatches();

      expect(result).toEqual([]);
      expect(matchRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        take: 10, // default value
      });
    });
  });

  describe('getMarketStats', () => {
    it('should return complete market statistics', async () => {
      const mockLastMatch = { price: new Decimal('50500') };
      const mockStats = {
        volumeBTC: { volume: '2.5' },
        volumeUSD: { volume: '125000' },
        highPrice: { high: '51000' },
        lowPrice: { low: '49000' },
      };

      matchRepository.findOne.mockResolvedValue(mockLastMatch as any);

      // Mock getRawOne as a jest.fn() so we can use mockResolvedValueOnce
      const matchGetRawOne = jest
        .fn()
        .mockResolvedValueOnce(mockStats.volumeBTC)
        .mockResolvedValueOnce(mockStats.volumeUSD);
      matchRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: matchGetRawOne,
      } as any);

      const orderGetRawOne = jest
        .fn()
        .mockResolvedValueOnce(mockStats.highPrice)
        .mockResolvedValueOnce(mockStats.lowPrice);
      orderRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: orderGetRawOne,
      } as any);

      const result = await service.getMarketStats();

      expect(result).toEqual({
        ultimoPreco: 50500,
        volumeBTC: 2.5,
        volumeUSD: 125000,
        alta: 51000,
        baixa: 49000,
      });
    });

    it('should handle null values in market statistics', async () => {
      matchRepository.findOne.mockResolvedValue(null);
      (matchRepository.createQueryBuilder as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      });
      (orderRepository.createQueryBuilder as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getMarketStats();

      expect(result).toEqual({
        ultimoPreco: 0,
        volumeBTC: 0,
        volumeUSD: 0,
        alta: 0,
        baixa: 0,
      });
    });

    it('should throw InternalServerErrorException when query fails', async () => {
      matchRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.getMarketStats()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getMatchBook', () => {
    it('should return aggregated buy and sell orders', async () => {
      const mockBuyMatches = [
        {
          id: 1,
          price: new Decimal('50000'),
          amount: new Decimal('1'),
          order: {
            id: 1,
            amount: new Decimal('1'),
            status: OrderStatus.ACTIVE,
            user: { username: 'buyer1' },
          },
        },
      ];

      const mockSellMatches = [
        {
          id: 2,
          price: new Decimal('51000'),
          amount: new Decimal('0.5'),
          order: {
            id: 2,
            amount: new Decimal('0.5'),
            status: OrderStatus.ACTIVE,
            user: { username: 'seller1' },
          },
        },
      ];

      matchRepository.find.mockImplementation((options: any) => {
        return options.where.order.type === OrderType.BUY
          ? Promise.resolve(mockBuyMatches as any)
          : Promise.resolve(mockSellMatches as any);
      });

      const result = await service.getMatchBook();

      expect(result).toEqual({
        buy: [
          {
            price: new Decimal('50000'),
            amount: new Decimal('1'),
            orderId: 1,
            orderAmount: new Decimal('1'),
            orderStatus: OrderStatus.ACTIVE,
            user: 'buyer1',
          },
        ],
        sell: [
          {
            price: new Decimal('51000'),
            amount: new Decimal('0.5'),
            orderId: 2,
            orderAmount: new Decimal('0.5'),
            orderStatus: OrderStatus.ACTIVE,
            user: 'seller1',
          },
        ],
      });

      // Verify buy orders query
      expect(matchRepository.find).toHaveBeenCalledWith({
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

      // Verify sell orders query
      expect(matchRepository.find).toHaveBeenCalledWith({
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
    });

    it('should return empty arrays when no active orders exist', async () => {
      matchRepository.find.mockResolvedValue([]);

      const result = await service.getMatchBook();

      expect(result).toEqual({
        buy: [],
        sell: [],
      });
    });
  });

  describe('mapMatchesForOrderBook', () => {
    it('should correctly transform matches to order book items', () => {
      const inputMatches = [
        {
          price: new Decimal('50000'),
          amount: new Decimal('1'),
          order: {
            id: 1,
            amount: new Decimal('1'),
            status: OrderStatus.ACTIVE,
            user: { username: 'trader1' },
          },
        },
      ];

      // Mock do getMatchBook que usará o método privado internamente
      matchRepository.find.mockImplementation((options: any) => {
        return options.where.order.type === OrderType.BUY
          ? Promise.resolve(inputMatches as any)
          : Promise.resolve([]);
      });

      return service.getMatchBook().then((result) => {
        expect(result.buy).toEqual([
          {
            price: new Decimal('50000'),
            amount: new Decimal('1'),
            orderId: 1,
            orderAmount: new Decimal('1'),
            orderStatus: OrderStatus.ACTIVE,
            user: 'trader1',
          },
        ]);
      });
    });

    it('should handle empty input array', () => {
      const result = (service as any).mapMatchesForOrderBook([]);
      expect(result).toEqual([]);
    });
  });
});

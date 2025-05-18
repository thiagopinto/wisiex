import { Test, TestingModule } from '@nestjs/testing';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { Match } from './entities/match.entity';
import { MatchBookItemDto } from './dto/match-book-item.dto';
import Decimal from 'decimal.js';
import { OrderType } from '../common/enums/order-type.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Currency } from '../common/enums/currency-enum';

describe('MatchController', () => {
  let controller: MatchController;
  let matchService: jest.Mocked<MatchService>;

  const mockMatch: Match = {
    id: 1,
    orderId: 1,
    counterOrderId: null,
    takerId: 1,
    makerId: null,
    amount: new Decimal('1.5'),
    price: new Decimal('50000.25'),
    takerFee: null,
    makerFee: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    order: {
      id: 1,
      userId: 1,
      user: {
        id: 1,
        username: 'Test User',
        btcBalanceAvailable: new Decimal('0'),
        btcBalanceOnHold: new Decimal('0'),
        usdBalanceAvailable: new Decimal('0'),
        usdBalanceOnHold: new Decimal('0'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      type: OrderType.BUY,
      status: OrderStatus.ACTIVE,
      amount: new Decimal('1.5'),
      price: new Decimal('50000.25'),
      filled: new Decimal('0'),
      baseCurrency: Currency.BTC,
      quoteCurrency: Currency.USD,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    counterOrder: null,
  };

  const mockMatchBook = {
    buy: [
      {
        price: new Decimal('50000'),
        amount: new Decimal('1'),
        orderId: 1,
        orderAmount: new Decimal('1'),
        orderStatus: 'ACTIVE',
        user: 'user1',
      } as MatchBookItemDto,
    ],
    sell: [
      {
        price: new Decimal('51000'),
        amount: new Decimal('0.5'),
        orderId: 2,
        orderAmount: new Decimal('0.5'),
        orderStatus: 'ACTIVE',
        user: 'user2',
      } as MatchBookItemDto,
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchController],
      providers: [
        {
          provide: MatchService,
          useValue: {
            getLatestMatches: jest.fn(),
            getMatchBook: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MatchController>(MatchController);
    matchService = module.get<MatchService>(
      MatchService,
    ) as jest.Mocked<MatchService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLatestMatches', () => {
    it('should return an array of matches', async () => {
      matchService.getLatestMatches.mockResolvedValue([mockMatch]);

      const result = await controller.getLatestMatches();

      expect(result).toEqual([mockMatch]);
      expect(matchService.getLatestMatches).toHaveBeenCalled();
    });

    it('should return empty array if no matches found', async () => {
      matchService.getLatestMatches.mockResolvedValue([]);

      const result = await controller.getLatestMatches();

      expect(result).toEqual([]);
    });
  });

  describe('getMatchBook', () => {
    it('should return match book with buy and sell orders', async () => {
      matchService.getMatchBook.mockResolvedValue(mockMatchBook);

      const result = await controller.getMatchBook();

      expect(result).toEqual(mockMatchBook);
      expect(matchService.getMatchBook).toHaveBeenCalled();
    });

    it('should return empty arrays if no orders found', async () => {
      matchService.getMatchBook.mockResolvedValue({
        buy: [],
        sell: [],
      });

      const result = await controller.getMatchBook();

      expect(result).toEqual({
        buy: [],
        sell: [],
      });
    });
  });
});

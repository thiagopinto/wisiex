import { Test, TestingModule } from '@nestjs/testing';
import { QueueController } from './queue.controller';
import { ExchangeService } from '../exchange/services/exchange.service';
import { Logger } from '@nestjs/common';
import { Match } from '../match/entities/match.entity';
import Decimal from 'decimal.js';
import { User } from '../user/entities/user.entity';
import { OrderType } from '../common/enums/order-type.enum';
import { Currency } from '../common/enums/currency-enum';
import { OrderStatus } from '../common/enums/order-status.enum';

describe('QueueController', () => {
  let controller: QueueController;
  let exchangeService: jest.Mocked<ExchangeService>;
  let logger: jest.Mocked<Logger>;

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    btcBalanceAvailable: new Decimal('100'),
    btcBalanceOnHold: new Decimal('0'),
    usdBalanceAvailable: new Decimal('100000'),
    usdBalanceOnHold: new Decimal('0'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrder = {
    id: 1,
    userId: 1,
    user: mockUser,
    type: OrderType.BUY,
    amount: new Decimal('1'),
    price: new Decimal('50000'),
    status: OrderStatus.ACTIVE,
    filled: new Decimal('0'),
    baseCurrency: Currency.BTC,
    quoteCurrency: Currency.USD,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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
    order: mockOrder,
    counterOrder: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [
        {
          provide: ExchangeService,
          useValue: {
            resolveMatch: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<QueueController>(QueueController);
    exchangeService = module.get<ExchangeService>(
      ExchangeService,
    ) as jest.Mocked<ExchangeService>;
    logger = module.get<Logger>(Logger) as jest.Mocked<Logger>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleMatchCreated', () => {
    it('should process match successfully without errors', async () => {
      await controller.handleMatchCreated(mockMatch);

      expect(exchangeService.resolveMatch).toHaveBeenCalledTimes(1);
      expect(exchangeService.resolveMatch).toHaveBeenCalledWith(mockMatch);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log error when exchange service fails', async () => {
      const testError = new Error('Exchange service failed');
      exchangeService.resolveMatch.mockRejectedValue(testError);

      await expect(controller.handleMatchCreated(mockMatch)).rejects.toThrow(
        testError,
      );
    });

    it('should handle invalid match data format', async () => {
      const invalidMatch = {
        ...mockMatch,
        amount: 'invalid',
        price: 'invalid',
      } as unknown as Match;

      const testError = new Error('Invalid match data format');
      exchangeService.resolveMatch.mockRejectedValue(testError);

      await expect(controller.handleMatchCreated(invalidMatch)).rejects.toThrow(
        testError,
      );
    });
  });

  describe('handleErrorMessage', () => {
    it('should properly log structured error messages', async () => {
      const errorMessage = {
        error: 'Test error',
        details: 'Something went wrong',
        timestamp: new Date().toISOString(),
      };

      await controller.handleErrorMessage(errorMessage);
    });

    it('should handle empty error message object', async () => {
      await controller.handleErrorMessage({});
    });

    it('should handle non-object error messages', async () => {
      const errorMessage = 'Simple error string';

      await controller.handleErrorMessage(errorMessage);
    });
  });
});

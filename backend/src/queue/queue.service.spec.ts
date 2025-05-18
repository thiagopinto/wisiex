import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { ClientProxy } from '@nestjs/microservices';
import { Match } from '../match/entities/match.entity';
import Decimal from 'decimal.js';
import { OrderType } from '../common/enums/order-type.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Currency } from '../common/enums/currency-enum';

describe('QueueService', () => {
  let service: QueueService;
  let clientProxy: jest.Mocked<ClientProxy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: 'MESSAGE_PRODUCER',
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    clientProxy = module.get<ClientProxy>(
      'MESSAGE_PRODUCER',
    ) as jest.Mocked<ClientProxy>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a generic message to the queue', async () => {
      const testMessage = { key: 'value' };

      await service.sendMessage(testMessage);

      expect(clientProxy.emit).toHaveBeenCalledWith(
        'match_created',
        testMessage,
      );
      expect(clientProxy.emit).toHaveBeenCalledTimes(1);
    });

    it('should handle empty message', async () => {
      await service.sendMessage({});

      expect(clientProxy.emit).toHaveBeenCalledWith('match_created', {});
    });
  });

  describe('sendMessageMatching', () => {
    it('should send a match message with converted decimals', async () => {
      const testMatch: Match = {
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
          type: OrderType.BUY,
          amount: new Decimal('1.5'),
          price: new Decimal('50000.25'),
          status: OrderStatus.ACTIVE,
          baseCurrency: Currency.BTC,
          quoteCurrency: Currency.USD,
          user: {
            id: 1,
            username: 'testuser',
            btcBalanceAvailable: new Decimal('0'),
            btcBalanceOnHold: new Decimal('0'),
            usdBalanceAvailable: new Decimal('0'),
            usdBalanceOnHold: new Decimal('0'),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          filled: new Decimal('0'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        counterOrder: null,
      };

      await service.sendMessageMatching(testMatch);

      expect(clientProxy.emit).toHaveBeenCalledWith('match_created', {
        ...testMatch,
        price: '50000.25',
        amount: '1.5',
      });
    });

    it('should handle null values in match message', async () => {
      const testMatch: Partial<Match> = {
        id: 1,
        amount: new Decimal('1'),
        price: new Decimal('50000'),
      };

      await service.sendMessageMatching(testMatch as Match);

      expect(clientProxy.emit).toHaveBeenCalledWith('match_created', {
        ...testMatch,
        price: '50000',
        amount: '1',
      });
    });
  });
});

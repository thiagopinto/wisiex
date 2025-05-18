import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { User } from '../user/entities/user.entity';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { MatchService } from '../match/match.service';
import { WebsocketService } from '../websocket/websocket.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { OrderStatus } from '../common/enums/order-status.enum';
import { OrderType } from '../common/enums/order-type.enum';
import Decimal from 'decimal.js';
import { Currency } from '../common/enums/currency-enum';

const mockOrderRepository = () => ({
  find: jest.fn(),
  create: jest.fn(),
});

const mockUserService = () => ({
  checkAvailableBalance: jest.fn(),
  reserveBalance: jest.fn(),
  releaseReservedBalance: jest.fn(),
});

const mockMatchService = () => ({
  createMatch: jest.fn(),
});

const mockWebsocketService = () => ({
  emitUserOrderCreated: jest.fn(),
});

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let userService: ReturnType<typeof mockUserService>;
  let matchService: ReturnType<typeof mockMatchService>;
  let websocketService: ReturnType<typeof mockWebsocketService>;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useFactory: mockOrderRepository },
        { provide: UserService, useFactory: mockUserService },
        { provide: MatchService, useFactory: mockMatchService },
        { provide: WebsocketService, useFactory: mockWebsocketService },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockImplementation(() => queryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get(getRepositoryToken(Order));
    userService = module.get(UserService);
    matchService = module.get(MatchService);
    websocketService = module.get(WebsocketService);

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(), // This will be a Jest mock function
        save: jest.fn(), // This will be a Jest mock function
        delete: jest.fn(),
      },
    } as any;

    dataSource = module.get(DataSource);
    (dataSource.createQueryRunner as jest.Mock).mockReturnValue(queryRunner);
  });

  describe('getOrdersByUserId', () => {
    it('should return active orders for a user', async () => {
      const mockOrders = [{ id: 1 }, { id: 2 }] as any;
      orderRepository.find.mockResolvedValue(mockOrders);
      const result = await service.getOrdersByUserId(1);
      expect(result).toEqual(mockOrders);
      expect(orderRepository.find).toHaveBeenCalledWith({
        relations: ['user'],
        where: { userId: 1, status: OrderStatus.ACTIVE },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('createOrder', () => {
    const dto = {
      type: OrderType.BUY,
      amount: new Decimal('1'),
      price: new Decimal('100'),
      userId: 1,
      baseCurrency: Currency.BTC, // Adicione isso
      quoteCurrency: Currency.USD, // Adicione isso
    };

    it('should throw if user not found', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createOrder(1, {
          type: OrderType.BUY,
          amount: '1',
          price: '100',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw if balance is insufficient', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue({
        id: 1,
      } as User);
      userService.checkAvailableBalance.mockReturnValue(false);

      await expect(
        service.createOrder(1, {
          type: OrderType.BUY,
          amount: Decimal.toString(),
          price: Decimal.toString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create order, match and emit websocket event', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue({
        id: 1,
      } as User);
      userService.checkAvailableBalance.mockReturnValue(true);

      orderRepository.create.mockReturnValue({
        id: 1,
        ...dto,
        status: OrderStatus.ACTIVE,
        filled: new Decimal(0),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          btcBalanceAvailable: new Decimal(100),
          btcBalanceOnHold: new Decimal(0),
          usdBalanceAvailable: new Decimal(100000),
          usdBalanceOnHold: new Decimal(0),
          createdAt: new Date(),
          updatedAt: new Date(),
          totalBtc: 100,
          totalUsd: 100000,
        } as User,
        baseCurrency: Currency.BTC,
        quoteCurrency: Currency.USD,
      });
      (queryRunner.manager.save as jest.Mock).mockResolvedValue({
        id: 1,
        ...dto,
        status: OrderStatus.ACTIVE,
        filled: new Decimal(0),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          btcBalanceAvailable: new Decimal(100),
          btcBalanceOnHold: new Decimal(0),
          usdBalanceAvailable: new Decimal(100000),
          usdBalanceOnHold: new Decimal(0),
          createdAt: new Date(),
          updatedAt: new Date(),
          totalBtc: 100,
          totalUsd: 100000,
        } as User,
        total: new Decimal(0),
        baseCurrency: Currency.BTC,
        quoteCurrency: Currency.USD,
      });

      await service.createOrder(1, {
        type: OrderType.BUY,
        amount: '1',
        price: '100',
      });

      expect(userService.reserveBalance).toHaveBeenCalled();
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(matchService.createMatch).toHaveBeenCalled();
      expect(websocketService.emitUserOrderCreated).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('should throw InternalServerErrorException when order not found', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);

      // Opcional: verificar a mensagem
      await expect(service.cancelOrder(2, 2)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should cancel an active order and release balance', async () => {
      const order = {
        id: 1,
        userId: 1,
        status: OrderStatus.ACTIVE,
        amount: new Decimal(10),
        filled: new Decimal(2),
        price: new Decimal(100),
        type: OrderType.BUY,
      };
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(order);

      await service.cancelOrder(1, 1);

      expect(userService.releaseReservedBalance).toHaveBeenCalledWith(
        1,
        OrderType.BUY,
        new Decimal(8),
        new Decimal(100),
        queryRunner.manager,
      );
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});

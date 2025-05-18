import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { OrderType } from '../common/enums/order-type.enum';

const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
};

const mockRequest = {
  user: mockUser,
};

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: jest.Mocked<OrderService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: {
            getOrdersByUserId: jest.fn(),
            createOrder: jest.fn(),
            getOrderHistoryByUserId: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true }) // Mock do JwtAuthGuard
      .compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get(OrderService);
  });

  describe('getOrders', () => {
    it('should return an array of orders', async () => {
      const mockOrders: Order[] = [
        {
          id: 1,
          userId: 1,
          type: 'BUY',
          amount: new Decimal('1'),
          price: new Decimal('100'),
          status: 'OPEN',
          filled: new Decimal('0'),
          baseCurrency: 'BTC',
          quoteCurrency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: null,
        } as unknown as Order,
        {
          id: 2,
          userId: 1,
          type: 'SELL',
          amount: new Decimal('0.5'),
          price: new Decimal('150'),
          status: 'OPEN',
          filled: new Decimal('0'),
          baseCurrency: 'BTC',
          quoteCurrency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: null,
        } as unknown as Order,
      ];

      orderService.getOrdersByUserId.mockResolvedValue(mockOrders);

      const result = await controller.getOrders(mockRequest as any);
      expect(result).toEqual(mockOrders);
      expect(orderService.getOrdersByUserId).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('createOrder', () => {
    const createOrderDto: CreateOrderDto = {
      type: OrderType.BUY,
      amount: '1',
      price: '100',
    };

    it('should create and return an order', async () => {
      const mockOrder: Order = {
        id: 1,
        userId: mockUser.id,
        ...createOrderDto,
        amount: new Decimal(createOrderDto.amount),
        price: new Decimal(createOrderDto.price),
      } as Order;

      orderService.createOrder.mockResolvedValue(mockOrder);

      const result = await controller.createOrder(
        createOrderDto,
        mockRequest as any,
      );
      expect(result).toEqual(mockOrder);
      expect(orderService.createOrder).toHaveBeenCalledWith(
        mockUser.id,
        createOrderDto,
      );
    });

    it('should throw BadRequestException when service throws it', async () => {
      const errorMessage = 'Invalid order data';
      orderService.createOrder.mockRejectedValue(
        new BadRequestException(errorMessage),
      );

      await expect(
        controller.createOrder(createOrderDto, mockRequest as any),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.createOrder(createOrderDto, mockRequest as any),
      ).rejects.toThrow(errorMessage);
    });

    it('should throw InternalServerErrorException when service throws unknown error', async () => {
      orderService.createOrder.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.createOrder(createOrderDto, mockRequest as any),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getOrderHistory', () => {
    it('should return an array of historical orders', async () => {
      const mockHistory: Order[] = [
        {
          id: 1,
          userId: 1,
          type: 'BUY',
          status: 'FILLED',
          amount: new Decimal('1'),
          price: new Decimal('100'),
          filled: new Decimal('1'),
          baseCurrency: 'BTC',
          quoteCurrency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: null,
        } as unknown as Order,
        {
          id: 2,
          userId: 1,
          type: 'SELL',
          status: 'CANCELLED',
          amount: new Decimal('0.5'),
          price: new Decimal('150'),
          filled: new Decimal('0.5'),
          baseCurrency: 'BTC',
          quoteCurrency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: null,
        } as unknown as Order,
      ];

      orderService.getOrderHistoryByUserId.mockResolvedValue(mockHistory);

      const result = await controller.getOrderHistory(mockRequest as any);
      expect(result).toEqual(mockHistory);
      expect(orderService.getOrderHistoryByUserId).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });
});

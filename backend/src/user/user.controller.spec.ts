import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import Decimal from 'decimal.js';
import { IRequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { ExchangeService } from '../exchange/services/exchange.service';

describe('UserController', () => {
  let controller: UserController;

  // Mock mínimo do UserService (não é usado no teste atual)
  const mockUserService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: ExchangeService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true }) // Mock do guard
      .compile();

    controller = module.get<UserController>(UserController);
  });

  describe('findOne', () => {
    it('should return user when user exists in request', () => {
      // Arrange
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

      const mockRequest = {
        user: mockUser,
      } as IRequestWithUser;

      // Act (chamada síncrona sem await)
      const result = controller.findOne(mockRequest);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user is not in request', () => {
      // Arrange
      const mockRequest = {
        user: null,
      } as unknown as IRequestWithUser;

      // Act & Assert
      expect(() => controller.findOne(mockRequest)).toThrow(NotFoundException);

      expect(() => controller.findOne(mockRequest)).toThrow(
        'User with username not found',
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { OrderType } from '../common/enums/order-type.enum';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import Decimal from 'decimal.js';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get<Repository<User>>(
      getRepositoryToken(User),
    ) as jest.Mocked<Repository<User>>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findOne('testuser');
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return undefined when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const result = await service.findOne('nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const newUser = {
        ...mockUser,
        username: 'newuser',
      };

      userRepository.create.mockReturnValue(newUser);
      userRepository.save.mockResolvedValue(newUser);

      const result = await service.create('newuser');
      expect(result).toEqual(newUser);
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'newuser',
        btcBalanceAvailable: 100,
        btcBalanceOnHold: 0,
        usdBalanceAvailable: 100000,
        usdBalanceOnHold: 0,
      });
      expect(userRepository.save).toHaveBeenCalledWith(newUser);
    });
  });

  describe('findById', () => {
    it('should return a user when found by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findById(1);
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return null when user not found by id', async () => {
      userRepository.findOne.mockResolvedValue(null);
      const result = await service.findById(999);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const updatedUser = { ...mockUser, username: 'updated' };
      userRepository.save.mockResolvedValue(updatedUser);
      const result = await service.update(updatedUser);
      expect(result).toEqual(updatedUser);
      expect(userRepository.save).toHaveBeenCalledWith(updatedUser);
    });
  });

  describe('checkAvailableBalance', () => {
    it('should return true when user has sufficient USD balance for BUY', () => {
      const result = service.checkAvailableBalance(
        mockUser,
        OrderType.BUY,
        1,
        50000,
      );
      expect(result).toBe(true);
    });

    it('should return false when user has insufficient USD balance for BUY', () => {
      const result = service.checkAvailableBalance(
        mockUser,
        OrderType.BUY,
        10,
        20000,
      );
      expect(result).toBe(false);
    });

    it('should return true when user has sufficient BTC balance for SELL', () => {
      const result = service.checkAvailableBalance(
        mockUser,
        OrderType.SELL,
        1,
        50000,
      );
      expect(result).toBe(true);
    });

    it('should return false when user has insufficient BTC balance for SELL', () => {
      const result = service.checkAvailableBalance(
        mockUser,
        OrderType.SELL,
        200,
        50000,
      );
      expect(result).toBe(false);
    });
  });

  describe('reserveBalance', () => {
    const mockEntityManager = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    it('should reserve USD balance for BUY order', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockUser);
      mockEntityManager.save.mockResolvedValue(mockUser);

      const result = await service.reserveBalance(
        1,
        OrderType.BUY,
        new Decimal('1'),
        new Decimal('50000'),
        mockEntityManager as any,
      );

      expect(result).toEqual(mockUser);
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(User, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when insufficient balance', async () => {
      mockEntityManager.findOne.mockResolvedValue({
        ...mockUser,
        usdBalanceAvailable: new Decimal('1000'),
      });

      await expect(
        service.reserveBalance(
          1,
          OrderType.BUY,
          new Decimal('1'),
          new Decimal('50000'),
          mockEntityManager as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException when user not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(
        service.reserveBalance(
          1,
          OrderType.BUY,
          new Decimal('1'),
          new Decimal('50000'),
          mockEntityManager as any,
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('releaseAndAdjustBalance', () => {
    const mockEntityManager = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    it('should release and adjust balances correctly', async () => {
      mockEntityManager.findOne.mockResolvedValue(mockUser);
      mockEntityManager.save.mockResolvedValue(mockUser);

      const result = await service.releaseAndAdjustBalance(
        1,
        new Decimal('1'),
        new Decimal('50000'),
        'BTC',
        'USD',
        mockEntityManager as any,
      );

      expect(result).toEqual(mockUser);
      expect(mockEntityManager.save).toHaveBeenCalled();
    });
  });

  describe('findUserById', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.findUserById(1);
      expect(result).toEqual(mockUser);
    });
  });

  describe('getUserStatistics', () => {
    it('should return user statistics', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.getUserStatistics(1);
      expect(result).toEqual({
        usdBalance: '100000',
        btcBalance: '100',
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.getUserStatistics(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

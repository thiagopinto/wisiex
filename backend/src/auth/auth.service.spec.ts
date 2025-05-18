import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { User } from '../user/entities/user.entity';
import { HttpStatus } from '@nestjs/common';
import Decimal from 'decimal.js';

describe('AuthService', () => {
  let authService: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

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
        AuthService,
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return token', async () => {
      const registerDto: LoginDto = { username: 'newuser' };

      userService.create.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('mockToken');

      const result = await authService.register(registerDto);

      expect(result).toEqual({
        access_token: 'mockToken',
        status: HttpStatus.CREATED,
      });
      expect(userService.create).toHaveBeenCalledWith('newuser');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 1,
        username: 'testuser',
      });
    });
  });

  describe('loginOrRegister', () => {
    it('should login existing user', async () => {
      const loginDto: LoginDto = { username: 'testuser' };

      userService.findOne.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('mockToken');

      const result = await authService.loginOrRegister(loginDto);

      expect(result).toEqual({
        access_token: 'mockToken',
        status: HttpStatus.OK,
      });
      expect(userService.findOne).toHaveBeenCalledWith('testuser');
    });

    it('should register new user when not found', async () => {
      const loginDto: LoginDto = { username: 'newuser' };

      userService.findOne.mockResolvedValue(undefined);
      userService.create.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('mockToken');

      const result = await authService.loginOrRegister(loginDto);

      expect(result).toEqual({
        access_token: 'mockToken',
        status: HttpStatus.CREATED,
      });
    });
  });

  describe('validateUserByToken', () => {
    it('should return user for valid token', async () => {
      const mockToken = 'valid.token.here';
      const mockPayload = { sub: '1', username: 'testuser' };

      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      userService.findById.mockResolvedValue(mockUser);

      const result = await authService.validateUserByToken(mockToken);

      expect(result).toEqual(mockUser);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        secret: process.env.JWT_SECRET,
      });
      expect(userService.findById).toHaveBeenCalledWith(1);
    });

    it('should return null for invalid token', async () => {
      const mockToken = 'invalid.token.here';

      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      const result = await authService.validateUserByToken(mockToken);

      expect(result).toBeNull();
    });

    it('should return null for invalid user ID in token', async () => {
      const mockToken = 'valid.token.here';
      const mockPayload = { sub: 'not-a-number', username: 'testuser' };

      jwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await authService.validateUserByToken(mockToken);

      expect(result).toBeNull();
    });
  });

  describe('validateUserById', () => {
    it('should return user for valid ID', async () => {
      userService.findById.mockResolvedValue(mockUser);

      const result = await authService.validateUserById(1);

      expect(result).toEqual(mockUser);
      expect(userService.findById).toHaveBeenCalledWith(1);
    });

    it('should return null for invalid ID', async () => {
      userService.findById.mockResolvedValue(null);

      const result = await authService.validateUserById(999);

      expect(result).toBeNull();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';
import { HttpStatus } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let mockResponse: Partial<Response>; //  Partial para permitir mocks

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            loginOrRegister: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    //  Mock do objeto Response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.loginOrRegister and return 200 OK with token', async () => {
      //  Arrange
      const loginDto: LoginDto = { username: 'existinguser' };
      const mockToken = { access_token: 'mocked_token', status: HttpStatus.OK };
      jest.spyOn(authService, 'loginOrRegister').mockResolvedValue(mockToken);

      //  Act
      await controller.login(loginDto, mockResponse as Response); //  Necessário o cast

      //  Assert
      expect(authService.loginOrRegister).toHaveBeenCalledWith(loginDto);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        access_token: 'mocked_token',
      });
    });

    it('should call authService.loginOrRegister and return 201 CREATED with token', async () => {
      //  Arrange
      const loginDto: LoginDto = { username: 'newuser' };
      const mockToken = {
        access_token: 'mocked_token',
        status: HttpStatus.CREATED,
      };
      jest.spyOn(authService, 'loginOrRegister').mockResolvedValue(mockToken);

      //  Act
      await controller.login(loginDto, mockResponse as Response); //  Necessário o cast

      //  Assert
      expect(authService.loginOrRegister).toHaveBeenCalledWith(loginDto);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        access_token: 'mocked_token',
      });
    });
  });
});

import { HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    registerDto: LoginDto,
  ): Promise<{ access_token: string; status: number }> {
    const { username } = registerDto;
    const status = HttpStatus.CREATED;

    // Create new user
    const newUser = await this.userService.create(username);

    // Generate JWT
    const payload = { sub: newUser.id, username: newUser.username };
    const access_token = await this.jwtService.signAsync(payload);

    return { access_token, status };
  }

  async loginOrRegister(
    loginDto: LoginDto,
  ): Promise<{ access_token: string; status: number }> {
    const { username } = loginDto;
    const user = await this.userService.findOne(username);
    const status = HttpStatus.OK;

    if (!user) {
      return await this.register(loginDto);
    }

    const payload = { sub: user.id, username: user.username };
    const access_token = await this.jwtService.signAsync(payload);

    return { access_token, status };
  }

  async validateUserByToken(token: string): Promise<User | null> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET, // Certifique-se de ter esta variável de ambiente configurada
      });

      const userId = Number(payload.sub);
      if (isNaN(userId)) {
        throw new Error('Invalid token payload: sub is not a valid number');
      }
      const user = await this.userService.findById(userId);
      return user;
    } catch {
      return null; // Ou lançar uma exceção, dependendo do seu tratamento de erros
    }
  }

  async validateUserById(userId: number): Promise<User | null> {
    try {
      const user = await this.userService.findById(userId);
      return user;
    } catch {
      return null;
    }
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private userService: UserService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(JwtAuthGuard.name);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Token ausente');
    }
    try {
      const payload = await this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      //  Recupere o usuário do banco de dados usando o 'sub' do payload
      const user = await this.userService.findById(Number(payload.sub)); //  Assumindo que 'sub' contém o ID do usuário
      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }
      //   Adicione o usuário completo ao objeto 'request'
      request['user'] = user;
    } catch (error) {
      console.error('Erro ao verificar o token JWT:', error);
      throw new UnauthorizedException('Token inválido');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

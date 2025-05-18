import { forwardRef, Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PassportModule } from '@nestjs/passport';

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    forwardRef(() => UserModule), // Importa o módulo de usuário
    JwtModule.registerAsync({
      imports: [ConfigModule], // Importe o ConfigModule se estiver usando
      // eslint-disable-next-line @typescript-eslint/require-await
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '12h' },
      }),
      inject: [ConfigService], // Injeta o ConfigService na useFactory
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard], // Exporta AuthService e JwtModule
})
export class AuthModule {
  constructor() {
    //console.log('AuthModule initialized 👌');
    //console.log('Key JWT:', process.env.JWT_SECRET); // Verifica se a chave JWT está definida
  }
}

import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { AuthModule } from '../auth/auth.module'; // Importe o AuthModule
import { WebsocketService } from './websocket.service';

@Module({
  imports: [AuthModule], // Se você estiver usando algum módulo para AuthService, importe aqui
  providers: [WebsocketGateway, WebsocketService],
  exports: [WebsocketGateway, WebsocketService],
})
export class WebsocketModule {}

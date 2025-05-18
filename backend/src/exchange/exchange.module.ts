import { forwardRef, Module } from '@nestjs/common';
import { ExchangeService } from './services/exchange.service';
import { UserModule } from '../user/user.module';
import { QueueModule } from 'src/queue/queue.module';
import { OrderModule } from 'src/order/order.module';
import { MatchModule } from 'src/match/match.module';
import { WebsocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => QueueModule),
    forwardRef(() => OrderModule),
    forwardRef(() => MatchModule),
    WebsocketModule,
  ],
  providers: [ExchangeService],
  exports: [ExchangeService],
})
export class ExchangeModule {}

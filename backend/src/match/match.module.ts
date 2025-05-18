import { forwardRef, Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { UserModule } from 'src/user/user.module';
import { QueueModule } from 'src/queue/queue.module';
import { OrderModule } from 'src/order/order.module';
import { WebsocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match]),
    forwardRef(() => UserModule),
    forwardRef(() => QueueModule),
    forwardRef(() => OrderModule),
    WebsocketModule,
  ],
  controllers: [MatchController],
  providers: [MatchService, Match],
  exports: [TypeOrmModule, MatchService],
})
export class MatchModule {}

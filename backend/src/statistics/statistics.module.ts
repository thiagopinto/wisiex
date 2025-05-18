import { forwardRef, Module } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { MatchModule } from 'src/match/match.module';
import { UserModule } from 'src/user/user.module';
import { QueueModule } from 'src/queue/queue.module';
import { OrderModule } from 'src/order/order.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => QueueModule),
    forwardRef(() => OrderModule),
    forwardRef(() => MatchModule),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}

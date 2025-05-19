import { Module, OnModuleInit } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

@Module({
  providers: [MetricsService],
  controllers: [MetricsController],
})
export class MetricsModule implements OnModuleInit {
  constructor(private readonly metricsService: MetricsService) {}
  onModuleInit() {
    console.log('MetricsModule initialized');
  }
}

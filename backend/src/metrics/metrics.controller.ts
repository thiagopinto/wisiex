import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    try {
      const metrics = await this.metricsService.getMetrics();
      if (typeof metrics !== 'string') {
        throw new Error('Metrics service did not return a string');
      }
      return metrics;
    } catch {
      // Optionally log the error here
      return '';
    }
  }
}

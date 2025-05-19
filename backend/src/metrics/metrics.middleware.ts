import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.metricsService.incHttpRequest(req.method, req.path, res.statusCode);
      this.metricsService.setActiveUsers(0); // Reset active users after each request
      this.metricsService.observeHttpResponseTime(
        req.method,
        req.path,
        res.statusCode,
        duration,
      );
    });

    next();
  }
}

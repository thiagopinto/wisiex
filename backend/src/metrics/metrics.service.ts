import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Summary, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestCounter: Counter<string>;
  private readonly httpResponseTimeHistogram: Histogram<string>;
  public readonly activeUsersGauge: Gauge;
  public readonly requestSummary: Summary;

  constructor() {
    this.httpRequestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    });

    this.httpResponseTimeHistogram = new Histogram({
      name: 'http_response_time_seconds',
      help: 'Histogram of HTTP response times',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.05, 0.1, 0.3, 0.5, 1, 3, 5, 10],
    });

    this.activeUsersGauge = new Gauge({
      name: 'active_users_total',
      help: 'Number of active users',
    });

    this.requestSummary = new Summary({
      name: 'request_latency_seconds',
      help: 'Request latency in seconds',
      percentiles: [0.5, 0.9, 0.99],
    });

    register.registerMetric(this.httpRequestCounter);
    register.registerMetric(this.httpResponseTimeHistogram);
  }

  // Increment the HTTP request counter
  public incHttpRequest(method: string, path: string, status: number): void {
    this.httpRequestCounter.inc({ method, path, status });
  }

  // Observe the HTTP response time
  public observeHttpResponseTime(
    method: string,
    path: string,
    status: number,
    duration: number,
  ): void {
    this.httpResponseTimeHistogram.observe(
      { method, path, status },
      duration / 1000,
    );
  }

  public setActiveUsers(value: number): void {
    this.activeUsersGauge.set(value);
  }

  public observeRequestLatency(value: number): void {
    this.requestSummary.observe(value / 1000);
  }

  public getMetrics(): Promise<string> {
    return register.metrics();
  }
}

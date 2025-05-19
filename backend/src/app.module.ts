import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import dataSource from './database/typeorm.config';
import { LoggerModule } from 'nestjs-pino';
import { QueueModule } from './queue/queue.module';
import { WebsocketModule } from './websocket/websocket.module';
import { OrderModule } from './order/order.module';
import { MatchModule } from './match/match.module';
import { StatisticsModule } from './statistics/statistics.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({ ...dataSource.options, autoLoadEntities: true }),
    UserModule,
    AuthModule,
    LoggerModule.forRoot({
      pinoHttp:
        process.env.NODE_ENV === 'development'
          ? {
              level: process.env.LOG_LEVEL || 'info',
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                },
              },
            }
          : {},
    }),
    QueueModule,
    WebsocketModule,
    OrderModule,
    MatchModule,
    StatisticsModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor() {
    //console.log('AppModule initialized 👌');
  }
}

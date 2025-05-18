import { forwardRef, Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ExchangeModule } from '../exchange/exchange.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MESSAGE_PRODUCER',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://exchange:secret@localhost:5672'],
          queue: 'matching_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
    forwardRef(() => ExchangeModule),
  ],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}

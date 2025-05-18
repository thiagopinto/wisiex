import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Match } from '../match/entities/match.entity';

@Injectable()
export class QueueService {
  constructor(
    @Inject('MESSAGE_PRODUCER') private readonly messageProducer: ClientProxy,
  ) {}

  async sendMessage(message: any) {
    const routingKey = 'match_created';
    this.messageProducer.emit(routingKey, message);
    console.log(`Mensagem enviada para '${routingKey}':`, message);
    await Promise.resolve();
  }

  async sendMessageMatching(message: Match) {
    const routingKey = 'match_created';
    this.messageProducer.emit(routingKey, {
      ...message,
      price: message.price.toString(),
      amount: message.amount.toString(),
    });
    console.log(`Mensagem enviada para '${routingKey}':`, message);
    await Promise.resolve();
  }
}

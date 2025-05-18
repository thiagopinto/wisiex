import { ExchangeService } from './../exchange/services/exchange.service';
import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { Match } from '../match/entities/match.entity';

@Controller()
export class QueueController {
  private readonly logger = new Logger(QueueController.name);
  constructor(private readonly exchangeService: ExchangeService) {}

  @EventPattern('match_created')
  async handleMatchCreated(data: Match) {
    try {
      await this.exchangeService.resolveMatch(data);
      console.log('Match processado com sucesso:', data);
    } catch (error) {
      this.logger.error(
        `Erro ao processar match_created: ${error.message}`,
        error.stack,
        'MatchingQueueConsumer',
      );
      // Você também pode adicionar informações da mensagem original ao log
      this.logger.error(
        `Mensagem com erro: ${JSON.stringify(data)}`,
        null,
        'MatchingQueueConsumer',
      );
      throw error;
    }
  }

  @EventPattern('error_queue')
  async handleErrorMessage(errorMessage: any) {
    this.logger.error(
      `Mensagem de erro recebida na fila de erros: ${JSON.stringify(errorMessage)}`,
      null,
      'ErrorQueueConsumer',
    );
    await Promise.resolve();
    // Lógica para tratar a mensagem de erro (análise, retry manual, etc.)
  }
}

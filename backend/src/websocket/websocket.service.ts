import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { Order } from '../order/entities/order.entity';
import { Match } from '../match/entities/match.entity';

@Injectable()
export class WebsocketService {
  constructor(private readonly websocketGateway: WebsocketGateway) {}

  // Eventos Genéricos de Ordens (para o Livro de Ordens e Tabelas Globais)

  emitNewOrder(order: any) {
    this.websocketGateway.server.emit('newOrder', order);
  }

  emitOrderMatched(match: any) {
    this.websocketGateway.server.emit('orderMatched', match);
  }

  emitOrderCancelled(orderId: number) {
    this.websocketGateway.server.emit('orderCancelled', orderId);
  }

  emitOrderBookUpdated(orderBook: any) {
    this.websocketGateway.server.emit('orderBookUpdated', orderBook);
  }

  emitGlobalTradesUpdated(trades: any[]) {
    this.websocketGateway.server.emit('globalTradesUpdated', trades);
  }

  // Eventos Específicos do Usuário (para Atualizar Saldos, Histórico, etc.)

  emitUserOrderCreated(userId: number, order: Order) {
    const targetSocket = this.websocketGateway.authenticatedClients.get(
      userId.toString(),
    );
    if (targetSocket) {
      targetSocket.emit('newOrder', order);
    } else {
      console.log(`Usuário com ID ${userId} não está conectado.`);
    }
  }

  emitUserOrderMatched(userId: number, match: Match) {
    const targetSocket = this.websocketGateway.authenticatedClients.get(
      userId.toString(),
    );
    if (targetSocket) {
      targetSocket.emit('orderMatched', match);
    } else {
      console.log(`Usuário com ID ${userId} não está conectado.`);
    }
  }

  emitUserOrderCancelled(userId: number, orderId: number) {
    const targetSocket = this.websocketGateway.authenticatedClients.get(
      userId.toString(),
    );
    if (targetSocket) {
      targetSocket.emit('orderCancelled', orderId);
    } else {
      console.log(`Usuário com ID ${userId} não está conectado.`);
    }
  }

  emitUserBalanceUpdated(userId: number, currency: string, newBalance: number) {
    const targetSocket = this.websocketGateway.authenticatedClients.get(
      userId.toString(),
    );
    if (targetSocket) {
      targetSocket.emit('balanceUpdated', {
        currency,
        newBalance,
      });
    } else {
      console.log(`Usuário com ID ${userId} não está conectado.`);
    }
  }

  emitUserTradeHistoryUpdated(userId: number, trade: any) {
    const targetSocket = this.websocketGateway.authenticatedClients.get(
      userId.toString(),
    );
    if (targetSocket) {
      targetSocket.emit('tradeHistoryUpdated', trade);
    } else {
      console.log(`Usuário com ID ${userId} não está conectado.`);
    }
  }

  // Eventos de Estatísticas do Mercado

  emitMarketStatisticsUpdated(statistics: any) {
    this.websocketGateway.server.emit('marketStatisticsUpdated', statistics);
  }

  // Eventos de Erro (Opcional, mas útil)

  emitOrderError(error: any) {
    this.websocketGateway.server.emit('orderError', error);
  }
}

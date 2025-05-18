import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({ cors: true })
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  authenticatedClients: Map<string, Socket> = new Map();

  constructor(private readonly authService: AuthService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (token) {
        const user = await this.authService.validateUserByToken(token);
        if (user) {
          this.authenticatedClients.set(user.id.toString(), client);
          client.emit('message', `Autenticado como ${user.username}!`);
        } else {
          client.emit(
            'message',
            'Token JWT inválido ou usuário não encontrado.',
          );
          client.disconnect(true);
        }
      } else {
        client.emit('message', 'Nenhum token JWT fornecido. Conexão anônima.');
      }
    } catch (error) {
      console.error('Erro durante a conexão WebSocket:', error);
      client.emit('error', 'Erro interno no servidor.');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.authenticatedClients.forEach((socket, userId) => {
      if (socket === client) {
        this.authenticatedClients.delete(userId);
        console.log(
          `Cliente desconectado: ${client.id} (Usuário ID: ${userId})`,
        );
      }
    });
    console.log(
      `Cliente desconectado (anônimo ou falha na autenticação): ${client.id}`,
    );
  }

  @SubscribeMessage('sendToUser')
  handleSendToUser(
    client: Socket,
    payload: { userId: string; message: string },
  ) {
    const targetClient = this.authenticatedClients.get(payload.userId);
    if (targetClient) {
      targetClient.emit('message', payload.message);
    } else {
      client.emit(
        'message',
        `Usuário com ID ${payload.userId} não está conectado.`,
      );
    }
  }

  @SubscribeMessage('broadcast')
  handleBroadcast(client: Socket, message: string) {
    this.server.emit('message', message);
  }

  private extractTokenFromSocket(socket: Socket): string | undefined {
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    return undefined;
  }
}

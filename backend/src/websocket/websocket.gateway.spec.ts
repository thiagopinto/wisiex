import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketGateway } from './websocket.gateway';
import { AuthService } from '../auth/auth.service';

describe('WebsocketGateway', () => {
  let gateway: WebsocketGateway;
  let mockAuthService: { validateUserByToken: jest.Mock };

  beforeEach(async () => {
    mockAuthService = {
      validateUserByToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketGateway,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    gateway = module.get<WebsocketGateway>(WebsocketGateway);
    gateway.server = { emit: jest.fn() } as any; // mock do server
  });

  it('deve autenticar e adicionar cliente ao mapa', async () => {
    const fakeUser = { id: 1, username: 'test' };
    const client = {
      handshake: { headers: { authorization: 'Bearer valid.token' } },
      emit: jest.fn(),
    } as any;

    mockAuthService.validateUserByToken.mockResolvedValue(fakeUser);

    await gateway.handleConnection(client);
    expect(mockAuthService.validateUserByToken).toHaveBeenCalledWith(
      'valid.token',
    );
    expect(gateway.authenticatedClients.get('1')).toBe(client);
    expect(client.emit).toHaveBeenCalledWith(
      'message',
      'Autenticado como test!',
    );
  });

  it('deve desconectar cliente com token inválido', async () => {
    const client = {
      handshake: { headers: { authorization: 'Bearer invalid.token' } },
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    mockAuthService.validateUserByToken.mockResolvedValue(null);

    await gateway.handleConnection(client);
    expect(client.emit).toHaveBeenCalledWith(
      'message',
      'Token JWT inválido ou usuário não encontrado.',
    );
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('deve permitir conexão anônima sem token', async () => {
    const client = {
      handshake: { headers: {} },
      emit: jest.fn(),
    } as any;

    await gateway.handleConnection(client);
    expect(client.emit).toHaveBeenCalledWith(
      'message',
      'Nenhum token JWT fornecido. Conexão anônima.',
    );
  });

  it('deve lidar com erro interno na conexão', async () => {
    const client = {
      handshake: { headers: { authorization: 'Bearer token' } },
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    mockAuthService.validateUserByToken.mockRejectedValue(new Error('Erro'));

    await gateway.handleConnection(client);
    expect(client.emit).toHaveBeenCalledWith(
      'error',
      'Erro interno no servidor.',
    );
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('deve remover cliente do mapa ao desconectar', () => {
    const client = {} as any;
    const userId = '1';
    gateway.authenticatedClients.set(userId, client);

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    gateway.handleDisconnect(client);

    expect(gateway.authenticatedClients.has(userId)).toBe(false);
    consoleSpy.mockRestore();
  });

  it('deve enviar mensagem para usuário autenticado', () => {
    const userClient = { emit: jest.fn() } as any;
    gateway.authenticatedClients.set('123', userClient);

    const senderClient = { emit: jest.fn() } as any;
    gateway.handleSendToUser(senderClient, {
      userId: '123',
      message: 'Hello!',
    });

    expect(userClient.emit).toHaveBeenCalledWith('message', 'Hello!');
  });

  it('deve notificar se usuário alvo não estiver conectado', () => {
    const senderClient = { emit: jest.fn() } as any;
    gateway.handleSendToUser(senderClient, { userId: '999', message: 'Hi' });

    expect(senderClient.emit).toHaveBeenCalledWith(
      'message',
      'Usuário com ID 999 não está conectado.',
    );
  });

  it('deve emitir mensagem para todos via broadcast', () => {
    const message = 'mensagem global';
    gateway.server.emit = jest.fn();
    gateway.handleBroadcast({} as any, message);

    expect(gateway.server.emit).toHaveBeenCalledWith('message', message);
  });
});

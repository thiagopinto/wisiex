import { Test, TestingModule } from '@nestjs/testing';
import { WebsocketService } from './websocket.service';
import { WebsocketGateway } from './websocket.gateway';

describe('WebsocketService', () => {
  let service: WebsocketService;
  let gatewayMock: {
    server: { emit: jest.Mock };
    authenticatedClients: Map<string, any>;
  };

  beforeEach(async () => {
    gatewayMock = {
      server: { emit: jest.fn() },
      authenticatedClients: new Map(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketService,
        {
          provide: WebsocketGateway,
          useValue: gatewayMock,
        },
      ],
    }).compile();

    service = module.get<WebsocketService>(WebsocketService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve emitir evento newOrder globalmente', () => {
    const fakeOrder = { id: 1, price: 100 };
    service.emitNewOrder(fakeOrder);
    expect(gatewayMock.server.emit).toHaveBeenCalledWith('newOrder', fakeOrder);
  });
});

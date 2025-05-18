import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import * as dotenv from 'dotenv';
dotenv.config(); // Carrega as variáveis de ambiente do arquivo .env

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // --- Configuração do Microserviço RabbitMQ ---
  // Conecta o mesmo aplicativo a um transporte de microserviço (RabbitMQ)
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls: [
          process.env.RABBITMQ_URL || 'amqp://exchange:secret@localhost:5672',
        ],
        queue: process.env.RABBITMQ_MATCHING_QUEUE || 'matching_queue',
        queueOptions: {
          durable: true,
        },
      },
    },
    { inheritAppConfig: true }, // Opcional: Herda configs do app HTTP (middlewares, etc.)
  );
  // --- Fim da Configuração do Microserviço ---

  // --- Configuração do Swagger ---
  // O Swagger é uma ferramenta para documentar APIs RESTful.
  const config = new DocumentBuilder()
    .setTitle('Cats example')
    .setDescription('The cats API description')
    .setVersion('1.0')
    .addTag('cats')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT', // Opcional: especifica o formato do token
        in: 'header',
        description: 'Enter JWT token',
      },
      'bearerAuth', // Nome para referência na anotação @ApiSecurity() ou @ApiBearerAuth()
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  // --- Fim da Configuração do Swagger ---

  app.useLogger(app.get(Logger));
  // Habilite CORS com configurações específicas
  app.enableCors({
    origin: '*', // Ou use true para permitir todas as origens
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { User } from './entities/user.entity'; // Ajuste o caminho para a sua entidade User

export const FindOneSwagger = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get a user by username' }),
    ApiParam({
      name: 'username',
      description: 'Username of the user to retrieve',
    }),
    ApiResponse({ status: 200, description: 'User found', type: User }),
    ApiResponse({ status: 404, description: 'User not found' }),
    ApiBearerAuth('bearerAuth'), // Informa ao Swagger que esta rota requer autenticação Bearer
  );
};

export const GetUserStatisticsSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: "Get the user's statistics (USD and BTC balance)",
    }),
    ApiResponse({
      status: 200,
      description: 'User statistics',
      schema: {
        properties: {
          usdBalance: { type: 'string', description: "User's USD balance" },
          btcBalance: { type: 'string', description: "User's BTC balance" },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 404, description: 'User not found' }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
    ApiBearerAuth('bearerAuth'),
  );
};

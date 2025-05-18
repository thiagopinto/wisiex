import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const GetMatchBookSwagger = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get the order book' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Returns the current order book (buy and sell sides).',
      schema: {
        properties: {
          buy: {
            type: 'array',
            description: 'Array of active buy orders in the order book.',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number', description: 'Price of the match' },
                amount: { type: 'number', description: 'Amount of the match' },
                orderId: { type: 'number', description: 'ID of the order' },
                orderAmount: {
                  type: 'number',
                  description: 'Amount of the order',
                },
                orderStatus: {
                  type: 'string',
                  description: 'Status of the order',
                },
              },
            },
          },
          sell: {
            type: 'array',
            description: 'Array of active sell orders in the order book.',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number', description: 'Price of the match' },
                amount: { type: 'number', description: 'Amount of the match' },
                orderId: { type: 'number', description: 'ID of the order' },
                orderAmount: {
                  type: 'number',
                  description: 'Amount of the order',
                },
                orderStatus: {
                  type: 'string',
                  description: 'Status of the order',
                },
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
  );
};

import { Order } from './entities/order.entity';
import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';

export const CreateOrderSwagger = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new trading order' }),
    ApiBody({ type: CreateOrderDto }),
    ApiResponse({
      status: 201,
      description: 'Order created successfully',
      type: Order,
    }), // Assuming your createOrder returns the created Order
    ApiResponse({
      status: 400,
      description: 'Bad Request (e.g., insufficient balance, invalid input)',
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }), // Assuming you will use a Guard
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
    ApiBearerAuth('bearerAuth'), // If you decide to use Bearer Auth
  );
};

export const GetOrdersSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all active orders for the authenticated user',
    }),
    ApiResponse({
      status: 200,
      description: "A list of the user's active orders",
      type: [Order], // Assuming getOrders returns an array of Order
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
    ApiBearerAuth('bearerAuth'),
  );
};

export const CancelOrderSwagger = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Cancel a specific order' }),
    ApiParam({
      name: 'id',
      type: 'number',
      description: 'ID of the order to cancel',
    }),
    ApiResponse({ status: 204, description: 'Order cancelled successfully' }), // No content on successful deletion
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({
      status: 404,
      description: 'Order not found or does not belong to the user',
    }),
    ApiResponse({
      status: 400,
      description: 'Bad Request (e.g., order is not active)',
    }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
    ApiBearerAuth('bearerAuth'),
  );
};

export const GetOrderHistorySwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get the order history for the authenticated user',
    }),
    ApiResponse({
      status: 200,
      description: "A list of the user's order history",
      type: [Order],
    }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
    ApiBearerAuth('bearerAuth'),
  );
};

export const GetOrderBookSwagger = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get the current order book (buy and sell orders)',
    }),
    ApiResponse({
      status: 200,
      description: 'The current order book',
      type: 'object', // Adjust the type based on your OrderBook structure
      schema: {
        properties: {
          buy: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number' },
                amount: { type: 'number' },
              },
            },
          },
          sell: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                price: { type: 'number' },
                amount: { type: 'number' },
              },
            },
          },
        },
      },
    }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
  );
};

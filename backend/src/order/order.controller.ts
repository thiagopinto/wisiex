import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CreateOrderSwagger,
  GetOrderHistorySwagger,
  GetOrdersSwagger,
} from './order.controller.swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { IRequestWithUser } from '../common/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';
import { ApiTags } from '@nestjs/swagger';

@Controller('order')
@ApiTags('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @GetOrdersSwagger()
  async getOrders(@Req() req: IRequestWithUser): Promise<Order[]> {
    // Use Order entity
    const userId = req.user.id; // Obtenha o ID do usuário do token JWT
    return await this.orderService.getOrdersByUserId(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @CreateOrderSwagger()
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: IRequestWithUser,
  ) {
    const userId = req.user.id;
    try {
      const order = await this.orderService.createOrder(userId, createOrderDto);
      return order;
    } catch (error) {
      console.error(error);
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @GetOrderHistorySwagger()
  async getOrderHistory(@Req() req: IRequestWithUser): Promise<Order[]> {
    const userId = req.user.id;
    return await this.orderService.getOrderHistoryByUserId(userId);
  }
}

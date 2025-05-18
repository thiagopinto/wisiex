import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches } from 'class-validator';
import { OrderType } from '../../common/enums/order-type.enum';

export class CreateOrderDto {
  @ApiProperty({
    enum: OrderType,
    description: 'Tipo da ordem: BUY para compra, SELL para venda.',
    example: OrderType.BUY,
  })
  @IsEnum(OrderType, { message: 'Tipo de ordem inválido.' })
  type: OrderType;

  @ApiProperty({
    description: 'Volume de BTC a ser negociado.',
    example: '0.00001234',
  })
  @IsString({
    message: 'Volume deve ser uma string representando um número decimal.',
  })
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'Volume deve ser um número decimal válido.',
  })
  amount: string;

  @ApiProperty({
    description: 'Preço em USD por BTC para a ordem limite.',
    example: '40000.5',
  })
  @IsString({
    message: 'Preço deve ser uma string representando um número decimal.',
  })
  @Matches(/^\d+(\.\d+)?$/, {
    message: 'Preço deve ser um número decimal válido.',
  })
  price: string;
}

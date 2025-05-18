import { Decimal } from 'decimal.js';

export class MatchBookItemDto {
  price: Decimal;
  amount: Decimal;
  orderId: number;
  orderAmount: Decimal;
  orderStatus: string;
  user: string;
}

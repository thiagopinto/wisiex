import Decimal from 'decimal.js';

export interface MatchCreationData {
  orderId: number;
  takerId: number;
  amount: Decimal;
  price: Decimal;
}

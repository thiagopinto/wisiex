import type { IUser } from "./user";

export interface IOrder {
  id: number;
  userId: number;
  user: IUser;
  type: string;
  amount: string;
  price: string;
  status: string;
  filled: string;
  baseCurrency: string;
  quoteCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrderResponse {
  order: IOrder;
  match?: {
    price: string;
    amount: string;
    fee: number;
  };
  balance: {
    btc: string;
    usd: string;
  };
}


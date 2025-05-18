import type { IOrder } from "./order";

export interface IMatch {
  id: number;
  order?: IOrder;
  orderId: number;
  counterOrder?: IOrder | null;
  counterOrderId: number | null;
  takerId: number;
  makerId: number | null;
  amount: string;
  price: string;
  takerFee: string | null;
  makerFee: string | null;
  createdAt: string;
  total: string;
}

export interface IMatcBookItem {
  price: string;
  amount: string;
  orderId: number;
  orderAmount: string;
  orderStatus: string;
  user: string;
}

export interface IMatchBook {
  buy: IMatcBookItem[];
  sell: IMatcBookItem[];
}

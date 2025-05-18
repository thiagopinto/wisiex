// src/types/TMatch.ts
import type { TOrder } from "./torder";

export type TMatch = {
  id: number;
  order?: TOrder;
  orderId: number;
  counterOrder?: TOrder | null;
  counterOrderId: number | null;
  takerId: number;
  makerId: number | null;
  amount: string;
  price: string;
  takerFee: string | null;
  makerFee: string | null;
  createdAt: string;
  total: string;
};

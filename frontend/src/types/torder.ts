import type { TUser } from "./tuser";

export type TOrder = {
  id: number;
  userId: number;
  user?: TUser;
  type: string;
  amount: string;
  price: string;
  status: string;
  filled: string;
  baseCurrency: string;
  quoteCurrency: string;
  createdAt: Date;
  updatedAt: Date;
  total: string; // Propriedade virtual, não precisa ser armazenada
};

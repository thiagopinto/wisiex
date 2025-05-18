import type { IOrder, IOrderResponse } from "../interfaces/order";
import authService from "./AuthService";
const authFetch = authService.authFetch;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const orderService = {
  async getOrders(): Promise<IOrder[]> {
    const response = await authFetch(`${API_BASE_URL}/order`);
    return response;
  },

  async createOrder(orderData: {
    amount: string;
    price: string;
    type: "buy" | "sell";
  }): Promise<IOrderResponse> {
    try {
      const response = await authFetch(`${API_BASE_URL}/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authService.getAuthHeader(),
        },
        body: JSON.stringify(orderData),
      });
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Unknown error occurred");
    }
  },
  async cancelOrder(orderId: string | number): Promise<void> {
    try {
      const response = await authFetch(`${API_BASE_URL}/order/${orderId}`, {
        method: "DELETE",
        headers: authService.getAuthHeader(),
      });

      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Unknown error occurred");
    }
  },
  async getOrderHistory(): Promise<IOrder[]> {
    const response = await authFetch(`${API_BASE_URL}/order/history`);
    return response;
  },
};

export default orderService;

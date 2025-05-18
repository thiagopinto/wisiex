import type { IMatch, IMatchBook } from "../interfaces/match";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const matchService = {
  async getLatestMatches(): Promise<IMatch[]> {
    const response = await fetch(`${API_BASE_URL}/matche/latest`);
    if (!response.ok) {
      throw new Error("Failed to fetch latest matches");
    }
    return await response.json();
  },
  async getMatcheBook(): Promise<IMatchBook> {
    // Defina um tipo para o OrderBook
    const response = await fetch(`${API_BASE_URL}/matche/book`);
    if (!response.ok) {
      throw new Error("Failed to fetch order book");
    }
    return await response.json();
  },
};

import type { IGlobalStatistics } from "../interfaces/statistics";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const statisticsService = {
  async getGlobalStatistics(): Promise<IGlobalStatistics> {
    // Defina um tipo para as estatísticas globais
    const response = await fetch(`${API_BASE_URL}/statistics/global`);
    if (!response.ok) {
      throw new Error("Failed to fetch global statistics");
    }
    return await response.json();
  },
};

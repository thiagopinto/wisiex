import type { IUserStatistics } from "../interfaces/statistics";
import authService from "./AuthService";
const authFetch = authService.authFetch;

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const userService = {
  async getUserStatistics(): Promise<IUserStatistics> {
    // Defina um tipo para as estatísticas do usuário
    const response = await authFetch(`${baseURL}/users/statistics`);
    return response;
  },
};

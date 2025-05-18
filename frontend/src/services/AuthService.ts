import type { TUser } from "../types/tuser";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const authService = {
  async login(username: string): Promise<{ access_token: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao fazer login");
    }

    const data = await response.json();
    return data;
  },

  async getUserData(token: string): Promise<TUser> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Erro ao obter dados do usuário");
    }

    const data = await response.json();
    return data;
  },

  getAuthHeader(): { Authorization: string } {
    const token = localStorage.getItem("access_token");
    if (!token) {
      throw new Error("No authentication token found");
    }
    return { Authorization: `Bearer ${token}` };
  },

  clearAuthToken() {
    localStorage.removeItem("access_token");
  },

  async authFetch(input: RequestInfo, init?: RequestInit) {
    try {
      const headers = {
        "Content-Type": "application/json",
        ...init?.headers,
        ...authService.getAuthHeader(),
      };

      const response = await fetch(input, {
        ...init,
        headers,
      });

      if (response.status === 401) {
        authService.clearAuthToken();
        window.location.reload();
        throw new Error("Session expired. Please login again.");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("API call failed:", error);
      throw error;
    }
  },
};

export default authService;

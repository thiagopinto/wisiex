// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect } from "react";
//import { useNavigate } from "react-router-dom";
import authService from "../services/AuthService";
import type { TUser } from "../types/tuser";

interface AuthContextType {
  isAuthenticated: boolean;
  user: TUser | null;
  login: (username: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<TUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  //const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      authService
        .getUserData(token)
        .then((userData) => {
          setUser(userData);
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.removeItem("access_token");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string) => {
    try {
      setLoading(true); // Indicate loading during login
      const data = await authService.login(username);
      const token = data.access_token;
      localStorage.setItem("access_token", token);

      const userData = await authService.getUserData(token);
      setUser(userData);
      setIsAuthenticated(true);
      // navigate('/orders');
    } catch (error) {
      console.error("Login failed:", error);
      // Optionally set isAuthenticated to false and user to null on login failure
      setIsAuthenticated(false);
      setUser(null);
      throw error; // Propagate the error
    } finally {
      setLoading(false); // Ensure loading is set to false after login attempt
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setIsAuthenticated(false);
    setUser(null);
    // navigate('/');
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}{" "}
      {/* Render children regardless of loading state, handle loading in components */}
    </AuthContext.Provider>
  );
}

export { AuthContext, AuthProvider };

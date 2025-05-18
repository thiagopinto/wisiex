import React, {
  createContext,
  useState,
  useEffect,
  useContext,
} from "react";
import { io, Socket } from "socket.io-client";
import authService from "../services/AuthService";
import type { ISocketContextType } from "../interfaces/socket";

const SocketContext = createContext<ISocketContextType>({
  socket: null,
  isConnected: false
});

export const SocketProvider: React.FC<React.PropsWithChildren<object>> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Obter a URL do WebSocket da variável de ambiente ou usar o padrão
    const WEBSOCKET_Url =
      import.meta.env.WEBSOCKET_Url || "http://localhost:3000";
    let newSocket: Socket;

    try {
      const authHeader = authService.getAuthHeader();
      newSocket = io(WEBSOCKET_Url, {
        extraHeaders: authHeader, // Envia o token no handshake
      });
    } catch (error) {
      console.error("Error getting auth header:", error);
      newSocket = io(WEBSOCKET_Url); // Conecta sem autenticação em caso de erro
    }

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to WebSocket server");
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from WebSocket server");
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    newSocket.on("message", (data: string) => {
      console.log("Received message:", data);
    });

    // Limpeza da conexão ao desmontar o componente
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};

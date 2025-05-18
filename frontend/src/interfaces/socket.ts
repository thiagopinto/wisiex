import type { Socket } from "socket.io-client";

export interface ISocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

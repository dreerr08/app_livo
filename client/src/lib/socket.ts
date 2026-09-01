import { io } from "socket.io-client";
import { API_URL } from "./api";

export const socket = io(API_URL, { autoConnect: false });

export function joinOrderRoom(orderId: string) {
  if (!socket.connected) socket.connect();
  socket.emit("join:order", orderId);
}

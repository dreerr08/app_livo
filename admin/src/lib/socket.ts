import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export const socket = io(API_URL, { autoConnect: false });

export function connectAsRestaurant() {
  socket.connect();
  socket.on("connect", () => socket.emit("join:restaurant"));
}

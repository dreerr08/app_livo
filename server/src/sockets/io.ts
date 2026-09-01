import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../env.js";

let io: Server;

// Sala única do painel do restaurante. Se no futuro houver múltiplas
// unidades/lojas, isso vira uma sala por restaurantId.
export const RESTAURANT_ROOM = "restaurant";

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN },
  });

  io.on("connection", (socket) => {
    socket.on("join:restaurant", () => {
      socket.join(RESTAURANT_ROOM);
    });
  });

  return io;
}

export function getIo() {
  if (!io) throw new Error("Socket.io não inicializado. Chame initSocket antes.");
  return io;
}

export function emitOrderCreated(order: unknown) {
  getIo().to(RESTAURANT_ROOM).emit("order:created", order);
}

export function emitOrderUpdated(order: unknown) {
  getIo().to(RESTAURANT_ROOM).emit("order:updated", order);
}

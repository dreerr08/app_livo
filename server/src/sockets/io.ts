import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../env.js";

let io: Server;

// Sala única do painel do restaurante. Se no futuro houver múltiplas
// unidades/lojas, isso vira uma sala por restaurantId.
export const RESTAURANT_ROOM = "restaurant";
export const orderRoom = (orderId: string) => `order:${orderId}`;

// Mesma lista de origens permitidas usada pelo CORS do Express (app do
// cliente e painel do restaurante rodam em portas/domínios diferentes).
const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins.includes("*") ? true : allowedOrigins },
  });

  io.on("connection", (socket) => {
    socket.on("join:restaurant", () => {
      socket.join(RESTAURANT_ROOM);
    });

    // Cliente entra na sala do próprio pedido para acompanhar o status
    // em tempo real (Épico 7). Sem checagem de posse aqui — o id do
    // pedido já funciona como capability (é um cuid não sequencial).
    socket.on("join:order", (orderId: string) => {
      socket.join(orderRoom(orderId));
    });
  });

  return io;
}

export function getIo() {
  return io;
}

// Emitir é um efeito colateral best-effort: se o socket ainda não foi
// inicializado (ex: testes de API que não sobem um HTTP server real),
// a criação do pedido não pode falhar por causa disso.
export function emitOrderCreated(order: { id: string }) {
  io?.to(RESTAURANT_ROOM).emit("order:created", order);
}

export function emitOrderUpdated(order: { id: string }) {
  io?.to(RESTAURANT_ROOM).to(orderRoom(order.id)).emit("order:updated", order);
}

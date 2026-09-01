import type { Request, Response } from "express";
import { z } from "zod";
import * as ordersService from "../services/orders.service.js";
import { HttpError } from "../middlewares/errorHandler.js";

const createOrderInput = z.object({
  deliveryMode: z.enum(["DELIVERY", "PICKUP"]),
  addressId: z.string().optional(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
  paymentMethod: z.enum(["PIX", "CREDIT_CARD"]),
  card: z
    .object({
      token: z.string(),
      paymentMethodId: z.string(),
      installments: z.number().int().positive(),
    })
    .optional(),
});

export async function createOrder(req: Request, res: Response) {
  const input = createOrderInput.parse(req.body);
  const order = await ordersService.createOrder({ ...input, customerId: req.customerId! });
  res.status(201).json(order);
}

export async function quoteOrder(req: Request, res: Response) {
  const input = z
    .object({
      items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
      deliveryMode: z.enum(["DELIVERY", "PICKUP"]),
      cep: z.string().optional(),
    })
    .parse(req.body);
  res.json(await ordersService.quoteOrder(input));
}

// Só o dono do pedido (ou o painel, sem auth por ora) pode ver o detalhe.
// Aqui protegemos o endpoint do app do cliente: se autenticado, valida posse.
export async function getOrder(req: Request, res: Response) {
  const order = await ordersService.getOrderOrThrow(req.params.id);
  if (req.customerId && order.customerId !== req.customerId) {
    throw new HttpError(404, "Pedido não encontrado");
  }
  res.json(order);
}

const updateStatusInput = z.object({
  status: z.enum(["RECEIVED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "AWAITING_PICKUP", "COMPLETED"]),
});

export async function updateOrderStatus(req: Request, res: Response) {
  const { status } = updateStatusInput.parse(req.body);
  const order = await ordersService.updateOrderStatus(req.params.id, status);
  res.json(order);
}

// GET /orders/queue — usado pelo painel do restaurante (kanban)
export async function getKitchenQueue(_req: Request, res: Response) {
  res.json(await ordersService.listKitchenQueue());
}

// GET /orders/pending-payment — usado pelo painel para destacar pedidos
// aguardando confirmação, fora da fila de preparo.
export async function getPendingPaymentOrders(_req: Request, res: Response) {
  res.json(await ordersService.listPendingPaymentOrders());
}

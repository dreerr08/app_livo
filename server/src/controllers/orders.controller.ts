import type { Request, Response } from "express";
import { z } from "zod";
import * as ordersService from "../services/orders.service.js";

const createOrderInput = z.object({
  customerId: z.string(),
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
  const order = await ordersService.createOrder(input);
  res.status(201).json(order);
}

export async function getOrder(req: Request, res: Response) {
  const order = await ordersService.getOrderOrThrow(req.params.id);
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

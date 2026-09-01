import type { Request, Response } from "express";
import { prisma } from "../prisma.js";
import { HttpError } from "../middlewares/errorHandler.js";

export async function getMe(req: Request, res: Response) {
  const customer = await prisma.customer.findUnique({
    where: { id: req.customerId },
    include: { addresses: true },
  });
  if (!customer) throw new HttpError(404, "Cliente não encontrado");
  res.json(customer);
}

export async function listMyOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { customerId: req.customerId },
    include: { items: { include: { product: true } }, address: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
}

import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { HttpError } from "../middlewares/errorHandler.js";

const customerInput = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  email: z.string().email().optional(),
});

// Cadastro simplificado (telefone + nome). O fluxo completo de
// OTP/login (Épico 4) entra na próxima fase; por ora isso permite
// identificar o cliente para criar pedidos.
export async function createCustomer(req: Request, res: Response) {
  const data = customerInput.parse(req.body);
  const customer = await prisma.customer.upsert({
    where: { phone: data.phone },
    update: { name: data.name, email: data.email },
    create: data,
  });
  res.status(201).json(customer);
}

export async function getCustomer(req: Request, res: Response) {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: { addresses: true },
  });
  if (!customer) throw new HttpError(404, "Cliente não encontrado");
  res.json(customer);
}

export async function listCustomerOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { customerId: req.params.id },
    include: { items: { include: { product: true } }, address: true, payments: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
}

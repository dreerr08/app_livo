import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { HttpError } from "../middlewares/errorHandler.js";

const addressInput = z.object({
  label: z.string().optional(),
  cep: z.string().min(8).max(9),
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  reference: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export async function createAddress(req: Request, res: Response) {
  const data = addressInput.parse(req.body);
  const customerId = req.customerId!;

  if (data.isDefault) {
    await prisma.address.updateMany({ where: { customerId }, data: { isDefault: false } });
  }

  const address = await prisma.address.create({ data: { ...data, customerId } });
  res.status(201).json(address);
}

export async function listMyAddresses(req: Request, res: Response) {
  const addresses = await prisma.address.findMany({
    where: { customerId: req.customerId },
    orderBy: { createdAt: "desc" },
  });
  res.json(addresses);
}

export async function deleteAddress(req: Request, res: Response) {
  const address = await prisma.address.findUnique({ where: { id: req.params.id } });
  if (!address || address.customerId !== req.customerId) throw new HttpError(404, "Endereço não encontrado");
  await prisma.address.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

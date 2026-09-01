import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";

const addressInput = z.object({
  customerId: z.string(),
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

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { customerId: data.customerId },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({ data });
  res.status(201).json(address);
}

export async function listCustomerAddresses(req: Request, res: Response) {
  const addresses = await prisma.address.findMany({
    where: { customerId: req.params.customerId },
    orderBy: { createdAt: "desc" },
  });
  res.json(addresses);
}

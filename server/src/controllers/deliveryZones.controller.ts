import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { quoteDelivery } from "../services/deliveryZone.service.js";

const zoneInput = z.object({
  name: z.string().min(1),
  cepPrefixes: z.array(z.string().min(2)).min(1),
  fee: z.number().nonnegative(),
  freeShippingThreshold: z.number().positive().optional(),
  active: z.boolean().default(true),
});

export async function listDeliveryZones(_req: Request, res: Response) {
  res.json(await prisma.deliveryZone.findMany({ orderBy: { name: "asc" } }));
}

export async function createDeliveryZone(req: Request, res: Response) {
  const data = zoneInput.parse(req.body);
  const zone = await prisma.deliveryZone.create({ data });
  res.status(201).json(zone);
}

export async function updateDeliveryZone(req: Request, res: Response) {
  const data = zoneInput.partial().parse(req.body);
  const zone = await prisma.deliveryZone.update({ where: { id: req.params.id }, data });
  res.json(zone);
}

// GET /delivery-zones/quote?cep=01310-100 — usado pelo app do cliente
// para saber, antes do checkout, se entrega é possível e qual o frete.
export async function getDeliveryQuote(req: Request, res: Response) {
  const cep = z.string().min(8).parse(req.query.cep);
  const quote = await quoteDelivery(cep);
  res.json(quote);
}

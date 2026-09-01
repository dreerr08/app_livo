import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { HttpError } from "../middlewares/errorHandler.js";

const productInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  photoUrl: z.string().url().optional(),
  price: z.number().positive(),
  type: z.enum(["AVULSO", "COMBO"]).default("AVULSO"),
  category: z.string().optional(),
  isAvailable: z.boolean().default(true),
  // Quando type = COMBO: itens fixos que compõem o kit.
  comboItems: z.array(z.object({ itemId: z.string(), quantity: z.number().int().positive() })).optional(),
});

// GET /products — catálogo completo (combos + avulsos), com opção de esconder esgotados
export async function listProducts(req: Request, res: Response) {
  const onlyAvailable = req.query.available === "true";
  const products = await prisma.product.findMany({
    where: onlyAvailable ? { isAvailable: true } : undefined,
    include: { comboItems: { include: { item: true } } },
    orderBy: { name: "asc" },
  });
  res.json(products);
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { comboItems: { include: { item: true } } },
  });
  if (!product) throw new HttpError(404, "Produto não encontrado");
  res.json(product);
}

export async function createProduct(req: Request, res: Response) {
  const data = productInput.parse(req.body);
  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      photoUrl: data.photoUrl,
      price: data.price,
      type: data.type,
      category: data.category,
      isAvailable: data.isAvailable,
      comboItems: data.comboItems
        ? { create: data.comboItems.map((ci) => ({ itemId: ci.itemId, quantity: ci.quantity })) }
        : undefined,
    },
    include: { comboItems: { include: { item: true } } },
  });
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const data = productInput.partial().parse(req.body);
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      name: data.name,
      description: data.description,
      photoUrl: data.photoUrl,
      price: data.price,
      type: data.type,
      category: data.category,
      isAvailable: data.isAvailable,
    },
  });
  res.json(product);
}

// PATCH /products/:id/availability — marcar como esgotado/disponível
export async function setAvailability(req: Request, res: Response) {
  const { isAvailable } = z.object({ isAvailable: z.boolean() }).parse(req.body);
  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: { isAvailable },
  });
  res.json(product);
}

export async function deleteProduct(req: Request, res: Response) {
  await prisma.product.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

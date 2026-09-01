import type { Request, Response } from "express";
import { env } from "../env.js";
import { HttpError } from "../middlewares/errorHandler.js";

export async function uploadProductPhoto(req: Request, res: Response) {
  if (!req.file) throw new HttpError(400, "Nenhum arquivo enviado (campo 'photo')");
  const url = `${env.PUBLIC_BASE_URL}/uploads/products/${req.file.filename}`;
  res.status(201).json({ url });
}

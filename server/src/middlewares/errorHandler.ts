import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Dados inválidos", issues: err.issues });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Arquivo maior que 5MB" : "Falha no upload do arquivo";
    return res.status(400).json({ error: message });
  }
  console.error(err);
  return res.status(500).json({ error: "Erro interno do servidor" });
}

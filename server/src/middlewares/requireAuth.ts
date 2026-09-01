import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../services/auth.service.js";
import { HttpError } from "./errorHandler.js";

declare global {
  namespace Express {
    interface Request {
      customerId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Não autenticado");

  try {
    const { customerId } = verifyToken(header.slice("Bearer ".length));
    req.customerId = customerId;
    next();
  } catch {
    throw new HttpError(401, "Sessão inválida ou expirada");
  }
}

// Usado em rotas acessadas tanto pelo app do cliente (autenticado) quanto
// pelo painel do restaurante (sem login de operador nesta fase).
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.customerId = verifyToken(header.slice("Bearer ".length)).customerId;
    } catch {
      // token inválido em rota opcional: segue sem autenticar
    }
  }
  next();
}

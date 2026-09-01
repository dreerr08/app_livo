import type { Request, Response } from "express";
import { z } from "zod";
import * as authService from "../services/auth.service.js";

const phoneSchema = z.object({ phone: z.string().min(8) });

export async function requestOtp(req: Request, res: Response) {
  const { phone } = phoneSchema.parse(req.body);
  const result = await authService.requestOtp(phone);
  res.json({ sent: true, devCode: result.devCode });
}

const verifySchema = z.object({
  phone: z.string().min(8),
  code: z.string().length(6),
  name: z.string().min(1).optional(),
});

export async function verifyOtp(req: Request, res: Response) {
  const input = verifySchema.parse(req.body);
  const { token, customer } = await authService.verifyOtp(input);
  res.json({ token, customer });
}

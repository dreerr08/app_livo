import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "homolog", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  CORS_ORIGIN: z.string().default("*"),
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1, "MERCADOPAGO_ACCESS_TOKEN é obrigatório"),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
  PUBLIC_BASE_URL: z.string().url().describe("URL pública do backend, usada para configurar o webhook do Mercado Pago"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET precisa ter pelo menos 16 caracteres"),
});

export const env = envSchema.parse(process.env);

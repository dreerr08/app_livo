import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";
import { env } from "../env.js";
import { HttpError } from "../middlewares/errorHandler.js";

const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Gera e "envia" o código de verificação. Em produção, isto deve chamar
// um provedor de SMS (Twilio, Zenvia etc.) em vez de apenas logar —
// por isso devCode só volta na resposta fora de produção, para permitir
// testar o app sem SMS de verdade.
export async function requestOtp(phone: string) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 8);

  await prisma.otpCode.create({
    data: { phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000) },
  });

  console.log(`[auth] Código OTP para ${phone}: ${code} (expira em ${OTP_TTL_MINUTES}min)`);

  return { devCode: env.NODE_ENV === "production" ? undefined : code };
}

export type VerifyOtpInput = { phone: string; code: string; name?: string };

export async function verifyOtp(input: VerifyOtpInput) {
  const otp = await prisma.otpCode.findFirst({
    where: { phone: input.phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) throw new HttpError(400, "Nenhum código pendente para este telefone");
  if (otp.expiresAt < new Date()) throw new HttpError(400, "Código expirado, solicite um novo");
  if (otp.attempts >= MAX_ATTEMPTS) throw new HttpError(429, "Muitas tentativas, solicite um novo código");

  const valid = await bcrypt.compare(input.code, otp.codeHash);
  if (!valid) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(400, "Código inválido");
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

  let customer = await prisma.customer.findUnique({ where: { phone: input.phone } });
  if (!customer) {
    if (!input.name) throw new HttpError(400, "Nome é obrigatório no primeiro acesso");
    customer = await prisma.customer.create({ data: { phone: input.phone, name: input.name } });
  }

  const token = jwt.sign({ sub: customer.id, phone: customer.phone }, env.JWT_SECRET, { expiresIn: "30d" });
  return { token, customer };
}

export function verifyToken(token: string) {
  const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; phone: string };
  return { customerId: payload.sub, phone: payload.phone };
}

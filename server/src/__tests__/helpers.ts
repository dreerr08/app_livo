import request from "supertest";
import { createApp } from "../app.js";

export const app = createApp();

// Faz o fluxo real de OTP (request + verify) contra a própria API, e
// devolve o token pronto para usar nas próximas requisições de teste.
export async function registerAndLogin(phone: string, name: string) {
  const requestRes = await request(app).post("/auth/otp/request").send({ phone });
  const devCode = requestRes.body.devCode as string;

  const verifyRes = await request(app).post("/auth/otp/verify").send({ phone, code: devCode, name });
  return { token: verifyRes.body.token as string, customer: verifyRes.body.customer };
}

import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./helpers.js";

describe("auth OTP", () => {
  it("exige nome no primeiro acesso", async () => {
    const { body } = await request(app).post("/auth/otp/request").send({ phone: "11900000001" });

    const res = await request(app).post("/auth/otp/verify").send({ phone: "11900000001", code: body.devCode });
    expect(res.status).toBe(400);
  });

  it("cadastra e loga com código correto", async () => {
    const { body } = await request(app).post("/auth/otp/request").send({ phone: "11900000002" });

    const res = await request(app)
      .post("/auth/otp/verify")
      .send({ phone: "11900000002", code: body.devCode, name: "Ana" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.customer.name).toBe("Ana");
  });

  it("rejeita código incorreto", async () => {
    await request(app).post("/auth/otp/request").send({ phone: "11900000003" });

    const res = await request(app)
      .post("/auth/otp/verify")
      .send({ phone: "11900000003", code: "000000", name: "Bruno" });

    expect(res.status).toBe(400);
  });

  it("segundo login não exige nome de novo", async () => {
    const first = await request(app).post("/auth/otp/request").send({ phone: "11900000004" });
    await request(app).post("/auth/otp/verify").send({ phone: "11900000004", code: first.body.devCode, name: "Carla" });

    const second = await request(app).post("/auth/otp/request").send({ phone: "11900000004" });
    const res = await request(app).post("/auth/otp/verify").send({ phone: "11900000004", code: second.body.devCode });

    expect(res.status).toBe(200);
    expect(res.body.customer.name).toBe("Carla");
  });
});

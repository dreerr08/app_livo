import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./helpers.js";

describe("zonas de entrega", () => {
  it("cota CEP dentro e fora da zona", async () => {
    await request(app)
      .post("/delivery-zones")
      .send({ name: "Centro", cepPrefixes: ["01310"], fee: 8, freeShippingThreshold: 80 });

    const inZone = await request(app).get("/delivery-zones/quote").query({ cep: "01310-100" });
    expect(inZone.body.inZone).toBe(true);
    expect(inZone.body.fee).toBe(8);

    const outOfZone = await request(app).get("/delivery-zones/quote").query({ cep: "99999-999" });
    expect(outOfZone.body.inZone).toBe(false);
  });

  it("escolhe o prefixo mais específico entre zonas sobrepostas", async () => {
    await request(app).post("/delivery-zones").send({ name: "Ampla", cepPrefixes: ["013"], fee: 15 });
    await request(app).post("/delivery-zones").send({ name: "Específica", cepPrefixes: ["01310"], fee: 5 });

    const res = await request(app).get("/delivery-zones/quote").query({ cep: "01310-100" });
    expect(res.body.fee).toBe(5);
  });
});

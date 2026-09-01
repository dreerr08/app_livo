import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./helpers.js";

// Regressão: a API serve dois front-ends (app do cliente e painel) em
// origens diferentes. CORS_ORIGIN precisa liberar todas elas, não só uma.
describe("CORS", () => {
  it("libera as origens configuradas para o client e o admin", async () => {
    const clientRes = await request(app).get("/health").set("Origin", "http://localhost:3000");
    expect(clientRes.headers["access-control-allow-origin"]).toBe("http://localhost:3000");

    const adminRes = await request(app).get("/health").set("Origin", "http://localhost:5173");
    expect(adminRes.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("não libera uma origem fora da lista", async () => {
    const res = await request(app).get("/health").set("Origin", "http://evil.example.com");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

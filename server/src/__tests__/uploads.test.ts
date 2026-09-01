import { describe, expect, it, afterAll } from "vitest";
import request from "supertest";
import { readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { app } from "./helpers.js";

const uploadDir = path.join(process.cwd(), "uploads", "products");
const filesBefore = new Set(readdirSync(uploadDir));

describe("upload de foto do produto", () => {
  afterAll(() => {
    for (const file of readdirSync(uploadDir)) {
      if (!filesBefore.has(file)) unlinkSync(path.join(uploadDir, file));
    }
  });

  it("aceita imagem e devolve uma URL usável no cadastro do produto", async () => {
    const png = Buffer.from(
      "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082",
      "hex"
    );

    const res = await request(app).post("/uploads/product-photo").attach("photo", png, "capa.png");
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^https?:\/\/.+\/uploads\/products\/.+\.png$/);

    const create = await request(app).post("/products").send({ name: "Marmita com foto", price: 20, photoUrl: res.body.url });
    expect(create.status).toBe(201);
    expect(create.body.photoUrl).toBe(res.body.url);
  });

  it("rejeita arquivo que não é imagem", async () => {
    const res = await request(app).post("/uploads/product-photo").attach("photo", Buffer.from("não é imagem"), "arquivo.txt");
    expect(res.status).toBe(415);
  });

  it("exige o campo 'photo'", async () => {
    const res = await request(app).post("/uploads/product-photo");
    expect(res.status).toBe(400);
  });
});

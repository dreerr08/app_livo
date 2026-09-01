import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./helpers.js";

describe("produtos e combos", () => {
  it("cria, lista e marca como esgotado", async () => {
    const create = await request(app).post("/products").send({ name: "Marmita Teste", price: 19.9 });
    expect(create.status).toBe(201);

    const list = await request(app).get("/products");
    expect(list.body).toHaveLength(1);
    expect(list.body[0].isAvailable).toBe(true);

    const toggle = await request(app)
      .patch(`/products/${create.body.id}/availability`)
      .send({ isAvailable: false });
    expect(toggle.body.isAvailable).toBe(false);

    const filtered = await request(app).get("/products?available=true");
    expect(filtered.body).toHaveLength(0);
  });

  it("cria combo fixo com itens", async () => {
    const item = await request(app).post("/products").send({ name: "Frango", price: 20 });

    const combo = await request(app)
      .post("/products")
      .send({
        name: "Combo Teste",
        price: 50,
        type: "COMBO",
        comboItems: [{ itemId: item.body.id, quantity: 2 }],
      });

    expect(combo.status).toBe(201);
    expect(combo.body.comboItems).toHaveLength(1);
    expect(combo.body.comboItems[0].quantity).toBe(2);
  });
});

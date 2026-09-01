import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, registerAndLogin } from "./helpers.js";

async function setupCustomerWithAddressInZone(phone: string) {
  const { token } = await registerAndLogin(phone, "Cliente Teste");
  await request(app).post("/delivery-zones").send({ name: "Centro", cepPrefixes: ["01310"], fee: 8, freeShippingThreshold: 100 });
  const address = await request(app)
    .post("/addresses")
    .set("Authorization", `Bearer ${token}`)
    .send({ cep: "01310-100", street: "Av Paulista", number: "1", neighborhood: "Bela Vista", city: "SP", state: "SP" });
  return { token, addressId: address.body.id as string };
}

describe("pedidos", () => {
  it("exige autenticação para criar pedido", async () => {
    const product = await request(app).post("/products").send({ name: "Marmita", price: 20 });
    const res = await request(app)
      .post("/orders")
      .send({ deliveryMode: "PICKUP", items: [{ productId: product.body.id, quantity: 1 }], paymentMethod: "PIX" });
    expect(res.status).toBe(401);
  });

  it("calcula quote sem persistir pedido", async () => {
    const product = await request(app).post("/products").send({ name: "Marmita", price: 25 });
    await request(app).post("/delivery-zones").send({ name: "Centro", cepPrefixes: ["01310"], fee: 8 });

    const res = await request(app)
      .post("/orders/quote")
      .send({ deliveryMode: "DELIVERY", cep: "01310-100", items: [{ productId: product.body.id, quantity: 2 }] });

    expect(res.body).toEqual({ subtotal: 50, deliveryFee: 8, total: 58 });
  });

  it("bloqueia entrega fora da zona", async () => {
    const { token } = await registerAndLogin("11900000010", "Cliente");
    const product = await request(app).post("/products").send({ name: "Marmita", price: 20 });
    const address = await request(app)
      .post("/addresses")
      .set("Authorization", `Bearer ${token}`)
      .send({ cep: "99999-999", street: "Rua X", number: "1", neighborhood: "B", city: "C", state: "SP" });

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        deliveryMode: "DELIVERY",
        addressId: address.body.id,
        items: [{ productId: product.body.id, quantity: 1 }],
        paymentMethod: "PIX",
      });

    expect(res.status).toBe(422);
  });

  it("bloqueia item esgotado", async () => {
    const { token } = await registerAndLogin("11900000011", "Cliente");
    const product = await request(app).post("/products").send({ name: "Marmita", price: 20 });
    await request(app).patch(`/products/${product.body.id}/availability`).send({ isAvailable: false });

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ deliveryMode: "PICKUP", items: [{ productId: product.body.id, quantity: 1 }], paymentMethod: "PIX" });

    expect(res.status).toBe(409);
  });

  it("fluxo Pix completo: aguarda pagamento, webhook confirma, entra na fila, avança status", async () => {
    const { token, addressId } = await setupCustomerWithAddressInZone("11900000012");
    const product = await request(app).post("/products").send({ name: "Marmita", price: 30 });

    const order = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        deliveryMode: "DELIVERY",
        addressId,
        items: [{ productId: product.body.id, quantity: 1 }],
        paymentMethod: "PIX",
      });

    expect(order.status).toBe(201);
    expect(order.body.status).toBe("AWAITING_PAYMENT");
    expect(order.body.paymentStatus).toBe("PENDING");
    expect(order.body.payments[0].pixQrCode).toBeTruthy();

    // Pedido pendente não pode avançar na fila
    const blocked = await request(app).patch(`/orders/${order.body.id}/status`).send({ status: "PREPARING" });
    expect(blocked.status).toBe(409);

    // Pedido pendente não aparece na fila de preparo, mas aparece nos pendentes
    const queueBefore = await request(app).get("/orders/queue");
    expect(queueBefore.body.find((o: { id: string }) => o.id === order.body.id)).toBeUndefined();
    const pending = await request(app).get("/orders/pending-payment");
    expect(pending.body.find((o: { id: string }) => o.id === order.body.id)).toBeTruthy();

    // Webhook do Mercado Pago confirma o pagamento
    const gatewayPaymentId = order.body.payments[0].gatewayPaymentId as string;
    const { fakePaymentProvider } = await import("../services/payment/fakePaymentProvider.js");
    fakePaymentProvider.__setStatus(gatewayPaymentId, "approved");

    const webhook = await request(app)
      .post("/webhooks/mercadopago")
      .send({ type: "payment", data: { id: gatewayPaymentId } });
    expect(webhook.status).toBe(200);

    const afterWebhook = await request(app).get(`/orders/${order.body.id}`);
    expect(afterWebhook.body.status).toBe("RECEIVED");
    expect(afterWebhook.body.paymentStatus).toBe("PAID");

    const queueAfter = await request(app).get("/orders/queue");
    expect(queueAfter.body.find((o: { id: string }) => o.id === order.body.id)).toBeTruthy();

    const advance = await request(app).patch(`/orders/${order.body.id}/status`).send({ status: "PREPARING" });
    expect(advance.status).toBe(200);
    expect(advance.body.status).toBe("PREPARING");
  });

  it("cartão aprovado entra direto na fila; cartão recusado cancela o pedido", async () => {
    const { token } = await registerAndLogin("11900000013", "Cliente Cartão");
    const product = await request(app).post("/products").send({ name: "Marmita", price: 20 });

    const approved = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        deliveryMode: "PICKUP",
        items: [{ productId: product.body.id, quantity: 1 }],
        paymentMethod: "CREDIT_CARD",
        card: { token: "tok_ok", paymentMethodId: "visa", installments: 1 },
      });
    expect(approved.body.status).toBe("RECEIVED");
    expect(approved.body.paymentStatus).toBe("PAID");

    const rejected = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        deliveryMode: "PICKUP",
        items: [{ productId: product.body.id, quantity: 1 }],
        paymentMethod: "CREDIT_CARD",
        card: { token: "tok_reject", paymentMethodId: "visa", installments: 1 },
      });
    expect(rejected.status).toBe(402);
  });

  it("cliente não vê pedido de outro cliente", async () => {
    const a = await registerAndLogin("11900000014", "Cliente A");
    const b = await registerAndLogin("11900000015", "Cliente B");
    const product = await request(app).post("/products").send({ name: "Marmita", price: 20 });

    const order = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${a.token}`)
      .send({
        deliveryMode: "PICKUP",
        items: [{ productId: product.body.id, quantity: 1 }],
        paymentMethod: "CREDIT_CARD",
        card: { token: "tok_ok", paymentMethodId: "visa", installments: 1 },
      });

    const res = await request(app)
      .get(`/orders/${order.body.id}`)
      .set("Authorization", `Bearer ${b.token}`);
    expect(res.status).toBe(404);

    // Sem autenticação (painel do restaurante) continua enxergando
    const asPanel = await request(app).get(`/orders/${order.body.id}`);
    expect(asPanel.status).toBe(200);
  });

  it("histórico de pedidos do próprio cliente (Épico 8)", async () => {
    const { token } = await registerAndLogin("11900000016", "Cliente Histórico");
    const product = await request(app).post("/products").send({ name: "Marmita", price: 20 });

    await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({
        deliveryMode: "PICKUP",
        items: [{ productId: product.body.id, quantity: 1 }],
        paymentMethod: "CREDIT_CARD",
        card: { token: "tok_ok", paymentMethodId: "visa", installments: 1 },
      });

    const res = await request(app).get("/me/orders").set("Authorization", `Bearer ${token}`);
    expect(res.body).toHaveLength(1);
  });
});

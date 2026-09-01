import type { Request, Response } from "express";
import { prisma } from "../prisma.js";
import { paymentProvider } from "../services/payment/mercadoPagoProvider.js";
import { markOrderPaid, markOrderPaymentFailed } from "../services/orders.service.js";

// Mercado Pago notifica tanto via corpo (POST) quanto via query string
// (?type=payment&data.id=123), dependendo da configuração/versão do evento.
export async function mercadoPagoWebhook(req: Request, res: Response) {
  const fromBody = paymentProvider.parseWebhook(req.body);
  const fromQuery =
    req.query.type === "payment" && req.query["data.id"]
      ? { gatewayPaymentId: String(req.query["data.id"]) }
      : null;

  const parsed = fromBody ?? fromQuery;

  // Responde 200 mesmo para notificações que não são de pagamento, para o
  // Mercado Pago não ficar reenviando o webhook.
  if (!parsed) return res.status(200).send();

  const payment = await prisma.payment.findUnique({ where: { gatewayPaymentId: parsed.gatewayPaymentId } });
  if (!payment) return res.status(200).send();

  const status = await paymentProvider.getPaymentStatus(parsed.gatewayPaymentId);

  if (status === "approved" && payment.status !== "PAID") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID" } });
    await markOrderPaid(payment.orderId);
  } else if (status === "rejected") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUSED" } });
    await markOrderPaymentFailed(payment.orderId, "REFUSED");
  } else if (status === "refunded") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
    await markOrderPaymentFailed(payment.orderId, "REFUNDED");
  } else if (status === "cancelled") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
    await markOrderPaymentFailed(payment.orderId, "CANCELLED");
  }

  res.status(200).send();
}

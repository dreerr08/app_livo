import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { quoteDelivery } from "./deliveryZone.service.js";
import { paymentProvider } from "./payment/mercadoPagoProvider.js";
import { emitOrderCreated, emitOrderUpdated } from "../sockets/io.js";

export type CreateOrderInput = {
  customerId: string;
  deliveryMode: "DELIVERY" | "PICKUP";
  addressId?: string;
  items: { productId: string; quantity: number }[];
  paymentMethod: "PIX" | "CREDIT_CARD";
  card?: { token: string; paymentMethodId: string; installments: number };
};

// Monta o pedido, calcula subtotal/frete/total a partir do catálogo (nunca
// confia em preço vindo do front-end) e gera a cobrança no gateway.
// O pedido nasce com status AWAITING_PAYMENT e só avança para a fila de
// preparo (RECEIVED) quando o pagamento é confirmado (ver confirmPayment).
export async function createOrder(input: CreateOrderInput) {
  if (input.items.length === 0) throw new HttpError(400, "Pedido precisa ter ao menos um item");

  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new HttpError(404, "Cliente não encontrado");

  const products = await prisma.product.findMany({
    where: { id: { in: input.items.map((i) => i.productId) } },
  });

  const unavailable = products.find((p) => !p.isAvailable);
  if (unavailable) throw new HttpError(409, `Item indisponível: ${unavailable.name}`);

  let subtotal = new Prisma.Decimal(0);
  const orderItemsData = input.items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new HttpError(404, `Produto não encontrado: ${item.productId}`);
    const lineSubtotal = product.price.mul(item.quantity);
    subtotal = subtotal.add(lineSubtotal);
    return {
      productId: product.id,
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal: lineSubtotal,
    };
  });

  let deliveryFee = new Prisma.Decimal(0);
  let deliveryZoneId: string | undefined;
  let address = null;

  if (input.deliveryMode === "DELIVERY") {
    if (!input.addressId) throw new HttpError(400, "Endereço é obrigatório para entrega");
    address = await prisma.address.findUnique({ where: { id: input.addressId } });
    if (!address || address.customerId !== input.customerId) {
      throw new HttpError(404, "Endereço não encontrado");
    }

    const quote = await quoteDelivery(address.cep);
    if (!quote.inZone) throw new HttpError(422, "CEP fora da zona de entrega. Escolha retirada no local.");

    deliveryZoneId = quote.zoneId;
    const freeAbove = quote.freeShippingThreshold;
    deliveryFee = freeAbove !== null && subtotal.gte(freeAbove) ? new Prisma.Decimal(0) : new Prisma.Decimal(quote.fee);
  }

  const total = subtotal.add(deliveryFee);

  const order = await prisma.order.create({
    data: {
      customerId: input.customerId,
      deliveryMode: input.deliveryMode,
      addressId: input.deliveryMode === "DELIVERY" ? input.addressId : undefined,
      deliveryZoneId,
      subtotal,
      deliveryFee,
      total,
      items: { create: orderItemsData },
    },
    include: { items: { include: { product: true } }, address: true },
  });

  const description = `Pedido ${order.id} — App LIVO`;

  // A cobrança é uma chamada de rede a um serviço externo: se ela falhar
  // (gateway fora do ar, credencial inválida etc.), o pedido não pode
  // ficar órfão em AWAITING_PAYMENT sem nenhum registro de pagamento —
  // cancelamos e devolvemos um erro claro para o cliente tentar de novo.
  try {
    if (input.paymentMethod === "PIX") {
      const pix = await paymentProvider.createPixCharge({
        orderId: order.id,
        amount: Number(total),
        description,
        payerEmail: customer.email ?? `${customer.phone}@convidado.applivo`,
        payerName: customer.name,
      });

      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: "PIX",
          amount: total,
          gatewayPaymentId: pix.gatewayPaymentId,
          pixQrCode: pix.qrCode,
          pixQrCodeBase64: pix.qrCodeBase64,
          pixCopyPaste: pix.copyPaste,
        },
      });
    } else {
      if (!input.card) throw new HttpError(400, "Dados do cartão são obrigatórios");

      const charge = await paymentProvider.chargeCard({
        orderId: order.id,
        amount: Number(total),
        description,
        payerEmail: customer.email ?? `${customer.phone}@convidado.applivo`,
        cardToken: input.card.token,
        paymentMethodId: input.card.paymentMethodId,
        installments: input.card.installments,
      });

      await prisma.payment.create({
        data: {
          orderId: order.id,
          method: "CREDIT_CARD",
          amount: total,
          gatewayPaymentId: charge.gatewayPaymentId,
          status: charge.status === "approved" ? "PAID" : charge.status === "rejected" ? "REFUSED" : "PENDING",
        },
      });

      if (charge.status === "rejected") {
        await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "REFUSED" } });
        throw new HttpError(402, `Pagamento recusado: ${charge.statusDetail}`);
      }

      if (charge.status === "approved") {
        await markOrderPaid(order.id);
      }
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    await prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "REFUSED" } });
    throw new HttpError(502, "Não foi possível processar o pagamento no momento. Tente novamente.");
  }

  const fullOrder = await getOrderOrThrow(order.id);
  emitOrderCreated(fullOrder);
  return fullOrder;
}

export async function getOrderOrThrow(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } }, address: true, payments: true, customer: true },
  });
  if (!order) throw new HttpError(404, "Pedido não encontrado");
  return order;
}

// Chamado quando o gateway confirma o pagamento (webhook ou aprovação
// síncrona do cartão). Pedido não pago nunca chega aqui — só a partir
// deste ponto ele entra na fila de preparo do painel.
export async function markOrderPaid(orderId: string) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID", status: "RECEIVED" },
    include: { items: { include: { product: true } }, address: true, payments: true, customer: true },
  });
  emitOrderUpdated(order);
  return order;
}

export async function markOrderPaymentFailed(orderId: string, reason: "REFUSED" | "REFUNDED" | "CANCELLED") {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: reason, status: "CANCELLED" },
    include: { items: { include: { product: true } }, address: true, payments: true, customer: true },
  });
  emitOrderUpdated(order);
  return order;
}

const KITCHEN_STATUSES = ["RECEIVED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "AWAITING_PICKUP", "COMPLETED"] as const;
export type KitchenStatus = (typeof KITCHEN_STATUSES)[number];

// Usado pelo painel (Épico 9) para mover o card entre colunas do kanban.
export async function updateOrderStatus(orderId: string, status: KitchenStatus) {
  const order = await getOrderOrThrow(orderId);
  if (order.paymentStatus !== "PAID") {
    throw new HttpError(409, "Pedido só pode avançar na fila após confirmação de pagamento");
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: { items: { include: { product: true } }, address: true, payments: true, customer: true },
  });
  emitOrderUpdated(updated);
  return updated;
}

// Fila do painel: tudo que já está pago, ordenado do mais antigo pro mais novo.
export async function listKitchenQueue() {
  return prisma.order.findMany({
    where: { paymentStatus: "PAID", status: { not: "COMPLETED" } },
    include: { items: { include: { product: true } }, address: true, payments: true, customer: true },
    orderBy: { createdAt: "asc" },
  });
}

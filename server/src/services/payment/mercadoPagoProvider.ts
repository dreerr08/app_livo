import { MercadoPagoConfig, Payment } from "mercadopago";
import { env } from "../../env.js";
import type {
  CardChargeInput,
  CardChargeResult,
  PaymentProvider,
  PixChargeInput,
  PixChargeResult,
} from "./paymentProvider.js";

const client = new MercadoPagoConfig({ accessToken: env.MERCADOPAGO_ACCESS_TOKEN });
const paymentApi = new Payment(client);

const notificationUrl = `${env.PUBLIC_BASE_URL}/webhooks/mercadopago`;

function splitName(fullName: string) {
  const [first, ...rest] = fullName.trim().split(/\s+/);
  return { first_name: first, last_name: rest.join(" ") || first };
}

export class MercadoPagoProvider implements PaymentProvider {
  async createPixCharge(input: PixChargeInput): Promise<PixChargeResult> {
    const { first_name, last_name } = splitName(input.payerName);

    const result = await paymentApi.create({
      body: {
        transaction_amount: input.amount,
        description: input.description,
        payment_method_id: "pix",
        payer: { email: input.payerEmail, first_name, last_name },
        external_reference: input.orderId,
        notification_url: notificationUrl,
      },
    });

    const txData = result.point_of_interaction?.transaction_data;
    if (!result.id || !txData?.qr_code || !txData?.qr_code_base64) {
      throw new Error("Mercado Pago não retornou os dados de QR Code do Pix");
    }

    return {
      gatewayPaymentId: String(result.id),
      qrCode: txData.qr_code,
      qrCodeBase64: txData.qr_code_base64,
      copyPaste: txData.qr_code,
    };
  }

  async chargeCard(input: CardChargeInput): Promise<CardChargeResult> {
    const result = await paymentApi.create({
      body: {
        transaction_amount: input.amount,
        description: input.description,
        token: input.cardToken,
        payment_method_id: input.paymentMethodId,
        installments: input.installments,
        payer: { email: input.payerEmail },
        external_reference: input.orderId,
        notification_url: notificationUrl,
      },
    });

    if (!result.id || !result.status) {
      throw new Error("Mercado Pago não retornou o resultado da cobrança de cartão");
    }

    const status: CardChargeResult["status"] =
      result.status === "approved" ? "approved" : result.status === "in_process" ? "in_process" : "rejected";

    return {
      gatewayPaymentId: String(result.id),
      status,
      statusDetail: result.status_detail ?? "",
    };
  }

  parseWebhook(payload: unknown): { gatewayPaymentId: string } | null {
    const body = payload as Record<string, unknown> | null;
    if (!body) return null;

    // Formato atual: { type: "payment", data: { id: "123" } }
    if (body.type === "payment" && typeof body.data === "object" && body.data !== null) {
      const id = (body.data as Record<string, unknown>).id;
      if (id) return { gatewayPaymentId: String(id) };
    }

    // Formato legado: { topic: "payment", id: "123" }
    if (body.topic === "payment" && body.id) {
      return { gatewayPaymentId: String(body.id) };
    }

    return null;
  }

  async getPaymentStatus(gatewayPaymentId: string) {
    const result = await paymentApi.get({ id: gatewayPaymentId });
    switch (result.status) {
      case "approved":
        return "approved" as const;
      case "refunded":
      case "charged_back":
        return "refunded" as const;
      case "cancelled":
        return "cancelled" as const;
      case "rejected":
        return "rejected" as const;
      default:
        return "pending" as const;
    }
  }
}

export const paymentProvider: PaymentProvider = new MercadoPagoProvider();

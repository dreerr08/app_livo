import type {
  CardChargeInput,
  CardChargeResult,
  PaymentProvider,
  PixChargeInput,
  PixChargeResult,
} from "./paymentProvider.js";

// Provider em memória usado nos testes automatizados, para não depender
// de rede/credenciais reais do Mercado Pago. Convenções para os testes
// simularem cada cenário:
//   - chargeCard: cardToken "tok_reject" → recusado; qualquer outro → aprovado
//   - createPixCharge: fica "pending" até o teste chamar __setStatus(id, "approved")
type Status = "pending" | "approved" | "rejected" | "refunded" | "cancelled";

const statuses = new Map<string, Status>();
let counter = 0;

export class FakePaymentProvider implements PaymentProvider {
  async createPixCharge(input: PixChargeInput): Promise<PixChargeResult> {
    const id = `fake_pix_${++counter}_${input.orderId}`;
    statuses.set(id, "pending");
    return { gatewayPaymentId: id, qrCode: "00020126-fake-pix", qrCodeBase64: "ZmFrZQ==", copyPaste: "00020126-fake-pix" };
  }

  async chargeCard(input: CardChargeInput): Promise<CardChargeResult> {
    const id = `fake_card_${++counter}_${input.orderId}`;
    const approved = input.cardToken !== "tok_reject";
    statuses.set(id, approved ? "approved" : "rejected");
    return {
      gatewayPaymentId: id,
      status: approved ? "approved" : "rejected",
      statusDetail: approved ? "accredited" : "cc_rejected_other_reason",
    };
  }

  parseWebhook(payload: unknown): { gatewayPaymentId: string } | null {
    const body = payload as Record<string, unknown> | null;
    if (body?.type === "payment" && typeof body.data === "object" && body.data !== null) {
      const id = (body.data as Record<string, unknown>).id;
      if (id) return { gatewayPaymentId: String(id) };
    }
    return null;
  }

  async getPaymentStatus(gatewayPaymentId: string) {
    return statuses.get(gatewayPaymentId) ?? "pending";
  }

  __setStatus(gatewayPaymentId: string, status: Status) {
    statuses.set(gatewayPaymentId, status);
  }

  __reset() {
    statuses.clear();
    counter = 0;
  }
}

export const fakePaymentProvider = new FakePaymentProvider();

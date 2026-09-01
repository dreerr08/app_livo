// Interface do gateway de pagamento. Manter a integração atrás desta
// interface permite trocar de gateway (Mercado Pago, Asaas, Pagar.me...)
// sem alterar o restante do sistema.

export type PixChargeInput = {
  orderId: string;
  amount: number;
  description: string;
  payerEmail: string;
  payerName: string;
};

export type PixChargeResult = {
  gatewayPaymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  copyPaste: string;
};

export type CardChargeInput = {
  orderId: string;
  amount: number;
  description: string;
  payerEmail: string;
  cardToken: string;
  paymentMethodId: string; // ex: "visa", "master" — vem do formulário/SDK de checkout do front-end
  installments: number;
};

export type CardChargeResult = {
  gatewayPaymentId: string;
  status: "approved" | "in_process" | "rejected";
  statusDetail: string;
};

export interface PaymentProvider {
  createPixCharge(input: PixChargeInput): Promise<PixChargeResult>;
  chargeCard(input: CardChargeInput): Promise<CardChargeResult>;
  /** Normaliza a notificação de webhook do gateway para o payment_id afetado. */
  parseWebhook(payload: unknown): { gatewayPaymentId: string } | null;
  /** Consulta o status atual de um pagamento diretamente no gateway. */
  getPaymentStatus(gatewayPaymentId: string): Promise<"pending" | "approved" | "rejected" | "refunded" | "cancelled">;
}

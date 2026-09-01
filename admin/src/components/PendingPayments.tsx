import type { Order } from "../lib/types";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Aguardando confirmação",
  REFUSED: "Recusado",
  REFUNDED: "Estornado",
  CANCELLED: "Cancelado",
};

// Pedidos com pagamento pendente ficam destacados e fora da fila de
// preparo — o operador nunca deve começar a preparar algo não pago.
export function PendingPayments({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return null;

  return (
    <section className="pending-payments">
      <h2>Aguardando confirmação de pagamento ({orders.length})</h2>
      <div className="pending-list">
        {orders.map((order) => (
          <div key={order.id} className="order-card pending">
            <div className="row">
              <strong>#{order.id.slice(-6)}</strong>
              <span className="badge warn">{STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}</span>
            </div>
            <p className="muted">{order.customer.name}</p>
            <p className="muted">{order.payments[0]?.method === "PIX" ? "Pix" : "Cartão de crédito"}</p>
            <strong>R$ {Number(order.total).toFixed(2)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

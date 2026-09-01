import type { Order, OrderStatus } from "../lib/types";

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: "RECEIVED", label: "Novo" },
  { status: "PREPARING", label: "Em preparo" },
  { status: "READY", label: "Pronto" },
];

const OUT_COLUMN_LABEL = "Saiu p/ entrega / Aguardando retirada";

function nextStatus(order: Order): OrderStatus | null {
  switch (order.status) {
    case "RECEIVED":
      return "PREPARING";
    case "PREPARING":
      return "READY";
    case "READY":
      return order.deliveryMode === "DELIVERY" ? "OUT_FOR_DELIVERY" : "AWAITING_PICKUP";
    case "OUT_FOR_DELIVERY":
    case "AWAITING_PICKUP":
      return "COMPLETED";
    default:
      return null;
  }
}

function nextLabel(order: Order): string {
  const next = nextStatus(order);
  return next === "COMPLETED" ? "Concluir" : "Avançar";
}

function OrderCard({ order, onAdvance }: { order: Order; onAdvance: (id: string, status: OrderStatus) => void }) {
  const next = nextStatus(order);
  return (
    <div className="order-card">
      <div className="order-card-header">
        <strong>#{order.id.slice(-6)}</strong>
        <span className={`chip ${order.deliveryMode === "DELIVERY" ? "chip-delivery" : "chip-pickup"}`}>
          {order.deliveryMode === "DELIVERY" ? "Entrega" : "Retirada"}
        </span>
      </div>
      <p className="muted">{order.customer.name} — {order.customer.phone}</p>
      <ul>
        {order.items.map((item) => (
          <li key={item.id}>
            {item.quantity}x {item.product.name}
          </li>
        ))}
      </ul>
      {order.deliveryMode === "DELIVERY" && order.address && (
        <p className="muted">
          {order.address.street}, {order.address.number} — {order.address.neighborhood}
        </p>
      )}
      <div className="row">
        <strong>R$ {Number(order.total).toFixed(2)}</strong>
        {next && <button onClick={() => onAdvance(order.id, next)}>{nextLabel(order)}</button>}
      </div>
    </div>
  );
}

export function KanbanBoard({ orders, onAdvance }: { orders: Order[]; onAdvance: (id: string, status: OrderStatus) => void }) {
  const outColumnOrders = orders.filter((o) => o.status === "OUT_FOR_DELIVERY" || o.status === "AWAITING_PICKUP");

  return (
    <div className="kanban">
      {COLUMNS.map((col) => (
        <div key={col.status} className="kanban-column">
          <h3>{col.label}</h3>
          {orders
            .filter((o) => o.status === col.status)
            .map((order) => (
              <OrderCard key={order.id} order={order} onAdvance={onAdvance} />
            ))}
        </div>
      ))}
      <div className="kanban-column">
        <h3>{OUT_COLUMN_LABEL}</h3>
        {outColumnOrders.map((order) => (
          <OrderCard key={order.id} order={order} onAdvance={onAdvance} />
        ))}
      </div>
    </div>
  );
}

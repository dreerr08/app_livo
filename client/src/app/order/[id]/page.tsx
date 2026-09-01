"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import { socket, joinOrderRoom } from "../../../lib/socket";
import type { Order, OrderStatus } from "../../../lib/types";

const DELIVERY_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "RECEIVED", label: "Recebido" },
  { status: "PREPARING", label: "Em preparo" },
  { status: "READY", label: "Pronto" },
  { status: "OUT_FOR_DELIVERY", label: "Saiu para entrega" },
  { status: "COMPLETED", label: "Concluído" },
];

const PICKUP_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "RECEIVED", label: "Recebido" },
  { status: "PREPARING", label: "Em preparo" },
  { status: "READY", label: "Pronto" },
  { status: "AWAITING_PICKUP", label: "Aguardando retirada" },
  { status: "COMPLETED", label: "Concluído" },
];

export default function OrderTrackingPage({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Order>(`/orders/${params.id}`, { token })
      .then(setOrder)
      .catch((err) => setError(err instanceof Error ? err.message : "Pedido não encontrado"));

    joinOrderRoom(params.id);
    const handler = (updated: Order) => setOrder(updated);
    socket.on("order:updated", handler);
    return () => {
      socket.off("order:updated", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (error) {
    return (
      <main>
        <p className="error">{error}</p>
        <Link href="/">Voltar ao cardápio</Link>
      </main>
    );
  }

  if (!order) return <p className="muted">Carregando pedido...</p>;

  const steps = order.deliveryMode === "DELIVERY" ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentIndex = steps.findIndex((s) => s.status === order.status);
  const pixPayment = order.payments.find((p) => p.method === "PIX");

  function copyPix() {
    if (!pixPayment?.pixCopyPaste) return;
    navigator.clipboard.writeText(pixPayment.pixCopyPaste).then(() => setCopied(true));
  }

  return (
    <main>
      <h1>Pedido #{order.id.slice(-6)}</h1>

      {order.paymentStatus === "PENDING" && pixPayment && (
        <div className="card qr-box">
          <p>
            <strong>Aguardando pagamento via Pix</strong>
          </p>
          {pixPayment.pixQrCodeBase64 && (
            <img src={`data:image/png;base64,${pixPayment.pixQrCodeBase64}`} alt="QR Code Pix" />
          )}
          <button onClick={copyPix}>{copied ? "Copiado!" : "Copiar código Pix"}</button>
          <p className="muted">O status muda automaticamente assim que o pagamento for confirmado.</p>
        </div>
      )}

      {(order.status === "CANCELLED") && (
        <p className="error">
          Pedido cancelado {order.paymentStatus === "REFUSED" ? "— pagamento recusado." : "."}
        </p>
      )}

      {order.status !== "CANCELLED" && order.paymentStatus === "PAID" && (
        <div className="status-timeline">
          {steps.map((step, i) => (
            <div
              key={step.status}
              className={`status-step ${i === currentIndex ? "active" : i < currentIndex ? "done" : ""}`}
            >
              {step.label}
            </div>
          ))}
        </div>
      )}

      <h2>Itens</h2>
      <div className="card">
        {order.items.map((item) => (
          <div key={item.id} className="row">
            <span>
              {item.quantity}x {item.product.name}
            </span>
            <span>R$ {Number(item.subtotal).toFixed(2)}</span>
          </div>
        ))}
        <div className="row">
          <span>Frete</span>
          <span>R$ {Number(order.deliveryFee).toFixed(2)}</span>
        </div>
        <div className="row">
          <strong>Total</strong>
          <strong>R$ {Number(order.total).toFixed(2)}</strong>
        </div>
      </div>

      {order.deliveryMode === "DELIVERY" && order.address && (
        <p className="muted">
          Entrega em: {order.address.street}, {order.address.number} — {order.address.neighborhood}
        </p>
      )}
      {order.deliveryMode === "PICKUP" && <p className="muted">Retirada no local.</p>}

      <Link href="/orders">Ver meus pedidos</Link>
    </main>
  );
}

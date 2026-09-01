"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useCart } from "../../lib/cart";
import type { Order } from "../../lib/types";

const STATUS_LABELS: Record<string, string> = {
  AWAITING_PAYMENT: "Aguardando pagamento",
  RECEIVED: "Recebido",
  PREPARING: "Em preparo",
  READY: "Pronto",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  AWAITING_PICKUP: "Aguardando retirada",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export default function OrdersHistoryPage() {
  const { token, customer } = useAuth();
  const { addItem } = useCart();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Order[]>("/me/orders", { token }).then(setOrders);
  }, [token]);

  if (!customer) {
    return (
      <main>
        <h1>Meus pedidos</h1>
        <p>Entre para ver seu histórico de pedidos.</p>
        <Link href="/login?redirect=/orders" className="btn">
          Entrar
        </Link>
      </main>
    );
  }

  function repeatOrder(order: Order) {
    for (const item of order.items) {
      addItem(
        { productId: item.productId, name: item.product.name, price: Number(item.unitPrice), photoUrl: item.product.photoUrl },
        item.quantity
      );
    }
    router.push("/cart");
  }

  return (
    <main>
      <h1>Meus pedidos</h1>
      {!orders && <p className="muted">Carregando...</p>}
      {orders?.length === 0 && <p className="muted">Você ainda não fez nenhum pedido.</p>}

      {orders?.map((order) => (
        <div key={order.id} className="card">
          <div className="row">
            <strong>#{order.id.slice(-6)}</strong>
            <span className="muted">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
          </div>
          <p>{STATUS_LABELS[order.status] ?? order.status}</p>
          <div className="row">
            <span>R$ {Number(order.total).toFixed(2)}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/order/${order.id}`}>Ver detalhes</Link>
              <button onClick={() => repeatOrder(order)}>Repetir pedido</button>
            </div>
          </div>
        </div>
      ))}
    </main>
  );
}

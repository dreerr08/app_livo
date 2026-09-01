import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { connectAsRestaurant, socket } from "./socket";
import type { Order } from "./types";

// Mantém a fila de preparo e os pedidos aguardando pagamento sincronizados
// em tempo real via WebSocket (Épico 9/10), com a lista inicial vindo da API.
export function useOrders() {
  const [queue, setQueue] = useState<Order[]>([]);
  const [pending, setPending] = useState<Order[]>([]);

  useEffect(() => {
    apiFetch<Order[]>("/orders/queue").then(setQueue);
    apiFetch<Order[]>("/orders/pending-payment").then(setPending);

    connectAsRestaurant();

    function upsert(list: Order[], order: Order) {
      const exists = list.some((o) => o.id === order.id);
      return exists ? list.map((o) => (o.id === order.id ? order : o)) : [...list, order];
    }

    function handleOrder(order: Order) {
      if (order.paymentStatus === "PENDING") {
        setPending((prev) => upsert(prev, order));
        setQueue((prev) => prev.filter((o) => o.id !== order.id));
        return;
      }

      setPending((prev) => prev.filter((o) => o.id !== order.id));

      if (order.paymentStatus === "PAID" && order.status !== "COMPLETED") {
        setQueue((prev) => upsert(prev, order));
      } else {
        // pago mas concluído, ou recusado/estornado/cancelado: sai da fila
        setQueue((prev) => prev.filter((o) => o.id !== order.id));
      }
    }

    socket.on("order:created", handleOrder);
    socket.on("order:updated", handleOrder);

    return () => {
      socket.off("order:created", handleOrder);
      socket.off("order:updated", handleOrder);
    };
  }, []);

  async function updateStatus(orderId: string, status: string) {
    const updated = await apiFetch<Order>(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setQueue((prev) => (updated.status === "COMPLETED" ? prev.filter((o) => o.id !== orderId) : prev.map((o) => (o.id === orderId ? updated : o))));
  }

  return { queue, pending, updateStatus };
}

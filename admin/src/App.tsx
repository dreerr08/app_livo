import { useEffect, useState } from "react";
import { connectAsRestaurant, socket } from "./lib/socket.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

type Order = { id: string; status: string; total: string };

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/orders/queue`)
      .then((r) => r.json())
      .then(setOrders)
      .catch(() => setOrders([]));

    connectAsRestaurant();
    socket.on("order:created", (order: Order) => setOrders((prev) => [...prev, order]));
    socket.on("order:updated", (order: Order) =>
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)))
    );

    return () => {
      socket.off("order:created");
      socket.off("order:updated");
      socket.disconnect();
    };
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>Painel App LIVO</h1>
      <p>Fila de pedidos pagos (tempo real via WebSocket):</p>
      {orders.length === 0 && <p>Nenhum pedido na fila.</p>}
      <ul>
        {orders.map((order) => (
          <li key={order.id}>
            #{order.id.slice(-6)} — {order.status} — R$ {order.total}
          </li>
        ))}
      </ul>
    </main>
  );
}

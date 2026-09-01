import { useState } from "react";
import { KanbanBoard } from "./components/KanbanBoard";
import { PendingPayments } from "./components/PendingPayments";
import { MenuManager } from "./components/MenuManager";
import { DeliveryZonesManager } from "./components/DeliveryZonesManager";
import { useOrders } from "./lib/useOrders";

type Tab = "queue" | "menu" | "zones";

export default function App() {
  const [tab, setTab] = useState<Tab>("queue");
  const { queue, pending, updateStatus } = useOrders();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Painel App LIVO</h1>
        <nav className="tabs">
          <button className={tab === "queue" ? "active" : ""} onClick={() => setTab("queue")}>
            Fila de pedidos
          </button>
          <button className={tab === "menu" ? "active" : ""} onClick={() => setTab("menu")}>
            Cardápio
          </button>
          <button className={tab === "zones" ? "active" : ""} onClick={() => setTab("zones")}>
            Zonas de entrega
          </button>
        </nav>
      </header>

      <main>
        {tab === "queue" && (
          <>
            <PendingPayments orders={pending} />
            <KanbanBoard orders={queue} onAdvance={updateStatus} />
          </>
        )}
        {tab === "menu" && <MenuManager />}
        {tab === "zones" && <DeliveryZonesManager />}
      </main>
    </div>
  );
}

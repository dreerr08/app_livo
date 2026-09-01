import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import type { DeliveryZone } from "../lib/types";

const emptyForm = { name: "", cepPrefixes: "", fee: "", freeShippingThreshold: "" };

export function DeliveryZonesManager() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    apiFetch<DeliveryZone[]>("/delivery-zones").then(setZones);
  }

  useEffect(reload, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch("/delivery-zones", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          cepPrefixes: form.cepPrefixes.split(",").map((p) => p.trim()).filter(Boolean),
          fee: Number(form.fee),
          freeShippingThreshold: form.freeShippingThreshold ? Number(form.freeShippingThreshold) : undefined,
        }),
      });
      setForm(emptyForm);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar zona");
    }
  }

  async function toggleActive(zone: DeliveryZone) {
    await apiFetch(`/delivery-zones/${zone.id}`, { method: "PUT", body: JSON.stringify({ active: !zone.active }) });
    reload();
  }

  return (
    <div className="two-columns">
      <div>
        <h2>Nova zona de entrega</h2>
        <form onSubmit={handleSubmit} className="card">
          <input placeholder="Nome (ex: Centro)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input
            placeholder="Prefixos de CEP, separados por vírgula (ex: 01310, 01311)"
            value={form.cepPrefixes}
            onChange={(e) => setForm({ ...form, cepPrefixes: e.target.value })}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Taxa de entrega (R$)"
            value={form.fee}
            onChange={(e) => setForm({ ...form, fee: e.target.value })}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Piso de frete grátis (R$, opcional)"
            value={form.freeShippingThreshold}
            onChange={(e) => setForm({ ...form, freeShippingThreshold: e.target.value })}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit">Cadastrar zona</button>
        </form>
      </div>

      <div>
        <h2>Zonas cadastradas ({zones.length})</h2>
        {zones.map((zone) => (
          <div key={zone.id} className={`card ${zone.active ? "" : "unavailable"}`}>
            <div className="row">
              <strong>{zone.name}</strong>
              <span>R$ {Number(zone.fee).toFixed(2)}</span>
            </div>
            <p className="muted">CEPs: {zone.cepPrefixes.join(", ")}</p>
            {zone.freeShippingThreshold && (
              <p className="muted">Frete grátis acima de R$ {Number(zone.freeShippingThreshold).toFixed(2)}</p>
            )}
            <label>
              <input type="checkbox" checked={zone.active} onChange={() => toggleActive(zone)} /> Ativa
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

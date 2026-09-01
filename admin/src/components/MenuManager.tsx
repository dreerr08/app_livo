import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiFetch, uploadFile } from "../lib/api";
import type { Product } from "../lib/types";

const emptyForm = {
  name: "",
  description: "",
  photoUrl: "",
  price: "",
  type: "AVULSO" as "AVULSO" | "COMBO",
  category: "",
  calories: "",
  weightGrams: "",
  ingredients: "",
};

export function MenuManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [comboItemIds, setComboItemIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reload() {
    apiFetch<Product[]>("/products").then(setProducts);
  }

  useEffect(reload, []);

  const avulsos = products.filter((p) => p.type === "AVULSO");

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      photoUrl: product.photoUrl ?? "",
      price: product.price,
      type: product.type,
      category: product.category ?? "",
      calories: product.calories?.toString() ?? "",
      weightGrams: product.weightGrams?.toString() ?? "",
      ingredients: product.ingredients.join("\n"),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setComboItemIds([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadFile("/uploads/product-photo", file, "photo");
      setForm((prev) => ({ ...prev, photoUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar a foto");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      description: form.description || undefined,
      photoUrl: form.photoUrl || undefined,
      price: Number(form.price),
      type: form.type,
      category: form.category || undefined,
      calories: form.calories ? Number(form.calories) : undefined,
      weightGrams: form.weightGrams ? Number(form.weightGrams) : undefined,
      ingredients: form.ingredients
        .split("\n")
        .map((i) => i.trim())
        .filter(Boolean),
      comboItems: form.type === "COMBO" ? comboItemIds.map((itemId) => ({ itemId, quantity: 1 })) : undefined,
    };

    try {
      if (editingId) {
        await apiFetch(`/products/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/products", { method: "POST", body: JSON.stringify(payload) });
      }
      resetForm();
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar produto");
    }
  }

  async function toggleAvailability(product: Product) {
    await apiFetch(`/products/${product.id}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ isAvailable: !product.isAvailable }),
    });
    reload();
  }

  async function togglePublished(product: Product) {
    await apiFetch(`/products/${product.id}/published`, {
      method: "PATCH",
      body: JSON.stringify({ isPublished: !product.isPublished }),
    });
    reload();
  }

  async function remove(product: Product) {
    if (!confirm(`Remover "${product.name}"?`)) return;
    await apiFetch(`/products/${product.id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="two-columns">
      <div>
        <h2>{editingId ? "Editar item" : "Novo item"}</h2>
        <form onSubmit={handleSubmit} className="card">
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <label className="muted">Foto</label>
          {form.photoUrl && <img src={form.photoUrl} alt="Prévia" className="photo-preview" />}
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} />
          {uploading && <p className="muted">Enviando foto...</p>}

          <input
            type="number"
            step="0.01"
            placeholder="Preço"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
          <input placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "AVULSO" | "COMBO" })}>
            <option value="AVULSO">Marmita avulsa</option>
            <option value="COMBO">Combo (kit fixo)</option>
          </select>

          <div className="row">
            <input
              type="number"
              placeholder="Calorias (kcal)"
              value={form.calories}
              onChange={(e) => setForm({ ...form, calories: e.target.value })}
            />
            <input
              type="number"
              placeholder="Peso (g)"
              value={form.weightGrams}
              onChange={(e) => setForm({ ...form, weightGrams: e.target.value })}
            />
          </div>

          <label className="muted">Ingredientes (um por linha)</label>
          <textarea
            rows={4}
            placeholder={"Frango\nArroz\nFeijão"}
            value={form.ingredients}
            onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
          />

          {form.type === "COMBO" && !editingId && (
            <div>
              <p className="muted">Marmitas que compõem o combo:</p>
              {avulsos.map((item) => (
                <label key={item.id} style={{ display: "block" }}>
                  <input
                    type="checkbox"
                    checked={comboItemIds.includes(item.id)}
                    onChange={(e) =>
                      setComboItemIds((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                    }
                  />{" "}
                  {item.name}
                </label>
              ))}
            </div>
          )}

          {error && <p className="error">{error}</p>}

          {!editingId && (
            <p className="muted">
              O item nasce como <strong>rascunho</strong> — só você vê aqui no painel. Publique quando estiver pronto para o
              cliente ver no app.
            </p>
          )}

          <div className="row" style={{ marginTop: 8 }}>
            <button type="submit" disabled={uploading}>
              {editingId ? "Salvar alterações" : "Cadastrar"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div>
        <h2>Cardápio ({products.length})</h2>
        {products.map((product) => (
          <div key={product.id} className={`card ${product.isAvailable ? "" : "unavailable"}`}>
            <div className="row">
              {product.photoUrl && <img src={product.photoUrl} alt={product.name} className="thumb" />}
              <div style={{ flex: 1 }}>
                <strong>
                  {product.name} {product.type === "COMBO" && <span className="badge">combo</span>}
                  {!product.isPublished && <span className="badge warn">rascunho</span>}
                </strong>
                {(product.calories || product.weightGrams) && (
                  <p className="muted">
                    {product.calories ? `${product.calories} kcal` : ""}
                    {product.calories && product.weightGrams ? " · " : ""}
                    {product.weightGrams ? `${product.weightGrams}g` : ""}
                  </p>
                )}
              </div>
              <span>R$ {Number(product.price).toFixed(2)}</span>
            </div>
            <div className="row">
              <div style={{ display: "flex", gap: 12 }}>
                <label>
                  <input type="checkbox" checked={product.isAvailable} onChange={() => toggleAvailability(product)} /> Disponível
                </label>
                <label>
                  <input type="checkbox" checked={product.isPublished} onChange={() => togglePublished(product)} /> Publicado
                </label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => startEdit(product)}>Editar</button>
                <button onClick={() => remove(product)}>Remover</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useCart } from "../lib/cart";
import type { Product } from "../lib/types";

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    apiFetch<Product[]>("/products")
      .then(setProducts)
      .catch(() => setError("Não foi possível carregar o cardápio. Tente novamente em instantes."));
  }, []);

  return (
    <main>
      <h1>Cardápio</h1>
      {error && <p className="error">{error}</p>}
      {!products && !error && <p className="muted">Carregando...</p>}
      {products?.length === 0 && <p className="muted">Nenhum item disponível no momento.</p>}

      {products?.map((product) => (
        <article key={product.id} className={`card ${product.isAvailable ? "" : "unavailable"}`}>
          {product.photoUrl && <img src={product.photoUrl} alt={product.name} />}
          <div className="row">
            <h3>
              {product.name}
              {product.type === "COMBO" && <span className="badge">combo</span>}
              {!product.isAvailable && <span className="badge warn">esgotado</span>}
            </h3>
          </div>
          {product.description && <p className="muted">{product.description}</p>}
          {product.type === "COMBO" && product.comboItems && product.comboItems.length > 0 && (
            <ul className="muted">
              {product.comboItems.map((ci) => (
                <li key={ci.id}>
                  {ci.quantity}x {ci.item.name}
                </li>
              ))}
            </ul>
          )}
          <div className="row">
            <span className="price">R$ {Number(product.price).toFixed(2)}</span>
            <button
              disabled={!product.isAvailable}
              onClick={() =>
                addItem({ productId: product.id, name: product.name, price: Number(product.price), photoUrl: product.photoUrl })
              }
            >
              Adicionar
            </button>
          </div>
        </article>
      ))}
    </main>
  );
}

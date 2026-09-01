"use client";

import Link from "next/link";
import { useCart } from "../../lib/cart";

export default function CartPage() {
  const { items, setQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <main>
        <h1>Carrinho</h1>
        <p className="muted">Seu carrinho está vazio.</p>
        <Link href="/" className="btn">
          Ver cardápio
        </Link>
      </main>
    );
  }

  return (
    <main>
      <h1>Carrinho</h1>
      {items.map((item) => (
        <div key={item.productId} className="card">
          <div className="row">
            <strong>{item.name}</strong>
            <button className="link-button" onClick={() => removeItem(item.productId)}>
              remover
            </button>
          </div>
          <div className="row">
            <span>R$ {item.price.toFixed(2)}</span>
            <div className="qty-controls">
              <button onClick={() => setQuantity(item.productId, item.quantity - 1)}>-</button>
              <span>{item.quantity}</span>
              <button onClick={() => setQuantity(item.productId, item.quantity + 1)}>+</button>
            </div>
          </div>
        </div>
      ))}

      <div className="card row">
        <strong>Subtotal</strong>
        <strong>R$ {subtotal.toFixed(2)}</strong>
      </div>

      <Link href="/checkout" className="btn" style={{ display: "block", textAlign: "center", marginTop: 16 }}>
        Ir para o checkout
      </Link>
    </main>
  );
}

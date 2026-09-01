"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";

export function NavBar() {
  const { customer, logout } = useAuth();
  const { items } = useCart();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <nav className="navbar">
      <Link href="/" className="brand">
        App LIVO
      </Link>
      <div className="nav-links">
        <Link href="/cart">Carrinho{totalItems > 0 ? ` (${totalItems})` : ""}</Link>
        {customer ? (
          <>
            <Link href="/orders">Meus pedidos</Link>
            <button onClick={logout} className="link-button">
              Sair ({customer.name})
            </button>
          </>
        ) : (
          <Link href="/login">Entrar</Link>
        )}
      </div>
    </nav>
  );
}

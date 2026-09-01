"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useCart } from "../../lib/cart";
import type { Address, Order } from "../../lib/types";

type Quote = { subtotal: number; deliveryFee: number; total: number };

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export default function CheckoutPage() {
  const { token, customer } = useAuth();
  const { items, subtotal, clear } = useCart();
  const router = useRouter();

  const [deliveryMode, setDeliveryMode] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "", installments: 1 });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<Address[]>("/me/addresses", { token }).then((list) => {
      setAddresses(list);
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def) setSelectedAddressId(def.id);
      else setShowNewAddress(true);
    });
  }, [token]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const cepForQuote = deliveryMode === "DELIVERY" ? selectedAddress?.cep : undefined;

  useEffect(() => {
    if (items.length === 0) return;
    if (deliveryMode === "DELIVERY" && !cepForQuote) {
      setQuote(null);
      return;
    }
    setQuoteError(null);
    apiFetch<Quote>("/orders/quote", {
      method: "POST",
      body: JSON.stringify({
        deliveryMode,
        cep: cepForQuote,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }),
    })
      .then(setQuote)
      .catch((err) => {
        setQuote(null);
        setQuoteError(err instanceof Error ? err.message : "Não foi possível calcular o frete");
      });
  }, [deliveryMode, cepForQuote, items]);

  async function handleAddAddress(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const address = await apiFetch<Address>("/addresses", {
      method: "POST",
      token,
      body: JSON.stringify({ ...newAddress, isDefault: addresses.length === 0 }),
    });
    setAddresses((prev) => [address, ...prev]);
    setSelectedAddressId(address.id);
    setShowNewAddress(false);
  }

  async function handleSubmit() {
    if (!token) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const order = await apiFetch<Order>("/orders", {
        method: "POST",
        token,
        body: JSON.stringify({
          deliveryMode,
          addressId: deliveryMode === "DELIVERY" ? selectedAddressId : undefined,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          paymentMethod,
          card:
            paymentMethod === "CREDIT_CARD"
              ? {
                  // TODO: tokenização real do cartão deve ser feita no front-end
                  // com o SDK do Mercado Pago (Checkout Bricks) antes de ir para
                  // produção — nunca envie o número do cartão para o nosso
                  // backend. Este stub existe só para exercitar o fluxo de ponta
                  // a ponta enquanto não há uma conta Mercado Pago real conectada.
                  token: onlyDigits(card.number).startsWith("0000") ? "tok_reject" : "tok_stub",
                  paymentMethodId: "visa",
                  installments: card.installments,
                }
              : undefined,
        }),
      });
      clear();
      router.push(`/order/${order.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Não foi possível concluir o pedido");
    } finally {
      setSubmitting(false);
    }
  }

  if (!customer) {
    return (
      <main>
        <h1>Checkout</h1>
        <p>Você precisa entrar para finalizar o pedido.</p>
        <Link href="/login?redirect=/checkout" className="btn">
          Entrar
        </Link>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main>
        <h1>Checkout</h1>
        <p className="muted">Seu carrinho está vazio.</p>
        <Link href="/" className="btn">
          Ver cardápio
        </Link>
      </main>
    );
  }

  const canSubmit = deliveryMode === "PICKUP" ? true : !!selectedAddressId && !!quote;

  return (
    <main>
      <h1>Checkout</h1>

      <h2>Como você quer receber?</h2>
      <div className="tabs">
        <button className={deliveryMode === "DELIVERY" ? "active" : ""} onClick={() => setDeliveryMode("DELIVERY")}>
          Entrega
        </button>
        <button className={deliveryMode === "PICKUP" ? "active" : ""} onClick={() => setDeliveryMode("PICKUP")}>
          Retirar no local
        </button>
      </div>

      {deliveryMode === "PICKUP" && (
        <p className="muted card">Retirada sem custo de frete. Endereço e horário do restaurante serão exibidos na confirmação.</p>
      )}

      {deliveryMode === "DELIVERY" && (
        <>
          <h2>Endereço de entrega</h2>
          {addresses.map((a) => (
            <label key={a.id} className="card row">
              <span>
                {a.street}, {a.number} — {a.neighborhood}, {a.city}/{a.state} ({a.cep})
              </span>
              <input
                type="radio"
                name="address"
                checked={selectedAddressId === a.id}
                onChange={() => setSelectedAddressId(a.id)}
              />
            </label>
          ))}

          {!showNewAddress && (
            <button onClick={() => setShowNewAddress(true)}>+ Novo endereço</button>
          )}

          {showNewAddress && (
            <form onSubmit={handleAddAddress} className="card">
              <input
                placeholder="CEP"
                value={newAddress.cep}
                onChange={(e) => setNewAddress({ ...newAddress, cep: e.target.value })}
                required
              />
              <input
                placeholder="Rua"
                value={newAddress.street}
                onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                required
              />
              <input
                placeholder="Número"
                value={newAddress.number}
                onChange={(e) => setNewAddress({ ...newAddress, number: e.target.value })}
                required
              />
              <input
                placeholder="Complemento (opcional)"
                value={newAddress.complement}
                onChange={(e) => setNewAddress({ ...newAddress, complement: e.target.value })}
              />
              <input
                placeholder="Bairro"
                value={newAddress.neighborhood}
                onChange={(e) => setNewAddress({ ...newAddress, neighborhood: e.target.value })}
                required
              />
              <input
                placeholder="Cidade"
                value={newAddress.city}
                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                required
              />
              <input
                placeholder="UF"
                maxLength={2}
                value={newAddress.state}
                onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value.toUpperCase() })}
                required
              />
              <button type="submit">Salvar endereço</button>
            </form>
          )}

          {quoteError && <p className="error">{quoteError}</p>}
        </>
      )}

      <h2>Resumo</h2>
      <div className="card">
        <div className="row">
          <span>Subtotal</span>
          <span>R$ {subtotal.toFixed(2)}</span>
        </div>
        <div className="row">
          <span>Frete</span>
          <span>{quote ? `R$ ${quote.deliveryFee.toFixed(2)}` : deliveryMode === "PICKUP" ? "R$ 0,00" : "—"}</span>
        </div>
        <div className="row">
          <strong>Total</strong>
          <strong>R$ {(quote?.total ?? subtotal).toFixed(2)}</strong>
        </div>
      </div>

      <h2>Pagamento</h2>
      <div className="tabs">
        <button className={paymentMethod === "PIX" ? "active" : ""} onClick={() => setPaymentMethod("PIX")}>
          Pix
        </button>
        <button className={paymentMethod === "CREDIT_CARD" ? "active" : ""} onClick={() => setPaymentMethod("CREDIT_CARD")}>
          Cartão de crédito
        </button>
      </div>

      {paymentMethod === "CREDIT_CARD" && (
        <div className="card">
          <input
            placeholder="Número do cartão"
            value={card.number}
            onChange={(e) => setCard({ ...card, number: e.target.value })}
          />
          <input placeholder="Nome no cartão" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
          <input placeholder="Validade MM/AA" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
          <input placeholder="CVV" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} />
          <p className="muted">
            Ambiente de demonstração: use um número que não comece em 0000 para simular aprovação.
          </p>
        </div>
      )}

      {submitError && <p className="error">{submitError}</p>}

      <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{ width: "100%" }}>
        {submitting ? "Processando..." : `Pagar R$ ${(quote?.total ?? subtotal).toFixed(2)}`}
      </button>
    </main>
  );
}

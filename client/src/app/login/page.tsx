"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";

export default function LoginPage() {
  const { requestOtp, verifyOtp } = useAuth();
  const router = useRouter();

  const [redirectTo, setRedirectTo] = useState("/checkout");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectTo(params.get("redirect") ?? "/checkout");
  }, []);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await requestOtp(phone);
      setDevCode(res.devCode);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar código");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(phone, code, name || undefined);
      router.push(redirectTo);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Código inválido";
      if (message.includes("Nome")) setNeedsName(true);
      else setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Entrar</h1>
      <p className="muted">Você pode navegar pelo cardápio sem login. O login é necessário só para fechar o pedido.</p>

      {error && <p className="error">{error}</p>}

      {step === "phone" && (
        <form onSubmit={handleRequest}>
          <input
            type="tel"
            placeholder="Telefone com DDD, ex: 11999998888"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Receber código"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerify}>
          {devCode && (
            <p className="muted">
              Ambiente de teste — código gerado: <strong>{devCode}</strong> (em produção isso chegaria por SMS)
            </p>
          )}
          <input
            inputMode="numeric"
            placeholder="Código de 6 dígitos"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            required
          />
          {needsName && (
            <input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      )}
    </main>
  );
}

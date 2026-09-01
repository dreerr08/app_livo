"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "./api";
import type { Customer } from "./types";

type AuthState = { token: string | null; customer: Customer | null };

type AuthContextValue = AuthState & {
  requestOtp: (phone: string) => Promise<{ devCode?: string }>;
  verifyOtp: (phone: string, code: string, name?: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "app-livo:auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, customer: null });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      // localStorage indisponível (modo privado etc.) — segue deslogado
    }
  }, []);

  function persist(next: AuthState) {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignora falha de persistência
    }
  }

  async function requestOtp(phone: string) {
    return apiFetch<{ sent: boolean; devCode?: string }>("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }

  async function verifyOtp(phone: string, code: string, name?: string) {
    const res = await apiFetch<{ token: string; customer: Customer }>("/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code, name }),
    });
    persist({ token: res.token, customer: res.customer });
  }

  function logout() {
    persist({ token: null, customer: null });
  }

  return <AuthContext.Provider value={{ ...state, requestOtp, verifyOtp, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa ser usado dentro de <AuthProvider>");
  return ctx;
}

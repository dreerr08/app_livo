const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

type FetchOptions = RequestInit & { token?: string | null };

export async function apiFetch<T>(path: string, init?: FetchOptions): Promise<T> {
  const { token, headers, ...rest } = init ?? {};
  const finalHeaders: Record<string, string> = { "Content-Type": "application/json", ...(headers as Record<string, string>) };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export { API_URL };

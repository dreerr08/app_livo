const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Upload de arquivo — não pode usar apiFetch, que sempre força
// Content-Type: application/json (multipart precisa do boundary que o
// próprio browser gera a partir do FormData).
export async function uploadFile(path: string, file: File, fieldName: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append(fieldName, file);
  const res = await fetch(`${API_URL}${path}`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Erro ${res.status}`);
  }
  return res.json();
}

export { API_URL };

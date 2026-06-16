// Cienki klient API: dokleja token (Bearer) do każdego żądania i parsuje JSON.
// Zapytania idą na /api/* — w dev przez proxy Vite na Workera, na produkcji ten sam origin.

import { getToken } from "./token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, `Request failed: ${res.status}`);
  }
  // 204 / brak treści
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

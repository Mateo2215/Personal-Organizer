// Token dostępu trzymany lokalnie w przeglądarce (decyzja auth v1: token zamiast logowania Google).

const KEY = "po_app_token";

export function getToken(): string | null {
  return localStorage.getItem(KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(KEY);
}

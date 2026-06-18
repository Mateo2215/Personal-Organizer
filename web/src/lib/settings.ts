// Ustawienia użytkownika trzymane lokalnie w przeglądarce (per urządzenie, $0 — bez backendu).
// Decyzja 2026-06-18: imię w localStorage, świadomie osobno na każdym urządzeniu.

const NAME_KEY = "po_user_name";

export function getName(): string {
  return localStorage.getItem(NAME_KEY)?.trim() ?? "";
}

export function setName(name: string): void {
  const trimmed = name.trim();
  if (trimmed) localStorage.setItem(NAME_KEY, trimmed);
  else localStorage.removeItem(NAME_KEY);
}

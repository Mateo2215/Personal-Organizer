// Model pomysłu + funkcje API. project_id = null → Ogólne (nieprzypisane).

import { api } from "./api";

// Priorytet: 1 = niski (domyślny), 2 = średni, 3 = wysoki. Wyższy = wyżej w grupie.
export type IdeaPriority = 1 | 2 | 3;
export const DEFAULT_PRIORITY: IdeaPriority = 1;

export interface Idea {
  id: number;
  content: string;
  project_id: number | null;
  priority: IdeaPriority;
  created_at: string;
}

// Metadane poziomów (etykieta + klasy Tailwind). Pełne nazwy klas — Tailwind musi je „zobaczyć" w źródle.
export interface PriorityMeta {
  value: IdeaPriority;
  label: string;
  dotClass: string; // kolorowa kropka (picker + stopka wiersza)
  cardClass: string; // obwódka/poświata karty w podglądzie
  activeClass: string; // aktywny segment w pickerze
}

export const PRIORITIES: PriorityMeta[] = [
  {
    value: 1,
    label: "Niski",
    dotClass: "bg-faint",
    cardClass: "border-card-border hover:border-card-hover",
    activeClass: "border-faint/60 bg-white/[0.06] text-subtle",
  },
  {
    value: 2,
    label: "Średni",
    dotClass: "bg-prio-med",
    cardClass: "border-[rgb(245_197_99_/_0.38)] hover:border-[rgb(245_197_99_/_0.55)]",
    activeClass: "border-prio-med/60 bg-[rgb(245_197_99_/_0.12)] text-prio-med",
  },
  {
    value: 3,
    label: "Wysoki",
    dotClass: "bg-alarm",
    cardClass: "border-alarm-border shadow-[0_10px_30px_-16px_rgb(255_90_118_/_0.6)] hover:border-alarm",
    activeClass: "border-alarm/60 bg-alarm-bg text-alarm-text",
  },
];

export const priorityMeta = (p: IdeaPriority): PriorityMeta =>
  PRIORITIES.find((x) => x.value === p) ?? PRIORITIES[0];

export const listIdeas = () => api<Idea[]>("/api/ideas");

export const addIdea = (content: string, project_id: number | null, priority: IdeaPriority) =>
  api<Idea>("/api/ideas", { method: "POST", body: JSON.stringify({ content, project_id, priority }) });

export const patchIdea = (
  id: number,
  patch: { content?: string; project_id?: number | null; priority?: IdeaPriority },
) => api<Idea>(`/api/ideas/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

export const deleteIdea = (id: number) =>
  api<void>(`/api/ideas/${id}`, { method: "DELETE" });

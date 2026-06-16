// Model pomysłu + funkcje API. project_id = null → Skrzynka (nieprzypisane).

import { api } from "./api";

export interface Idea {
  id: number;
  content: string;
  project_id: number | null;
  created_at: string;
}

export const listIdeas = () => api<Idea[]>("/api/ideas");

export const addIdea = (content: string, project_id: number | null) =>
  api<Idea>("/api/ideas", { method: "POST", body: JSON.stringify({ content, project_id }) });

export const patchIdea = (id: number, patch: { content?: string; project_id?: number | null }) =>
  api<Idea>(`/api/ideas/${id}`, { method: "PATCH", body: JSON.stringify(patch) });

export const deleteIdea = (id: number) =>
  api<void>(`/api/ideas/${id}`, { method: "DELETE" });

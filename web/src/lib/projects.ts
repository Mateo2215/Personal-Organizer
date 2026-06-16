// Model projektu + funkcje API. Projekty grupują pomysły (zadania w v1 są bez projektów).

import { api } from "./api";

export interface Project {
  id: number;
  name: string;
  created_at: string;
}

export const listProjects = () => api<Project[]>("/api/projects");

export const addProject = (name: string) =>
  api<Project>("/api/projects", { method: "POST", body: JSON.stringify({ name }) });

export const renameProject = (id: number, name: string) =>
  api<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });

// Usunięcie przenosi pomysły projektu do Skrzynki (logika po stronie Workera).
export const deleteProject = (id: number) =>
  api<void>(`/api/projects/${id}`, { method: "DELETE" });

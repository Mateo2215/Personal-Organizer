// Zakładka „Pomysły": szybki przechwyt + lista pogrupowana po projektach ze stałą Skrzynką.

import type { Idea } from "../lib/ideas";
import { IdeaCapture } from "./IdeaCapture";
import { ProjectGroup } from "./ProjectGroup";
import { useProjects, useIdeas } from "./useIdeasData";

export function Ideas() {
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: ideas, isLoading: loadingIdeas, isError } = useIdeas();

  // Grupowanie pomysłów po project_id (null = Skrzynka). Lista pomysłów już posortowana (najnowsze pierwsze).
  const byProject = new Map<number | null, Idea[]>();
  for (const idea of ideas ?? []) {
    const arr = byProject.get(idea.project_id) ?? [];
    arr.push(idea);
    byProject.set(idea.project_id, arr);
  }

  return (
    <div className="space-y-5">
      <IdeaCapture />

      {(loadingProjects || loadingIdeas) && <p className="text-sm text-neutral-500">Wczytuję…</p>}
      {isError && <p className="text-sm text-red-400">Błąd wczytywania pomysłów.</p>}

      {/* Stała Skrzynka na nieprzypisane, potem projekty (alfabetycznie z API). */}
      <ProjectGroup project={null} ideas={byProject.get(null) ?? []} />
      {projects?.map((p) => (
        <ProjectGroup key={p.id} project={p} ideas={byProject.get(p.id) ?? []} />
      ))}
    </div>
  );
}

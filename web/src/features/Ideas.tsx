// Zakładka „Pomysły": szybki przechwyt + lista pogrupowana po projektach ze stałą Skrzynką.

import { Lightbulb } from "lucide-react";
import type { Idea } from "../lib/ideas";
import { IdeaCapture } from "./IdeaCapture";
import { ProjectGroup } from "./ProjectGroup";
import { EmptyState } from "../components/EmptyState";
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

  const loading = loadingProjects || loadingIdeas;
  const isEmpty = !loading && (ideas?.length ?? 0) === 0 && (projects?.length ?? 0) === 0;

  return (
    <div className="space-y-5">
      <IdeaCapture />

      {loading && <p className="text-sm text-faint">Wczytuję…</p>}
      {isError && <p className="text-sm text-alarm-text">Błąd wczytywania pomysłów.</p>}

      {isEmpty ? (
        <EmptyState
          icon={Lightbulb}
          title="Brak pomysłów"
          description="Złap pierwszy pomysł w polu powyżej — trafi do Skrzynki albo do wybranego projektu."
        />
      ) : (
        <>
          {/* Stała Skrzynka na nieprzypisane, potem projekty (alfabetycznie z API). */}
          <ProjectGroup project={null} ideas={byProject.get(null) ?? []} />
          {projects?.map((p) => (
            <ProjectGroup key={p.id} project={p} ideas={byProject.get(p.id) ?? []} />
          ))}
        </>
      )}
    </div>
  );
}

// Jedna grupa w widoku Pomysłów: nagłówek projektu (zmień nazwę / usuń) + lista pomysłów.
// project === null oznacza stałą „Skrzynkę" (bez zarządzania).

import { useState } from "react";
import type { Idea } from "../lib/ideas";
import type { Project } from "../lib/projects";
import { useIdeasActions } from "./useIdeasData";
import { IdeaItem } from "./IdeaItem";

export function ProjectGroup({ project, ideas }: { project: Project | null; ideas: Idea[] }) {
  const { editProject, removeProject } = useIdeasActions();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project?.name ?? "");

  const isInbox = project === null;

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed || !project) return setEditing(false);
    editProject.mutate({ id: project.id, name: trimmed }, { onSuccess: () => setEditing(false) });
  }

  function onDelete() {
    if (!project) return;
    const msg = `Usunąć projekt „${project.name}"? Jego pomysły trafią do Skrzynki (nie zostaną skasowane).`;
    if (confirm(msg)) removeProject.mutate(project.id);
  }

  return (
    <section className="space-y-2">
      <header className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm outline-none focus:border-indigo-500"
            />
            <button onClick={saveName} className="text-sm text-indigo-400">Zapisz</button>
            <button onClick={() => { setName(project?.name ?? ""); setEditing(false); }} className="text-sm text-neutral-500">Anuluj</button>
          </>
        ) : (
          <>
            <h2 className={`flex-1 text-sm font-semibold ${isInbox ? "text-neutral-400" : "text-neutral-200"}`}>
              {isInbox ? "Skrzynka" : project!.name}
            </h2>
            {!isInbox && (
              <>
                <button onClick={() => { setName(project!.name); setEditing(true); }} aria-label="Zmień nazwę" className="text-sm text-neutral-500 hover:text-indigo-400">✎</button>
                <button onClick={onDelete} aria-label="Usuń projekt" className="text-sm text-neutral-500 hover:text-red-400">✕</button>
              </>
            )}
          </>
        )}
      </header>

      {ideas.length === 0 ? (
        <p className="text-xs text-neutral-600">Brak pomysłów.</p>
      ) : (
        <ul className="space-y-2">
          {ideas.map((idea) => (
            <IdeaItem key={idea.id} idea={idea} />
          ))}
        </ul>
      )}
    </section>
  );
}

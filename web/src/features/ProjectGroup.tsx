// Jedna grupa w widoku Pomysłów: nagłówek projektu (zmień nazwę / usuń) + lista pomysłów.
// project === null oznacza stałą grupę „Ogólne" (bez zarządzania).

import { useState } from "react";
import { Inbox, Pencil, X } from "lucide-react";
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
    const msg = `Usunąć projekt „${project.name}"? Jego pomysły trafią do Ogólnych (nie zostaną skasowane).`;
    if (confirm(msg)) removeProject.mutate(project.id);
  }

  return (
    <section className="space-y-2.5">
      <header className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              className="flex-1 rounded-[10px] border border-card-border bg-field px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent/60"
            />
            <button onClick={saveName} className="text-sm font-semibold text-accent">Zapisz</button>
            <button onClick={() => { setName(project?.name ?? ""); setEditing(false); }} className="text-sm text-muted">Anuluj</button>
          </>
        ) : (
          <>
            {isInbox && <Inbox size={15} strokeWidth={2} className="text-muted" />}
            <h2 className={`text-sm font-bold ${isInbox ? "text-muted" : "text-ink"}`}>
              {isInbox ? "Ogólne" : project!.name}
            </h2>
            <span className="rounded-full bg-[rgb(150_124_255_/_0.16)] px-2 py-0.5 text-[11px] font-bold text-accent-soft">
              {ideas.length}
            </span>
            <span className="flex-1" />
            {!isInbox && (
              <>
                <button onClick={() => { setName(project!.name); setEditing(true); }} aria-label="Zmień nazwę" className="text-faint transition-colors hover:text-accent">
                  <Pencil size={14} strokeWidth={2} />
                </button>
                <button onClick={onDelete} aria-label="Usuń projekt" className="text-faint transition-colors hover:text-alarm">
                  <X size={14} strokeWidth={2} />
                </button>
              </>
            )}
          </>
        )}
      </header>

      {ideas.length === 0 ? (
        <p className="text-xs text-faint">Brak pomysłów.</p>
      ) : (
        <ul className="space-y-2.5">
          {ideas.map((idea) => (
            <IdeaItem key={idea.id} idea={idea} />
          ))}
        </ul>
      )}
    </section>
  );
}

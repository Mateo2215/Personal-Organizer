// Pojedynczy pomysł: podgląd (treść + czas + edytuj/usuń) oraz tryb edycji (treść + przeniesienie do projektu).
// Błąd zapisu nie gubi wpisanej treści (zostajemy w edycji).

import { useState, type FormEvent } from "react";
import { Pencil, X, ChevronDown } from "lucide-react";
import { formatLocal } from "../lib/tasks";
import type { Idea } from "../lib/ideas";
import { useProjects, useIdeasActions } from "./useIdeasData";

const INBOX = ""; // pusta wartość selecta = Skrzynka (project_id null)

export function IdeaItem({ idea }: { idea: Idea }) {
  const { data: projects } = useProjects();
  const { editIdea, removeIdea } = useIdeasActions();

  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(idea.content);
  const [project, setProject] = useState<string>(idea.project_id == null ? INBOX : String(idea.project_id));
  const [error, setError] = useState(false);

  function startEdit() {
    setContent(idea.content);
    setProject(idea.project_id == null ? INBOX : String(idea.project_id));
    setError(false);
    setEditing(true);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    setError(false);
    editIdea.mutate(
      { id: idea.id, content: text, project_id: project === INBOX ? null : Number(project) },
      { onSuccess: () => setEditing(false), onError: () => setError(true) },
    );
  }

  if (editing) {
    return (
      <li className="rounded-[14px] border border-accent/40 bg-card p-3">
        <form onSubmit={submit} className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            autoFocus
            className="w-full resize-y rounded-[12px] border border-card-border bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full appearance-none rounded-[12px] border border-card-border bg-field py-2 pl-3 pr-9 text-sm text-ink outline-none focus:border-accent/60"
              >
                <option value={INBOX}>Skrzynka</option>
                {projects?.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
              <ChevronDown
                size={16}
                strokeWidth={2}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
            <button
              type="submit"
              disabled={editIdea.isPending || !content.trim()}
              className="accent-gradient rounded-[12px] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {editIdea.isPending ? "Zapisuję…" : "Zapisz"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-[12px] border border-card-border px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
            >
              Anuluj
            </button>
          </div>
          {error && (
            <p className="text-xs text-alarm-text">Nie udało się zapisać — treść zachowana, spróbuj ponownie.</p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 rounded-[14px] border border-card-border bg-card px-[14px] py-[11px] transition-colors hover:border-card-hover">
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap break-words text-sm leading-[1.4] text-ink">{idea.content}</p>
        <p className="mt-1 text-[10.5px] text-faint">{formatLocal(idea.created_at)}</p>
      </div>
      <button onClick={startEdit} aria-label="Edytuj pomysł" className="shrink-0 text-faint transition-colors hover:text-accent">
        <Pencil size={14} strokeWidth={2} />
      </button>
      <button onClick={() => removeIdea.mutate(idea.id)} aria-label="Usuń pomysł" className="shrink-0 text-faint transition-colors hover:text-alarm">
        <X size={14} strokeWidth={2} />
      </button>
    </li>
  );
}

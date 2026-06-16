// Pojedynczy pomysł: podgląd (treść + czas + edytuj/usuń) oraz tryb edycji (treść + przeniesienie do projektu).
// Błąd zapisu nie gubi wpisanej treści (zostajemy w edycji).

import { useState, type FormEvent } from "react";
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
      <li className="rounded-lg border border-indigo-700 bg-neutral-900 p-3">
        <form onSubmit={submit} className="space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            autoFocus
            className="w-full resize-y rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <div className="flex gap-2">
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            >
              <option value={INBOX}>Skrzynka</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={editIdea.isPending || !content.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {editIdea.isPending ? "Zapisuję…" : "Zapisz"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200"
            >
              Anuluj
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-400">Nie udało się zapisać — treść zachowana, spróbuj ponownie.</p>
          )}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap break-words text-sm">{idea.content}</p>
        <p className="text-xs text-neutral-600">{formatLocal(idea.created_at)}</p>
      </div>
      <button onClick={startEdit} aria-label="Edytuj pomysł" className="text-sm text-neutral-500 hover:text-indigo-400">✎</button>
      <button onClick={() => removeIdea.mutate(idea.id)} aria-label="Usuń pomysł" className="text-sm text-neutral-500 hover:text-red-400">✕</button>
    </li>
  );
}

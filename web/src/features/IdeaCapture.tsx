// Formularz szybkiego przechwytu pomysłu: treść + wybór projektu (lub Skrzynka / nowy w locie).

import { useState, type FormEvent } from "react";
import { useProjects, useIdeasActions } from "./useIdeasData";

const INBOX = ""; // pusta wartość selecta = Skrzynka (project_id null)

export function IdeaCapture() {
  const { data: projects } = useProjects();
  const { createIdea, createProject } = useIdeasActions();

  const [content, setContent] = useState("");
  const [project, setProject] = useState<string>(INBOX); // id projektu jako string lub "" (Skrzynka)
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    const projectId = project === INBOX ? null : Number(project);
    createIdea.mutate(
      { content: text, project_id: projectId },
      // Czyścimy treść dopiero po udanym zapisie (brak utraty przy błędzie). Projekt zostaje.
      { onSuccess: () => setContent("") },
    );
  }

  function addNewProject(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createProject.mutate(name, {
      onSuccess: (p) => {
        setProject(String(p.id)); // auto-wybór świeżo utworzonego projektu
        setNewName("");
        setShowNew(false);
      },
    });
  }

  return (
    <section className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <form onSubmit={submit} className="space-y-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Złap pomysł…"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 outline-none focus:border-indigo-500"
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
            disabled={createIdea.isPending || !content.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {createIdea.isPending ? "Zapisuję…" : "Zapisz"}
          </button>
        </div>
        {createIdea.isError && (
          <p className="text-sm text-red-400">Nie udało się zapisać — treść zachowana, spróbuj ponownie.</p>
        )}
      </form>

      {showNew ? (
        <form onSubmit={addNewProject} className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nazwa nowego projektu"
            autoFocus
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={createProject.isPending || !newName.trim()}
            className="rounded-lg bg-neutral-700 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Dodaj
          </button>
          <button
            type="button"
            onClick={() => { setShowNew(false); setNewName(""); }}
            className="rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-400"
          >
            Anuluj
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="text-xs text-neutral-500 hover:text-indigo-400"
        >
          + Nowy projekt
        </button>
      )}
    </section>
  );
}

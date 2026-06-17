// Formularz szybkiego przechwytu pomysłu: treść + wybór projektu (lub Skrzynka / nowy w locie).

import { useState, type FormEvent } from "react";
import { Lightbulb, ChevronDown } from "lucide-react";
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
    <section className="space-y-3 rounded-[18px] border border-card-border bg-card p-[13px]">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Lightbulb size={18} strokeWidth={2} className="shrink-0 text-accent" />
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Złap pomysł…"
            className="w-full bg-transparent text-ink placeholder:text-placeholder outline-none"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full appearance-none rounded-[14px] border border-card-border bg-field py-2 pl-3.5 pr-9 text-sm text-ink outline-none focus:border-accent/60"
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
            disabled={createIdea.isPending || !content.trim()}
            className="accent-gradient rounded-[14px] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {createIdea.isPending ? "Zapisuję…" : "Zapisz"}
          </button>
        </div>
        {createIdea.isError && (
          <p className="text-sm text-alarm-text">Nie udało się zapisać — treść zachowana, spróbuj ponownie.</p>
        )}
      </form>

      {showNew ? (
        <form onSubmit={addNewProject} className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nazwa nowego projektu"
            autoFocus
            className="flex-1 rounded-[12px] border border-card-border bg-field px-3 py-2 text-sm text-ink placeholder:text-placeholder outline-none focus:border-accent/60"
          />
          <button
            type="submit"
            disabled={createProject.isPending || !newName.trim()}
            className="rounded-[12px] border border-card-border bg-white/[0.05] px-3 py-2 text-sm text-ink disabled:opacity-50"
          >
            Dodaj
          </button>
          <button
            type="button"
            onClick={() => { setShowNew(false); setNewName(""); }}
            className="rounded-[12px] px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
          >
            Anuluj
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="text-[12.5px] font-semibold text-accent transition-opacity hover:opacity-80"
        >
          + Nowy projekt
        </button>
      )}
    </section>
  );
}

// Formularz szybkiego przechwytu pomysłu: treść + priorytet + wybór projektu (lub Ogólne / nowy w locie).

import { useState, type FormEvent } from "react";
import { Lightbulb, ChevronDown } from "lucide-react";
import { DEFAULT_PRIORITY, type IdeaPriority } from "../lib/ideas";
import { PriorityPicker } from "./PriorityPicker";
import { useProjects, useIdeasActions } from "./useIdeasData";

const INBOX = ""; // pusta wartość selecta = Ogólne (project_id null)

export function IdeaCapture() {
  const { data: projects } = useProjects();
  const { createIdea, createProject } = useIdeasActions();

  const [content, setContent] = useState("");
  const [project, setProject] = useState<string>(INBOX); // id projektu jako string lub "" (Ogólne)
  const [priority, setPriority] = useState<IdeaPriority>(DEFAULT_PRIORITY);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text) return;
    const projectId = project === INBOX ? null : Number(project);
    createIdea.mutate(
      { content: text, project_id: projectId, priority },
      // Czyścimy treść i priorytet dopiero po udanym zapisie (brak utraty przy błędzie). Projekt zostaje.
      { onSuccess: () => { setContent(""); setPriority(DEFAULT_PRIORITY); } },
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
    <section className="space-y-3 rounded-[18px] border border-accent/30 bg-card p-[13px] shadow-[0_8px_30px_-16px_rgb(150_108_255_/_0.55)]">
      <div className="flex items-center gap-2">
        <Lightbulb size={15} strokeWidth={2.5} className="text-accent" />
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Nowy pomysł</span>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-[14px] border border-card-border bg-field px-3.5 py-2.5">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Co chodzi Ci po głowie?"
            className="w-full bg-transparent text-ink placeholder:text-placeholder outline-none"
          />
        </div>
        <PriorityPicker value={priority} onChange={setPriority} />
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="w-full appearance-none rounded-[14px] border border-card-border bg-field py-2 pl-3.5 pr-9 text-sm text-ink outline-none focus:border-accent/60"
            >
              <option value={INBOX}>Ogólne</option>
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
        <form onSubmit={addNewProject} className="space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nazwa nowego projektu"
            autoFocus
            className="w-full rounded-[12px] border border-card-border bg-field px-3 py-2 text-sm text-ink placeholder:text-placeholder outline-none focus:border-accent/60"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowNew(false); setNewName(""); }}
              className="rounded-[12px] px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={createProject.isPending || !newName.trim()}
              className="rounded-[12px] border border-card-border bg-white/[0.05] px-4 py-2 text-sm text-ink disabled:opacity-50"
            >
              Dodaj
            </button>
          </div>
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

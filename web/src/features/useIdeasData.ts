// Warstwa danych dla zakładki „Pomysły": zapytania + mutacje projektów i pomysłów.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listProjects, addProject, renameProject, deleteProject } from "../lib/projects";
import { listIdeas, addIdea, patchIdea, deleteIdea } from "../lib/ideas";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: listProjects });
}

export function useIdeas() {
  return useQuery({ queryKey: ["ideas"], queryFn: listIdeas });
}

export function useIdeasActions() {
  const qc = useQueryClient();
  const invIdeas = () => qc.invalidateQueries({ queryKey: ["ideas"] });
  const invProjects = () => qc.invalidateQueries({ queryKey: ["projects"] });

  const createIdea = useMutation({
    mutationFn: (v: { content: string; project_id: number | null }) => addIdea(v.content, v.project_id),
    onSuccess: invIdeas,
  });
  const editIdea = useMutation({
    mutationFn: (v: { id: number; content: string; project_id: number | null }) =>
      patchIdea(v.id, { content: v.content, project_id: v.project_id }),
    onSuccess: invIdeas,
  });
  const removeIdea = useMutation({
    mutationFn: (id: number) => deleteIdea(id),
    onSuccess: invIdeas,
  });
  const createProject = useMutation({
    mutationFn: (name: string) => addProject(name),
    onSuccess: invProjects,
  });
  const editProject = useMutation({
    mutationFn: (v: { id: number; name: string }) => renameProject(v.id, v.name),
    onSuccess: invProjects,
  });
  const removeProject = useMutation({
    // Usunięcie przenosi pomysły do Skrzynki — odświeżamy obie listy.
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => { invProjects(); invIdeas(); },
  });

  return { createIdea, editIdea, removeIdea, createProject, editProject, removeProject };
}

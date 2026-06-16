// Wspólne zapytanie i mutacje zadań (współdzielone przez widoki Dziś i Zadania).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTasks, patchTask, deleteTask } from "../lib/tasks";

export function useTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: listTasks });
}

export function useTaskActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const toggle = useMutation({
    mutationFn: (v: { id: number; status: "open" | "done" }) => patchTask(v.id, { status: v.status }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteTask(id),
    onSuccess: invalidate,
  });

  return { toggle, remove };
}

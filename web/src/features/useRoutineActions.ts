// Wspólne zapytanie i mutacje rutyn (współdzielone przez widoki Dziś i Zadania).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listRoutines,
  addRoutine,
  patchRoutine,
  deleteRoutine,
  todayLocalDate,
} from "../lib/routines";

export function useRoutines() {
  return useQuery({ queryKey: ["routines"], queryFn: listRoutines });
}

export function useRoutineActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["routines"] });

  // toggle: done=true → ustaw last_done_on na dzisiejszą datę lokalną; done=false → wyczyść (null).
  const toggle = useMutation({
    mutationFn: (v: { id: number; done: boolean }) =>
      patchRoutine(v.id, { last_done_on: v.done ? todayLocalDate() : null }),
    onSuccess: invalidate,
  });
  const add = useMutation({
    mutationFn: (content: string) => addRoutine({ content }),
    onSuccess: invalidate,
  });
  const rename = useMutation({
    mutationFn: (v: { id: number; content: string }) => patchRoutine(v.id, { content: v.content }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteRoutine(id),
    onSuccess: invalidate,
  });

  return { toggle, add, rename, remove };
}

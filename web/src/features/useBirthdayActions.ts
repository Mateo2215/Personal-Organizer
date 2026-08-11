// Wspólne zapytanie i mutacje urodzin (współdzielone przez ekran Urodziny i kartę na „Dziś").

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listBirthdays,
  addBirthday,
  patchBirthday,
  deleteBirthday,
  type BirthdayPatch,
  type NewBirthday,
} from "../lib/birthdays";

export function useBirthdays() {
  return useQuery({ queryKey: ["birthdays"], queryFn: listBirthdays });
}

export function useBirthdayActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["birthdays"] });

  const add = useMutation({
    mutationFn: (input: NewBirthday) => addBirthday(input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: (v: { id: number; patch: BirthdayPatch }) => patchBirthday(v.id, v.patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteBirthday(id),
    onSuccess: invalidate,
  });

  return { add, update, remove };
}

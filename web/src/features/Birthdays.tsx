// Ekran „Urodziny": lista od najbliższych obchodów, pogrupowana po miesiącach, + dodawanie i edycja.
// Podstrona Ustawień (nie zakładka) — wchodzi się tu kilka razy w roku, więc nie zabiera miejsca w dolnej nawigacji.

import { useState } from "react";
import { Cake, Plus } from "lucide-react";
import { useBirthdays, useBirthdayActions } from "./useBirthdayActions";
import { useMinuteNow } from "./useMinuteNow";
import { BirthdayForm } from "./BirthdayForm";
import { BirthdayRow } from "./BirthdayRow";
import { EmptyState } from "../components/EmptyState";
import { groupByMonth, sortByUpcoming, type NewBirthday } from "../lib/birthdays";

export function Birthdays() {
  const { data, isLoading } = useBirthdays();
  const { add, update, remove } = useBirthdayActions();
  const now = new Date(useMinuteNow());

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const birthdays = data ?? [];
  const groups = groupByMonth(sortByUpcoming(birthdays, now));

  function onAdd(values: NewBirthday) {
    add.mutate(values, { onSuccess: () => setAdding(false) });
  }

  function onSave(id: number, values: NewBirthday) {
    update.mutate({ id, patch: values }, { onSuccess: () => setEditingId(null) });
  }

  return (
    <div className="space-y-4">
      {adding ? (
        <section className="space-y-3 rounded-[16px] border border-card-border bg-card p-4">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Nowa osoba</h2>
          <BirthdayForm
            submitLabel="Dodaj"
            pending={add.isPending}
            error={add.isError ? "Nie udało się zapisać. Spróbuj ponownie." : null}
            onSubmit={onAdd}
            onCancel={() => setAdding(false)}
          />
        </section>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-dashed border-[rgb(150_124_255_/_0.45)] bg-[rgb(150_124_255_/_0.07)] py-3.5 text-sm font-bold text-accent-soft transition-colors hover:bg-[rgb(150_124_255_/_0.12)]"
        >
          <Plus size={18} strokeWidth={2.5} />
          Dodaj osobę
        </button>
      )}

      {isLoading && <p className="text-sm text-faint">Wczytuję…</p>}

      {!isLoading && birthdays.length === 0 && !adding && (
        <EmptyState
          icon={Cake}
          title="Brak urodzin"
          description="Dodaj bliskich, a dostaniesz powiadomienie rano w dniu ich urodzin."
          actions={[{ label: "Dodaj osobę", onClick: () => setAdding(true), variant: "primary" }]}
        />
      )}

      {groups.map((group) => (
        <section key={group.month} className="space-y-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{group.label}</h3>
          <ul className="space-y-2.5">
            {group.birthdays.map((birthday) =>
              editingId === birthday.id ? (
                <li key={birthday.id} className="rounded-[14px] border border-card-border bg-card p-3">
                  <BirthdayForm
                    initial={{
                      name: birthday.name,
                      month: birthday.month,
                      day: birthday.day,
                      birth_year: birthday.birth_year,
                    }}
                    submitLabel="Zapisz"
                    pending={update.isPending}
                    error={update.isError ? "Nie udało się zapisać zmian." : null}
                    onSubmit={(values) => onSave(birthday.id, values)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <BirthdayRow
                  key={birthday.id}
                  birthday={birthday}
                  now={now}
                  onEdit={() => setEditingId(birthday.id)}
                  onDelete={() => remove.mutate(birthday.id)}
                />
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

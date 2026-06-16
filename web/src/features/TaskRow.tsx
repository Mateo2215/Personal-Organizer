// Pojedynczy wiersz zadania (checkbox + treść + termin + usuń). Zaległe wyróżnione na czerwono.

import { formatLocal, type Task } from "../lib/tasks";

export function TaskRow({
  task,
  onToggle,
  onDelete,
  overdue,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  overdue?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        overdue ? "border-red-900 bg-red-950/30" : "border-neutral-800 bg-neutral-900"
      }`}
    >
      <input
        type="checkbox"
        checked={task.status === "done"}
        onChange={onToggle}
        className="h-5 w-5 accent-indigo-500"
      />
      <div className="min-w-0 flex-1">
        <p className={task.status === "done" ? "truncate text-neutral-500 line-through" : "truncate"}>
          {task.content}
        </p>
        <p className={`text-xs ${overdue ? "text-red-400" : "text-neutral-500"}`}>
          {formatLocal(task.has_time ? task.due_at : null)}
        </p>
      </div>
      <button
        onClick={onDelete}
        className="text-sm text-neutral-500 hover:text-red-400"
        aria-label="Usuń"
      >
        ✕
      </button>
    </li>
  );
}

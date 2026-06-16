-- Personal Organizer — schemat początkowy (v1).
-- Czas trzymany jako ISO 8601 w UTC. Strefę (Europe/Warsaw) obsługuje front.

CREATE TABLE projects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Zadania. W v1 BEZ przypisania do projektu (świadoma decyzja).
CREATE TABLE tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  content     TEXT NOT NULL,
  due_at      TEXT,                          -- ISO UTC; NULL = brak terminu
  has_time    INTEGER NOT NULL DEFAULT 1,    -- 1 = ma godzinę (kandydat do push), 0 = tylko dzień
  status      TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'done'
  reminded_at TEXT,                          -- ustawiane po wysłaniu push; NULL = jeszcze nie
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Indeks pod zapytanie crona: zadania otwarte, z godziną, jeszcze nieprzypomniane.
CREATE INDEX idx_tasks_due ON tasks (status, has_time, reminded_at, due_at);

-- Pomysły. project_id NULL = Skrzynka. Usunięcie projektu przenosi pomysły do Skrzynki (logika w aplikacji).
CREATE TABLE ideas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  content    TEXT NOT NULL,
  project_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_ideas_project ON ideas (project_id, created_at);

-- Subskrypcje Web Push (jeden użytkownik, ale może mieć kilka urządzeń/przeglądarek).
CREATE TABLE push_subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

// Validates and normalizes organizer backup files before any database writes.
// Supports the current versioned format and the two earlier unversioned export shapes.

export const EXPORT_FORMAT_VERSION = 1 as const;

export interface ImportTask {
  id: number;
  content: string;
  due_at: string | null;
  has_time: 0 | 1;
  status: "open" | "done";
  reminded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportIdea {
  id: number;
  content: string;
  project_id: number | null;
  priority: 1 | 2 | 3;
  created_at: string;
}

export interface ImportProject {
  id: number;
  name: string;
  created_at: string;
}

export interface ImportRoutine {
  id: number;
  content: string;
  last_done_on: string | null;
  created_at: string;
}

export interface ImportData {
  format_version: typeof EXPORT_FORMAT_VERSION;
  tasks: ImportTask[];
  ideas: ImportIdea[];
  projects: ImportProject[];
  routines: ImportRoutine[];
}

export type ImportParseResult =
  | { ok: true; data: ImportData }
  | { ok: false; error: string };

class ImportValidationError extends Error {}

type UnknownRecord = Record<string, unknown>;

function fail(message: string): never {
  throw new ImportValidationError(message);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, path: string): UnknownRecord {
  if (!isRecord(value)) fail(`${path} must be an object`);
  return value;
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(`${path} must be an array`);
  return value;
}

function requirePositiveInteger(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    fail(`${path} must be a positive integer`);
  }
  return value as number;
}

function requireNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${path} must be a non-empty string`);
  }
  return value;
}

function requireTimestamp(value: unknown, path: string): string {
  if (
    typeof value !== "string"
    || !value.includes("T")
    || Number.isNaN(Date.parse(value))
  ) {
    fail(`${path} must be an ISO timestamp`);
  }
  return value;
}

function requireNullableTimestamp(value: unknown, path: string): string | null {
  return value === null ? null : requireTimestamp(value, path);
}

function requireLocalDate(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${path} must use YYYY-MM-DD`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    fail(`${path} must be a valid calendar date`);
  }
  return value;
}

function requireNullableLocalDate(value: unknown, path: string): string | null {
  return value === null ? null : requireLocalDate(value, path);
}

function parseTask(value: unknown, index: number): ImportTask {
  const row = requireRecord(value, `tasks[${index}]`);
  const hasTime = row.has_time;
  if (hasTime !== 0 && hasTime !== 1) fail(`tasks[${index}].has_time must be 0 or 1`);
  const status = row.status;
  if (status !== "open" && status !== "done") fail(`tasks[${index}].status is invalid`);

  return {
    id: requirePositiveInteger(row.id, `tasks[${index}].id`),
    content: requireNonEmptyString(row.content, `tasks[${index}].content`),
    due_at: requireNullableTimestamp(row.due_at, `tasks[${index}].due_at`),
    has_time: hasTime,
    status,
    reminded_at: requireNullableTimestamp(row.reminded_at, `tasks[${index}].reminded_at`),
    created_at: requireTimestamp(row.created_at, `tasks[${index}].created_at`),
    updated_at: requireTimestamp(row.updated_at, `tasks[${index}].updated_at`),
  };
}

function parseProject(value: unknown, index: number): ImportProject {
  const row = requireRecord(value, `projects[${index}]`);
  return {
    id: requirePositiveInteger(row.id, `projects[${index}].id`),
    name: requireNonEmptyString(row.name, `projects[${index}].name`),
    created_at: requireTimestamp(row.created_at, `projects[${index}].created_at`),
  };
}

function parseIdea(value: unknown, index: number, legacy: boolean): ImportIdea {
  const row = requireRecord(value, `ideas[${index}]`);
  const projectId = row.project_id;
  if (projectId !== null && (!Number.isInteger(projectId) || (projectId as number) <= 0)) {
    fail(`ideas[${index}].project_id must be null or a positive integer`);
  }

  const priority = row.priority === undefined && legacy ? 1 : row.priority;
  if (priority !== 1 && priority !== 2 && priority !== 3) {
    fail(`ideas[${index}].priority must be 1, 2 or 3`);
  }

  return {
    id: requirePositiveInteger(row.id, `ideas[${index}].id`),
    content: requireNonEmptyString(row.content, `ideas[${index}].content`),
    project_id: projectId as number | null,
    priority,
    created_at: requireTimestamp(row.created_at, `ideas[${index}].created_at`),
  };
}

function parseRoutine(value: unknown, index: number): ImportRoutine {
  const row = requireRecord(value, `routines[${index}]`);
  return {
    id: requirePositiveInteger(row.id, `routines[${index}].id`),
    content: requireNonEmptyString(row.content, `routines[${index}].content`),
    last_done_on: requireNullableLocalDate(row.last_done_on, `routines[${index}].last_done_on`),
    created_at: requireTimestamp(row.created_at, `routines[${index}].created_at`),
  };
}

function assertUniqueIds(rows: Array<{ id: number }>, path: string): void {
  const seen = new Set<number>();
  for (const row of rows) {
    if (seen.has(row.id)) fail(`${path} contains duplicate id ${row.id}`);
    seen.add(row.id);
  }
}

export function parseImport(raw: unknown): ImportParseResult {
  try {
    let parsed = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        fail("invalid JSON");
      }
    }

    const root = requireRecord(parsed, "backup");
    const version = root.format_version;
    const legacy = version === undefined;
    if (!legacy && version !== EXPORT_FORMAT_VERSION) {
      fail(`unsupported format_version: ${String(version)}`);
    }

    const tasks = requireArray(root.tasks, "tasks").map(parseTask);
    const projects = requireArray(root.projects, "projects").map(parseProject);
    const ideas = requireArray(root.ideas, "ideas").map((row, index) => parseIdea(row, index, legacy));
    const routinesRaw = legacy && root.routines === undefined
      ? []
      : requireArray(root.routines, "routines");
    const routines = routinesRaw.map(parseRoutine);

    assertUniqueIds(tasks, "tasks");
    assertUniqueIds(projects, "projects");
    assertUniqueIds(ideas, "ideas");
    assertUniqueIds(routines, "routines");

    const projectIds = new Set(projects.map((project) => project.id));
    for (const [index, idea] of ideas.entries()) {
      if (idea.project_id !== null && !projectIds.has(idea.project_id)) {
        fail(`ideas[${index}].project_id references a missing project`);
      }
    }

    return {
      ok: true,
      data: {
        format_version: EXPORT_FORMAT_VERSION,
        tasks,
        ideas,
        projects,
        routines,
      },
    };
  } catch (error) {
    if (error instanceof ImportValidationError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "invalid backup" };
  }
}

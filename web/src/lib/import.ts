// Reads backup files locally and sends validated JSON to the restore endpoint.
// Schema validation remains authoritative on the Worker before any database writes.

import { api } from "./api";

export class ImportFileError extends Error {
  code: "read_failed" | "invalid_json";

  constructor(code: "read_failed" | "invalid_json") {
    super(code);
    this.code = code;
  }
}

export interface ImportSummary {
  ok: true;
  imported: {
    tasks: number;
    ideas: number;
    projects: number;
    routines: number;
  };
}

export async function readImportFile(file: Pick<File, "text">): Promise<unknown> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new ImportFileError("read_failed");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ImportFileError("invalid_json");
  }
}

export function restoreImport(data: unknown): Promise<ImportSummary> {
  return api<ImportSummary>("/api/import", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

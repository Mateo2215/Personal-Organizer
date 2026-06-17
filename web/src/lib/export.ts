// Exports all user data (tasks, ideas, projects) as a pretty-printed JSON file download.
// Calls GET /api/export and triggers a browser file download without any navigation.

import { api } from "./api";

interface ExportData {
  tasks: unknown[];
  ideas: unknown[];
  projects: unknown[];
  routines: unknown[];
}

export async function downloadExport(): Promise<void> {
  const data = await api<ExportData>("/api/export");

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `organizer-export-${today}.json`;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

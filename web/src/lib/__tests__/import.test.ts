import { beforeEach, describe, expect, it, vi } from "vitest";
import { readImportFile, restoreImport } from "../import";

vi.mock("../api", () => ({
  api: vi.fn(),
}));

import { api } from "../api";

const mockApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("backup import client", () => {
  it("czyta poprawny plik i wysyła jego dane do endpointu", async () => {
    const data = { format_version: 1, tasks: [], ideas: [], projects: [], routines: [] };
    const file = { text: vi.fn().mockResolvedValue(JSON.stringify(data)) };
    mockApi.mockResolvedValue({
      ok: true,
      imported: { tasks: 0, ideas: 0, projects: 0, routines: 0 },
    });

    const parsed = await readImportFile(file);
    await restoreImport(parsed);

    expect(parsed).toEqual(data);
    expect(mockApi).toHaveBeenCalledWith("/api/import", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("odrzuca uszkodzony JSON bez wysyłania requestu", async () => {
    const file = { text: vi.fn().mockResolvedValue("{uszkodzony") };

    await expect(readImportFile(file)).rejects.toMatchObject({ code: "invalid_json" });
    expect(mockApi).not.toHaveBeenCalled();
  });
});

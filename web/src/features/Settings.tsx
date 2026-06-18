// Ekran „Ustawienia": personalizacja, eksport/import danych i konto.
// Imię trzymane lokalnie (per urządzenie). Eksport i Wyloguj przeniesione tu z menu ⋮ nagłówka.

import { useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserRound, ArrowDownToLine, FileUp, LogOut } from "lucide-react";
import { getName, setName } from "../lib/settings";
import { downloadExport } from "../lib/export";
import { ApiError } from "../lib/api";
import { ImportFileError, readImportFile, restoreImport, type ImportSummary } from "../lib/import";
import { clearToken } from "../lib/token";

export function Settings() {
  const queryClient = useQueryClient();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [name, setNameState] = useState(getName());
  const [saved, setSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isReadingImport, setIsReadingImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ fileName: string; data: unknown } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  function onNameChange(value: string) {
    setNameState(value);
    setName(value); // zapis na bieżąco; powitanie odświeży się przy następnym wejściu na „Dziś"
    setSaved(true);
  }

  async function onExport() {
    setIsExporting(true);
    setExportError(null);
    try {
      await downloadExport();
    } catch {
      setExportError("Nie udało się pobrać eksportu.");
    } finally {
      setIsExporting(false);
    }
  }

  function resetImportSelection() {
    setPendingImport(null);
    if (importInputRef.current) importInputRef.current.value = "";
  }

  async function onImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsReadingImport(true);
    setImportError(null);
    setImportSuccess(null);
    setPendingImport(null);
    try {
      const data = await readImportFile(file);
      setPendingImport({ fileName: file.name, data });
    } catch (error) {
      if (error instanceof ImportFileError && error.code === "invalid_json") {
        setImportError("Wybrany plik nie zawiera poprawnego JSON.");
      } else {
        setImportError("Nie udało się odczytać wybranego pliku.");
      }
      if (importInputRef.current) importInputRef.current.value = "";
    } finally {
      setIsReadingImport(false);
    }
  }

  function importSummaryMessage(summary: ImportSummary): string {
    const { tasks, ideas, projects, routines } = summary.imported;
    return `Odtworzono: ${tasks} zadań, ${ideas} pomysłów, ${projects} projektów i ${routines} rutyn.`;
  }

  async function onConfirmImport() {
    if (!pendingImport) return;

    setIsImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      await downloadExport();
    } catch {
      setImportError("Nie udało się utworzyć kopii bezpieczeństwa. Import został anulowany.");
      setIsImporting(false);
      return;
    }

    try {
      const summary = await restoreImport(pendingImport.data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["ideas"] }),
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["routines"] }),
      ]);
      setImportSuccess(importSummaryMessage(summary));
      resetImportSelection();
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setImportError("Kopia ma nieprawidłowy lub nieobsługiwany format. Dane nie zostały zmienione.");
      } else {
        setImportError("Nie udało się odtworzyć danych. Bieżące dane pozostały bez zmian.");
      }
    } finally {
      setIsImporting(false);
    }
  }

  function logout() {
    clearToken();
    location.reload(); // przeładowanie pokaże ekran klucza (getToken() = null)
  }

  return (
    <div className="space-y-5">
      {/* Personalizacja */}
      <section className="space-y-3 rounded-[16px] border border-card-border bg-card p-4">
        <div className="flex items-center gap-2">
          <UserRound size={15} strokeWidth={2.5} className="text-accent" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Personalizacja</h2>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm text-subtle">Twoje imię</span>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="np. Mateusz"
            className="w-full rounded-[12px] border border-card-border bg-field px-3 py-2.5 text-sm text-ink placeholder:text-placeholder outline-none focus:border-accent/60"
          />
        </label>
        <p className="text-xs text-faint">
          {saved && name.trim()
            ? `Powitanie na ekranie Dziś: Dzień dobry, ${name.trim()} 👋`
            : "Pojawi się w powitaniu na ekranie Dziś. Zapisane tylko na tym urządzeniu."}
        </p>
      </section>

      {/* Dane */}
      <section className="space-y-3 rounded-[16px] border border-card-border bg-card p-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Dane</h2>
        <button
          onClick={onExport}
          disabled={isExporting || isImporting || isReadingImport}
          className="flex w-full items-center gap-2.5 rounded-[12px] border border-card-border bg-white/[0.04] px-3.5 py-3 text-left text-sm text-ink transition-colors hover:bg-white/[0.07] disabled:opacity-40"
        >
          <ArrowDownToLine size={17} strokeWidth={2} className="text-muted" />
          {isExporting ? "Eksportuję…" : "Eksportuj dane (JSON)"}
        </button>
        {exportError && <p className="text-xs text-alarm-text">{exportError}</p>}

        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          onChange={onImportFileChange}
          className="hidden"
          aria-label="Wybierz kopię danych JSON"
        />
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          disabled={isReadingImport || isImporting || isExporting}
          className="flex w-full items-center gap-2.5 rounded-[12px] border border-card-border bg-white/[0.04] px-3.5 py-3 text-left text-sm text-ink transition-colors hover:bg-white/[0.07] disabled:opacity-40"
        >
          <FileUp size={17} strokeWidth={2} className="text-muted" />
          {isReadingImport ? "Sprawdzam plik…" : "Odtwórz z kopii (JSON)"}
        </button>

        {pendingImport && (
          <div className="space-y-3 rounded-[12px] border border-alarm-border bg-alarm-bg p-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-alarm-text">Zastąpić wszystkie dane?</p>
              <p className="break-all text-xs text-subtle">{pendingImport.fileName}</p>
              <p className="text-xs leading-relaxed text-muted">
                Zadania, pomysły, projekty i rutyny zostaną zastąpione zawartością kopii.
                Najpierw automatycznie pobierzemy kopię obecnych danych.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold">
              <button
                type="button"
                onClick={onConfirmImport}
                disabled={isImporting}
                className="rounded-[10px] bg-alarm px-3 py-2 text-white transition-opacity disabled:opacity-40"
              >
                {isImporting ? "Odtwarzam…" : "Tak, odtwórz"}
              </button>
              <button
                type="button"
                onClick={resetImportSelection}
                disabled={isImporting}
                className="px-2 py-2 text-muted transition-colors hover:text-ink disabled:opacity-40"
              >
                Nie
              </button>
            </div>
          </div>
        )}

        <div aria-live="polite">
          {importError && <p className="text-xs text-alarm-text">{importError}</p>}
          {importSuccess && <p className="text-xs text-accent">{importSuccess}</p>}
        </div>
      </section>

      {/* Konto */}
      <section className="space-y-3 rounded-[16px] border border-card-border bg-card p-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Konto</h2>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-[12px] border border-card-border bg-white/[0.04] px-3.5 py-3 text-left text-sm text-ink transition-colors hover:bg-white/[0.07]"
        >
          <LogOut size={17} strokeWidth={2} className="text-muted" />
          Wyloguj
        </button>
      </section>
    </div>
  );
}

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/settings/page";
import { addLog, loadLogs } from "@/lib/storage";
import { CURRENT_LOG_VERSION } from "@/lib/types";
import type { WorkoutLog } from "@/lib/types";

// jsdom doesn't implement File.prototype.text() (a standard Web API every
// real browser supports) — polyfill it via FileReader for this test only.
// The app code itself uses the standard `file.text()` and needs no change.
if (typeof File !== "undefined" && !File.prototype.text) {
  File.prototype.text = function (this: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

function makeLog(id: string): WorkoutLog {
  return {
    version: CURRENT_LOG_VERSION, id, workoutId: "w", title: "Full Body A", mode: "normal",
    date: "2026-01-01T00:00:00.000Z",
    exercises: [{
      exerciseSlug: "dumbbell-squat", exerciseName: "Dumbbell Squat", status: "completed", plannedSets: 1,
      plannedRepRange: [8, 12], plannedRestSeconds: 60, plannedRpeTarget: 7,
      actualSets: [{ setNumber: 1, reps: 10, weight: 20, weightUnit: "lb", rpe: 7, completed: true }],
      sessionFeel: "good", modified: false,
    }],
  };
}

function jsonFile(data: unknown): File {
  return new File([JSON.stringify(data)], "backup.json", { type: "application/json" });
}

async function selectImportFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  fireEvent.change(input);
}

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SettingsPage: import (Phase 3C backup)", () => {
  it("a valid file offers merge/replace, and a successful merge reports the new total", async () => {
    addLog(makeLog("existing"));
    render(<SettingsPage />);

    const bundle = { exportVersion: 1, exportedAt: "x", appLogVersion: CURRENT_LOG_VERSION, logs: [makeLog("imported")] };
    await selectImportFile(jsonFile(bundle));
    await waitFor(() => expect(screen.getByText(/found 1 workout/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /^merge with existing$/i }));

    expect(screen.getByText(/imported 1 workout — 2 total now saved/i)).toBeInTheDocument();
    expect(loadLogs().map((l) => l.id).sort()).toEqual(["existing", "imported"]);
  });

  it("rejects a file that isn't a recognizable logs export, without crashing", async () => {
    render(<SettingsPage />);
    await selectImportFile(jsonFile({ some: "unrelated json" }));
    await waitFor(() => expect(screen.getByText(/doesn't look like/i)).toBeInTheDocument());
    expect(screen.queryByText(/found \d/i)).not.toBeInTheDocument();
  });
});

describe("SettingsPage: import does not report success when the write fails", () => {
  it("shows the import-specific error and does not show success when localStorage.setItem throws on merge", async () => {
    addLog(makeLog("existing"));
    render(<SettingsPage />);

    const bundle = { exportVersion: 1, exportedAt: "x", appLogVersion: CURRENT_LOG_VERSION, logs: [makeLog("imported")] };
    await selectImportFile(jsonFile(bundle));
    await waitFor(() => expect(screen.getByText(/found 1 workout/i)).toBeInTheDocument());

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });
    fireEvent.click(screen.getByRole("button", { name: /^merge with existing$/i }));
    setItemSpy.mockRestore();

    expect(screen.getByText(/could not import logs\. please try again or export a backup first\./i)).toBeInTheDocument();
    expect(screen.queryByText(/imported 1 workout/i)).not.toBeInTheDocument();
    // The pending-import card is still shown so the user can retry without re-picking the file.
    expect(screen.getByRole("button", { name: /^merge with existing$/i })).toBeInTheDocument();
    // Nothing was actually written — the pre-import state is intact.
    expect(loadLogs().map((l) => l.id)).toEqual(["existing"]);
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/history/l1",
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={typeof href === "string" ? href : "#"}>{children}</a>,
}));

import HistoryDetailPage from "@/app/history/[id]/page";
import { addLog, loadLogById } from "@/lib/storage";
import { CURRENT_LOG_VERSION } from "@/lib/types";
import type { WorkoutLog } from "@/lib/types";

function seedLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  const log: WorkoutLog = {
    version: CURRENT_LOG_VERSION, id: "l1", workoutId: "w", title: "Full Body A",
    mode: "normal", date: "2026-03-01T10:00:00.000Z",
    exercises: [{
      exerciseSlug: "dumbbell-squat", exerciseName: "Dumbbell Squat", status: "completed", plannedSets: 2,
      plannedRepRange: [8, 12], plannedRestSeconds: 60, plannedRpeTarget: 7,
      actualSets: [
        { setNumber: 1, reps: 10, weight: 20, weightUnit: "lb", rpe: 7, completed: true },
        { setNumber: 2, reps: 10, weight: 20, weightUnit: "lb", rpe: 7, completed: true },
      ],
      sessionFeel: "good", modified: false,
    }],
    ...overrides,
  };
  addLog(log);
  return log;
}

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
  push.mockClear();
});
afterEach(() => cleanup());

describe("HistoryDetailPage: rendering", () => {
  it("renders the workout title, exercise, planned stats, and actual sets", () => {
    seedLog();
    render(<HistoryDetailPage params={{ id: "l1" }} />);

    expect(screen.getByText("Full Body A")).toBeInTheDocument();
    expect(screen.getByText("Dumbbell Squat")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText(/Planned: 2 sets/)).toBeInTheDocument();
    expect(screen.getAllByText("20 lb")).toHaveLength(2); // weight + unit for both sets
  });

  it("shows a not-found state for an id that doesn't exist", () => {
    render(<HistoryDetailPage params={{ id: "does-not-exist" }} />);
    expect(screen.getByText(/wasn't found/i)).toBeInTheDocument();
  });

  it("shows the readiness snapshot when the log has one, and omits it when absent", () => {
    seedLog({ readiness: { recommendation: "low-energy", redFlags: ["dizziness"], reasons: [], date: "x" } });
    render(<HistoryDetailPage params={{ id: "l1" }} />);
    expect(screen.getByText("Readiness at the time")).toBeInTheDocument();
    expect(screen.getByText(/dizziness/)).toBeInTheDocument();
  });

  it("omits the readiness section entirely for older logs with none recorded", () => {
    seedLog();
    render(<HistoryDetailPage params={{ id: "l1" }} />);
    expect(screen.queryByText("Readiness at the time")).not.toBeInTheDocument();
  });
});

describe("HistoryDetailPage: edit mode", () => {
  it("Edit reveals editable inputs; Save persists the change and survives reload", () => {
    seedLog();
    render(<HistoryDetailPage params={{ id: "l1" }} />);

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    const weightInputs = screen.getAllByDisplayValue("20");
    fireEvent.change(weightInputs[0], { target: { value: "35" } });
    fireEvent.click(screen.getByRole("button", { name: /^save changes$/i }));

    expect(screen.getByText(/changes saved/i)).toBeInTheDocument();
    // Persisted to localStorage — a fresh read reflects the edit, not the original.
    expect(loadLogById("l1")!.exercises[0].actualSets[0].weight).toBe(35);
  });

  it("Cancel discards in-progress edits without touching storage", () => {
    seedLog();
    render(<HistoryDetailPage params={{ id: "l1" }} />);

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    const weightInputs = screen.getAllByDisplayValue("20");
    fireEvent.change(weightInputs[0], { target: { value: "99" } });
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(loadLogById("l1")!.exercises[0].actualSets[0].weight).toBe(20);
    expect(screen.getAllByText("20 lb")).toHaveLength(2); // back to the view (unedited) state
  });

  it("editing down to fewer completed sets than planned saves as 'modified', never a silently-invalid 'completed'", () => {
    seedLog();
    render(<HistoryDetailPage params={{ id: "l1" }} />);

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    // Mark set 2 as missed.
    const missToggles = screen.getAllByRole("button", { name: /^completed$/ });
    fireEvent.click(missToggles[1]);
    expect(screen.getByText(/will save as/i)).toBeInTheDocument(); // non-silent warning before save

    fireEvent.click(screen.getByRole("button", { name: /^save changes$/i }));
    expect(loadLogById("l1")!.exercises[0].status).toBe("modified");
  });

  it("shows a clear error and stays in edit mode (never claims success) if the save write fails", () => {
    seedLog();
    render(<HistoryDetailPage params={{ id: "l1" }} />);

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    const weightInputs = screen.getAllByDisplayValue("20");
    fireEvent.change(weightInputs[0], { target: { value: "35" } });

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });
    fireEvent.click(screen.getByRole("button", { name: /^save changes$/i }));
    setItemSpy.mockRestore();

    expect(screen.getByText(/could not save changes/i)).toBeInTheDocument();
    expect(screen.queryByText(/changes saved/i)).not.toBeInTheDocument();
    // Still in edit mode with the draft intact — the edit was never actually persisted.
    expect(screen.getByRole("button", { name: /^save changes$/i })).toBeInTheDocument();
    expect(loadLogById("l1")!.exercises[0].actualSets[0].weight).toBe(20);
  });
});

describe("HistoryDetailPage: delete", () => {
  it("requires confirmation before deleting, and does nothing if declined", () => {
    seedLog();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<HistoryDetailPage params={{ id: "l1" }} />);

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(loadLogById("l1")).toBeDefined(); // declined -> nothing deleted
    expect(push).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("deletes and navigates back to /history once confirmed", () => {
    seedLog();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<HistoryDetailPage params={{ id: "l1" }} />);

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(loadLogById("l1")).toBeUndefined();
    expect(push).toHaveBeenCalledWith("/history");
    confirmSpy.mockRestore();
  });

  it("shows a clear error and does not navigate away if the delete write fails", () => {
    seedLog();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<HistoryDetailPage params={{ id: "l1" }} />);

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    setItemSpy.mockRestore();

    expect(screen.getByText(/could not delete/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(loadLogById("l1")).toBeDefined(); // still there — the delete never actually landed
    confirmSpy.mockRestore();
  });
});

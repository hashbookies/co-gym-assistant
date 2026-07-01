// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ExerciseLogger from "@/components/ExerciseLogger";
import type { ExercisePrescription, ExerciseLog } from "@/lib/types";

function rx(overrides: Partial<ExercisePrescription> = {}): ExercisePrescription {
  return {
    slug: "ex", displayName: "Exercise", equipment: "dumbbell", movementPattern: "squat",
    primaryMuscle: "quads", difficulty: "beginner", image: "", gif: "",
    sets: [3, 3], reps: [8, 12], timeBased: false, restSeconds: 60, rpe: 7,
    substitutions: [], safetyNotes: "s", jointRiskNotes: "j", regression: "r",
    ...overrides,
  };
}

function lastLog(onChange: ReturnType<typeof vi.fn>): ExerciseLog {
  return onChange.mock.calls[onChange.mock.calls.length - 1][0];
}

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("ExerciseLogger: honest logging wiring (component-level, not just the pure builders)", () => {
  it("starts not_started with no completed sets, emitted on mount", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={onChange} />);
    expect(lastLog(onChange).status).toBe("not_started");
    expect(lastLog(onChange).actualSets).toEqual([]);
  });

  it("'Log as planned' emits completed sets only after the explicit tap", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" defaultWeight={25} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /log as planned/i }));
    const log = lastLog(onChange);
    expect(log.status).toBe("completed");
    expect(log.actualSets).toHaveLength(3);
    expect(log.actualSets.every((s) => s.completed)).toBe(true);
    expect(log.actualSets[0].weight).toBe(25);
  });

  it("'Skip' emits a skipped/missed state with no completed sets", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    const log = lastLog(onChange);
    expect(log.status).toBe("skipped");
    expect(log.sessionFeel).toBe("missed");
    expect(log.actualSets).toEqual([]);
  });

  it("'Edit sets' reveals per-set inputs, and editing reps/weight/RPE updates the emitted log", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx({ sets: [2, 2], reps: [8, 12] })} weightUnit="lb" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /edit sets/i }));
    expect(lastLog(onChange).status).toBe("modified");
    expect(lastLog(onChange).actualSets).toHaveLength(2);

    // Both prefilled rows start at the top of the rep range (12) and default RPE (7).
    const repsInputs = screen.getAllByDisplayValue("12");
    fireEvent.change(repsInputs[0], { target: { value: "9" } });
    expect(lastLog(onChange).actualSets[0].reps).toBe(9);

    const weightInputs = screen.getAllByDisplayValue("0"); // no defaultWeight passed
    fireEvent.change(weightInputs[0], { target: { value: "35" } });
    expect(lastLog(onChange).actualSets[0].weight).toBe(35);

    const rpeInputs = screen.getAllByDisplayValue("7");
    fireEvent.change(rpeInputs[0], { target: { value: "8" } });
    expect(lastLog(onChange).actualSets[0].rpe).toBe(8);

    // Marking a set missed flips `completed` — this is manual, not automatic.
    const toggle = screen.getAllByRole("button", { name: /completed/i })[0];
    fireEvent.click(toggle);
    expect(lastLog(onChange).actualSets[0].completed).toBe(false);
  });

  it("'Reset' returns a modified/completed log back to not_started", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /log as planned/i }));
    expect(lastLog(onChange).status).toBe("completed");

    fireEvent.click(screen.getByRole("button", { name: /^reset$/i }));
    expect(lastLog(onChange).status).toBe("not_started");
    expect(lastLog(onChange).actualSets).toEqual([]);
  });
});

describe("ExerciseLogger: numeric inputs don't force 0 mid-edit", () => {
  it("clearing a reps field shows blank (not 0) and doesn't push 0 into the log until blur", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx({ sets: [1, 1], reps: [8, 12] })} weightUnit="lb" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /edit sets/i }));

    const repsInput = screen.getByDisplayValue("12") as HTMLInputElement;
    fireEvent.change(repsInput, { target: { value: "" } });

    expect(repsInput.value).toBe(""); // blank while editing, not "0"
    expect(lastLog(onChange).actualSets[0].reps).toBe(12); // saved value untouched so far

    // Typing a fresh number after clearing updates live — no forced 0 in between.
    fireEvent.change(repsInput, { target: { value: "9" } });
    expect(repsInput.value).toBe("9");
    expect(lastLog(onChange).actualSets[0].reps).toBe(9);
  });

  it("blurring an empty reps field finalizes it to 0 — never NaN", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx({ sets: [1, 1], reps: [8, 12] })} weightUnit="lb" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /edit sets/i }));

    const repsInput = screen.getByDisplayValue("12") as HTMLInputElement;
    fireEvent.change(repsInput, { target: { value: "" } });
    fireEvent.blur(repsInput);

    expect(lastLog(onChange).actualSets[0].reps).toBe(0);
    expect(Number.isNaN(lastLog(onChange).actualSets[0].reps)).toBe(false);
    expect(repsInput.value).toBe("0");
  });

  it("clearing the weight field behaves the same way (blank while editing, 0 only on blur)", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx({ sets: [1, 1] })} weightUnit="lb" defaultWeight={25} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /edit sets/i }));

    const weightInput = screen.getByDisplayValue("25") as HTMLInputElement;
    fireEvent.change(weightInput, { target: { value: "" } });
    expect(weightInput.value).toBe("");
    expect(lastLog(onChange).actualSets[0].weight).toBe(25); // unchanged until blur

    fireEvent.blur(weightInput);
    expect(lastLog(onChange).actualSets[0].weight).toBe(0);
  });

  it("never writes NaN into the log, even for a non-numeric typed value", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx({ sets: [1, 1], reps: [8, 12] })} weightUnit="lb" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /edit sets/i }));

    const repsInput = screen.getByDisplayValue("12") as HTMLInputElement;
    fireEvent.change(repsInput, { target: { value: "abc" } });
    expect(lastLog(onChange).actualSets[0].reps).toBe(12); // invalid text is not live-patched
    expect(Number.isNaN(lastLog(onChange).actualSets[0].reps)).toBe(false);

    fireEvent.blur(repsInput);
    expect(lastLog(onChange).actualSets[0].reps).toBe(0); // finalized to 0, never NaN
    expect(Number.isNaN(lastLog(onChange).actualSets[0].reps)).toBe(false);
  });

  it("'Reset to planned' clears any in-progress draft so it doesn't mask the refreshed values", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx({ sets: [1, 1], reps: [8, 12] })} weightUnit="lb" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /edit sets/i }));

    const repsInput = screen.getByDisplayValue("12") as HTMLInputElement;
    fireEvent.change(repsInput, { target: { value: "" } }); // mid-edit, draft = ""

    fireEvent.click(screen.getByRole("button", { name: /reset to planned/i }));

    // The input should reflect the freshly reset canonical value (12), not the stale blank draft.
    expect(screen.getByDisplayValue("12")).toBeInTheDocument();
    expect(lastLog(onChange).actualSets[0].reps).toBe(12);
  });
});

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

  it("'Log set as planned' logs exactly one set per tap, using the planned reps/RPE and the given weight", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" defaultWeight={25} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i }));
    const log = lastLog(onChange);
    expect(log.status).toBe("in_progress"); // 1 of 3 planned sets — not yet complete, NOT terminal
    expect(log.actualSets).toHaveLength(1);
    expect(log.actualSets[0]).toMatchObject({ setNumber: 1, reps: 12, weight: 25, rpe: 7, completed: true });
    expect(log.sessionFeel).toBe("good");
  });

  it("repeated taps log set 1, then set 2, then set 3, becoming 'completed' only on the last one", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={onChange} />);
    const tap = () => fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i }));

    tap();
    expect(lastLog(onChange).actualSets.map((s) => s.setNumber)).toEqual([1]);
    expect(lastLog(onChange).status).toBe("in_progress");

    tap();
    expect(lastLog(onChange).actualSets.map((s) => s.setNumber)).toEqual([1, 2]);
    expect(lastLog(onChange).status).toBe("in_progress");

    tap();
    expect(lastLog(onChange).actualSets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
    expect(lastLog(onChange).status).toBe("completed"); // all 3 planned sets logged
    expect(lastLog(onChange).actualSets.every((s) => s.completed)).toBe(true);
  });

  it("a fresh exercise starts with 0 logged sets", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={onChange} />);
    expect(lastLog(onChange).actualSets).toHaveLength(0);
    expect(lastLog(onChange).status).toBe("not_started");
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
    render(<ExerciseLogger prescription={rx({ sets: [1, 1] })} weightUnit="lb" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i }));
    expect(lastLog(onChange).status).toBe("completed"); // single planned set — done in one tap

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

describe("ExerciseLogger: guided rest / next-set panel", () => {
  it("the primary quick-log path ('Log set as planned') offers rest after the FIRST tap, with sets remaining", () => {
    const onRequestRestStart = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={vi.fn()} onRequestRestStart={onRequestRestStart} />);
    fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i }));
    expect(screen.getByText("Set 1 logged")).toBeInTheDocument();
    expect(screen.getByText("Next set: 2 of 3")).toBeInTheDocument();
    expect(onRequestRestStart).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Exercise complete")).not.toBeInTheDocument();
  });

  it("no rest is offered once the final planned set is logged — 'Exercise complete' instead", () => {
    const onRequestRestStart = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={vi.fn()} onRequestRestStart={onRequestRestStart} onMoveToNext={vi.fn()} />);
    const tap = () => fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i }));
    tap(); // set 1 -> rest offered
    tap(); // set 2 -> rest offered
    onRequestRestStart.mockClear();
    tap(); // set 3 -> exercise complete, no more rest

    expect(screen.getByText("Exercise complete")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /move to next exercise/i })).toBeInTheDocument();
    expect(onRequestRestStart).not.toHaveBeenCalled();
    expect(screen.queryByText(/set.*logged/)).not.toBeInTheDocument();
    expect(screen.queryByText(/next set/i)).not.toBeInTheDocument();
  });

  it("no guided panel appears for not_started or skipped", () => {
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={vi.fn()} />);
    expect(screen.queryByText("Exercise complete")).not.toBeInTheDocument();
    expect(screen.queryByText(/set.*left/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    expect(screen.queryByText("Exercise complete")).not.toBeInTheDocument();
    expect(screen.queryByText(/set.*left/i)).not.toBeInTheDocument();
  });

  it("onRequestRestStart fires exactly once per quick-log tap while sets remain, and not on the final (completing) tap", () => {
    const onRequestRestStart = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={vi.fn()} onRequestRestStart={onRequestRestStart} />);
    const tap = () => fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i }));

    tap(); // set 1 of 3 -> in_progress, rest offered
    expect(onRequestRestStart).toHaveBeenCalledTimes(1);

    tap(); // set 2 of 3 -> still in_progress, rest offered again
    expect(onRequestRestStart).toHaveBeenCalledTimes(2);

    tap(); // set 3 of 3 -> completed, no more rest
    expect(onRequestRestStart).toHaveBeenCalledTimes(2);
  });

  it("the rest timer is idle (not counting) unless the parent marks isResting true — starting rest never alters the log", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={onChange} isResting={false} />);
    fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i })); // 1 of 3 -> in_progress

    expect(screen.getByRole("button", { name: /start rest/i })).toBeInTheDocument();
    const before = lastLog(onChange);
    fireEvent.click(screen.getByRole("button", { name: /start rest/i }));
    // Starting/offering rest must never itself change the exercise log.
    expect(lastLog(onChange)).toEqual(before);
  });

  it("'Start next set' from the guided panel does not alter the exercise log itself", () => {
    const onChange = vi.fn();
    const onStartNextSet = vi.fn();
    render(
      <ExerciseLogger
        prescription={rx()} weightUnit="lb" onChange={onChange}
        isResting onStartNextSet={onStartNextSet}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i })); // 1 of 3 -> in_progress

    const before = lastLog(onChange);
    fireEvent.click(screen.getByRole("button", { name: /^start next set$/i }));
    expect(onStartNextSet).toHaveBeenCalledTimes(1);
    expect(lastLog(onChange)).toEqual(before);
  });

  it("'Finish as modified' terminalizes an in_progress exercise, preserving exactly the sets already logged", () => {
    const onChange = vi.fn();
    const onRequestRestStop = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={onChange} isResting onRequestRestStop={onRequestRestStop} />);
    fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i })); // 1 of 3 -> in_progress
    expect(lastLog(onChange).status).toBe("in_progress");

    fireEvent.click(screen.getByRole("button", { name: /^finish as modified$/i }));
    const log = lastLog(onChange);
    expect(log.status).toBe("modified");
    expect(log.actualSets).toHaveLength(1); // no fake sets added
    expect(log.actualSets[0].setNumber).toBe(1);
    expect(onRequestRestStop).toHaveBeenCalled(); // rest timer stopped

    expect(screen.getByText("Exercise finished as modified")).toBeInTheDocument();
    expect(screen.queryByText(/next set/i)).not.toBeInTheDocument();
  });

  it("'Edit sets' immediately terminalizes as 'modified' — no rest is ever offered from the manual editor", () => {
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i })); // 1 of 3 -> in_progress
    fireEvent.click(screen.getByRole("button", { name: /^edit sets$/i }));

    expect(screen.queryByText(/next set/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^start rest/i })).not.toBeInTheDocument();
  });

  it("'Edit sets' after a partial quick-log preserves the already-logged set and fills in the rest", () => {
    const onChange = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" defaultWeight={25} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i })); // set 1 logged (weight 25)

    fireEvent.click(screen.getByRole("button", { name: /^edit sets$/i }));
    const log = lastLog(onChange);
    expect(log.actualSets).toHaveLength(3); // all 3 rows now present
    expect(log.actualSets[0]).toMatchObject({ setNumber: 1, weight: 25, completed: true }); // preserved as-logged
    expect(log.actualSets[1]).toMatchObject({ setNumber: 2, completed: true }); // filled in as planned
    expect(log.actualSets[2]).toMatchObject({ setNumber: 3, completed: true });
    // All 3 rows are now visible in the editor.
    expect(screen.getAllByRole("button", { name: /^completed$/ })).toHaveLength(3);
  });

  it("'Skip' from mid-way through quick-logging discards the partial sets and starts no rest timer", () => {
    const onChange = vi.fn();
    const onRequestRestStart = vi.fn();
    render(<ExerciseLogger prescription={rx()} weightUnit="lb" onChange={onChange} onRequestRestStart={onRequestRestStart} />);
    fireEvent.click(screen.getByRole("button", { name: /^log set as planned$/i }));
    onRequestRestStart.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    const log = lastLog(onChange);
    expect(log.status).toBe("skipped");
    expect(log.actualSets).toEqual([]);
    expect(onRequestRestStart).not.toHaveBeenCalled();
    expect(screen.queryByText(/rest/i)).not.toBeInTheDocument();
  });
});

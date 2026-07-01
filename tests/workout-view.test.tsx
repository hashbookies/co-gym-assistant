// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import WorkoutView from "@/components/WorkoutView";
import type { ExercisePrescription, Workout } from "@/lib/types";

function rx(overrides: Partial<ExercisePrescription> = {}): ExercisePrescription {
  return {
    slug: "ex", displayName: "Exercise", equipment: "dumbbell", movementPattern: "squat",
    primaryMuscle: "quads", difficulty: "beginner", image: "/images/x.jpg", gif: "/videos/x.gif",
    sets: [3, 3], reps: [8, 12], timeBased: false, restSeconds: 60, rpe: 7,
    substitutions: [], safetyNotes: "s", jointRiskNotes: "j", regression: "r",
    ...overrides,
  };
}

const workout: Workout = {
  id: "w1", title: "Test Workout", mode: "normal", dayIndex: 0, emphasis: "Squat",
  warmup: [rx({ slug: "warm-a", displayName: "Warm A", image: "/images/w.jpg", gif: "/videos/w.gif" })],
  main: [
    rx({ slug: "main-a", displayName: "Main A", image: "/images/m1.jpg", gif: "/videos/m1.gif" }),
    rx({ slug: "main-b", displayName: "Main B", image: "/images/m2.jpg", gif: "/videos/m2.gif" }),
  ],
  createdAt: new Date().toISOString(),
};

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("WorkoutView: only one demo/timer runs at a time (warm-up + main)", () => {
  it("starting another card's demo stops whichever card was previously active", () => {
    render(<WorkoutView workout={workout} />);

    // Order: warm-up card, main-a, main-b.
    const startButtons = () => screen.getAllByRole("button", { name: /start/i });
    expect(startButtons()).toHaveLength(3);

    // Start main-a's demo.
    fireEvent.click(startButtons()[1]);
    let imgs = screen.getAllByRole("img");
    expect(imgs[0]).toHaveAttribute("src", "/images/w.jpg"); // warm-up untouched
    expect(imgs[1]).toHaveAttribute("src", "/videos/m1.gif"); // main-a now playing
    expect(imgs[2]).toHaveAttribute("src", "/images/m2.jpg"); // main-b untouched

    // Starting the warm-up card's demo should stop main-a's.
    fireEvent.click(startButtons()[0]); // main-a's button is now "Stop", so index 0 is warm-up
    imgs = screen.getAllByRole("img");
    expect(imgs[0]).toHaveAttribute("src", "/videos/w.gif"); // warm-up now playing
    expect(imgs[1]).toHaveAttribute("src", "/images/m1.jpg"); // main-a stopped, back to thumbnail
    expect(imgs[2]).toHaveAttribute("src", "/images/m2.jpg"); // main-b still untouched

    // Only one "Stop" button should exist at any time.
    expect(screen.getAllByRole("button", { name: /stop/i })).toHaveLength(1);
  });
});

describe("WorkoutView: completion gate blocks incomplete logging", () => {
  it("keeps Complete disabled until every main exercise is logged/skipped, then reports the right statuses", () => {
    const onComplete = vi.fn();
    render(<WorkoutView workout={workout} onComplete={onComplete} />);

    const completeButton = () => screen.getByTestId("complete-workout-button");
    expect(completeButton()).toBeDisabled();

    // Log main-a's 3 planned sets one at a time (sets:[3,3] default).
    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);
    expect(completeButton()).toBeDisabled(); // main-b still not_started
    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);

    // Skip main-b (the last remaining "Skip" button — main-a's logger now shows
    // its own "completed" state with a different Skip button too).
    const skipButtons = screen.getAllByRole("button", { name: /^skip$/i });
    fireEvent.click(skipButtons[skipButtons.length - 1]);

    expect(completeButton()).not.toBeDisabled();
    expect(onComplete).not.toHaveBeenCalled(); // never auto-fires

    fireEvent.click(completeButton());
    expect(onComplete).toHaveBeenCalledTimes(1);

    const exercises = onComplete.mock.calls[0][1];
    expect(exercises).toHaveLength(2);
    expect(exercises.find((e: { exerciseSlug: string }) => e.exerciseSlug === "main-a")?.status).toBe("completed");
    expect(exercises.find((e: { exerciseSlug: string }) => e.exerciseSlug === "main-b")?.status).toBe("skipped");
  });

  it("clicking the disabled Complete button does nothing", () => {
    const onComplete = vi.fn();
    render(<WorkoutView workout={workout} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId("complete-workout-button"));
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe("WorkoutView: sticky completion bar uses count-based copy, not an inline name list", () => {
  it("shows a count and subtext while incomplete, with no exercise names listed", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    expect(screen.getByText("2 exercises left to log")).toBeInTheDocument();
    expect(screen.getByText("Log or skip each main exercise to finish.")).toBeInTheDocument();
    // The old long-form "Still to do: Main A, Main B" listing must be gone.
    expect(screen.queryByText(/still to do/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/main a.*main b/i)).not.toBeInTheDocument();
  });

  it("switches to 'Ready to complete workout' once every main exercise is logged/skipped", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    // Fully log main-a's 3 planned sets (a single tap only reaches "in_progress",
    // which is NOT terminal and must not satisfy the completion gate).
    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^skip$/i }).pop()!);
    expect(screen.getByText("Ready to complete workout")).toBeInTheDocument();
    expect(screen.queryByText(/exercises left to log/i)).not.toBeInTheDocument();
    // Button label itself never changes — only its disabled state does.
    expect(screen.getByTestId("complete-workout-button")).toHaveTextContent("Mark workout complete");
  });

  it("singular copy reads '1 exercise left to log'", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    // main-a must be fully completed (terminal) to count as "logged" — a
    // single in_progress tap must not make it count.
    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);
    expect(screen.getByText("2 exercises left to log")).toBeInTheDocument(); // still in_progress, not terminal
    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);
    expect(screen.getByText("1 exercise left to log")).toBeInTheDocument();
  });
});

describe("WorkoutView: warm-up exercises never count toward or block completion", () => {
  it("pending count and completion gate only consider main exercises, never the warm-up", () => {
    const onComplete = vi.fn();
    render(<WorkoutView workout={workout} onComplete={onComplete} />);
    // 1 warm-up + 2 main exist, but the count only reflects the 2 main exercises.
    expect(screen.getByText("2 exercises left to log")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^log set as planned$/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^skip$/i }).pop()!);

    expect(screen.getByTestId("complete-workout-button")).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("complete-workout-button"));
    // Completion never depends on (or reports) the warm-up exercise.
    const exercises = onComplete.mock.calls[0][1];
    expect(exercises).toHaveLength(2);
    expect(exercises.some((e: { exerciseSlug: string }) => e.exerciseSlug === "warm-a")).toBe(false);
  });

  it("warm-up cards render no Log as planned / Edit sets / Skip controls", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    // Only the 2 main exercises should offer logging actions, never the warm-up.
    expect(screen.getAllByRole("button", { name: /^log set as planned$/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^edit sets$/i })).toHaveLength(2);
  });

  it("only main cards show the 'Log this exercise' logger label, never the warm-up", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    expect(screen.getAllByText("Log this exercise")).toHaveLength(2);
  });
});

describe("WorkoutView: logger is merged into the same card surface as its exercise", () => {
  it("renders the logger inside the corresponding exercise-card test id for each main exercise", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    const cardA = screen.getByTestId("exercise-card-main-a");
    const cardB = screen.getByTestId("exercise-card-main-b");
    expect(within(cardA).getByTestId("exercise-logger-main-a")).toBeInTheDocument();
    expect(within(cardB).getByTestId("exercise-logger-main-b")).toBeInTheDocument();
    // Cross-check: card A must not contain card B's logger, and vice versa.
    expect(within(cardA).queryByTestId("exercise-logger-main-b")).not.toBeInTheDocument();
    expect(within(cardB).queryByTestId("exercise-logger-main-a")).not.toBeInTheDocument();
  });

  it("the warm-up exercise card renders no logger at all", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    const warmCard = screen.getByTestId("exercise-card-warm-a");
    expect(within(warmCard).queryByTestId(/exercise-logger-/)).not.toBeInTheDocument();
  });

  it("no separate bordered logger card exists outside of exercise-card-* (one surface per exercise)", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    // Every logger must be a descendant of its exercise card, not a sibling.
    const loggerA = screen.getByTestId("exercise-logger-main-a");
    const cardA = screen.getByTestId("exercise-card-main-a");
    expect(cardA.contains(loggerA)).toBe(true);
  });
});

describe("WorkoutView: guided rest timer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Leaves exactly 1 of 3 planned sets logged on the given card via the
  // primary quick-log path — this alone reaches "in_progress", which is
  // exactly the state that offers a rest timer.
  function partiallyLogOneSet(card: HTMLElement) {
    fireEvent.click(within(card).getByRole("button", { name: /^log set as planned$/i }));
  }

  it("rest timer auto-starts after a partial log, counts down, and beeps at zero without touching the log", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    const cardA = screen.getByTestId("exercise-card-main-a");
    partiallyLogOneSet(cardA);

    expect(within(cardA).getByText("Set 1 logged")).toBeInTheDocument();
    expect(within(cardA).getByText("Next set: 2 of 3")).toBeInTheDocument();
    expect(within(cardA).getByText("Rest 01:00")).toBeInTheDocument();
    expect(within(cardA).getByText("In progress")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(30000));
    expect(within(cardA).getByText("Rest 00:30")).toBeInTheDocument();
    // The ticking countdown never logs anything — still exactly 1 set logged.
    expect(within(cardA).getByText("Set 1 logged")).toBeInTheDocument();
    expect(within(cardA).getByText("In progress")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(30000));
    expect(within(cardA).getByText("Rest complete")).toBeInTheDocument();
    expect(within(cardA).getByRole("button", { name: /^start next set$/i })).toBeInTheDocument();
    expect(within(cardA).getByText("Set 1 logged")).toBeInTheDocument();
    expect(within(cardA).getByText("In progress")).toBeInTheDocument();
  });

  it("'Skip rest' ends the countdown early without logging anything", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    const cardA = screen.getByTestId("exercise-card-main-a");
    partiallyLogOneSet(cardA);

    expect(within(cardA).getByText("Rest 01:00")).toBeInTheDocument();
    fireEvent.click(within(cardA).getByRole("button", { name: /^skip rest$/i }));

    expect(within(cardA).getByText("Rest skipped")).toBeInTheDocument();
    expect(within(cardA).getByText("Set 1 logged")).toBeInTheDocument();
    expect(within(cardA).getByText("In progress")).toBeInTheDocument();
  });

  it("'Start next set' starts the exercise's own work/demo timer (same as tapping Start)", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    const cardA = screen.getByTestId("exercise-card-main-a");
    partiallyLogOneSet(cardA);

    fireEvent.click(within(cardA).getByRole("button", { name: /^start next set$/i }));
    // The card's own demo/work timer is now the active one — its Start button
    // becomes Stop and the gif is showing, exactly like tapping Start directly.
    expect(within(cardA).getByRole("button", { name: /^■ stop$/i })).toBeInTheDocument();
    const img = within(cardA).getAllByRole("img")[0];
    expect(img).toHaveAttribute("src", "/videos/m1.gif");
  });

  it("starting another card's work timer cancels an in-progress rest timer", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    const cardA = screen.getByTestId("exercise-card-main-a");
    const cardB = screen.getByTestId("exercise-card-main-b");
    partiallyLogOneSet(cardA);
    expect(within(cardA).getByText("Rest 01:00")).toBeInTheDocument();

    fireEvent.click(within(cardB).getByRole("button", { name: /^▶ start$/i }));

    // Card A's rest timer was cancelled — it now reads as skipped, not still counting.
    expect(within(cardA).queryByText(/^Rest 0/)).not.toBeInTheDocument();
    expect(within(cardA).getByText("Rest skipped")).toBeInTheDocument();
    // Card B's work timer is the one now running.
    expect(within(cardB).getByRole("button", { name: /^■ stop$/i })).toBeInTheDocument();
  });

  it("starting a rest timer cancels an in-progress work/demo timer elsewhere", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    const cardA = screen.getByTestId("exercise-card-main-a");
    const cardB = screen.getByTestId("exercise-card-main-b");

    fireEvent.click(within(cardB).getByRole("button", { name: /^▶ start$/i }));
    expect(within(cardB).getByRole("button", { name: /^■ stop$/i })).toBeInTheDocument();

    partiallyLogOneSet(cardA); // auto-starts card A's rest timer
    expect(within(cardA).getByText("Rest 01:00")).toBeInTheDocument();

    // Card B's work timer was cancelled by the new rest timer starting.
    expect(within(cardB).getByRole("button", { name: /^▶ start$/i })).toBeInTheDocument();
  });

  it("does not recommend rest for a skipped exercise, and completing all sets shows 'Exercise complete' with no rest offer", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    const cardA = screen.getByTestId("exercise-card-main-a");
    const cardB = screen.getByTestId("exercise-card-main-b");

    fireEvent.click(within(cardB).getByRole("button", { name: /^skip$/i }));
    // The always-present "Rest" stat label (Sets/Reps/Rest/RPE grid) is fine —
    // only the guided rest-timer panel itself must be absent.
    expect(within(cardB).queryByText(/^Rest \d/)).not.toBeInTheDocument();
    expect(within(cardB).queryByText(/^Start rest/)).not.toBeInTheDocument();
    expect(within(cardB).queryByText("Exercise complete")).not.toBeInTheDocument();

    // Log all 3 of card A's planned sets, one tap at a time.
    fireEvent.click(within(cardA).getByRole("button", { name: /^log set as planned$/i }));
    fireEvent.click(within(cardA).getByRole("button", { name: /^log set as planned$/i }));
    fireEvent.click(within(cardA).getByRole("button", { name: /^log set as planned$/i }));
    expect(within(cardA).getByText("Exercise complete")).toBeInTheDocument();
    expect(within(cardA).queryByText(/^Rest \d/)).not.toBeInTheDocument();
    expect(within(cardA).queryByText(/^Start rest/)).not.toBeInTheDocument();
  });

  it("an in_progress exercise (1 of 3 sets tapped) does NOT satisfy the completion gate — the core fix", () => {
    const onComplete = vi.fn();
    render(<WorkoutView workout={workout} onComplete={onComplete} />);
    const cardA = screen.getByTestId("exercise-card-main-a");
    partiallyLogOneSet(cardA); // main-a is "in_progress" — NOT terminal — main-b still not_started

    // Both main exercises are still pending: in_progress must not count as "logged".
    expect(screen.getByText("2 exercises left to log")).toBeInTheDocument();
    expect(screen.getByTestId("complete-workout-button")).toBeDisabled();

    act(() => vi.advanceTimersByTime(60000)); // rest timer finishes naturally — no effect on the gate
    expect(screen.getByText("2 exercises left to log")).toBeInTheDocument();
    expect(screen.getByTestId("complete-workout-button")).toBeDisabled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("'Finish as modified' terminalizes an in_progress exercise so it DOES satisfy the completion gate", () => {
    const onComplete = vi.fn();
    render(<WorkoutView workout={workout} onComplete={onComplete} />);
    const cardA = screen.getByTestId("exercise-card-main-a");
    const cardB = screen.getByTestId("exercise-card-main-b");
    partiallyLogOneSet(cardA); // main-a is "in_progress"
    expect(screen.getByText("2 exercises left to log")).toBeInTheDocument();

    fireEvent.click(within(cardA).getByRole("button", { name: /^finish as modified$/i }));
    expect(within(cardA).getByText("Exercise finished as modified")).toBeInTheDocument();
    expect(screen.getByText("1 exercise left to log")).toBeInTheDocument(); // only main-b now pending

    fireEvent.click(within(cardB).getByRole("button", { name: /^skip$/i }));
    expect(screen.getByTestId("complete-workout-button")).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("complete-workout-button"));

    const exercises = onComplete.mock.calls[0][1];
    expect(exercises.find((e: { exerciseSlug: string }) => e.exerciseSlug === "main-a")?.status).toBe("modified");
    expect(exercises.find((e: { exerciseSlug: string }) => e.exerciseSlug === "main-a")?.actualSets).toHaveLength(1);
  });
});

describe("WorkoutView: log prompt only appears on loggable (main) cards, never warm-up", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("warm-up card's timer finishing shows 'Time's up' but never a logging instruction", () => {
    render(<WorkoutView workout={workout} />);
    // Order: warm-up card, main-a, main-b.
    fireEvent.click(screen.getAllByRole("button", { name: /start/i })[0]);
    act(() => {
      vi.advanceTimersByTime(90000); // MAX_WORK_SECONDS, generously covers any computed duration
    });
    expect(screen.getByText(/time.?s up/i)).toBeInTheDocument();
    expect(screen.queryByText(/log your set when ready/i)).not.toBeInTheDocument();
  });

  it("a main exercise's timer finishing does show the logging instruction", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    // main-a is the second Start button (after the warm-up card).
    fireEvent.click(screen.getAllByRole("button", { name: /start/i })[1]);
    act(() => {
      vi.advanceTimersByTime(90000);
    });
    expect(screen.getByText(/time.?s up/i)).toBeInTheDocument();
    expect(screen.getByText(/log your set when ready/i)).toBeInTheDocument();
    // The timer finishing never auto-logs — both main exercises are still pending.
    expect(screen.getByText("2 exercises left to log")).toBeInTheDocument();
    expect(screen.getByTestId("complete-workout-button")).toBeDisabled();
  });
});

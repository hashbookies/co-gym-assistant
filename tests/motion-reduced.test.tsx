// @vitest-environment jsdom
// Reduced-motion safety: with prefers-reduced-motion enabled, every animated
// surface must render and function identically — no crashes, no missing
// content, no blocked interactions. (tests/setup.ts polyfills matchMedia with
// a controllable flag.)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={typeof href === "string" ? href : "#"}>{children}</a>,
}));

import WorkoutView from "@/components/WorkoutView";
import HistoryPage from "@/app/history/page";
import type { ExercisePrescription, Workout } from "@/lib/types";

const setReducedMotion = (v: boolean) =>
  (globalThis as unknown as { __setReducedMotion: (v: boolean) => void }).__setReducedMotion(v);

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
  warmup: [rx({ slug: "warm-a", displayName: "Warm A" })],
  main: [
    rx({ slug: "main-a", displayName: "Main A" }),
    rx({ slug: "main-b", displayName: "Main B" }),
  ],
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
  setReducedMotion(true);
});
afterEach(() => {
  setReducedMotion(false);
  cleanup();
});

describe("reduced motion: workout flow is fully functional", () => {
  it("renders all exercise cards and the completion bar without crashing", () => {
    render(<WorkoutView workout={workout} onComplete={vi.fn()} />);
    expect(screen.getByTestId("exercise-card-warm-a")).toBeInTheDocument();
    expect(screen.getByTestId("exercise-card-main-a")).toBeInTheDocument();
    expect(screen.getByTestId("exercise-card-main-b")).toBeInTheDocument();
    expect(screen.getByTestId("complete-workout-button")).toBeDisabled();
  });

  it("quick-logging still offers the rest panel and the completion gate still works end-to-end", () => {
    const onComplete = vi.fn();
    render(<WorkoutView workout={workout} onComplete={onComplete} />);
    const cardA = screen.getByTestId("exercise-card-main-a");

    fireEvent.click(within(cardA).getByRole("button", { name: /^log set as planned$/i }));
    expect(within(cardA).getByText("Set 1 logged")).toBeInTheDocument();
    expect(within(cardA).getByText("Rest 01:00")).toBeInTheDocument();

    fireEvent.click(within(cardA).getByRole("button", { name: /^log set as planned$/i }));
    fireEvent.click(within(cardA).getByRole("button", { name: /^log set as planned$/i }));
    expect(within(cardA).getByText("Exercise complete")).toBeInTheDocument();

    const cardB = screen.getByTestId("exercise-card-main-b");
    fireEvent.click(within(cardB).getByRole("button", { name: /^skip$/i }));

    expect(screen.getByTestId("complete-workout-button")).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("complete-workout-button"));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe("reduced motion: pages render without crashing", () => {
  it("history page renders its empty state", () => {
    render(<HistoryPage />);
    expect(screen.getByText(/no workouts logged yet/i)).toBeInTheDocument();
  });
});

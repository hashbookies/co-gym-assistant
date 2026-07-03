// @vitest-environment jsdom
// Phase 3E: graceful media-unavailable UX for ExerciseMedia and the library
// detail page. No broken image icon, an explicit "Demo unavailable" state, a
// pointer to the written steps, and instructions that render regardless.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    <a href={typeof href === "string" ? href : "#"}>{children}</a>,
}));

import ExerciseMedia from "@/components/ExerciseMedia";

beforeEach(() => cleanup());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---- 6: ExerciseMedia unavailable states -----------------------------------

describe("ExerciseMedia: no media at all", () => {
  it("eager mode with no candidates shows 'Demo unavailable' and points to the written steps (no img)", () => {
    const { container } = render(<ExerciseMedia mode="eager" alt="Some exercise" />);
    expect(screen.getByText(/demo unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/written steps below/i)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull(); // no broken image icon
  });

  it("lazyDemo mode with no gif disables Start and labels it 'Demo unavailable'", () => {
    render(<ExerciseMedia mode="lazyDemo" image="/runtime-media/images/x.jpg" alt="Some exercise" durationSeconds={30} />);
    const btn = screen.getByRole("button", { name: /demo unavailable/i });
    expect(btn).toBeDisabled();
    // Never surfaces a "Start" affordance when there's nothing to play.
    expect(screen.queryByRole("button", { name: /start/i })).toBeNull();
  });
});

describe("ExerciseMedia: eager candidates all fail at runtime", () => {
  it("falls back to the 'Demo unavailable' placeholder after every candidate errors", () => {
    const { container } = render(
      <ExerciseMedia mode="eager" gif="/runtime-media/videos/missing.gif" image="/runtime-media/images/missing.jpg" alt="Broken exercise" />,
    );
    // Exhaust all candidates by firing onError until the img is gone.
    for (let i = 0; i < 8; i++) {
      const img = container.querySelector("img");
      if (!img) break;
      fireEvent.error(img);
    }
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/demo unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/written steps below/i)).toBeInTheDocument();
  });
});

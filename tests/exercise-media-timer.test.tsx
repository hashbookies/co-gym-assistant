// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ExerciseMedia from "@/components/ExerciseMedia";
import * as sound from "@/lib/sound";

beforeEach(() => {
  cleanup();
  vi.useFakeTimers();
  vi.spyOn(sound, "playBeep").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ExerciseMedia lazyDemo: countdown auto-stops the gif at zero", () => {
  it("hides the gif, returns to the thumbnail, and shows the finished state — without restarting", () => {
    render(
      <ExerciseMedia mode="lazyDemo" gif="/videos/test.gif" image="/images/test.jpg" alt="Test exercise" durationSeconds={2} showLogPrompt />,
    );

    // Static thumbnail by default.
    expect(screen.getByRole("img")).toHaveAttribute("src", "/images/test.jpg");

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/videos/test.gif");

    // Countdown is live and readable mid-flight (mm:ss format).
    expect(screen.getByText("00:02")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("00:01")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Countdown finished: gif hidden, back to the thumbnail, finished state shown, beep played.
    expect(screen.getByRole("img")).toHaveAttribute("src", "/images/test.jpg");
    expect(screen.getByText(/time.?s up/i)).toBeInTheDocument();
    expect(screen.getByText(/log your set when ready/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
    expect(sound.playBeep).toHaveBeenCalledTimes(1);

    // The countdown must not silently restart on its own. (Note: the finished
    // chip's enter animation may briefly hold a motion-internal timer, so we
    // assert behaviorally — advancing well past the original duration must
    // never bring the gif/countdown back or beep again.)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("img")).toHaveAttribute("src", "/images/test.jpg");
    expect(screen.getByText(/time.?s up/i)).toBeInTheDocument();
    expect(screen.queryByText(/^00:\d\d$/)).not.toBeInTheDocument(); // no countdown running
    expect(sound.playBeep).toHaveBeenCalledTimes(1); // still only once
  });

  it("manual Stop before the countdown finishes hides the gif, clears the timer, and plays no beep", () => {
    render(
      <ExerciseMedia mode="lazyDemo" gif="/videos/test.gif" image="/images/test.jpg" alt="Test exercise" durationSeconds={30} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/videos/test.gif");

    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/images/test.jpg");
    expect(screen.queryByText(/time.?s up/i)).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    expect(sound.playBeep).not.toHaveBeenCalled();
  });

  it("re-tapping Start after a natural finish clears the finished state and restarts the countdown", () => {
    render(
      <ExerciseMedia mode="lazyDemo" gif="/videos/test.gif" image="/images/test.jpg" alt="Test exercise" durationSeconds={2} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/time.?s up/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/videos/test.gif");
    expect(screen.queryByText(/time.?s up/i)).not.toBeInTheDocument();
  });
});

describe("ExerciseMedia lazyDemo: showLogPrompt", () => {
  it("does NOT show 'Log your set when ready' by default (e.g. warm-up cards), even though 'Time's up' still shows", () => {
    render(
      <ExerciseMedia mode="lazyDemo" gif="/videos/test.gif" image="/images/test.jpg" alt="Warm-up exercise" durationSeconds={2} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/time.?s up/i)).toBeInTheDocument();
    expect(screen.queryByText(/log your set when ready/i)).not.toBeInTheDocument();
  });

  it("shows 'Log your set when ready' when showLogPrompt is true (loggable main-work cards)", () => {
    render(
      <ExerciseMedia mode="lazyDemo" gif="/videos/test.gif" image="/images/test.jpg" alt="Main exercise" durationSeconds={2} showLogPrompt />,
    );
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/time.?s up/i)).toBeInTheDocument();
    expect(screen.getByText(/log your set when ready/i)).toBeInTheDocument();
  });
});

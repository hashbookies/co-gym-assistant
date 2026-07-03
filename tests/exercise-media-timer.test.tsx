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

    // Static thumbnail by default (runtime preferred).
    expect(screen.getByRole("img")).toHaveAttribute("src", "/runtime-media/images/test.jpg");

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/runtime-media/videos/test.gif");

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
    expect(screen.getByRole("img")).toHaveAttribute("src", "/runtime-media/images/test.jpg");
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
    expect(screen.getByRole("img")).toHaveAttribute("src", "/runtime-media/images/test.jpg");
    expect(screen.getByText(/time.?s up/i)).toBeInTheDocument();
    expect(screen.queryByText(/^00:\d\d$/)).not.toBeInTheDocument(); // no countdown running
    expect(sound.playBeep).toHaveBeenCalledTimes(1); // still only once
  });

  it("manual Stop before the countdown finishes hides the gif, clears the timer, and plays no beep", () => {
    render(
      <ExerciseMedia mode="lazyDemo" gif="/videos/test.gif" image="/images/test.jpg" alt="Test exercise" durationSeconds={30} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/runtime-media/videos/test.gif");

    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    expect(screen.getByRole("img")).toHaveAttribute("src", "/runtime-media/images/test.jpg");
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
    expect(screen.getByRole("img")).toHaveAttribute("src", "/runtime-media/videos/test.gif");
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

describe("ExerciseMedia candidate resolution & fallbacks", () => {
  it("prefers runtime media path first, then local public path as fallback", () => {
    render(
      <ExerciseMedia mode="lazyDemo" gif="/videos/test.gif" image="/images/test.jpg" alt="Test Exercise" />
    );

    const img = screen.getByRole("img");
    // Preferred first: /runtime-media/images/...
    expect(img).toHaveAttribute("src", "/runtime-media/images/test.jpg");

    // Simulate error on runtime media path -> should fall back to local public path
    fireEvent.error(img);
    expect(img).toHaveAttribute("src", "/images/test.jpg");
  });

  it("renders placeholder when all image candidates fail", () => {
    render(
      <ExerciseMedia mode="lazyDemo" gif="/videos/test.gif" image="/images/test.jpg" alt="Test Exercise" />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/runtime-media/images/test.jpg");

    // Fail runtime-media image path
    fireEvent.error(img);
    expect(img).toHaveAttribute("src", "/images/test.jpg");

    // Fail local public image path
    fireEvent.error(img);

    // Should render placeholder container instead of img
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Test Exercise")).toBeInTheDocument();
    expect(screen.getByText("Demo unavailable")).toBeInTheDocument();
  });

  it("handles gif candidate resolution fallback and disables the button when all fail", () => {
    render(
      <ExerciseMedia mode="lazyDemo" gif="/videos/test.gif" image="/images/test.jpg" alt="Test Exercise" />
    );

    // Start playback to reveal GIF
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    const gifImg = screen.getByRole("img");

    // Preferred first: /runtime-media/videos/...
    expect(gifImg).toHaveAttribute("src", "/runtime-media/videos/test.gif");

    // Fail runtime-media video path
    fireEvent.error(gifImg);
    expect(gifImg).toHaveAttribute("src", "/videos/test.gif");

    // Fail local public video path
    fireEvent.error(gifImg);

    // GIF failed completely: should show "Demo unavailable" disabled button
    expect(screen.getByRole("button", { name: /demo unavailable/i })).toBeDisabled();
    // Should fall back to rendering the static image
    const finalImg = screen.getByRole("img");
    expect(finalImg).toHaveAttribute("src", "/runtime-media/images/test.jpg");
  });

  it("preserves remote HTTP/HTTPS URLs directly without adding local prefixes", () => {
    render(
      <ExerciseMedia mode="lazyDemo" gif="https://example.com/demo.gif" image="https://example.com/thumb.jpg" alt="Remote Exercise" />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/thumb.jpg");

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    const gifImg = screen.getByRole("img");
    expect(gifImg).toHaveAttribute("src", "https://example.com/demo.gif");
  });

  it("disables the Start button when no playable demo is provided at all", () => {
    render(
      <ExerciseMedia mode="lazyDemo" image="/images/test.jpg" alt="No Gif Exercise" />
    );

    expect(screen.getByRole("button", { name: /demo unavailable/i })).toBeDisabled();
  });
});


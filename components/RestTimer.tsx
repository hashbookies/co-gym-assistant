"use client";

import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/timing";
import { playBeep } from "@/lib/sound";
import { CheckCircleIcon } from "@/components/icons";

/**
 * Guidance-only rest countdown between sets. Mirrors ExerciseMedia's
 * controlled-timer pattern so it can share WorkoutView's "one active timer"
 * coordination: `isActive` is owned by the parent, this component only owns
 * the visible remaining/ended state.
 *
 * Never logs anything — it just counts down, beeps, and asks the user to
 * explicitly tap "Start next set", which the parent wires to the same
 * work-timer start used by the exercise's own Start button.
 */
export default function RestTimer({
  seconds,
  isActive,
  onRequestStart,
  onRequestStop,
  onStartNextSet,
}: {
  seconds: number;
  isActive: boolean;
  onRequestStart: () => void;
  onRequestStop: () => void;
  onStartNextSet: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [ended, setEnded] = useState<"finished" | "skipped" | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Distinguishes "the countdown reached zero on its own" from "the parent
  // turned isActive off because the user skipped/stopped it" — only the
  // latter should be labeled "skipped" instead of "finished".
  const endedNaturallyRef = useRef(false);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!isActive) {
      if (endedNaturallyRef.current) {
        endedNaturallyRef.current = false;
      } else if (wasActiveRef.current) {
        setEnded("skipped");
      }
      wasActiveRef.current = false;
      return;
    }
    wasActiveRef.current = true;
    setEnded(null);
    setRemaining(seconds);
    let secondsLeft = seconds;
    intervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setRemaining(0);
        setEnded("finished");
        playBeep();
        endedNaturallyRef.current = true;
        onRequestStop();
      } else {
        setRemaining(secondsLeft);
      }
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, seconds]);

  if (ended === "finished") {
    return (
      <div className="rounded-xl bg-brand-50 p-2.5 text-center">
        <p className="flex items-center justify-center gap-1 text-xs font-semibold text-brand-700">
          <CheckCircleIcon className="h-3.5 w-3.5" /> Rest complete
        </p>
        <button onClick={onStartNextSet} className="btn-primary mt-2 w-full py-2 text-xs">
          Start next set
        </button>
      </div>
    );
  }

  if (ended === "skipped") {
    return (
      <div className="rounded-xl bg-stone-100 p-2.5 text-center">
        <p className="text-xs font-semibold text-stone-600">Rest skipped</p>
        <button onClick={onStartNextSet} className="btn-primary mt-2 w-full py-2 text-xs">
          Start next set
        </button>
      </div>
    );
  }

  if (isActive) {
    return (
      <div className="rounded-xl bg-stone-100 p-2.5">
        <p className="text-center text-xs font-semibold text-stone-600">Rest {formatCountdown(remaining)}</p>
        <div className="mt-2 flex gap-1.5">
          <button
            onClick={onRequestStop}
            className="flex-1 rounded-lg border border-stone-300 bg-white py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
          >
            Skip rest
          </button>
          <button onClick={onStartNextSet} className="btn-primary flex-1 py-1.5 text-xs">
            Start next set
          </button>
        </div>
      </div>
    );
  }

  // Idle — rest hasn't been started (auto-start is the normal path; this is a
  // manual fallback in case that ever doesn't fire).
  return (
    <button
      onClick={onRequestStart}
      className="w-full rounded-lg border border-stone-300 bg-white py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-50"
    >
      Start rest ({formatCountdown(seconds)})
    </button>
  );
}

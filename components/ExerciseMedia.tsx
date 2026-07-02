"use client";

import { useEffect, useRef, useState } from "react";
import { formatCountdown } from "@/lib/timing";
import { playBeep } from "@/lib/sound";
import { PopIn } from "@/components/motion";
import { DumbbellIcon, CheckCircleIcon } from "@/components/icons";

/**
 * Safe exercise media. Plain <img> on purpose: next/image does not optimize
 * animated gifs, and these are local static assets served from /public.
 *
 * mode:
 *  - "eager"    (default): show the gif immediately, falling back to the static
 *    image, then a neutral placeholder. Used on the Exercise Detail page.
 *  - "lazyDemo": show a static thumbnail by default. "Start" reveals the gif
 *    AND begins a guidance countdown (if `durationSeconds` is given); "Stop"
 *    hides the gif and clears the countdown. When the countdown reaches zero
 *    the gif auto-stops on its own (back to the thumbnail) and a "finished"
 *    state persists until the user taps Start again. The gif is only ever
 *    loaded on demand (the /videos folder is large — never auto-load).
 *
 * For "lazyDemo", pass `isActive` + `onRequestStart`/`onRequestStop` to let a
 * parent enforce "only one demo/timer running at a time" across many cards.
 * If omitted, the component manages its own play state locally.
 *
 * `showLogPrompt` controls whether the "Log your set when ready." hint shows
 * after the countdown finishes — only exercises that actually have a logger
 * below them (main work, not warm-up) should show it.
 */
export default function ExerciseMedia({
  gif,
  image,
  alt,
  mode = "eager",
  durationSeconds,
  isActive,
  onRequestStart,
  onRequestStop,
  showLogPrompt = false,
}: {
  gif?: string;
  image?: string;
  alt: string;
  mode?: "eager" | "lazyDemo";
  durationSeconds?: number;
  isActive?: boolean;
  onRequestStart?: () => void;
  onRequestStop?: () => void;
  showLogPrompt?: boolean;
}) {
  // All hooks are declared unconditionally (before any mode-based branching)
  // so eager and lazyDemo renders never change hook call order.
  const [imgFailed, setImgFailed] = useState(!image);
  const [gifFailed, setGifFailed] = useState(false);
  const [localPlaying, setLocalPlaying] = useState(false);
  const controlled = isActive !== undefined;
  const playing = controlled ? !!isActive : localPlaying;

  const [remaining, setRemaining] = useState(durationSeconds ?? 0);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Distinguishes "playing turned off because the countdown finished on its
  // own" from "playing turned off because of a manual Stop / switching away".
  // Only the former should preserve the finished/Time's-up state.
  const finishedNaturallyRef = useRef(false);

  function start() {
    if (controlled) onRequestStart?.();
    else setLocalPlaying(true);
  }
  function stop() {
    if (controlled) onRequestStop?.();
    else setLocalPlaying(false);
  }

  useEffect(() => {
    // The countdown only ever applies in lazyDemo mode.
    if (mode !== "lazyDemo") return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!playing || !durationSeconds) {
      if (finishedNaturallyRef.current) {
        // Just auto-stopped after the countdown hit zero — keep the finished
        // state visible instead of wiping it out.
        finishedNaturallyRef.current = false;
      } else {
        setFinished(false);
        setRemaining(durationSeconds ?? 0);
      }
      return;
    }
    setFinished(false);
    setRemaining(durationSeconds);
    let secondsLeft = durationSeconds;
    intervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setRemaining(0);
        setFinished(true);
        playBeep(); // only reachable after the user tapped Start
        finishedNaturallyRef.current = true;
        stop(); // auto-stop the gif/timer — do not let it keep playing
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
  }, [mode, playing, durationSeconds]);

  // `compact` (lazyDemo/workout-card) uses a white fill so any letterbox space
  // around a contained image matches the white card surface instead of
  // reading as a mismatched gray box. The eager/detail-page placeholder is
  // left on its original stone-50 fill — unaffected by this change.
  const Placeholder = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex w-full items-center justify-center ${compact ? "aspect-[4/3] max-h-56 bg-white" : "aspect-square bg-stone-50"}`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100">
        <DumbbellIcon className="h-5 w-5 text-stone-400" />
      </span>
    </div>
  );

  // ---- Eager (detail page): gif first, fallback image, fallback placeholder ----
  if (mode === "eager") {
    const primary = gif || image || "";
    if (!primary) return <Placeholder />;
    return <EagerImg primary={primary} image={image} alt={alt} />;
  }

  // ---- Lazy demo + guided timer (workout cards) ----
  const hasGif = !!gif && !gifFailed;
  // `!finished` guards the gif immediately once the countdown hits zero, even
  // before a controlled `isActive` prop round-trips back down from the parent.
  const showGif = playing && hasGif && !finished;
  const showCountdown = playing && !finished && !!durationSeconds;

  return (
    <div>
      <div className="relative max-h-56 overflow-hidden rounded-xl border border-stone-200/70 bg-white">
        {showGif ? (
          <img
            src={gif}
            alt={alt}
            className="aspect-[4/3] max-h-56 w-full object-contain"
            onError={() => { setGifFailed(true); stop(); }}
          />
        ) : imgFailed ? (
          <Placeholder compact />
        ) : (
          <img
            src={image}
            alt={alt}
            loading="lazy"
            className="aspect-[4/3] max-h-56 w-full object-contain"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>

      {hasGif && (
        <div className="mt-2 flex items-center gap-1.5">
          <button
            onClick={() => (playing ? stop() : start())}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              playing ? "bg-stone-800 text-white" : "border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
            }`}
          >
            {playing ? "■ Stop" : "▶ Start"}
          </button>
          {showCountdown && (
            <span className="w-14 flex-none rounded-lg border border-stone-200 bg-white py-1.5 text-center text-xs font-mono font-semibold text-stone-700">
              {formatCountdown(remaining)}
            </span>
          )}
          {finished && (
            <PopIn>
              <span className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-brand-50 px-2 py-1.5 text-xs font-semibold text-brand-700">
                <CheckCircleIcon className="h-3.5 w-3.5" /> Time&apos;s up
              </span>
            </PopIn>
          )}
        </div>
      )}
      {finished && showLogPrompt && (
        <PopIn>
          <p className="mt-1.5 text-center text-[11px] text-stone-500">Log your set when ready.</p>
        </PopIn>
      )}
    </div>
  );
}

// Eager variant kept separate so detail-page behavior is unchanged.
function EagerImg({ primary, image, alt }: { primary: string; image?: string; alt: string }) {
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-stone-50">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
          <DumbbellIcon className="h-6 w-6 text-stone-400" />
        </span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="eager"
      className="aspect-square w-full bg-stone-100 object-cover"
      onError={() => {
        if (image && src !== image) setSrc(image);
        else setFailed(true);
      }}
    />
  );
}

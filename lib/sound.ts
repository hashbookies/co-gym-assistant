// Tiny Web Audio beep for timer completion. Client-only and best-effort: never
// throws, never adds a bundled audio file. Only ever called from the timer's
// own completion handler, which only runs after the user tapped "Start" — so
// this respects autoplay policy (no sound on load, no sound without a prior
// user gesture). If audio is blocked or unsupported, it fails silently.
export function playBeep(): void {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // Autoplay/audio blocked or unsupported — fail silently per spec.
  }
}

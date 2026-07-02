// Central motion vocabulary for the app — every animated surface draws from
// these shared variants so timing/easing stay consistent and there are no
// one-off animation configs scattered through components.
//
// Register: this is a guided workout tool, not a landing page. Motion exists
// to convey state (a set was logged, rest finished, a workout appeared) and
// give tactile feedback — never choreography that makes the user wait.
// Timings follow the product register: ~180–280ms for state/microinteractions,
// ~350–450ms for card/page reveals. Exits run faster than entrances.

import type { Variants } from "motion/react";

/** Confident, decisive deceleration (ease-out-expo). The app's one easing. */
export const EASE = [0.16, 1, 0.3, 1] as const;

export const DUR = {
  /** Press/tap feedback. */
  tap: 0.15,
  /** Small state changes: banners, chips, panel swaps. */
  micro: 0.22,
  /** Larger state changes: rest panel, result cards. */
  state: 0.28,
  /** Page/card reveals. */
  reveal: 0.4,
} as const;

/** Exits are ~75% of the matching entrance so leaving never feels slow. */
export const EXIT_DUR = DUR.micro * 0.75;

/** Per-item stagger step, hard-capped so a long list never delays the user. */
export const STAGGER_STEP = 0.055;
export const STAGGER_CAP = 0.33;

/** Delay for the nth item in a staggered list (capped). */
export function staggerDelay(index: number): number {
  return Math.min(index * STAGGER_STEP, STAGGER_CAP);
}

// ---------------------------------------------------------------------------
// Variants. All are enter-focused; exit is defined only where a surface is
// genuinely removed (AnimatePresence) — state swaps in task-critical flows
// use enter-only animation so nothing ever blocks the next tap.
// ---------------------------------------------------------------------------

/** Content rises gently into place. The workhorse reveal. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.reveal, ease: EASE } },
};

/** Parent orchestrator: children with variants stagger in automatically. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_STEP, delayChildren: 0.05 } },
};

/** Card entrance for lists (pairs with staggerContainer or an index delay). */
export const cardEnter: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: DUR.reveal, ease: EASE } },
};

/** Quiet scale-in for result/summary cards. */
export const softScaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { duration: DUR.state, ease: EASE } },
};

/** Small panel sliding up into the flow (rest timer, pending-import card). */
export const slidePanel: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.state, ease: EASE } },
  exit: { opacity: 0, y: 6, transition: { duration: EXIT_DUR, ease: EASE } },
};

/** Success/confirmation pop — noticeable but never bouncy. */
export const popSuccess: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: DUR.state, ease: EASE } },
};

/** Whole-page entrance: barely-there rise so navigation feels intentional
 * without ever making the user wait for choreography. */
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.reveal, ease: EASE } },
};

/** Reduced-motion replacement: a fast opacity-only fade, no movement. */
export const reducedFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

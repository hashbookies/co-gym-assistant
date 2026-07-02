"use client";

// Thin, reusable animation wrappers. Every animated surface in the app goes
// through one of these four components so reduced-motion handling and timing
// live in exactly one place. None of them ever gate interaction: task
// surfaces animate on ENTER only — a user can always tap mid-animation.

import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";
import {
  pageEnter, cardEnter, popSuccess, slidePanel, reducedFade, staggerDelay, DUR, EASE,
} from "@/lib/motion";

/** Pick the real variants, or the opacity-only fallback under reduced motion. */
function useVariants(v: Variants): Variants {
  const reduce = useReducedMotion();
  return reduce ? reducedFade : v;
}

/** Wraps page content with a subtle fade/rise entrance. */
export function MotionPage({ className, children }: { className?: string; children: React.ReactNode }) {
  const variants = useVariants(pageEnter);
  return (
    <motion.div className={className} variants={variants} initial="hidden" animate="visible">
      {children}
    </motion.div>
  );
}

/**
 * Card entrance for list items. `index` staggers siblings (capped so long
 * lists never delay the user); `interactive` adds hover/tap feedback and
 * should only be set on cards that actually do something when tapped.
 */
export function AnimatedCard({
  index = 0,
  interactive = false,
  className,
  children,
}: {
  index?: number;
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const variants = reduce ? reducedFade : cardEnter;
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ delay: reduce ? 0 : staggerDelay(index) }}
      {...(interactive && !reduce
        ? { whileHover: { y: -2, transition: { duration: DUR.tap, ease: EASE } }, whileTap: { scale: 0.985 } }
        : {})}
    >
      {children}
    </motion.div>
  );
}

/**
 * Crossfades between distinct states (view/edit, form/result, empty/filled).
 * Exit runs faster than enter, and the swap never blocks input on the
 * incoming state. Give `id` a value that changes when the state changes.
 */
export function PresenceSwap({
  id,
  className,
  children,
}: {
  id: string | number | boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const variants = useVariants(slidePanel);
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div key={String(id)} className={className} variants={variants} initial="hidden" animate="visible" exit="exit">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Enter-only pop for banners, success states, and small panels that appear
 * inside a task flow (rest timer, "Exercise complete", error banners).
 * No exit animation on purpose: removal is instant so it can never slow the
 * user down. Re-keys re-pop (e.g. each newly logged set).
 */
export function PopIn({
  id,
  className,
  children,
}: {
  id?: string | number | boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const variants = useVariants(popSuccess);
  return (
    <motion.div key={id !== undefined ? String(id) : undefined} className={className} variants={variants} initial="hidden" animate="visible">
      {children}
    </motion.div>
  );
}

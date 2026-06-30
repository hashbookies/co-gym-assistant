// Pure readiness/safety assessment. NOT medical advice — it only routes the
// user to a safer workout option. Red flags force away from hard training.

import type { ReadinessAnswers, ReadinessResult } from "@/lib/types";

/**
 * Map readiness answers to a recommendation.
 *  - any red flag  -> "rest" (rest / mobility / gentle walk / clinician note)
 *  - any caution   -> "low-energy"
 *  - otherwise      -> "normal"
 */
export function assessReadiness(a: ReadinessAnswers, now: Date = new Date()): ReadinessResult {
  const redFlags: string[] = [];
  const reasons: string[] = [];

  // Red flags — do NOT generate a hard workout.
  if (a.dizziness) redFlags.push("Dizziness");
  if (a.nausea === "worse") redFlags.push("Worsening nausea");
  if (a.hydration === "low") redFlags.push("Likely dehydration");
  if (a.sleep === "very-poor") redFlags.push("Very poor sleep");
  if (a.soreness === "severe") redFlags.push("Severe soreness");
  if (a.energy === "very-low") redFlags.push("Very low energy");
  if (a.appetite === "under-fueled") redFlags.push("Possible under-fueling");

  // Cautions — generate a lighter session.
  if (a.nausea === "mild") reasons.push("Mild nausea");
  if (a.sleep === "poor") reasons.push("Poor sleep");
  if (a.soreness === "moderate") reasons.push("Moderate soreness");
  if (a.energy === "low") reasons.push("Low energy");
  if (a.injectionDay) reasons.push("Injection day / post-injection fatigue");

  let recommendation: ReadinessResult["recommendation"];
  if (redFlags.length > 0) recommendation = "rest";
  else if (reasons.length > 0) recommendation = "low-energy";
  else recommendation = "normal";

  return { recommendation, redFlags, reasons, date: now.toISOString() };
}

export function recommendationLabel(r: ReadinessResult["recommendation"]): string {
  switch (r) {
    case "normal":
      return "You're good for a normal beginner workout";
    case "low-energy":
      return "Take it easy — a low-energy workout is recommended";
    case "rest":
      return "Rest or gentle movement is recommended today";
  }
}

export const CLINICIAN_NOTE =
  "This app does not provide medical advice. If symptoms persist or worsen, follow your clinician's guidance — especially while using prescription medication.";

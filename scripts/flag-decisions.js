/*
 * Exclusion decisions for the 56 flagged exercises (55 unique slugs).
 *
 * verdict:
 *   keep       - false flag; fully home-doable as written
 *   keep-mod   - usable at home with a stated modification (furniture/floor/anchor)
 *   exclude    - drop from pool; needs equipment you don't have. Substitute given.
 *   manual     - genuinely ambiguous, leave for human eyes
 *
 * homeSuitable    - final value to write into the dataset
 * requiresUnavail - the unavailable equipment it depends on ("" if none)
 * substitute      - home-safe swap using dumbbell / bodyweight / band
 */
module.exports = {
  // --- Pull-up / chin-up / muscle-up family: all need a pull-up/overhead bar ---
  "archer-pull-up":            { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "one-arm dumbbell row / wide band row" },
  "band-assisted-pull-up":     { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "band seated row" },
  "bench-pull-ups":            { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "bent-over dumbbell row" },
  "biceps-narrow-pull-ups":    { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "band underhand row + dumbbell curl" },
  "biceps-pull-up":            { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "dumbbell row + dumbbell curl" },
  "chest-dip-on-dip-pull-up-cage": { verdict: "exclude", homeSuitable: false, requiresUnavail: "dip/pull-up cage", substitute: "dumbbell floor press / floor push-up" },
  "chin-up":                   { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "band underhand row / neutral-grip dumbbell row" },
  "chin-ups-narrow-parallel-grip": { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "neutral-grip dumbbell row" },
  "close-grip-chin-up":        { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "band underhand row" },
  "inverse-leg-curl-on-pull-up-cable-machine": { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar + cable machine", substitute: "band lying leg curl / sliding leg curl" },
  "kipping-muscle-up":         { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "band row (skill not replicable at home)" },
  "l-pull-up":                 { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "dumbbell row + seated leg raise" },
  "mixed-grip-chin-up":        { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "dumbbell row" },
  "muscle-up":                 { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "band row + push-up" },
  "muscle-up-on-vertical-bar": { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "band row + push-up" },
  "one-arm-chin-up":           { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "one-arm dumbbell row" },
  "pull-up-neutral-grip":      { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "neutral-grip dumbbell row" },
  "pull-up":                   { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "bent-over dumbbell row / anchored band pulldown" },
  "rear-pull-up":              { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "reverse fly / wide band row" },
  "reverse-grip-pull-up":      { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "band underhand row" },
  "rocky-pull-up-pulldown":    { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "anchored band pulldown / dumbbell row" },
  "scapular-pull-up":          { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "band scapular retraction / prone Y-T-W raises" },
  "shoulder-grip-pull-up":     { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "dumbbell row" },
  "wide-grip-pull-up":         { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "wide bent-over dumbbell row" },
  "wide-grip-rear-pull-up":    { verdict: "exclude", homeSuitable: false, requiresUnavail: "pull-up bar", substitute: "reverse fly / wide band row" },

  // --- Band pulldowns: usable WITH a high anchor (over-door); else swap to a row ---
  "band-close-grip-pulldown":            { verdict: "keep-mod", homeSuitable: true, requiresUnavail: "high anchor point (over-door anchor) — not confirmed", substitute: "band close-grip bent-over row (if no anchor)" },
  "band-fixed-back-close-grip-pulldown": { verdict: "keep-mod", homeSuitable: true, requiresUnavail: "high anchor point (over-door anchor) — not confirmed", substitute: "band seated row (if no anchor)" },
  "band-fixed-back-underhand-pulldown":  { verdict: "keep-mod", homeSuitable: true, requiresUnavail: "high anchor point (over-door anchor) — not confirmed", substitute: "band underhand bent-over row (if no anchor)" },
  "band-kneeling-one-arm-pulldown":      { verdict: "keep-mod", homeSuitable: true, requiresUnavail: "high anchor point (over-door anchor) — not confirmed", substitute: "band one-arm bent-over row (if no anchor)" },
  "band-underhand-pulldown":             { verdict: "keep-mod", homeSuitable: true, requiresUnavail: "high anchor point (over-door anchor) — not confirmed", substitute: "band underhand bent-over row (if no anchor)" },

  // --- Dumbbell decline/incline PRESS & FLY: need an adjustable bench -> exclude ---
  "dumbbell-decline-bench-press":          { verdict: "exclude", homeSuitable: false, requiresUnavail: "adjustable/decline bench", substitute: "dumbbell floor press" },
  "dumbbell-decline-fly":                  { verdict: "exclude", homeSuitable: false, requiresUnavail: "adjustable/decline bench", substitute: "dumbbell floor fly (reduced ROM) / band fly" },
  "dumbbell-decline-hammer-press":         { verdict: "exclude", homeSuitable: false, requiresUnavail: "adjustable/decline bench", substitute: "neutral-grip dumbbell floor press" },
  "dumbbell-decline-one-arm-fly":          { verdict: "exclude", homeSuitable: false, requiresUnavail: "adjustable/decline bench", substitute: "one-arm dumbbell floor fly" },
  "dumbbell-decline-one-arm-hammer-press": { verdict: "exclude", homeSuitable: false, requiresUnavail: "adjustable/decline bench", substitute: "one-arm dumbbell floor press" },
  "dumbbell-decline-triceps-extension":    { verdict: "exclude", homeSuitable: false, requiresUnavail: "adjustable/decline bench", substitute: "lying floor dumbbell triceps extension" },
  "dumbbell-decline-twist-fly":            { verdict: "exclude", homeSuitable: false, requiresUnavail: "adjustable/decline bench", substitute: "dumbbell floor fly" },
  "dumbbell-incline-bench-press":          { verdict: "exclude", homeSuitable: false, requiresUnavail: "incline bench", substitute: "hands-elevated/incline push-up (upper-chest emphasis reduced)" },
  "dumbbell-one-arm-decline-chest-press":  { verdict: "exclude", homeSuitable: false, requiresUnavail: "adjustable/decline bench", substitute: "one-arm dumbbell floor press" },
  "dumbbell-palms-in-incline-bench-press": { verdict: "exclude", homeSuitable: false, requiresUnavail: "incline bench", substitute: "neutral-grip dumbbell floor press" },
  "dumbbell-reverse-grip-incline-bench-one-arm-row": { verdict: "exclude", homeSuitable: false, requiresUnavail: "incline bench", substitute: "bent-over one-arm dumbbell row" },
  "dumbbell-reverse-grip-incline-bench-two-arm-row": { verdict: "exclude", homeSuitable: false, requiresUnavail: "incline bench", substitute: "bent-over two-arm dumbbell row" },

  // --- Dumbbell decline SHRUG / standing curl: bench is incidental -> keep with mod ---
  "dumbbell-decline-shrug":     { verdict: "keep-mod", homeSuitable: true, requiresUnavail: "", substitute: "standing dumbbell shrug (no bench needed)" },
  "dumbbell-decline-shrug-v-2": { verdict: "keep-mod", homeSuitable: true, requiresUnavail: "", substitute: "standing dumbbell shrug (no bench needed)" },
  "dumbbell-standing-one-arm-curl-over-incline-bench": { verdict: "keep-mod", homeSuitable: true, requiresUnavail: "", substitute: "dumbbell concentration curl (brace elbow on inner thigh)" },

  // --- Bodyweight bench/decline/parallel-bar moves ---
  "bench-dip-on-floor":      { verdict: "keep",     homeSuitable: true,  requiresUnavail: "", substitute: "already a floor move — no change" },
  "bench-dip-knees-bent":    { verdict: "keep-mod", homeSuitable: true,  requiresUnavail: "", substitute: "use a sturdy chair/sofa edge; or floor triceps dip / close-grip push-up" },
  "three-bench-dip":         { verdict: "keep-mod", homeSuitable: true,  requiresUnavail: "", substitute: "two chairs; or chair dip / close-grip push-up" },
  "decline-crunch":          { verdict: "keep-mod", homeSuitable: true,  requiresUnavail: "", substitute: "floor crunch / reverse crunch (no decline board needed)" },
  "decline-push-up":         { verdict: "keep-mod", homeSuitable: true,  requiresUnavail: "", substitute: "feet elevated on a chair/step — standard home decline push-up" },
  "decline-sit-up":          { verdict: "keep-mod", homeSuitable: true,  requiresUnavail: "", substitute: "floor sit-up (feet anchored under furniture)" },
  "rear-decline-bridge":     { verdict: "keep-mod", homeSuitable: true,  requiresUnavail: "", substitute: "floor glute bridge / shoulders-on-sofa hip thrust" },
  "side-hip-on-parallel-bars":         { verdict: "exclude", homeSuitable: false, requiresUnavail: "parallel bars", substitute: "side plank with hip dip" },
  "vertical-leg-raise-on-parallel-bars": { verdict: "exclude", homeSuitable: false, requiresUnavail: "captain's chair / parallel bars", substitute: "lying leg raise / floor reverse crunch" },
  "wide-grip-chest-dip-on-high-parallel-bars": { verdict: "exclude", homeSuitable: false, requiresUnavail: "parallel bars", substitute: "wide floor push-up / dumbbell floor fly" },
};

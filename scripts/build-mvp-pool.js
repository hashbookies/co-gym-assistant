/*
 * Build the curated MVP pool (~70 reviewed exercises) for the workout generator.
 *
 * Every entry references a REAL record in exercises.tagged.json (script throws
 * if a slug is missing — no invented exercises). Source + inferred fields are
 * copied verbatim (preserving confidence). Programming fields + confirmed
 * difficulty are hand-authored here with provenance "manual-curated".
 *
 * Constraints honored (hasDoorAnchor:false, handles-only bands):
 *   - no anchored pulldowns / pallof, no pull-up bar, no bench, no machines.
 *   - every selected exercise: requiresAnchor/Bench/PullupBar/Special = false.
 *
 *   data/mvp-pool.json
 *   data/mvp-pool-report.md
 *
 * Run:  node scripts/build-mvp-pool.js   (after enrich-and-report.js)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TAGGED = path.join(ROOT, "data", "exercises.tagged.json");
const OUT_JSON = path.join(ROOT, "data", "mvp-pool.json");
const OUT_DOC = path.join(ROOT, "data", "mvp-pool-report.md");

const tagged = JSON.parse(fs.readFileSync(TAGGED, "utf8"));
const by = {};
for (const x of tagged) by[x.slug] = x; // last-wins for dup slugs (fine: identical)

// programming presets by role (beginner-first, RPE-based, no failure work)
const P = {
  lowerCompound: { repRange: [8, 12], setRange: [2, 3], restSeconds: 90, rpeTarget: 7 },
  upperPush:     { repRange: [8, 12], setRange: [2, 3], restSeconds: 75, rpeTarget: 7 },
  upperPull:     { repRange: [8, 12], setRange: [2, 3], restSeconds: 75, rpeTarget: 7 },
  isolation:     { repRange: [12, 15], setRange: [2, 3], restSeconds: 60, rpeTarget: 7 },
  calf:          { repRange: [12, 20], setRange: [2, 3], restSeconds: 45, rpeTarget: 8 },
  glute:         { repRange: [12, 15], setRange: [2, 3], restSeconds: 60, rpeTarget: 7 },
  core:          { repRange: [10, 15], setRange: [2, 3], restSeconds: 45, rpeTarget: 7 },
  plankTime:     { repRange: [20, 40], setRange: [2, 3], restSeconds: 45, rpeTarget: 6, timeBased: true },
  mobility:      { repRange: [20, 40], setRange: [1, 2], restSeconds: 15, rpeTarget: 3, timeBased: true },
};

// Generic progression/regression text reused where sensible
const PROG_REPS = "Add 1–2 reps per set each session; once you hit the top of the rep range for all sets at the target RPE, add a small load (or a set) and drop back to the bottom of the range.";
const PROG_TIME = "Add 5 seconds per set each session; once you hold the top of the range for all sets, add a set or progress to a harder variation.";
const REG_GENERIC = "Reduce range of motion, reduce load, or reduce reps. Stop the set if form breaks down.";

// Category-specific default notes — used only where an item has no bespoke note.
// Short, practical, movement-family specific; not generic fear copy.
const SAFETY_BY_CAT = {
  Squat: "Control depth and keep knees tracking over the toes; brace your core.",
  Hinge: "Hinge at the hips with a neutral spine; brace and don't round the lower back.",
  Lunge: "Lower under control and keep the front knee tracking over the foot.",
  "Horizontal push": "Keep the shoulder blades set and lower under control; don't flare the elbows hard.",
  "Vertical push": "Keep ribs down and core braced; press without arching the lower back.",
  "Horizontal pull": "Keep a neutral spine and pull with the back — don't jerk the weight up.",
  "Lat/back alt": "Move with control and squeeze the shoulder blades; avoid shrugging or swinging.",
  "Core anti-extension": "Keep hips level and stop the lower back from sagging or arching.",
  "Core anti-rotation": "Resist twisting; keep hips and shoulders square throughout.",
  "Core flexion": "Curl the trunk smoothly and don't pull on your neck.",
  Glutes: "Drive through the heels and squeeze the glutes; keep ribs down.",
  Calves: "Use a full, controlled range; pause at the top and lower slowly.",
  Biceps: "Avoid swinging; keep elbows controlled and close to the body.",
  Triceps: "Keep elbows pointing forward and move only the forearms.",
  "Shoulder isolation": "Lead with the elbows and stop near shoulder height; no shrugging.",
  "Mobility/warm-up": "Ease into the range and breathe; never bounce or force a stretch.",
};
const JOINT_BY_CAT = {
  Squat: "Knee and lower-back focus — control depth; reduce range if the knees ache.",
  Hinge: "Lower-back focus — keep it neutral; stop if you feel lumbar strain.",
  Lunge: "Knee focus — keep the front knee stable; reverse lunges are gentler on the knee.",
  "Horizontal push": "Shoulder/elbow focus — floor variations limit risky end-range.",
  "Vertical push": "Shoulder focus — don't force end-range overhead; stop on any pinch.",
  "Horizontal pull": "Lower-back/shoulder focus — hinge with a flat back, don't round.",
  "Lat/back alt": "Shoulder focus — keep it controlled; skip if it pinches.",
  "Core anti-extension": "Lower-back focus — keep it flat, not arched.",
  "Core anti-rotation": "Lower-back focus — brace and avoid twisting under fatigue.",
  "Core flexion": "Neck/lower-back focus — support the head; avoid yanking the neck.",
  Glutes: "Low joint risk when performed with control.",
  Calves: "Ankle focus — control the bottom stretch; avoid bouncing.",
  Biceps: "Elbow/wrist focus — low risk with a controlled tempo.",
  Triceps: "Elbow focus — control the load near the head; don't flare the elbows.",
  "Shoulder isolation": "Shoulder focus — light loads, no shrugging; low risk when controlled.",
  "Mobility/warm-up": "Low joint risk when eased into; never force the range.",
};

// ---- the curated selection ------------------------------------------------
// role drives default programming; per-item fields override/annotate.
const SELECT = [
  // 1. SQUAT
  { slug: "dumbbell-goblet-squat", cat: "Squat", role: "lowerCompound", difficulty: "intermediate",
    regression: "bodyweight squat to a chair (sit-to-stand).", substitutions: ["dumbbell-squat", "split-squats"],
    jointRiskNotes: "Keep knees tracking over toes; do not let them cave inward.",
    why: "Best-loaded home squat; goblet position keeps the torso upright and is forgiving for beginners." },
  { slug: "dumbbell-squat", cat: "Squat", role: "lowerCompound", difficulty: "intermediate",
    regression: "reduce depth or hold lighter dumbbells.", substitutions: ["dumbbell-goblet-squat"],
    why: "Dumbbells at sides allow heavier loading than goblet once stronger." },
  { slug: "dumbbell-supported-squat", cat: "Squat", role: "lowerCompound", difficulty: "beginner",
    regression: "hold a doorframe/chair for more support.", substitutions: ["dumbbell-goblet-squat"],
    why: "Beginner entry point; external support reduces balance demand on low-energy days.", lowEnergy: true },
  { slug: "split-squats", cat: "Squat", role: "lowerCompound", difficulty: "intermediate",
    regression: "shorten the stance and hold support.", substitutions: ["dumbbell-lunge"],
    jointRiskNotes: "Front knee stays behind toes-ish; control the descent.",
    why: "Unilateral strength + balance with no equipment; bridges to lunges." },
  { slug: "band-squat", cat: "Squat", role: "lowerCompound", difficulty: "beginner",
    regression: "use a lighter band or partial range.", substitutions: ["dumbbell-goblet-squat"],
    why: "Band-only squat for travel/no-dumbbell days; adds resistance at the top.", lowEnergy: true },

  // 2. HINGE
  { slug: "dumbbell-romanian-deadlift", cat: "Hinge", role: "lowerCompound", difficulty: "intermediate",
    regression: "reduce range (stop mid-shin) and load.", substitutions: ["dumbbell-stiff-leg-deadlift", "low-glute-bridge-on-floor"],
    jointRiskNotes: "Hinge at the hips with a flat back; do not round the lower spine.",
    why: "Primary posterior-chain builder (hamstrings/glutes); the key hinge pattern." },
  { slug: "dumbbell-stiff-leg-deadlift", cat: "Hinge", role: "lowerCompound", difficulty: "intermediate",
    regression: "soften knees and shorten range.", substitutions: ["dumbbell-romanian-deadlift"],
    jointRiskNotes: "Flat back throughout; load stays close to the legs.",
    why: "Hamstring-biased hinge variation; canonical over near-duplicates." },
  { slug: "dumbbell-deadlift", cat: "Hinge", role: "lowerCompound", difficulty: "intermediate",
    regression: "elevate the dumbbells on a low surface to reduce range.", substitutions: ["dumbbell-romanian-deadlift"],
    jointRiskNotes: "Brace the core; hips and shoulders rise together.",
    why: "Full hip hinge from the floor; complements RDL with more quad/glute." },
  { slug: "band-straight-leg-deadlift", cat: "Hinge", role: "isolation", difficulty: "beginner", region: "lower",
    regression: "lighter band, partial range.", substitutions: ["dumbbell-romanian-deadlift", "low-glute-bridge-on-floor"],
    why: "Band hinge for low-load/low-energy or dumbbell-free sessions.", lowEnergy: true },

  // 3. LUNGE
  { slug: "dumbbell-lunge", cat: "Lunge", role: "lowerCompound", difficulty: "intermediate",
    regression: "bodyweight static lunge holding support.", substitutions: ["dumbbell-rear-lunge", "split-squats"],
    jointRiskNotes: "Step length controls knee stress; avoid knee collapsing inward.",
    why: "Loaded unilateral leg work; strong carryover to daily movement." },
  { slug: "dumbbell-rear-lunge", cat: "Lunge", role: "lowerCompound", difficulty: "intermediate",
    regression: "bodyweight reverse lunge.", substitutions: ["dumbbell-lunge"],
    jointRiskNotes: "Reverse step is gentler on the front knee than forward lunges.",
    why: "Knee-friendlier lunge variation; good default for beginners with knee caution." },
  { slug: "walking-lunge", cat: "Lunge", role: "lowerCompound", difficulty: "intermediate",
    regression: "stationary lunge in place.", substitutions: ["forward-lunge-male"],
    why: "Bodyweight progression option; adds a light conditioning element." },
  { slug: "forward-lunge-male", cat: "Lunge", role: "lowerCompound", difficulty: "beginner",
    displayName: "Forward Lunge", regression: "hold a wall/chair; reduce depth.", substitutions: ["dumbbell-rear-lunge"],
    why: "Bodyweight beginner lunge; usable on low-energy days.", lowEnergy: true },
  { slug: "dumbbell-contralateral-forward-lunge", cat: "Lunge", role: "lowerCompound", difficulty: "intermediate",
    regression: "bodyweight version, shorter range.", substitutions: ["dumbbell-lunge"],
    jointRiskNotes: "Opposite-side load adds a light anti-rotation core demand.",
    why: "Lunge + core integration; one loaded carry-over option." },

  // 4. HORIZONTAL PUSH
  { slug: "push-up", cat: "Horizontal push", role: "upperPush", difficulty: "intermediate",
    regression: "incline push-up (hands on a counter) or knees.", substitutions: ["close-grip-push-up-on-knees", "dumbbell-lying-hammer-press"],
    why: "Foundational bodyweight horizontal push; scales endlessly." },
  { slug: "close-grip-push-up-on-knees", cat: "Horizontal push", role: "upperPush", difficulty: "beginner",
    displayName: "Close-Grip Push-Up (Knees)", regression: "incline against a wall.", substitutions: ["push-up"],
    why: "Beginner push regression with triceps emphasis; low-energy friendly.", lowEnergy: true },
  { slug: "diamond-push-up", cat: "Horizontal push", role: "upperPush", difficulty: "intermediate",
    regression: "knees or wider hand position.", substitutions: ["push-up"],
    why: "Harder push progression emphasizing triceps/inner chest." },
  { slug: "dumbbell-lying-hammer-press", cat: "Horizontal push", role: "upperPush", difficulty: "intermediate",
    displayName: "Dumbbell Floor Press (Neutral Grip)",
    regression: "lighter load; pause on the floor each rep.", substitutions: ["push-up", "dumbbell-fly"],
    jointRiskNotes: "Floor limits shoulder extension — shoulder-friendly pressing.",
    safetyNotes: "Performed lying on the floor; no bench needed.",
    why: "Loaded horizontal press without a bench; shoulder-safe floor variant." },
  { slug: "dumbbell-fly", cat: "Horizontal push", role: "isolation", difficulty: "intermediate",
    displayName: "Dumbbell Floor Fly",
    regression: "reduce load and range; keep a soft elbow bend.", substitutions: ["dumbbell-lying-hammer-press"],
    jointRiskNotes: "Shoulder focus — the floor caps the range; don't over-stretch at the bottom.",
    safetyNotes: "Performed lying on the FLOOR (not a bench); keep elbows lightly bent throughout.",
    why: "Chest isolation/stretch to complement pressing; floor version limits risky shoulder end-range." },
  { slug: "band-close-grip-push-up", cat: "Horizontal push", role: "upperPush", difficulty: "intermediate",
    regression: "perform without the band (plain push-up).", substitutions: ["push-up"],
    why: "Adds band tension to the push-up for a strength-day option without dumbbells." },

  // 5. VERTICAL PUSH / shoulder press
  { slug: "dumbbell-seated-shoulder-press", cat: "Vertical push", role: "upperPush", difficulty: "beginner",
    regression: "press one arm at a time or reduce load.", substitutions: ["dumbbell-standing-overhead-press", "band-shoulder-press"],
    jointRiskNotes: "Press slightly in front of the head; avoid forcing end-range overhead.",
    safetyNotes: "Use a normal chair with back support — no bench required.",
    why: "Beginner overhead press with back support; the canonical seated press." },
  { slug: "dumbbell-standing-overhead-press", cat: "Vertical push", role: "upperPush", difficulty: "intermediate",
    regression: "seated press or lighter load.", substitutions: ["dumbbell-seated-shoulder-press"],
    jointRiskNotes: "Brace the core so the lower back doesn't arch.",
    why: "Standing press adds full-body bracing; main vertical push." },
  { slug: "dumbbell-arnold-press", cat: "Vertical push", role: "upperPush", difficulty: "intermediate",
    duplicateGroup: "dumbbell arnold press", regression: "standard overhead press, lighter.", substitutions: ["dumbbell-standing-overhead-press"],
    jointRiskNotes: "Shoulder focus — rotate smoothly; skip if it pinches the shoulder.",
    safetyNotes: "Use a stable chair with back support; no bench required. Rotate the wrists smoothly and keep ribs down.",
    why: "Delt variation with more front-delt and rotation; canonical over its V.2 twin." },
  { slug: "band-shoulder-press", cat: "Vertical push", role: "upperPush", difficulty: "beginner",
    regression: "lighter band; seated.", substitutions: ["dumbbell-seated-shoulder-press"],
    why: "Band overhead press for low-load/low-energy days.", lowEnergy: true },

  // 6. HORIZONTAL PULL / row
  { slug: "dumbbell-bent-over-row", cat: "Horizontal pull", role: "upperPull", difficulty: "intermediate",
    regression: "support chest on thighs (more upright) and lighten.", substitutions: ["dumbbell-one-arm-bent-over-row", "resistance-band-seated-straight-back-row"],
    jointRiskNotes: "Flat back, hinge at hips; don't round the spine under load.",
    why: "Primary horizontal pull and the backbone of back work without a bar." },
  { slug: "dumbbell-one-arm-bent-over-row", cat: "Horizontal pull", role: "upperPull", difficulty: "intermediate",
    displayName: "One-Arm Dumbbell Row (Free Standing)",
    regression: "brace free hand on thigh/knee (not a bench), lighten.", substitutions: ["dumbbell-bent-over-row"],
    jointRiskNotes: "Self-supported on your own leg — no bench. Keep spine neutral.",
    safetyNotes: "Performed self-supported; do NOT require a bench.",
    why: "Heavier per-arm rowing with a free-standing brace; bench-free by design." },
  { slug: "dumbbell-palm-rotational-bent-over-row", cat: "Horizontal pull", role: "upperPull", difficulty: "intermediate",
    regression: "lighten and reduce range.", substitutions: ["dumbbell-bent-over-row"],
    why: "Row variation that adds biceps/grip variety to back days." },
  // Replaced bodyweight-standing-row-with-towel (required a DOOR setup) with a
  // floor-seated band row anchored around the user's own feet — no door/anchor.
  { slug: "resistance-band-seated-straight-back-row", cat: "Horizontal pull", role: "upperPull", difficulty: "beginner",
    displayName: "Seated Band Row (Feet-Anchored)",
    regression: "lighter band; reduce range.", substitutions: ["dumbbell-bent-over-row", "band-standing-rear-delt-row"],
    safetyNotes: "Sit on the floor and loop the band around your own feet — no door or wall anchor. Keep a tall, neutral spine.",
    why: "Beginner, low-energy band row that anchors around your feet; replaces the door-dependent towel row.", lowEnergy: true },
  // Replaced band-one-arm-standing-low-row (source required a waist-height ANCHOR)
  // with a standing dumbbell underhand row — no anchor, adds lat/bicep variety.
  { slug: "dumbbell-reverse-grip-row-female", cat: "Horizontal pull", role: "upperPull", difficulty: "intermediate",
    displayName: "Dumbbell Reverse-Grip Row",
    regression: "more upright torso; lighter load.", substitutions: ["dumbbell-bent-over-row", "dumbbell-one-arm-bent-over-row"],
    jointRiskNotes: "Lower-back/elbow focus — flat back; underhand grip adds biceps emphasis.",
    why: "Underhand bent-over row for lat/biceps variety; fully free-standing, no anchor needed." },

  // 7. LAT / BACK ALTERNATIVES (honest: no true vertical pull without a bar)
  { slug: "dumbbell-pullover", cat: "Lat/back alt", role: "upperPull", difficulty: "intermediate",
    displayName: "Dumbbell Floor Pullover",
    regression: "reduce range (stop at forehead level) and load.", substitutions: ["dumbbell-bent-over-row"],
    jointRiskNotes: "Floor caps shoulder flexion. Skip if it causes any shoulder pinch.",
    safetyNotes: "Lying on the FLOOR (not a bench), which safely limits the overhead range.",
    why: "Closest safe lat-stretch movement at home; floor version limits risky end-range." },
  { slug: "dumbbell-rear-delt-row-shoulder", cat: "Lat/back alt", role: "upperPull", difficulty: "intermediate",
    displayName: "Dumbbell Rear Delt Row",
    regression: "lighten; pause at the top.", substitutions: ["dumbbell-reverse-fly", "band-standing-rear-delt-row"],
    why: "Upper-back/rear-delt row for posture; offsets all the pressing volume." },
  { slug: "dumbbell-reverse-fly", cat: "Lat/back alt", role: "isolation", difficulty: "intermediate",
    regression: "bend over less / lighten; seated.", substitutions: ["dumbbell-rear-delt-row-shoulder"],
    jointRiskNotes: "Lead with the elbows; avoid shrugging.",
    why: "Rear-delt/scapular-retraction isolation — key for shoulder balance at home." },
  { slug: "band-standing-rear-delt-row", cat: "Lat/back alt", role: "upperPull", difficulty: "beginner",
    regression: "lighter band; slower tempo.", substitutions: ["dumbbell-reverse-fly"],
    safetyNotes: "Band held in both hands at chest height (no anchor needed).",
    why: "Anchor-free band back work; great low-energy upper-back option.", lowEnergy: true },

  // 8. CORE ANTI-EXTENSION
  { slug: "front-plank-with-twist", cat: "Core anti-extension", role: "plankTime", difficulty: "beginner",
    displayName: "Front Plank", regression: "plank from the knees.", substitutions: ["power-point-plank", "dead-bug"],
    safetyNotes: "Time-based hold (seconds). Keep hips level; don't let the lower back sag.",
    why: "Foundational anti-extension core; teaches bracing for hinges/squats.", lowEnergy: true },
  { slug: "power-point-plank", cat: "Core anti-extension", role: "plankTime", difficulty: "beginner",
    regression: "knees down; shorter holds.", substitutions: ["front-plank-with-twist"],
    safetyNotes: "Time-based hold (seconds).",
    why: "Plank variation for progression variety.", lowEnergy: true },

  // 9. CORE ANTI-ROTATION (honest gap: loaded pallof needs an anchor)
  { slug: "side-bridge-v-2", cat: "Core anti-rotation", role: "plankTime", difficulty: "beginner",
    displayName: "Side Plank", regression: "from the knees; shorter holds.", substitutions: ["dead-bug"],
    safetyNotes: "Time-based hold each side. Resists lateral flexion/rotation — best anti-rotation proxy without an anchor.",
    why: "Trains rotary/lateral stability; stands in for pallof presses, which need a mounted anchor we don't assume.", lowEnergy: true },
  { slug: "dead-bug", cat: "Core anti-rotation", role: "core", difficulty: "intermediate",
    regression: "move only the legs (keep arms still).", substitutions: ["side-bridge-v-2"],
    safetyNotes: "Keep the lower back pressed to the floor; contralateral pattern resists trunk rotation.",
    why: "Anti-rotation/rotary stability with contralateral limbs; very joint-friendly and doubles as anti-extension.", lowEnergy: true },

  // 10. CORE FLEXION
  { slug: "crunch-floor", cat: "Core flexion", role: "core", difficulty: "beginner",
    displayName: "Floor Crunch", regression: "smaller range; hands across chest.", substitutions: ["cross-body-crunch"],
    safetyNotes: "Curl the trunk; don't yank the neck.",
    why: "Basic trunk flexion; accessible beginner ab work.", lowEnergy: true },
  { slug: "cross-body-crunch", cat: "Core flexion", role: "core", difficulty: "beginner",
    regression: "slower tempo; fewer reps.", substitutions: ["crunch-floor"],
    why: "Adds oblique emphasis to flexion work.", lowEnergy: true },
  { slug: "band-lying-straight-leg-raise", cat: "Core flexion", role: "core", difficulty: "intermediate",
    displayName: "Lying Leg Raise (Band Optional)", regression: "bent knees; remove band.", substitutions: ["crunch-floor"],
    jointRiskNotes: "Keep the lower back down; if it arches, bend the knees.",
    why: "Lower-ab focused flexion; band adds optional resistance." },
  { slug: "3-4-sit-up", cat: "Core flexion", role: "core", difficulty: "intermediate",
    displayName: "3/4 Sit-Up", regression: "crunch instead of full sit-up.", substitutions: ["crunch-floor"],
    why: "Longer-range flexion progression beyond the crunch." },

  // 11. GLUTES
  { slug: "low-glute-bridge-on-floor", cat: "Glutes", role: "glute", difficulty: "beginner",
    displayName: "Glute Bridge", regression: "smaller range; hold the top.", substitutions: ["glute-bridge-march", "resistance-band-hip-thrusts-on-knees-female"],
    why: "Foundational glute activation; safe for everyone and great on low-energy days.", lowEnergy: true },
  { slug: "glute-bridge-march", cat: "Glutes", role: "glute", difficulty: "beginner",
    regression: "keep both feet down (static bridge).", substitutions: ["low-glute-bridge-on-floor"],
    safetyNotes: "Keep hips level as each foot lifts.",
    why: "Adds single-leg stability and light core to the bridge.", lowEnergy: true },
  { slug: "resistance-band-hip-thrusts-on-knees-female", cat: "Glutes", role: "glute", difficulty: "beginner",
    displayName: "Banded Kneeling Hip Thrust", regression: "remove band.", substitutions: ["low-glute-bridge-on-floor"],
    safetyNotes: "Band around the hips (held/looped), no fixed anchor.",
    why: "Direct glute work with band resistance; anchor-free.", lowEnergy: true },
  { slug: "side-hip-abduction", cat: "Glutes", role: "isolation", difficulty: "beginner",
    regression: "smaller range; slower.", substitutions: ["glute-bridge-march", "low-glute-bridge-on-floor"],
    why: "Glute-medius/abductor work for hip stability and knee tracking.", lowEnergy: true },

  // 12. CALVES
  { slug: "bodyweight-standing-calf-raise", cat: "Calves", role: "calf", difficulty: "beginner",
    regression: "hold a wall; both feet.", substitutions: ["dumbbell-standing-calf-raise"],
    why: "Equipment-free calf work; high-rep friendly.", lowEnergy: true },
  { slug: "dumbbell-standing-calf-raise", cat: "Calves", role: "calf", difficulty: "intermediate",
    regression: "bodyweight only.", substitutions: ["bodyweight-standing-calf-raise"],
    jointRiskNotes: "Full range; pause at the top, control the descent.",
    why: "Loaded calf raise for progressive overload." },
  { slug: "dumbbell-seated-calf-raise", cat: "Calves", role: "calf", difficulty: "beginner",
    regression: "lighter load.", substitutions: ["dumbbell-standing-calf-raise"],
    safetyNotes: "Seated on a normal chair; dumbbells rest on the knees.",
    why: "Targets soleus and is gentle/seated for low-energy days.", lowEnergy: true },

  // 13. BICEPS
  { slug: "dumbbell-biceps-curl", cat: "Biceps", role: "isolation", difficulty: "beginner",
    regression: "lighter load; alternate arms.", substitutions: ["dumbbell-concentration-curl", "band-alternating-biceps-curl"],
    why: "Canonical biceps curl; simple and scalable.", lowEnergy: true },
  { slug: "dumbbell-concentration-curl", cat: "Biceps", role: "isolation", difficulty: "intermediate",
    regression: "lighter load.", substitutions: ["dumbbell-biceps-curl"],
    safetyNotes: "Brace the elbow on the inner thigh (seated on a chair) — no bench.",
    why: "Strict single-arm curl; covers the 'over incline bench' move minus the bench." },
  { slug: "dumbbell-alternate-seated-hammer-curl", cat: "Biceps", role: "isolation", difficulty: "beginner",
    displayName: "Seated Hammer Curl", regression: "lighter load.", substitutions: ["dumbbell-biceps-curl"],
    safetyNotes: "Use a stable chair; no bench required. Keep elbows tucked and avoid swinging.",
    why: "Neutral-grip curl hits brachialis/forearm; easy seated option.", lowEnergy: true },
  { slug: "band-alternating-biceps-curl", cat: "Biceps", role: "isolation", difficulty: "beginner",
    regression: "lighter band.", substitutions: ["dumbbell-biceps-curl"],
    safetyNotes: "Band under both feet; no anchor.",
    why: "Band curl for dumbbell-free or low-energy days.", lowEnergy: true },

  // 14. TRICEPS
  { slug: "dumbbell-seated-triceps-extension", cat: "Triceps", role: "isolation", difficulty: "beginner",
    displayName: "Seated Overhead Triceps Extension", regression: "one arm or lighter load.", substitutions: ["dumbbell-lying-triceps-extension", "dumbbell-kickback"],
    jointRiskNotes: "Keep elbows pointing forward; control behind the head.",
    safetyNotes: "Seated on a normal chair.",
    why: "Overhead triceps with a long-head stretch; beginner-friendly.", lowEnergy: true },
  { slug: "dumbbell-lying-triceps-extension", cat: "Triceps", role: "isolation", difficulty: "intermediate",
    displayName: "Floor Lying Triceps Extension", regression: "lighter load; reduce range.", substitutions: ["dumbbell-seated-triceps-extension"],
    jointRiskNotes: "Lower toward the forehead/floor under control; elbow-friendly tempo.",
    safetyNotes: "Performed lying on the FLOOR; no bench.",
    why: "Floor skull-crusher for triceps mass without a bench." },
  { slug: "dumbbell-kickback", cat: "Triceps", role: "isolation", difficulty: "intermediate",
    regression: "lighter load; brace on thigh.", substitutions: ["dumbbell-seated-triceps-extension"],
    why: "Triceps isolation with peak contraction; low joint stress." },
  { slug: "bodyweight-kneeling-triceps-extension", cat: "Triceps", role: "isolation", difficulty: "beginner",
    regression: "more upright; shorter range.", substitutions: ["dumbbell-seated-triceps-extension"],
    why: "Equipment-free triceps option; useful when traveling.", lowEnergy: true },

  // 15. SHOULDER ISOLATION
  { slug: "dumbbell-lateral-raise", cat: "Shoulder isolation", role: "isolation", difficulty: "beginner",
    regression: "lighter load; partial range.", substitutions: ["band-front-raise", "dumbbell-front-raise"],
    jointRiskNotes: "Lead with elbows, stop around shoulder height; avoid shrugging.",
    why: "Side-delt isolation for shoulder width and balance.", lowEnergy: true },
  { slug: "dumbbell-front-raise", cat: "Shoulder isolation", role: "isolation", difficulty: "beginner",
    duplicateGroup: "dumbbell front raise", regression: "alternate arms; lighter.", substitutions: ["band-front-raise"],
    why: "Front-delt isolation; canonical over its V.2 twin.", lowEnergy: true },
  { slug: "dumbbell-rear-delt-raise", cat: "Shoulder isolation", role: "isolation", difficulty: "intermediate",
    regression: "seated, chest on thighs, lighter.", substitutions: ["dumbbell-reverse-fly"],
    why: "Rear-delt isolation reinforcing posture/shoulder health." },
  { slug: "band-front-raise", cat: "Shoulder isolation", role: "isolation", difficulty: "beginner",
    regression: "lighter band.", substitutions: ["dumbbell-front-raise"],
    safetyNotes: "Band under both feet; no anchor.",
    why: "Band delt raise for low-load/low-energy days.", lowEnergy: true },

  // 16. MOBILITY / WARM-UP
  { slug: "inchworm", cat: "Mobility/warm-up", role: "mobility", difficulty: "beginner",
    regression: "bend knees on the walkout.", substitutions: ["world-greatest-stretch"],
    safetyNotes: "Dynamic warm-up; move slowly and breathe.",
    why: "Full-body dynamic warm-up: hamstrings, shoulders, core.", lowEnergy: true },
  { slug: "world-greatest-stretch", cat: "Mobility/warm-up", role: "mobility", difficulty: "intermediate",
    displayName: "World's Greatest Stretch", regression: "reduce depth; hold support.", substitutions: ["inchworm"],
    why: "Opens hips, T-spine, and hamstrings before lower-body days.", lowEnergy: true },
  { slug: "chest-and-front-of-shoulder-stretch", cat: "Mobility/warm-up", role: "mobility", difficulty: "beginner",
    regression: "gentler range.", substitutions: ["world-greatest-stretch"],
    why: "Counters desk posture; preps shoulders for pressing.", lowEnergy: true },
  { slug: "all-fours-squad-stretch", cat: "Mobility/warm-up", role: "mobility", difficulty: "beginner",
    displayName: "All-Fours Quad Stretch", regression: "gentler range.", substitutions: ["seated-glute-stretch"],
    why: "Quad/hip-flexor mobility before squats and lunges.", lowEnergy: true },
  { slug: "seated-glute-stretch", cat: "Mobility/warm-up", role: "mobility", difficulty: "beginner",
    regression: "less depth.", substitutions: ["all-fours-squad-stretch"],
    why: "Glute/hip cooldown or warm-up; gentle and seated.", lowEnergy: true },
];

// ---- build ----------------------------------------------------------------
const missing = SELECT.filter((s) => !by[s.slug]).map((s) => s.slug);
if (missing.length) {
  console.error("ABORT — these slugs are not in the tagged pool:", missing);
  process.exit(1);
}

const out = SELECT.map((s) => {
  const r = by[s.slug];
  const preset = P[s.role];
  const timeBased = !!preset.timeBased;
  const lowEnergy = s.lowEnergy === true; // explicit, conservative
  return {
    slug: r.slug,
    displayName: s.displayName || r.name,
    sourceId: r.id,
    equipment: r.equipment,
    category: s.cat,

    movementPattern: r.movementPattern,
    movementPatternConfidence: r._confidence.movementPattern,
    splitTag: r.splitTag,
    splitTagConfidence: r._confidence.splitTag,
    bodyRegion: s.region || r.bodyRegion,     // manual override where inferred tag is wrong
    bodyRegionProvenance: s.region ? "manual-curated" : "inferred",
    primaryMuscle: r.primaryMuscle,
    secondaryMuscles: r.secondaryMuscles,

    beginnerSuitable: s.difficulty === "beginner",
    difficulty: s.difficulty,                 // MANUALLY CONFIRMED
    difficultyConfidence: "manual-confirmed",
    homeSuitable: true,
    homeSuitableConfidence: r._confidence.homeSuitable, // preserve original
    requiresAnchor: false,
    requiresBench: false,
    requiresPullupBar: false,
    requiresSpecialEquipment: false,
    requiresDoorSetup: false,

    canonicalExercise: true,
    duplicateGroup: s.duplicateGroup || (r._dup ? r._dup.cluster : null),

    // hand-authored programming (provenance: manual-curated)
    repRange: preset.repRange,
    setRange: preset.setRange,
    restSeconds: preset.restSeconds,
    rpeTarget: preset.rpeTarget,
    timeBased,
    progression: timeBased ? PROG_TIME : PROG_REPS,
    regression: s.regression || REG_GENERIC,
    substitutions: s.substitutions || [],
    lowEnergyFriendly: lowEnergy,
    // backfilled: bespoke note if authored, else category-specific default. Never null.
    jointRiskNotes: s.jointRiskNotes || JOINT_BY_CAT[s.cat] || "Low joint risk when performed with control.",
    safetyNotes: s.safetyNotes || SAFETY_BY_CAT[s.cat] || "Move with control and stop if anything hurts.",
    whySelected: s.why,

    _provenance: {
      source: ["sourceId", "displayName", "equipment", "primaryMuscle", "secondaryMuscles"],
      inferred: ["movementPattern", "splitTag", "bodyRegion", "homeSuitable"],
      manualCurated: ["category", "difficulty", "repRange", "setRange", "restSeconds", "rpeTarget",
        "progression", "regression", "substitutions", "lowEnergyFriendly", "jointRiskNotes",
        "safetyNotes", "whySelected", "requiresAnchor", "requiresBench", "requiresPullupBar",
        "requiresSpecialEquipment", "requiresDoorSetup", "canonicalExercise"],
    },
  };
});

fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2));

// ---- report ---------------------------------------------------------------
const count = (arr, k) => {
  const m = {};
  for (const x of arr) { const key = typeof k === "function" ? k(x) : x[k]; m[key] = (m[key] || 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};
const tbl = (rows) => rows.map(([k, v]) => `| ${k} | ${v} |`).join("\n");
const lowE = out.filter((x) => x.lowEnergyFriendly);

const report = `# Co-Gym Assistant — Curated MVP Pool Report

**${out.length} reviewed exercises** for the workout generator. Source: \`data/mvp-pool.json\`.
Built from the 640-exercise tagged library; every entry is a real dataset record.
Settings assumption: \`hasDoorAnchor: false\` (handles-only bands, no bench/bar/machine).

## By category (target balance)
| category | count |
|---|---|
${tbl(count(out, "category"))}

## By equipment
| equipment | count |
|---|---|
${tbl(count(out, "equipment"))}

## By movement pattern
| pattern | count |
|---|---|
${tbl(count(out, "movementPattern"))}

## By split tag
| split | count |
|---|---|
${tbl(count(out, "splitTag"))}

## By body region
| region | count |
|---|---|
${tbl(count(out, "bodyRegion"))}

## By primary muscle
| muscle | count |
|---|---|
${tbl(count(out, "primaryMuscle"))}

## By difficulty (manually confirmed)
| difficulty | count |
|---|---|
${tbl(count(out, "difficulty"))}

## Low-energy-friendly subset: ${lowE.length}
Used for low-energy / post-injection / poor-readiness sessions.

## Confidence & provenance
- \`difficulty\` is **manually confirmed** for all ${out.length} (was the weak inferred field).
- \`movementPattern\` / \`splitTag\` keep their original inferred confidence.
- Programming fields (\`repRange\`, \`setRange\`, \`restSeconds\`, \`rpeTarget\`, \`progression\`,
  \`regression\`) are **manual-curated**, beginner-first, RPE-based, no failure training.
- Every exercise: \`requiresAnchor/Bench/PullupBar/Special = false\`.
`;

fs.writeFileSync(OUT_DOC, report);
console.log(`Built MVP pool: ${out.length} exercises. Low-energy: ${lowE.length}.`);
console.log("By pattern:", count(out, "movementPattern").map(([k, v]) => `${k}:${v}`).join(", "));
console.log(`Wrote:\n  ${OUT_JSON}\n  ${OUT_DOC}`);

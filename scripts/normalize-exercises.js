/*
 * Phase 0 — Exercise data pipeline for Co-Gym Assistant
 *
 * Reads the raw ExerciseDB-style export, keeps only home-equipment exercises,
 * derives the metadata fields described in CLAUDE.md via transparent keyword
 * rules, flags edge cases that need a human review, and emits:
 *   - data/exercises.normalized.json   (EN-only, runtime-ready)
 *   - data/coverage-report.md          (gap report to drive the metadata decision)
 *
 * Run:  node scripts/normalize-exercises.js
 *
 * Nothing here is authoritative training advice — every derived field is a
 * heuristic guess meant to be reviewed. The "review flags" section of the
 * report is the important output.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const RAW = path.join(ROOT, "data", "exercises.json");
const OUT_JSON = path.join(ROOT, "data", "exercises.normalized.json");
const OUT_REPORT = path.join(ROOT, "data", "coverage-report.md");

// ---------------------------------------------------------------------------
// Equipment policy (from CLAUDE.md "Allowed equipment categories")
// ---------------------------------------------------------------------------
// Raw -> normalized home enum. resistance band collapses into "band".
const EQUIPMENT_MAP = {
  "body weight": "bodyweight",
  dumbbell: "dumbbell",
  band: "band",
  "resistance band": "band",
};
// "rope" is intentionally NOT whitelisted: the bucket is mixed (jump rope,
// rope climb, battling ropes vs. usable strap stretches). Handled separately.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const has = (text, words) => words.some((w) => text.includes(w));

// ---------------------------------------------------------------------------
// Heuristic taggers (ordered priority; first match wins)
// ---------------------------------------------------------------------------
function movementPattern(name) {
  const n = ` ${name} `;
  if (has(n, ["stretch", " pose", " mobility", "foam roll", " yoga"])) return "mobility";
  if (has(n, ["pallof", "anti-rotation", "wood chop", "woodchop"])) return "core-anti-rotation";
  if (has(n, ["plank", "rollout", "roll-out", "dead bug", "deadbug", "ab wheel", "wheel roll"])) return "core-anti-extension";
  if (has(n, ["crunch", "sit-up", "sit up", "leg raise", "leg-raise", "v-up", "knee raise", "knee-up", "russian twist", "toes to bar", "jackknife"])) return "core-flexion";
  if (has(n, ["lunge", "split squat", "step-up", "step up", "cossack"])) return "lunge";
  if (has(n, ["deadlift", "hip thrust", "good morning", "romanian", " rdl", "hyperextension", "back extension", "glute bridge", "swing", "hip extension"])) return "hinge";
  if (has(n, ["squat"])) return "squat";
  if (has(n, ["carry", "farmer", "suitcase"])) return "carry";
  if (has(n, ["press", "push-up", "push up", "pushup", " dip", " fly", " flye", "overhead", "push press"])) return "push";
  if (has(n, ["row", "pulldown", "pull-down", "pull-up", "pull up", "pullup", "chin-up", "chin up", "face pull", "shrug", "pullover", "reverse fly", "rear delt"])) return "pull";
  // isolation fallback (curls, extensions, raises, kickbacks, calf raises)
  return "isolation";
}

function bodyRegion(bodyPart) {
  if (["upper legs", "lower legs"].includes(bodyPart)) return "lower";
  if (["waist", "cardio"].includes(bodyPart)) return "full"; // core/cardio bucket
  return "upper"; // back, chest, shoulders, upper arms, lower arms, neck
}

function splitTag(name, bodyPart, pattern, primaryMuscle) {
  if (bodyPart === "waist" || pattern.startsWith("core")) return "core";
  if (["squat", "hinge", "lunge"].includes(pattern) || bodyRegion(bodyPart) === "lower") return "legs";
  if (pattern === "push") return "push";
  if (pattern === "pull") return "pull";
  // isolation fallback by muscle
  const m = primaryMuscle.toLowerCase();
  if (has(m, ["chest", "pec", "tricep", "delt", "shoulder"])) return "push";
  if (has(m, ["back", "lat", "bicep", "trap", "forearm", "rhomboid"])) return "pull";
  return "core";
}

function difficulty(name, equipment) {
  const n = ` ${name} `;
  if (has(n, ["pistol", "single-leg", "single leg", "one-arm", "one arm", "one-leg", "deficit", "plyo", "jump", "explosive", "muscle-up", "muscle up", "archer", "shrimp", "nordic", "weighted"])) return "advanced";
  if (has(n, ["assisted", "wall", "kneeling", "on knees", "seated", "incline", "box ", "machine", "supported", "modified"])) return "beginner";
  if (equipment === "bodyweight" && has(n, ["crunch", "bridge", "plank", "raise", "march"])) return "beginner";
  return "intermediate";
}

// Home-suitability flags. Returns { homeSuitable, needsAnchor, reasons[] }
function homeSafety(name, equipment, instructionsEn) {
  const n = ` ${name} `;
  const text = `${n} ${instructionsEn.toLowerCase()}`;
  const reasons = [];
  let needsAnchor = false;

  // Things you simply don't have at home
  if (has(n, ["pull-up", "pull up", "pullup", "chin-up", "chin up", "muscle-up", "muscle up", "rope climb", "lat pulldown"]))
    reasons.push("needs pull-up bar / overhead bar");
  if (has(n, ["battling rope", "battle rope"])) reasons.push("needs battling ropes");
  if (n.includes("jump rope") || n.includes("skipping")) reasons.push("needs jump rope (defer)");
  if (has(n, ["bench dip", "decline", "incline bench", "dip cage", "dip station", "parallel bars"]))
    reasons.push("needs bench/dip station (check floor sub)");
  if (has(n, ["smith", "cable", "barbell", "leverage", "sled", "kettlebell"]))
    reasons.push("references unavailable equipment in name");

  // Band moves that need a fixed anchor or bar
  if (equipment === "band" && has(n, ["pulldown", "pull-down", "assisted pull-up", "fixed back", "lat ", "pull-up", "chin-up"])) {
    needsAnchor = true;
    reasons.push("band move likely needs high/overhead anchor");
  }
  if (equipment === "band" && has(text, ["anchor", "door", "attach the band to", "secure the band"])) {
    needsAnchor = true;
  }

  return { homeSuitable: reasons.length === 0, needsAnchor, reasons };
}

function lowEnergyFriendly(pattern, difficulty, equipment) {
  if (difficulty === "advanced") return false;
  if (["mobility", "core-anti-extension", "core-flexion", "isolation"].includes(pattern)) return true;
  if (equipment === "bodyweight" || equipment === "band") return true;
  return difficulty === "beginner";
}

// Reconcile the two primary-muscle taxonomies. Prefer `target`, fall back to
// `muscle_group`. Both are kept raw in the output for later cleanup.
function primaryMuscle(target, muscleGroup) {
  return (target || muscleGroup || "").trim();
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));

const kept = [];
const dropped = []; // {name, equipment}
const reviewFlags = []; // {name, equipment, reasons}

for (const r of raw) {
  const eqNorm = EQUIPMENT_MAP[r.equipment];
  if (!eqNorm) {
    dropped.push({ name: r.name, equipment: r.equipment });
    continue;
  }

  const name = r.name;
  const instructionsEn = (r.instructions && r.instructions.en) || "";
  const stepsEn = (r.instruction_steps && r.instruction_steps.en) || [];
  const pMuscle = primaryMuscle(r.target, r.muscle_group);
  const pattern = movementPattern(name);
  const region = bodyRegion(r.body_part);
  const split = splitTag(name, r.body_part, pattern, pMuscle);
  const diff = difficulty(name, eqNorm);
  const safety = homeSafety(name, eqNorm, instructionsEn);

  if (safety.reasons.length) reviewFlags.push({ name, equipment: r.equipment, reasons: safety.reasons });

  kept.push({
    id: r.id,
    slug: slugify(name),
    name: title(name),

    bodyPart: r.body_part,
    equipmentRaw: r.equipment,
    primaryMuscle: pMuscle,
    primaryMuscleAlt: r.muscle_group, // kept for reconciliation
    secondaryMuscles: r.secondary_muscles || [],
    instructionsEn,
    instructionStepsEn: stepsEn,
    image: r.image,
    gifUrl: r.gif_url,

    equipment: eqNorm,
    needsAnchor: safety.needsAnchor,

    movementPattern: pattern,
    splitTag: split,
    bodyRegion: region,

    difficulty: diff,
    beginnerSuitable: diff === "beginner",
    lowEnergyFriendly: lowEnergyFriendly(pattern, diff, eqNorm),

    homeSuitable: safety.homeSuitable,
    reviewReasons: safety.reasons, // empty if clean

    // Programming fields left null on purpose — fill strategy is the decision
    // we make AFTER reading this report.
    repRange: null,
    setRange: null,
    restSeconds: null,
    rpeTarget: null,
    progression: null,
    regression: null,
    substitutions: [],
    jointRiskNotes: null,
    safetyNotes: null,
  });
}

fs.writeFileSync(OUT_JSON, JSON.stringify(kept, null, 2));

// ---------------------------------------------------------------------------
// Coverage report
// ---------------------------------------------------------------------------
const count = (arr, keyFn) => {
  const m = {};
  for (const x of arr) {
    const k = keyFn(x);
    m[k] = (m[k] || 0) + 1;
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};
const table = (rows) => rows.map(([k, v]) => `| ${k} | ${v} |`).join("\n");

const homeOk = kept.filter((x) => x.homeSuitable);
const report = `# Co-Gym Assistant — Phase 0 Coverage Report

Generated by \`scripts/normalize-exercises.js\` from \`data/exercises.json\`.
All derived fields are heuristic and meant for review.

## Headline
- Raw records: **${raw.length}**
- Kept (home equipment): **${kept.length}**
- Dropped (non-home equipment): **${dropped.length}**
- Flagged for human review: **${reviewFlags.length}**
- Clean & home-suitable (no flags): **${homeOk.length}**

## Kept by equipment
| equipment | count |
|---|---|
${table(count(kept, (x) => x.equipment))}

## Movement pattern coverage (kept set)
| pattern | count |
|---|---|
${table(count(kept, (x) => x.movementPattern))}

## Split tag coverage
| split | count |
|---|---|
${table(count(kept, (x) => x.splitTag))}

## Body region coverage
| region | count |
|---|---|
${table(count(kept, (x) => x.bodyRegion))}

## Difficulty distribution
| difficulty | count |
|---|---|
${table(count(kept, (x) => x.difficulty))}

## Low-energy-friendly pool
| lowEnergyFriendly | count |
|---|---|
${table(count(kept, (x) => String(x.lowEnergyFriendly)))}

## Clean home-suitable pool — pattern coverage
This is the pool we'd actually program from if we ship only flag-free exercises.
| pattern | count |
|---|---|
${table(count(homeOk, (x) => x.movementPattern))}

## Review flags (${reviewFlags.length})
Exercises kept by equipment filter but flagged for a human decision.
| name | equipment | reasons |
|---|---|---|
${reviewFlags.map((f) => `| ${f.name} | ${f.equipment} | ${f.reasons.join("; ")} |`).join("\n")}
`;

fs.writeFileSync(OUT_REPORT, report);

console.log(`Kept ${kept.length} / ${raw.length}. Flags: ${reviewFlags.length}. Clean: ${homeOk.length}.`);
console.log(`Wrote:\n  ${OUT_JSON}\n  ${OUT_REPORT}`);

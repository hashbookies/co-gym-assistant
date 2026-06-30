/*
 * Phase 0 enrichment + gap report (hybrid strategy).
 *
 * Adds CONFIDENCE + PROVENANCE to every inferred field so nothing reads as
 * false certainty. Source fields (from the dataset) are marked "source/high".
 * Inferred fields get high | medium | low based on how the heuristic fired.
 *
 *   data/exercises.tagged.json  - usable pool, each record + _confidence + _provenance + _dup
 *   data/gap-report.md          - coverage, weak-metadata audit, duplicate list, recommendation
 *
 * Run:  node scripts/enrich-and-report.js   (after finalize-pool.js)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FINAL = path.join(ROOT, "data", "exercises.final.json");
const OUT_JSON = path.join(ROOT, "data", "exercises.tagged.json");
const OUT_DOC = path.join(ROOT, "data", "gap-report.md");

const all = JSON.parse(fs.readFileSync(FINAL, "utf8"));
const pool = all.filter((x) => x.homeSuitable);

const has = (t, ws) => ws.some((w) => t.includes(w));

// --- movement pattern with confidence -------------------------------------
const STRONG = {
  squat: ["squat"],
  hinge: ["deadlift", "hip thrust", "romanian", " rdl", "glute bridge", "good morning", "hyperextension", "back extension"],
  lunge: ["lunge", "split squat", "step-up", "step up"],
  "core-flexion": ["crunch", "sit-up", "sit up", "leg raise", "v-up", "russian twist"],
  "core-anti-extension": ["plank", "rollout", "roll-out", "dead bug", "ab wheel"],
  "core-anti-rotation": ["pallof", "wood chop", "woodchop"],
  mobility: ["stretch", " pose", " mobility", "foam roll"],
};
const BROAD = {
  push: ["press", "push-up", "push up", "pushup", " dip", " fly", " flye", "overhead", "raise"],
  pull: ["row", "pulldown", "pull-down", "face pull", "shrug", "pullover", "reverse fly"],
  hinge: ["swing", "hip extension"],
  lunge: ["cossack"],
  carry: ["carry", "farmer", "suitcase"],
};
function tagPattern(name) {
  const n = ` ${name.toLowerCase()} `;
  for (const [pat, ws] of Object.entries(STRONG)) if (has(n, ws)) return { value: pat, confidence: "high" };
  for (const [pat, ws] of Object.entries(BROAD)) if (has(n, ws)) return { value: pat, confidence: "medium" };
  return { value: "isolation", confidence: "low" }; // fallback bucket
}

// --- body region (mostly deterministic) -----------------------------------
function tagRegion(bp) {
  if (["upper legs", "lower legs"].includes(bp)) return { value: "lower", confidence: "high" };
  if (["waist", "cardio"].includes(bp)) return { value: "full", confidence: "medium" }; // judgment
  return { value: "upper", confidence: "high" };
}

// --- split tag ------------------------------------------------------------
function tagSplit(bp, pattern, muscle) {
  if (bp === "waist" || pattern.startsWith("core")) return { value: "core", confidence: "high" };
  if (["squat", "hinge", "lunge"].includes(pattern)) return { value: "legs", confidence: "high" };
  if (["upper legs", "lower legs"].includes(bp)) return { value: "legs", confidence: "high" };
  if (pattern === "push") return { value: "push", confidence: "high" };
  if (pattern === "pull") return { value: "pull", confidence: "high" };
  const m = (muscle || "").toLowerCase();
  if (has(m, ["chest", "pec", "tricep", "delt", "shoulder"])) return { value: "push", confidence: "medium" };
  if (has(m, ["back", "lat", "bicep", "trap", "forearm"])) return { value: "pull", confidence: "medium" };
  return { value: "core", confidence: "low" };
}

// --- difficulty (always inferred, honest low/medium) ----------------------
function tagDifficulty(name, eq) {
  const n = ` ${name.toLowerCase()} `;
  if (has(n, ["pistol", "single-leg", "single leg", "one-arm", "one arm", "deficit", "plyo", "jump", "explosive", "archer", "nordic", "shrimp"]))
    return { value: "advanced", confidence: "medium" };
  if (has(n, ["assisted", "wall", "kneeling", "on knees", "seated", "incline", "supported", "modified"]))
    return { value: "beginner", confidence: "medium" };
  if (eq === "bodyweight" && has(n, ["crunch", "bridge", "plank", "march"]))
    return { value: "beginner", confidence: "low" };
  return { value: "intermediate", confidence: "low" }; // default guess
}

function tagLowEnergy(pattern, diff, eq) {
  let v;
  if (diff === "advanced") v = false;
  else if (["mobility", "core-anti-extension", "core-flexion", "isolation"].includes(pattern)) v = true;
  else if (eq === "bodyweight" || eq === "band") v = true;
  else v = diff === "beginner";
  return { value: v, confidence: "medium" };
}

// --- duplicate detection --------------------------------------------------
const normName = (n) =>
  n.toLowerCase().replace(/\(male\)|\(female\)|v\.?\s*\d+|version\s*\d+/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const clusters = {};
for (const x of pool) (clusters[normName(x.name)] = clusters[normName(x.name)] || []).push(x.slug);

// --- enrich ---------------------------------------------------------------
const SOURCE_FIELDS = ["id", "name", "bodyPart", "equipment", "primaryMuscle", "secondaryMuscles", "instructionsEn", "image", "gifUrl"];
const tagged = pool.map((x) => {
  const pattern = tagPattern(x.name);
  const region = tagRegion(x.bodyPart);
  const split = tagSplit(x.bodyPart, pattern.value, x.primaryMuscle);
  const diff = tagDifficulty(x.name, x.equipment);
  const lowE = tagLowEnergy(pattern.value, diff.value, x.equipment);
  const cluster = clusters[normName(x.name)];

  return {
    ...x,
    movementPattern: pattern.value,
    bodyRegion: region.value,
    splitTag: split.value,
    difficulty: diff.value,
    beginnerSuitable: diff.value === "beginner",
    lowEnergyFriendly: lowE.value,
    _confidence: {
      movementPattern: pattern.confidence,
      bodyRegion: region.confidence,
      splitTag: split.confidence,
      difficulty: diff.confidence,
      lowEnergyFriendly: lowE.confidence,
      // homeSuitable: manually reviewed flags are high; clean keeps are medium
      homeSuitable: x.verdict && x.verdict !== "keep" ? "high" : "medium",
    },
    _provenance: {
      ...Object.fromEntries(SOURCE_FIELDS.map((f) => [f, "source"])),
      movementPattern: "inferred",
      bodyRegion: "inferred",
      splitTag: "inferred",
      difficulty: "inferred",
      beginnerSuitable: "inferred",
      lowEnergyFriendly: "inferred",
      homeSuitable: x.verdict && x.verdict !== "keep" ? "reviewed" : "inferred",
    },
    _dup: cluster.length > 1 ? { cluster: normName(x.name), size: cluster.length } : null,
  };
});

fs.writeFileSync(OUT_JSON, JSON.stringify(tagged, null, 2));

// --- report ---------------------------------------------------------------
const count = (arr, k) => {
  const m = {};
  for (const x of arr) { const key = typeof k === "function" ? k(x) : x[k]; m[key] = (m[key] || 0) + 1; }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};
const tbl = (rows) => rows.map(([k, v]) => `| ${k} | ${v} |`).join("\n");

const confField = (f) => count(tagged, (x) => x._confidence[f]);
const dupClusters = Object.entries(clusters).filter(([, v]) => v.length > 1);
const redundant = dupClusters.reduce((s, [, v]) => s + v.length - 1, 0);

// programming-field gap (these are intentionally empty pre-MVP)
const PROG = ["repRange", "setRange", "restSeconds", "rpeTarget", "progression", "regression", "jointRiskNotes", "safetyNotes"];
const progGap = PROG.map((f) => [f, tagged.filter((x) => x[f] == null || (Array.isArray(x[f]) && !x[f].length)).length]);

const doc = `# Co-Gym Assistant — Phase 0 Gap Report (usable pool)

Source: \`data/exercises.tagged.json\` (${tagged.length} usable exercises).
Inferred fields carry confidence (high / medium / low). Source fields are taken
directly from the dataset and are not guesses.

## 1. Coverage by equipment
| equipment | count |
|---|---|
${tbl(count(tagged, "equipment"))}

## 2. Coverage by body part / category
(\`category\` == \`body_part\` in source, so one table.)
| body part | count |
|---|---|
${tbl(count(tagged, "bodyPart"))}

## 3. Coverage by primary muscle (source field, high confidence)
| muscle | count |
|---|---|
${tbl(count(tagged, "primaryMuscle"))}

## 4. Coverage by movement pattern (inferred)
| pattern | count |
|---|---|
${tbl(count(tagged, "movementPattern"))}

## 5. Coverage by split tag (inferred)
| split | count |
|---|---|
${tbl(count(tagged, "splitTag"))}

## 6. Confidence distribution of inferred fields
How much of the auto-tagging is a confident call vs. a soft guess.

**movementPattern** | ${confField("movementPattern").map(([k, v]) => `${k}: ${v}`).join(" · ")}
**splitTag** | ${confField("splitTag").map(([k, v]) => `${k}: ${v}`).join(" · ")}
**bodyRegion** | ${confField("bodyRegion").map(([k, v]) => `${k}: ${v}`).join(" · ")}
**difficulty** | ${confField("difficulty").map(([k, v]) => `${k}: ${v}`).join(" · ")}
**homeSuitable** | ${confField("homeSuitable").map(([k, v]) => `${k}: ${v}`).join(" · ")}

> \`difficulty\` is the weakest signal — it is a name-keyword guess, never asserted
> as fact. It must be human-confirmed for any exercise that enters the MVP pool.

## 7. Missing / weak metadata
Source text fields are complete (0 empty instructions, 0 empty secondary muscles).
The real gaps are the **programming fields**, intentionally left null in Phase 0:

| field | records missing |
|---|---|
${tbl(progGap)}

These are exactly the 18-field set from CLAUDE.md. They are NOT auto-invented —
they are the manual job for the reviewed MVP pool.

## 8. Duplicates (${dupClusters.length} clusters, ${redundant} redundant records)
Mostly "V. 2" re-shoots and male/female variants of the same movement. Keep one
canonical per cluster for the MVP pool; the rest stay searchable in the library.

${dupClusters.map(([k, v]) => `- **${k}** (${v.length}): ${v.join(", ")}`).join("\n")}

## 9. Unsafe / gym-dependent / unclear — status
The 40 gym-dependent exercises (pull-up bar, bench, parallel bars) were already
excluded in the exclusion review (\`exclusion-review.md\`) and are **not** in this
pool. Remaining safety review is per-exercise during MVP curation (joint-risk
notes, regression for beginners).

## 10. Recommendation: HYBRID (confirmed direction)
The data supports the hybrid plan:

- **Auto-tag the full ${tagged.length}-exercise pool** with the confidence fields above
  → powers Exercise Library search/filter now, expansion later.
- **Manually review a ${"~60–100"}-exercise MVP pool** for the workout generator:
  - confirm \`difficulty\` (low confidence) and \`homeSuitable\` (medium) by hand,
  - author the 8 programming fields,
  - pick one canonical per duplicate cluster,
  - guarantee movement-pattern balance (compounds are scarce: squat ${count(tagged, "movementPattern").find(([k]) => k === "squat")?.[1] || 0}, hinge ${count(tagged, "movementPattern").find(([k]) => k === "hinge")?.[1] || 0}, lunge ${count(tagged, "movementPattern").find(([k]) => k === "lunge")?.[1] || 0}).
- **Generator uses only the reviewed pool** at first; library uses the full tagged set.

Why not auto-tag-only for generation: \`difficulty\` and programming fields are too
safety-sensitive to ship as guesses for a user on tirzepatide. Why not curate-only:
throwing away 580 tagged exercises kills the library/search value for no benefit.
`;

fs.writeFileSync(OUT_DOC, doc);
console.log(`Tagged ${tagged.length} exercises. Dup clusters: ${dupClusters.length} (${redundant} redundant).`);
console.log(`Wrote:\n  ${OUT_JSON}\n  ${OUT_DOC}`);

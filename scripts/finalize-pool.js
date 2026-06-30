/*
 * Apply flag decisions -> final usable exercise pool + exclusion review doc.
 *
 *   data/exercises.final.json   (all kept records with final homeSuitable + decision)
 *   data/exclusion-review.md    (per-exercise verdict table + pool summary)
 *
 * Run:  node scripts/finalize-pool.js   (run normalize-exercises.js first)
 */
const fs = require("fs");
const path = require("path");
const DECISIONS = require("./flag-decisions.js");

const ROOT = path.resolve(__dirname, "..");
const NORM = path.join(ROOT, "data", "exercises.normalized.json");
const OUT_JSON = path.join(ROOT, "data", "exercises.final.json");
const OUT_DOC = path.join(ROOT, "data", "exclusion-review.md");

const data = JSON.parse(fs.readFileSync(NORM, "utf8"));

// Apply decisions
let applied = 0;
const seen = new Set();
for (const x of data) {
  if (!x.reviewReasons.length) continue;
  const d = DECISIONS[x.slug];
  if (!d) {
    console.warn("NO DECISION for", x.slug);
    continue;
  }
  x.homeSuitable = d.homeSuitable;
  x.verdict = d.verdict;
  x.requiresUnavailable = d.requiresUnavail;
  x.substitute = d.substitute;
  applied++;
  seen.add(x.slug);
}
// records that pass equipment filter and weren't flagged are clean keeps
for (const x of data) {
  if (!x.verdict) x.verdict = x.homeSuitable ? "keep" : "exclude";
}

fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2));

// Usable pool = homeSuitable
const pool = data.filter((x) => x.homeSuitable);
const excluded = data.filter((x) => !x.homeSuitable);

const count = (arr, k) => {
  const m = {};
  for (const x of arr) {
    const key = typeof k === "function" ? k(x) : x[k];
    m[key] = (m[key] || 0) + 1;
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};
const tbl = (rows) => rows.map(([k, v]) => `| ${k} | ${v} |`).join("\n");

// Per-decision review table (only the flagged ones)
const flagged = data.filter((x) => DECISIONS[x.slug]);
const reviewRows = flagged
  .map((x) => {
    const d = DECISIONS[x.slug];
    return `| ${x.slug} | ${x.equipmentRaw} | ${x.reviewReasons.join("; ")} | **${d.verdict}** | ${d.homeSuitable} | ${d.requiresUnavail || "—"} | ${d.substitute} |`;
  })
  .join("\n");

const verdictCounts = count(flagged, (x) => DECISIONS[x.slug].verdict);

const doc = `# Co-Gym Assistant — Exclusion Review (56 flagged exercises)

Decisions applied from \`scripts/flag-decisions.js\`. Output dataset: \`data/exercises.final.json\`.

## Verdict summary
| verdict | count |
|---|---|
${tbl(verdictCounts)}

> Note: 56 flagged records map to **55 unique slugs** — \`dumbbell-standing-one-arm-curl-over-incline-bench\` appears twice (duplicate source rows). De-dupe later.

## Per-exercise decisions
| slug | equipment | flag reason | verdict | homeSuitable | requires (unavailable) | home-safe substitute |
|---|---|---|---|---|---|---|
${reviewRows}

---

# Final usable pool

- Total kept by equipment filter: **${data.length}**
- **Usable (homeSuitable = true): ${pool.length}**
- Excluded: **${excluded.length}**

## Pool by equipment
| equipment | count |
|---|---|
${tbl(count(pool, "equipment"))}

## Pool by body part
| body part | count |
|---|---|
${tbl(count(pool, "bodyPart"))}

## Pool by primary muscle (target)
| muscle | count |
|---|---|
${tbl(count(pool, "primaryMuscle"))}

## Pool by movement pattern
| pattern | count |
|---|---|
${tbl(count(pool, "movementPattern"))}

## Pool by split tag
| split | count |
|---|---|
${tbl(count(pool, "splitTag"))}
`;

fs.writeFileSync(OUT_DOC, doc);

console.log(`Applied ${applied} decisions (${seen.size} unique slugs).`);
console.log(`Final pool: ${pool.length} usable / ${data.length} kept. Excluded: ${excluded.length}.`);
console.log(`Wrote:\n  ${OUT_JSON}\n  ${OUT_DOC}`);

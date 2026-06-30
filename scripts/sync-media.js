/*
 * Copy exercise media into /public so Next can serve it statically.
 *
 *   images/  -> public/images/   (~12 MB, 1324 jpgs)
 *   videos/  -> public/videos/   (~126 MB, 1324 gifs)
 *
 * Non-destructive: the root images/ and videos/ folders stay the source of
 * truth (the old prototype still references them). The public copies are
 * gitignored so they never bloat version control — re-run this after a clean
 * checkout: `npm run sync:media`.
 *
 * Run:  node scripts/sync-media.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PAIRS = [
  ["images", path.join("public", "images")],
  ["videos", path.join("public", "videos")],
];

let copied = 0;
let skipped = 0;

for (const [srcRel, destRel] of PAIRS) {
  const src = path.join(ROOT, srcRel);
  const dest = path.join(ROOT, destRel);
  if (!fs.existsSync(src)) {
    console.warn(`! source missing, skipping: ${srcRel}`);
    continue;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    // Skip files already present with the same size (cheap mirror).
    if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size) {
      skipped++;
      continue;
    }
    fs.copyFileSync(from, to);
    copied++;
  }
  console.log(`${srcRel} -> ${destRel}`);
}

console.log(`Done. Copied ${copied}, skipped ${skipped} (already up to date).`);

# Co-Gym Assistant — Phase 1 (App Scaffold)

Mobile-first Next.js App Router app. Local data + localStorage only. No backend,
auth, AI, or nutrition yet.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build + type-check
npm run build:pool   # regenerate data/mvp-pool.json from the curated builder
```

## Where data is loaded

| Data | File | Loader | Used by |
|---|---|---|---|
| Curated generator pool (65) | `data/mvp-pool.json` | `lib/data/pool.ts` | Workout generator ONLY |
| Full library (640) | `data/exercises.tagged.json` | `lib/data/library.ts` | Library browse + detail |

JSON is statically imported (no runtime fetch). The library list is projected to
a slim card shape in a server component so instruction text stays off the client.

## Generator rules (lib/generator.ts — pure & deterministic)

- Reads only the curated pool passed in.
- 3-day full-body; primary leg pattern rotates **squat → hinge → lunge** (no hard
  pattern back-to-back). Push alternates horizontal/vertical.
- Normal: RPE ≤ 7, full set ranges. Low-energy: RPE 5–6, 2 sets, +30s rest, only
  `lowEnergyFriendly` exercises, fewer movements.
- No failure training. Substitutions + safety/joint notes shown in the UI.
- `isGeneratorEligible` (lib/filters.ts) excludes any exercise with
  `requiresAnchor/Bench/PullupBar/DoorSetup/SpecialEquipment` unless the matching
  setting is enabled. MVP pool ships with all gates false.

## Readiness (lib/readiness.ts — pure)

Asks: nausea, dizziness, hydration, sleep, soreness, energy, appetite/fueling,
injection day. Red flags (dizziness, worsening nausea, dehydration, very poor
sleep, severe soreness, very low energy, under-fueling) → **rest/mobility/walk**
with a clinician note. Cautions → **low-energy**. Otherwise → **normal**.

## Tests (Vitest)

```bash
npm test          # run once
npm run test:watch
```

Pure-logic + smoke tests live in `tests/` (48 tests):
- `rng.test.ts` — determinism of the seeded PRNG.
- `readiness.test.ts` — red-flag routing (rest / low-energy / normal) + disclaimer.
- `filters.test.ts` — equipment-gate exclusion, equipment toggles, defaults false.
- `generator.test.ts` — pool-only sourcing, no gated exercises, RPE caps, low-energy
  rules, A/B/C squat→hinge→lunge rotation, legs/push/pull/core balance, substitution
  resolution, determinism, disabled-equipment respect.
- `smoke.test.tsx` — dashboard / generator / library routes render (jsdom + RTL).

## Phase 1 TODOs (intentionally deferred)

- PWA service worker + real icons (`public/icons/icon-192.png`, `icon-512.png`
  are referenced by the manifest but not yet added).
- Exercise images/gifs (`images/`, `videos/` at repo root) not yet served from
  `/public` — detail page shows text steps only.
- Unit tests for `generator.ts` / `readiness.ts` (logic is pure and ready to test).

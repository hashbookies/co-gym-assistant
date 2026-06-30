# Co-Gym Assistant — Phase 0 Gap Report (usable pool)

Source: `data/exercises.tagged.json` (640 usable exercises).
Inferred fields carry confidence (high / medium / low). Source fields are taken
directly from the dataset and are not guesses.

## 1. Coverage by equipment
| equipment | count |
|---|---|
| bodyweight | 298 |
| dumbbell | 282 |
| band | 60 |

## 2. Coverage by body part / category
(`category` == `body_part` in source, so one table.)
| body part | count |
|---|---|
| upper arms | 156 |
| upper legs | 108 |
| waist | 102 |
| chest | 74 |
| shoulders | 69 |
| back | 61 |
| lower legs | 26 |
| cardio | 22 |
| lower arms | 20 |
| neck | 2 |

## 3. Coverage by primary muscle (source field, high confidence)
| muscle | count |
|---|---|
| abs | 102 |
| biceps | 86 |
| pectorals | 71 |
| triceps | 70 |
| delts | 69 |
| glutes | 65 |
| upper back | 33 |
| calves | 26 |
| quads | 22 |
| cardiovascular system | 22 |
| forearms | 20 |
| hamstrings | 14 |
| lats | 13 |
| spine | 9 |
| traps | 6 |
| abductors | 4 |
| adductors | 3 |
| serratus anterior | 3 |
| levator scapulae | 2 |

## 4. Coverage by movement pattern (inferred)
| pattern | count |
|---|---|
| isolation | 251 |
| push | 190 |
| core-flexion | 47 |
| pull | 44 |
| mobility | 34 |
| squat | 29 |
| hinge | 18 |
| lunge | 15 |
| core-anti-extension | 9 |
| core-anti-rotation | 2 |
| carry | 1 |

## 5. Coverage by split tag (inferred)
| split | count |
|---|---|
| push | 207 |
| pull | 153 |
| legs | 146 |
| core | 134 |

## 6. Confidence distribution of inferred fields
How much of the auto-tagging is a confident call vs. a soft guess.

**movementPattern** | low: 251 · medium: 238 · high: 151
**splitTag** | high: 456 · medium: 157 · low: 27
**bodyRegion** | high: 516 · medium: 124
**difficulty** | low: 433 · medium: 207
**homeSuitable** | medium: 625 · high: 15

> `difficulty` is the weakest signal — it is a name-keyword guess, never asserted
> as fact. It must be human-confirmed for any exercise that enters the MVP pool.

## 7. Missing / weak metadata
Source text fields are complete (0 empty instructions, 0 empty secondary muscles).
The real gaps are the **programming fields**, intentionally left null in Phase 0:

| field | records missing |
|---|---|
| repRange | 640 |
| setRange | 640 |
| restSeconds | 640 |
| rpeTarget | 640 |
| progression | 640 |
| regression | 640 |
| jointRiskNotes | 640 |
| safetyNotes | 640 |

These are exactly the 18-field set from CLAUDE.md. They are NOT auto-invented —
they are the manual job for the reviewed MVP pool.

## 8. Duplicates (18 clusters, 18 redundant records)
Mostly "V. 2" re-shoots and male/female variants of the same movement. Keep one
canonical per cluster for the MVP pool; the rest stay searchable in the library.

- **dumbbell arnold press** (2): dumbbell-arnold-press, dumbbell-arnold-press-v-2
- **dumbbell close grip press** (2): dumbbell-close-grip-press, dumbbell-close-grip-press
- **dumbbell cross body hammer curl** (2): dumbbell-cross-body-hammer-curl, dumbbell-cross-body-hammer-curl-v-2
- **dumbbell cuban press** (2): dumbbell-cuban-press, dumbbell-cuban-press-v-2
- **dumbbell decline shrug** (2): dumbbell-decline-shrug, dumbbell-decline-shrug-v-2
- **dumbbell front raise** (2): dumbbell-front-raise, dumbbell-front-raise-v-2
- **dumbbell hammer curl** (2): dumbbell-hammer-curl, dumbbell-hammer-curl-v-2
- **dumbbell incline curl** (2): dumbbell-incline-curl, dumbbell-incline-curl-v-2
- **dumbbell lying one arm press** (2): dumbbell-lying-one-arm-press, dumbbell-lying-one-arm-press-v-2
- **dumbbell one arm shoulder press** (2): dumbbell-one-arm-shoulder-press, dumbbell-one-arm-shoulder-press-v-2
- **dumbbell seated lateral raise** (2): dumbbell-seated-lateral-raise, dumbbell-seated-lateral-raise-v-2
- **dumbbell standing one arm curl over incline bench** (2): dumbbell-standing-one-arm-curl-over-incline-bench, dumbbell-standing-one-arm-curl-over-incline-bench
- **inchworm** (2): inchworm, inchworm-v-2
- **inverted row** (2): inverted-row, inverted-row-v-2
- **jump squat** (2): jump-squat, jump-squat-v-2
- **push up wall** (2): push-up-wall, push-up-wall-v-2
- **self assisted inverse leg curl** (2): self-assisted-inverse-leg-curl, self-assisted-inverse-leg-curl
- **twisted leg raise** (2): twisted-leg-raise, twisted-leg-raise-female

## 9. Unsafe / gym-dependent / unclear — status
The 40 gym-dependent exercises (pull-up bar, bench, parallel bars) were already
excluded in the exclusion review (`exclusion-review.md`) and are **not** in this
pool. Remaining safety review is per-exercise during MVP curation (joint-risk
notes, regression for beginners).

## 10. Recommendation: HYBRID (confirmed direction)
The data supports the hybrid plan:

- **Auto-tag the full 640-exercise pool** with the confidence fields above
  → powers Exercise Library search/filter now, expansion later.
- **Manually review a ~60–100-exercise MVP pool** for the workout generator:
  - confirm `difficulty` (low confidence) and `homeSuitable` (medium) by hand,
  - author the 8 programming fields,
  - pick one canonical per duplicate cluster,
  - guarantee movement-pattern balance (compounds are scarce: squat 29, hinge 18, lunge 15).
- **Generator uses only the reviewed pool** at first; library uses the full tagged set.

Why not auto-tag-only for generation: `difficulty` and programming fields are too
safety-sensitive to ship as guesses for a user on tirzepatide. Why not curate-only:
throwing away 580 tagged exercises kills the library/search value for no benefit.

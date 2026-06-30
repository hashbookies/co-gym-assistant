# Co-Gym Assistant — Curated MVP Pool Report

**65 reviewed exercises** for the workout generator. Source: `data/mvp-pool.json`.
Built from the 640-exercise tagged library; every entry is a real dataset record.
Settings assumption: `hasDoorAnchor: false` (handles-only bands, no bench/bar/machine).

## By category (target balance)
| category | count |
|---|---|
| Horizontal push | 6 |
| Squat | 5 |
| Lunge | 5 |
| Horizontal pull | 5 |
| Mobility/warm-up | 5 |
| Hinge | 4 |
| Vertical push | 4 |
| Lat/back alt | 4 |
| Core flexion | 4 |
| Glutes | 4 |
| Biceps | 4 |
| Triceps | 4 |
| Shoulder isolation | 4 |
| Calves | 3 |
| Core anti-extension | 2 |
| Core anti-rotation | 2 |

## By equipment
| equipment | count |
|---|---|
| dumbbell | 32 |
| bodyweight | 23 |
| band | 10 |

## By movement pattern
| pattern | count |
|---|---|
| push | 18 |
| isolation | 11 |
| pull | 8 |
| hinge | 7 |
| squat | 5 |
| lunge | 5 |
| core-flexion | 4 |
| mobility | 4 |
| core-anti-extension | 3 |

## By split tag
| split | count |
|---|---|
| legs | 24 |
| push | 20 |
| pull | 12 |
| core | 9 |

## By body region
| region | count |
|---|---|
| upper | 32 |
| lower | 24 |
| full | 9 |

## By primary muscle
| muscle | count |
|---|---|
| glutes | 14 |
| delts | 11 |
| abs | 9 |
| triceps | 7 |
| pectorals | 5 |
| upper back | 5 |
| quads | 4 |
| biceps | 4 |
| calves | 3 |
| spine | 1 |
| abductors | 1 |
| hamstrings | 1 |

## By difficulty (manually confirmed)
| difficulty | count |
|---|---|
| intermediate | 33 |
| beginner | 32 |

## Low-energy-friendly subset: 33
Used for low-energy / post-injection / poor-readiness sessions.

## Confidence & provenance
- `difficulty` is **manually confirmed** for all 65 (was the weak inferred field).
- `movementPattern` / `splitTag` keep their original inferred confidence.
- Programming fields (`repRange`, `setRange`, `restSeconds`, `rpeTarget`, `progression`,
  `regression`) are **manual-curated**, beginner-first, RPE-based, no failure training.
- Every exercise: `requiresAnchor/Bench/PullupBar/Special = false`.

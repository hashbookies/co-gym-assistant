# Co-Gym Assistant — Exclusion Review (56 flagged exercises)

Decisions applied from `scripts/flag-decisions.js`. Output dataset: `data/exercises.final.json`.

## Verdict summary
| verdict | count |
|---|---|
| exclude | 40 |
| keep-mod | 15 |
| keep | 1 |

> Note: 56 flagged records map to **55 unique slugs** — `dumbbell-standing-one-arm-curl-over-incline-bench` appears twice (duplicate source rows). De-dupe later.

## Per-exercise decisions
| slug | equipment | flag reason | verdict | homeSuitable | requires (unavailable) | home-safe substitute |
|---|---|---|---|---|---|---|
| archer-pull-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | one-arm dumbbell row / wide band row |
| band-assisted-pull-up | band | needs pull-up bar / overhead bar; band move likely needs high/overhead anchor | **exclude** | false | pull-up bar | band seated row |
| band-close-grip-pulldown | band | band move likely needs high/overhead anchor | **keep-mod** | true | high anchor point (over-door anchor) — not confirmed | band close-grip bent-over row (if no anchor) |
| band-fixed-back-close-grip-pulldown | band | band move likely needs high/overhead anchor | **keep-mod** | true | high anchor point (over-door anchor) — not confirmed | band seated row (if no anchor) |
| band-fixed-back-underhand-pulldown | band | band move likely needs high/overhead anchor | **keep-mod** | true | high anchor point (over-door anchor) — not confirmed | band underhand bent-over row (if no anchor) |
| band-kneeling-one-arm-pulldown | band | band move likely needs high/overhead anchor | **keep-mod** | true | high anchor point (over-door anchor) — not confirmed | band one-arm bent-over row (if no anchor) |
| band-underhand-pulldown | band | band move likely needs high/overhead anchor | **keep-mod** | true | high anchor point (over-door anchor) — not confirmed | band underhand bent-over row (if no anchor) |
| bench-dip-knees-bent | body weight | needs bench/dip station (check floor sub) | **keep-mod** | true | — | use a sturdy chair/sofa edge; or floor triceps dip / close-grip push-up |
| bench-dip-on-floor | body weight | needs bench/dip station (check floor sub) | **keep** | true | — | already a floor move — no change |
| bench-pull-ups | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | bent-over dumbbell row |
| biceps-narrow-pull-ups | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | band underhand row + dumbbell curl |
| biceps-pull-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | dumbbell row + dumbbell curl |
| chest-dip-on-dip-pull-up-cage | body weight | needs pull-up bar / overhead bar | **exclude** | false | dip/pull-up cage | dumbbell floor press / floor push-up |
| chin-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | band underhand row / neutral-grip dumbbell row |
| chin-ups-narrow-parallel-grip | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | neutral-grip dumbbell row |
| close-grip-chin-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | band underhand row |
| decline-crunch | body weight | needs bench/dip station (check floor sub) | **keep-mod** | true | — | floor crunch / reverse crunch (no decline board needed) |
| decline-push-up | body weight | needs bench/dip station (check floor sub) | **keep-mod** | true | — | feet elevated on a chair/step — standard home decline push-up |
| decline-sit-up | body weight | needs bench/dip station (check floor sub) | **keep-mod** | true | — | floor sit-up (feet anchored under furniture) |
| dumbbell-decline-bench-press | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | adjustable/decline bench | dumbbell floor press |
| dumbbell-decline-fly | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | adjustable/decline bench | dumbbell floor fly (reduced ROM) / band fly |
| dumbbell-decline-hammer-press | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | adjustable/decline bench | neutral-grip dumbbell floor press |
| dumbbell-decline-one-arm-fly | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | adjustable/decline bench | one-arm dumbbell floor fly |
| dumbbell-decline-one-arm-hammer-press | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | adjustable/decline bench | one-arm dumbbell floor press |
| dumbbell-decline-shrug | dumbbell | needs bench/dip station (check floor sub) | **keep-mod** | true | — | standing dumbbell shrug (no bench needed) |
| dumbbell-decline-shrug-v-2 | dumbbell | needs bench/dip station (check floor sub) | **keep-mod** | true | — | standing dumbbell shrug (no bench needed) |
| dumbbell-decline-triceps-extension | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | adjustable/decline bench | lying floor dumbbell triceps extension |
| dumbbell-decline-twist-fly | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | adjustable/decline bench | dumbbell floor fly |
| dumbbell-incline-bench-press | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | incline bench | hands-elevated/incline push-up (upper-chest emphasis reduced) |
| dumbbell-one-arm-decline-chest-press | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | adjustable/decline bench | one-arm dumbbell floor press |
| dumbbell-palms-in-incline-bench-press | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | incline bench | neutral-grip dumbbell floor press |
| dumbbell-reverse-grip-incline-bench-one-arm-row | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | incline bench | bent-over one-arm dumbbell row |
| dumbbell-reverse-grip-incline-bench-two-arm-row | dumbbell | needs bench/dip station (check floor sub) | **exclude** | false | incline bench | bent-over two-arm dumbbell row |
| dumbbell-standing-one-arm-curl-over-incline-bench | dumbbell | needs bench/dip station (check floor sub) | **keep-mod** | true | — | dumbbell concentration curl (brace elbow on inner thigh) |
| dumbbell-standing-one-arm-curl-over-incline-bench | dumbbell | needs bench/dip station (check floor sub) | **keep-mod** | true | — | dumbbell concentration curl (brace elbow on inner thigh) |
| inverse-leg-curl-on-pull-up-cable-machine | body weight | needs pull-up bar / overhead bar; references unavailable equipment in name | **exclude** | false | pull-up bar + cable machine | band lying leg curl / sliding leg curl |
| kipping-muscle-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | band row (skill not replicable at home) |
| l-pull-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | dumbbell row + seated leg raise |
| mixed-grip-chin-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | dumbbell row |
| muscle-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | band row + push-up |
| muscle-up-on-vertical-bar | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | band row + push-up |
| one-arm-chin-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | one-arm dumbbell row |
| pull-up-neutral-grip | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | neutral-grip dumbbell row |
| pull-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | bent-over dumbbell row / anchored band pulldown |
| rear-decline-bridge | body weight | needs bench/dip station (check floor sub) | **keep-mod** | true | — | floor glute bridge / shoulders-on-sofa hip thrust |
| rear-pull-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | reverse fly / wide band row |
| reverse-grip-pull-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | band underhand row |
| rocky-pull-up-pulldown | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | anchored band pulldown / dumbbell row |
| scapular-pull-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | band scapular retraction / prone Y-T-W raises |
| shoulder-grip-pull-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | dumbbell row |
| side-hip-on-parallel-bars | body weight | needs bench/dip station (check floor sub) | **exclude** | false | parallel bars | side plank with hip dip |
| three-bench-dip | body weight | needs bench/dip station (check floor sub) | **keep-mod** | true | — | two chairs; or chair dip / close-grip push-up |
| vertical-leg-raise-on-parallel-bars | body weight | needs bench/dip station (check floor sub) | **exclude** | false | captain's chair / parallel bars | lying leg raise / floor reverse crunch |
| wide-grip-pull-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | wide bent-over dumbbell row |
| wide-grip-rear-pull-up | body weight | needs pull-up bar / overhead bar | **exclude** | false | pull-up bar | reverse fly / wide band row |
| wide-grip-chest-dip-on-high-parallel-bars | body weight | needs bench/dip station (check floor sub) | **exclude** | false | parallel bars | wide floor push-up / dumbbell floor fly |

---

# Final usable pool

- Total kept by equipment filter: **680**
- **Usable (homeSuitable = true): 640**
- Excluded: **40**

## Pool by equipment
| equipment | count |
|---|---|
| bodyweight | 298 |
| dumbbell | 282 |
| band | 60 |

## Pool by body part
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

## Pool by primary muscle (target)
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

## Pool by movement pattern
| pattern | count |
|---|---|
| isolation | 304 |
| push | 132 |
| core-flexion | 48 |
| pull | 45 |
| mobility | 34 |
| squat | 23 |
| lunge | 21 |
| hinge | 19 |
| core-anti-extension | 10 |
| core-anti-rotation | 2 |
| carry | 2 |

## Pool by split tag
| split | count |
|---|---|
| push | 203 |
| pull | 155 |
| legs | 147 |
| core | 135 |

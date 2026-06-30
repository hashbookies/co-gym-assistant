// Types mirror the actual JSON produced by scripts/build-mvp-pool.js and
// scripts/enrich-and-report.js. Keep these in sync with the data pipeline.

export type Equipment = "dumbbell" | "bodyweight" | "band";

export type MovementPattern =
  | "squat" | "hinge" | "lunge" | "push" | "pull" | "carry"
  | "core-anti-extension" | "core-anti-rotation" | "core-flexion"
  | "isolation" | "mobility";

export type SplitTag = "push" | "pull" | "legs" | "core";
export type BodyRegion = "upper" | "lower" | "full";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Confidence = "high" | "medium" | "low" | "manual-confirmed";

/** Curated generator exercise — one record of data/mvp-pool.json. */
export interface PoolExercise {
  slug: string;
  displayName: string;
  sourceId: string;
  equipment: Equipment;
  category: string; // e.g. "Squat", "Horizontal push" — the curation axis

  movementPattern: MovementPattern;
  movementPatternConfidence: Confidence;
  splitTag: SplitTag;
  splitTagConfidence: Confidence;
  bodyRegion: BodyRegion;
  primaryMuscle: string;
  secondaryMuscles: string[];

  beginnerSuitable: boolean;
  difficulty: Difficulty;
  difficultyConfidence: Confidence;
  homeSuitable: boolean;

  // Equipment gates — generator excludes any TRUE flag by default.
  requiresAnchor: boolean;
  requiresBench: boolean;
  requiresPullupBar: boolean;
  requiresSpecialEquipment: boolean;
  requiresDoorSetup: boolean;

  canonicalExercise: boolean;
  duplicateGroup: string | null;

  // Hand-authored programming.
  repRange: [number, number];
  setRange: [number, number];
  restSeconds: number;
  rpeTarget: number;
  timeBased: boolean; // repRange is in seconds when true
  progression: string;
  regression: string;
  substitutions: string[]; // slugs in the pool
  lowEnergyFriendly: boolean;
  jointRiskNotes: string;
  safetyNotes: string;
  whySelected: string;

  // Internal/debug — kept in data, hidden from normal UI.
  _provenance?: unknown;
}

/** Slim projection of the full library (data/exercises.tagged.json) for cards. */
export interface LibraryCard {
  slug: string;
  displayName: string;
  equipment: Equipment;
  movementPattern: MovementPattern;
  splitTag: SplitTag;
  bodyRegion: BodyRegion;
  primaryMuscle: string;
  difficulty: Difficulty;
  homeSuitable: boolean;
  lowEnergyFriendly: boolean;
  inGeneratorPool: boolean;
  thumb: string; // absolute /images/... path for a list thumbnail
  // Equipment gates so the UI can badge "requires anchor", etc.
  requiresAnchor: boolean;
  requiresBench: boolean;
  requiresPullupBar: boolean;
  requiresDoorSetup: boolean;
  requiresSpecialEquipment: boolean;
}

/** Full library record for the detail page. */
export interface LibraryExercise extends LibraryCard {
  sourceId: string;
  bodyPart: string;
  equipmentRaw: string;
  secondaryMuscles: string[];
  instructionsEn: string;
  instructionStepsEn: string[];
  image: string;
  gifUrl: string;
}

// ---------------- Workout / generation ----------------

export type WorkoutMode = "normal" | "low-energy";

export interface ExercisePrescription {
  slug: string;
  displayName: string;
  equipment: Equipment;
  movementPattern: MovementPattern;
  primaryMuscle: string;
  difficulty: Difficulty;
  sets: [number, number]; // min–max
  reps: [number, number]; // reps, or seconds when timeBased
  timeBased: boolean;
  restSeconds: number;
  rpe: number;
  substitutions: string[];
  safetyNotes: string;
  jointRiskNotes: string;
  regression: string;
}

export interface Workout {
  id: string;
  title: string;
  mode: WorkoutMode;
  dayIndex: number; // 0..2 within a 3-day cycle
  emphasis: string; // e.g. "Squat", "Low-energy"
  warmup: ExercisePrescription[];
  main: ExercisePrescription[];
  createdAt: string; // ISO
}

// ---------------- Settings / logs / readiness ----------------

export type WeightUnit = "lb" | "kg";

export interface Settings {
  equipment: { dumbbell: boolean; band: boolean; bodyweight: boolean };
  trainingDays: number;
  durationMin: number;
  level: Difficulty;
  weightUnit: WeightUnit;
  hasDoorAnchor: boolean;
  hasBench: boolean;
  hasPullupBar: boolean;
}

/** How an exercise felt this session — drives progression next time. */
export type SessionFeel = "easy" | "good" | "hard" | "missed";

/** One performed set of an exercise (Phase 3 per-set logging). */
export interface ActualSet {
  setNumber: number;
  reps: number;
  weight: number;
  weightUnit: WeightUnit;
  rpe: number;
  completed: boolean;
  notes?: string;
}

/** Explicit logging state — nothing counts as done until the user acts. */
export type ExerciseStatus = "not_started" | "completed" | "modified" | "skipped";

/** Per-exercise log within a workout. */
export interface ExerciseLog {
  exerciseSlug: string;
  exerciseName: string;
  status: ExerciseStatus;
  plannedSets: number;
  plannedRepRange: [number, number];
  plannedRestSeconds: number;
  plannedRpeTarget: number;
  actualSets: ActualSet[];
  sessionFeel: SessionFeel;
  modified: boolean;
  modificationNote?: string;
}

export const CURRENT_LOG_VERSION = 2;

export interface WorkoutLog {
  version: number; // CURRENT_LOG_VERSION; older logs are migrated on read
  id: string;
  workoutId: string;
  title: string;
  mode: WorkoutMode;
  date: string; // ISO
  exercises: ExerciseLog[];
  note?: string;
}

/** @deprecated v1 per-exercise shape — retained ONLY for migration of old logs. */
export interface LegacyExercisePerformance {
  slug: string;
  feel: "easy" | "hard" | "missed";
  weight?: number;
}

export type ProgressionAction =
  | "establish" | "hold" | "add-reps" | "add-weight" | "add-set" | "harder-variation";

export interface ProgressionSuggestion {
  action: ProgressionAction;
  text: string;
}

export type ReadinessRecommendation = "normal" | "low-energy" | "rest";

export interface ReadinessAnswers {
  nausea: "none" | "mild" | "worse";
  dizziness: boolean;
  hydration: "ok" | "low";
  sleep: "ok" | "poor" | "very-poor";
  soreness: "none" | "moderate" | "severe";
  energy: "ok" | "low" | "very-low";
  appetite: "ok" | "under-fueled";
  injectionDay: boolean;
}

export interface ReadinessResult {
  recommendation: ReadinessRecommendation;
  redFlags: string[];
  reasons: string[];
  date: string; // ISO
}

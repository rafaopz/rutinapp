// Tipos que reflejan los schemas del backend (FastAPI).

export interface User {
  id: number;
  username: string;
  email: string | null;
  display_name: string | null;
  is_active: boolean;
  preferred_unit: string;
  created_at: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MuscleGroup {
  id: number;
  name: string;
}

export interface Exercise {
  id: number;
  name: string;
  equipment: string | null;
  image_url: string | null;
  video_url: string | null;
  instructions: string | null;
  is_custom: boolean;
  owner_id: number | null;
  primary_muscle: MuscleGroup | null;
}

export interface ExerciseUpdatePayload {
  image_url?: string | null;
  video_url?: string | null;
  instructions?: string | null;
}

export interface RoutineSummary {
  id: number;
  name: string;
  days_per_week: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export interface RoutineDayExercise {
  id: number;
  order_index: number | null;
  target_sets: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  rest_seconds: number | null;
  exercise: Exercise;
}

export interface RoutineDay {
  id: number;
  day_order: number;
  name: string | null;
  exercises: RoutineDayExercise[];
}

export interface Routine extends RoutineSummary {
  days: RoutineDay[];
}

// --- Payloads de creación ---
export interface RoutineCreatePayload {
  name: string;
  days_per_week?: number | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface RoutineUpdatePayload {
  name?: string;
  days_per_week?: number | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface RoutineDayExerciseUpdatePayload {
  target_sets?: number | null;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  target_weight?: number | null;
  rest_seconds?: number | null;
}

export interface RoutineDayCreatePayload {
  day_order: number;
  name?: string | null;
}

export interface RoutineDayExerciseCreatePayload {
  exercise_id: number;
  order_index?: number | null;
  target_sets?: number | null;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  target_weight?: number | null;
  rest_seconds?: number | null;
}

// --- Workouts (ejecución) ---
export interface SetLog {
  id: number;
  set_number: number;
  weight: number;
  reps: number;
  rpe: number | null;
  is_warmup: boolean;
  exercise: Exercise;
}

export interface WorkoutSessionSummary {
  id: number;
  routine_day_id: number | null;
  performed_at: string;
  bodyweight: number | null;
  notes: string | null;
  duration_seconds: number | null;
}

export interface WorkoutSession extends WorkoutSessionSummary {
  set_logs: SetLog[];
}

export interface SetLogCreatePayload {
  exercise_id: number;
  set_number: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  is_warmup?: boolean;
}

export interface WorkoutSessionCreatePayload {
  routine_day_id?: number | null;
  performed_at?: string | null;
  bodyweight?: number | null;
  notes?: string | null;
  duration_seconds?: number | null;
  sets?: SetLogCreatePayload[];
}

// --- Stats ---
export interface ProgressionPoint {
  performed_date: string;
  weight: number;
  reps: number;
  rpe: number | null;
  est_1rm: number;
}

export interface PersonalRecord {
  exercise_id: number;
  exercise_name: string;
  weight: number;
  reps: number;
  est_1rm: number;
  performed_date: string;
}

export interface SessionStat {
  session_id: number;
  performed_at: string;
  duration_seconds: number | null;
  volume: number;
  reps: number;
  sets: number;
}

export interface ExerciseHistoryPoint {
  performed_date: string;
  max_weight: number;
  best_1rm: number;
  best_volume: number;
}

export interface TopExercise {
  exercise_id: number;
  exercise_name: string;
  sets: number;
  sessions: number;
}

export interface MacroMuscle {
  name: string;
  current: number;
  previous: number;
}

export interface PeriodTotals {
  workouts: number;
  duration_seconds: number;
  volume: number;
  sets: number;
}

export interface MuscleDistribution {
  muscles: MacroMuscle[];
  current: PeriodTotals;
  previous: PeriodTotals;
}

// --- Medidas corporales ---
export interface BodyMeasurement {
  id: number;
  measured_at: string;
  weight: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  thigh_cm: number | null;
  neck_cm: number | null;
  notes: string | null;
}

export interface BodyMeasurementCreatePayload {
  measured_at?: string | null;
  weight?: number | null;
  body_fat_pct?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  chest_cm?: number | null;
  arm_cm?: number | null;
  thigh_cm?: number | null;
  neck_cm?: number | null;
  notes?: string | null;
}

// --- Objetivos ---
export type GoalType = "bodyweight" | "body_fat" | "one_rm";

export interface Goal {
  id: number;
  goal_type: GoalType;
  target_value: number;
  exercise_id: number | null;
  target_date: string | null;
  created_at: string;
}

export interface GoalCreatePayload {
  goal_type: GoalType;
  target_value: number;
  exercise_id?: number | null;
  target_date?: string | null;
}

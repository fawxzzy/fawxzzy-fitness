export type SessionRow = {
  id: string;
  user_id: string;
  performed_at: string;
  notes: string | null;
  routine_id: string | null;
  routine_day_index: number | null;
  name: string | null;
  routine_day_name: string | null;
  duration_seconds: number | null;
  status: "in_progress" | "completed";
};

export type SessionExerciseRow = {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string;
  position: number;
  notes: string | null;
  is_skipped: boolean;
};

export type SetRow = {
  id: string;
  session_exercise_id: string;
  user_id: string;
  set_index: number;
  weight: number;
  reps: number;
  is_warmup: boolean;
  notes: string | null;
  duration_seconds: number | null;
  rpe: number | null;
};

export type ProfileRow = {
  id: string;
  timezone: string;
  active_routine_id: string | null;
};

export type RoutineRow = {
  id: string;
  user_id: string;
  name: string;
  cycle_length_days: number;
  start_date: string;
  timezone: string;
  updated_at: string;
  weight_unit: "lbs" | "kg";
};

export type RoutineDayRow = {
  id: string;
  user_id: string;
  routine_id: string;
  day_index: number;
  name: string | null;
  is_rest: boolean;
  notes: string | null;
};

export type RoutineDayExerciseRow = {
  id: string;
  user_id: string;
  routine_day_id: string;
  exercise_id: string;
  position: number;
  target_sets: number | null;
  target_reps: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  notes: string | null;
};

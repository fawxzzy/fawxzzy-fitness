import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { SessionCopilotFeedbackSignal } from "@/lib/session-copilot-feedback";

export type SessionRow = {
  id: string;
  user_id: string;
  performed_at: string;
  notes: string | null;
  routine_id: string | null;
  routine_day_index: number | null;
  name: string | null;
  routine_day_name: string | null;
  day_name_override: string | null;
  duration_seconds: number | null;
  status: "in_progress" | "completed";
};

export type SessionExerciseRow = {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string;
  routine_day_exercise_id?: string | null;
  position: number;
  performed_index?: number | null;
  notes: string | null;
  is_skipped: boolean;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none";
  default_unit?: string | null;
  target_sets_min?: number | null;
  target_sets_max?: number | null;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  target_weight_min?: number | null;
  target_weight_max?: number | null;
  target_weight_unit?: "lbs" | "kg" | null;
  target_time_seconds_min?: number | null;
  target_time_seconds_max?: number | null;
  target_distance_min?: number | null;
  target_distance_max?: number | null;
  target_distance_unit?: FitnessDistanceUnit | null;
  target_calories_min?: number | null;
  target_calories_max?: number | null;
  copilot_feedback_signal?: SessionCopilotFeedbackSignal | null;
  copilot_feedback_note?: string | null;
  copilot_feedback_effort?: number | null;
  copilot_feedback_updated_at?: string | null;
};

export type SetRow = {
  id: string;
  client_log_id?: string | null;
  session_exercise_id: string;
  user_id: string;
  set_index: number;
  weight: number;
  reps: number;
  is_warmup: boolean;
  notes: string | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: FitnessDistanceUnit | null;
  calories: number | null;
  rpe: number | null;
  weight_unit: "lbs" | "kg" | null;
};

export type ProfileRow = {
  id: string;
  timezone: string;
  active_routine_id: string | null;
  preferred_weight_unit: "lbs" | "kg" | null;
  preferred_distance_unit: "mi" | "km" | null;
  show_qa_llel_data?: boolean | null;
  user_number: number | null;
  user_kind: "human" | "automation" | "unknown";
  user_number_assigned_at?: string | null;
};

export type BillingCustomerRow = {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  billing_email?: string | null;
  latest_stripe_subscription_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BillingPurchaseRow = {
  id: string;
  user_id: string;
  purchase_kind: "lifetime_pro" | "pro_subscription";
  status: "pending" | "completed" | "cancelled" | "failed";
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_price_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_invoice_id?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  billing_interval?: "month" | "year" | null;
  billing_interval_count?: number | null;
  period_start?: string | null;
  period_end?: string | null;
  completed_at?: string | null;
  raw_event_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserEntitlementRow = {
  id: string;
  user_id: string;
  entitlement_key: "pro_lifetime" | "pro";
  status: "active" | "revoked";
  granted_at: string;
  expires_at?: string | null;
  granted_via_purchase_id?: string | null;
  source_subscription_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RoutineRow = {
  id: string;
  user_id: string;
  name: string;
  cycle_length_days: number;
  schedule_mode?: "weekday_anchored" | "rolling_n_day" | null;
  start_date: string;
  timezone: string;
  created_at?: string | null;
  updated_at: string;
  weight_unit: "lbs" | "kg";
  default_progression_playbook_id?: "double_progression" | "fixed_load_rep_range_progression" | "deload_after_stall" | null;
  default_progression_playbook_config?: Record<string, unknown> | null;
};

export type RoutineDayRow = {
  id: string;
  user_id: string;
  routine_id: string;
  day_index: number;
  name: string | null;
  is_rest: boolean;
  notes: string | null;
  duplicate_source_routine_day_id?: string | null;
  workout_plan_template_id?: string | null;
  workout_plan_template_edit_choice_required?: boolean | null;
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
  target_weight: number | null;
  target_weight_unit: "lbs" | "kg" | null;
  target_duration_seconds: number | null;
  target_distance: number | null;
  target_distance_unit: FitnessDistanceUnit | null;
  target_calories: number | null;
  progression_playbook_id?: "double_progression" | "fixed_load_rep_range_progression" | "deload_after_stall" | null;
  progression_playbook_config?: Record<string, unknown> | null;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  default_unit?: FitnessDistanceUnit | null;
  notes: string | null;
  workout_plan_template_exercise_id?: string | null;
};

export type WorkoutPlanTemplateRow = {
  id: string;
  user_id: string;
  name: string;
  is_rest: boolean;
  source_routine_day_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type WorkoutPlanTemplateExerciseRow = {
  id: string;
  user_id: string;
  workout_plan_template_id: string;
  exercise_id: string;
  position: number;
  target_sets: number | null;
  target_reps: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  target_weight_unit: "lbs" | "kg" | null;
  target_duration_seconds: number | null;
  target_distance: number | null;
  target_distance_unit: FitnessDistanceUnit | null;
  target_calories: number | null;
  progression_playbook_id?: "double_progression" | "fixed_load_rep_range_progression" | "deload_after_stall" | null;
  progression_playbook_config?: Record<string, unknown> | null;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  default_unit?: FitnessDistanceUnit | null;
  notes: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type WorkoutPlanRow = WorkoutPlanTemplateRow;

export type WorkoutPlanExerciseRow = WorkoutPlanTemplateExerciseRow;

export type ProgressionEventRow = {
  id: string;
  user_id: string;
  routine_id: string;
  routine_day_exercise_id: string;
  exercise_id: string;
  event_type: "promotion_applied" | "promotion_reverted" | "lock_in" | "deload_applied" | "review_acknowledged" | "manual_target_change" | "watch_applied";
  from_target: Record<string, unknown>;
  to_target: Record<string, unknown>;
  method: string;
  vector: string;
  step: Record<string, unknown> | null;
  reason: string;
  source_session_id: string | null;
  created_at: string;
};


export type ExerciseRow = {
  id: string;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance" | "none";
  default_unit: string | null;
  calories_estimation_method: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path: string | null;
  slug?: string | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
  how_to_short: string | null;
  curation_tags?: Record<string, string[]> | null;
  created_at: string;
};

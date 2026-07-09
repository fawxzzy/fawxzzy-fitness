import type { supabaseServer } from "@/lib/supabase/server";
import { resolveUniqueWorkoutPlanName } from "@/lib/workout-plan-template-name";
import type {
  RoutineDayExerciseRow,
  RoutineDayRow,
  WorkoutPlanExerciseRow,
  WorkoutPlanRow,
} from "@/types/db";

type SupabaseServerClient = ReturnType<typeof supabaseServer>;

export const ROUTINE_DAY_TEMPLATE_SELECT =
  "id, user_id, routine_id, day_index, name, is_rest, notes, duplicate_source_routine_day_id, workout_plan_template_id, workout_plan_template_edit_choice_required";
export const ROUTINE_DAY_TEMPLATE_SELECT_LEGACY =
  "id, user_id, routine_id, day_index, name, is_rest, notes, duplicate_source_routine_day_id";
export const ROUTINE_DAY_TEMPLATE_SELECT_PRE_TEMPLATE_LEGACY =
  "id, user_id, routine_id, day_index, name, is_rest, notes";
export const ROUTINE_DAY_EXERCISE_TEMPLATE_SELECT =
  "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config, workout_plan_template_exercise_id";
export const ROUTINE_DAY_EXERCISE_TEMPLATE_SELECT_LEGACY =
  "id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config";
export const WORKOUT_PLAN_TEMPLATE_SELECT =
  "id, user_id, name, is_rest, source_routine_day_id, created_at, updated_at";
export const WORKOUT_PLAN_TEMPLATE_EXERCISE_SELECT =
  "id, user_id, workout_plan_template_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes, progression_playbook_id, progression_playbook_config, created_at, updated_at";

type TemplateAwareRoutineDay = RoutineDayRow & {
  duplicate_source_routine_day_id: string | null;
  workout_plan_template_id: string | null;
  workout_plan_template_edit_choice_required: boolean;
};

type TemplateAwareRoutineDayExercise = RoutineDayExerciseRow & {
  workout_plan_template_exercise_id: string | null;
};

function normalizeTemplateAwareRoutineDay(
  day: (RoutineDayRow & {
    duplicate_source_routine_day_id?: string | null;
    workout_plan_template_id?: string | null;
    workout_plan_template_edit_choice_required?: boolean | null;
  }) | null,
) {
  if (!day) {
    return null;
  }

  return {
    ...day,
    duplicate_source_routine_day_id: day.duplicate_source_routine_day_id ?? null,
    workout_plan_template_id: day.workout_plan_template_id ?? null,
    workout_plan_template_edit_choice_required: day.workout_plan_template_edit_choice_required ?? false,
  } satisfies TemplateAwareRoutineDay;
}

function normalizeTemplateAwareRoutineDayExercise(
  exercise: (RoutineDayExerciseRow & {
    workout_plan_template_exercise_id?: string | null;
  }),
) {
  return {
    ...exercise,
    workout_plan_template_exercise_id: exercise.workout_plan_template_exercise_id ?? null,
  } satisfies TemplateAwareRoutineDayExercise;
}

function normalizeTemplateTableErrorMessage(error: { message?: string } | null | undefined) {
  return error?.message?.toLowerCase() ?? "";
}

export function isMissingWorkoutPlanTemplateTableError(error: { message?: string } | null | undefined) {
  const message = normalizeTemplateTableErrorMessage(error);
  const referencesTemplateTable =
    message.includes("workout_plan_templates") || message.includes("workout_plan_template_exercises");
  return referencesTemplateTable && (
    message.includes("does not exist")
    || message.includes("schema cache")
    || message.includes("could not find the table")
  );
}

export function isMissingRoutineDayTemplateColumnError(error: { message?: string } | null | undefined) {
  const message = normalizeTemplateTableErrorMessage(error);
  return (
    message.includes("workout_plan_template_id")
    && message.includes("routine_days")
    && (message.includes("schema cache") || message.includes("does not exist"))
  );
}

export function isMissingRoutineDayTemplateChoiceColumnError(error: { message?: string } | null | undefined) {
  const message = normalizeTemplateTableErrorMessage(error);
  return (
    message.includes("workout_plan_template_edit_choice_required")
    && message.includes("routine_days")
    && (message.includes("schema cache") || message.includes("does not exist"))
  );
}

export function isMissingRoutineDayExerciseTemplateColumnError(error: { message?: string } | null | undefined) {
  const message = normalizeTemplateTableErrorMessage(error);
  return (
    message.includes("workout_plan_template_exercise_id")
    && message.includes("routine_day_exercises")
    && (message.includes("schema cache") || message.includes("does not exist"))
  );
}

export function omitRoutineDayTemplateColumns<T extends Record<string, unknown>>(payload: T) {
  const {
    workout_plan_template_id: _templateId,
    workout_plan_template_edit_choice_required: _choiceRequired,
    ...rest
  } = payload;
  return rest;
}

export function omitRoutineDayExerciseTemplateColumn<T extends Record<string, unknown>>(payload: T) {
  const { workout_plan_template_exercise_id: _templateExerciseId, ...rest } = payload;
  return rest;
}

export async function loadWorkoutPlanTemplateNames(args: {
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const { data, error } = await args.supabase
    .from("workout_plan_templates")
    .select("name")
    .eq("user_id", args.userId)
    .order("updated_at", { ascending: false });

  if (error && isMissingWorkoutPlanTemplateTableError(error)) {
    return [];
  }

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.name);
}

export async function loadRoutineDayWithTemplateCompat(args: {
  supabase: SupabaseServerClient;
  routineDayId: string;
  userId: string;
  routineId?: string;
}) {
  let query = args.supabase
    .from("routine_days")
    .select("*")
    .eq("id", args.routineDayId)
    .eq("user_id", args.userId);

  if (args.routineId) {
    query = query.eq("routine_id", args.routineId);
  }

  const result = await query.maybeSingle();
  return {
    data: normalizeTemplateAwareRoutineDay(
      result.data as (RoutineDayRow & {
        duplicate_source_routine_day_id?: string | null;
        workout_plan_template_id?: string | null;
        workout_plan_template_edit_choice_required?: boolean | null;
      }) | null,
    ),
    error: result.error,
  };
}

export async function loadRoutineDaysWithTemplateCompat(args: {
  supabase: SupabaseServerClient;
  userId: string;
  routineIds?: string[];
  routineId?: string;
}) {
  let query = args.supabase
    .from("routine_days")
    .select("*")
    .eq("user_id", args.userId)
    .order("day_index", { ascending: true });

  if (args.routineId) {
    query = query.eq("routine_id", args.routineId);
  } else if (args.routineIds && args.routineIds.length > 0) {
    query = query.in("routine_id", args.routineIds);
  }

  const result = await query;
  return {
    data: ((result.data ?? []) as Array<
      RoutineDayRow & {
        duplicate_source_routine_day_id?: string | null;
        workout_plan_template_id?: string | null;
        workout_plan_template_edit_choice_required?: boolean | null;
      }
    >).map((day) => normalizeTemplateAwareRoutineDay(day)).filter((day): day is TemplateAwareRoutineDay => day !== null),
    error: result.error,
  };
}

export async function loadRoutineDayExercisesWithTemplateCompat(args: {
  supabase: SupabaseServerClient;
  userId: string;
  routineDayIds: string[];
}) {
  if (args.routineDayIds.length === 0) {
    return { data: [] as TemplateAwareRoutineDayExercise[], error: null };
  }

  const result = await args.supabase
    .from("routine_day_exercises")
    .select("*")
    .in("routine_day_id", args.routineDayIds)
    .eq("user_id", args.userId)
    .order("position", { ascending: true });

  return {
    data: ((result.data ?? []) as Array<
      RoutineDayExerciseRow & { workout_plan_template_exercise_id?: string | null }
    >).map((exercise) => normalizeTemplateAwareRoutineDayExercise(exercise)),
    error: result.error,
  };
}

async function loadWorkoutPlanTemplateExercises(args: {
  supabase: SupabaseServerClient;
  templateId: string;
  userId: string;
}) {
  const result = await args.supabase
    .from("workout_plan_template_exercises")
    .select(WORKOUT_PLAN_TEMPLATE_EXERCISE_SELECT)
    .eq("workout_plan_template_id", args.templateId)
    .eq("user_id", args.userId)
    .order("position", { ascending: true });

  return {
    data: (result.data ?? []) as WorkoutPlanTemplateExerciseRow[],
    error: result.error,
  };
}

function resolveTemplateSourceName(day: Pick<TemplateAwareRoutineDay, "name" | "day_index">) {
  const trimmedName = day.name?.trim() ?? "";
  return trimmedName || `Day ${day.day_index}`;
}

function buildTemplateExerciseInsertPayload(args: {
  templateId: string;
  userId: string;
  exercise: TemplateAwareRoutineDayExercise;
}) {
  return {
    user_id: args.userId,
    workout_plan_template_id: args.templateId,
    exercise_id: args.exercise.exercise_id,
    position: args.exercise.position,
    target_sets: args.exercise.target_sets,
    target_reps: args.exercise.target_reps,
    target_reps_min: args.exercise.target_reps_min,
    target_reps_max: args.exercise.target_reps_max,
    target_weight: args.exercise.target_weight,
    target_weight_unit: args.exercise.target_weight_unit,
    target_duration_seconds: args.exercise.target_duration_seconds,
    target_distance: args.exercise.target_distance,
    target_distance_unit: args.exercise.target_distance_unit,
    target_calories: args.exercise.target_calories,
    measurement_type: args.exercise.measurement_type,
    default_unit: args.exercise.default_unit,
    notes: args.exercise.notes,
    progression_playbook_id: args.exercise.progression_playbook_id ?? null,
    progression_playbook_config: args.exercise.progression_playbook_config ?? null,
  };
}

function buildRoutineDayExercisePayloadFromTemplate(args: {
  routineDayId: string;
  userId: string;
  templateExercise: WorkoutPlanTemplateExerciseRow;
}) {
  return {
    user_id: args.userId,
    routine_day_id: args.routineDayId,
    exercise_id: args.templateExercise.exercise_id,
    position: args.templateExercise.position,
    target_sets: args.templateExercise.target_sets,
    target_reps: args.templateExercise.target_reps,
    target_reps_min: args.templateExercise.target_reps_min,
    target_reps_max: args.templateExercise.target_reps_max,
    target_weight: args.templateExercise.target_weight,
    target_weight_unit: args.templateExercise.target_weight_unit,
    target_duration_seconds: args.templateExercise.target_duration_seconds,
    target_distance: args.templateExercise.target_distance,
    target_distance_unit: args.templateExercise.target_distance_unit,
    target_calories: args.templateExercise.target_calories,
    measurement_type: args.templateExercise.measurement_type,
    default_unit: args.templateExercise.default_unit,
    notes: args.templateExercise.notes,
    progression_playbook_id: args.templateExercise.progression_playbook_id ?? null,
    progression_playbook_config: args.templateExercise.progression_playbook_config ?? null,
    workout_plan_template_exercise_id: args.templateExercise.id,
  };
}

async function createWorkoutPlanTemplateFromDay(args: {
  supabase: SupabaseServerClient;
  userId: string;
  routineDay: TemplateAwareRoutineDay;
  dayExercises: TemplateAwareRoutineDayExercise[];
  requestedName?: string | null;
  capacityError?: Error | null;
}) {
  if (args.capacityError) {
    return { data: null, exercises: [] as WorkoutPlanTemplateExerciseRow[], error: args.capacityError };
  }

  const existingTemplateNames = await loadWorkoutPlanTemplateNames({
    supabase: args.supabase,
    userId: args.userId,
  });
  const templateName = resolveUniqueWorkoutPlanName({
    sourceName: resolveTemplateSourceName(args.routineDay),
    requestedName: args.requestedName,
    existingNames: existingTemplateNames,
  });

  const insertResult = await args.supabase
    .from("workout_plan_templates")
    .insert({
      user_id: args.userId,
      name: templateName,
      is_rest: args.routineDay.is_rest,
      source_routine_day_id: args.routineDay.id,
      updated_at: new Date().toISOString(),
    })
    .select(WORKOUT_PLAN_TEMPLATE_SELECT)
    .single();

  if (insertResult.error) {
    return { data: null, exercises: [] as WorkoutPlanTemplateExerciseRow[], error: insertResult.error };
  }

  const template = insertResult.data as WorkoutPlanRow;
  const exerciseRows = args.dayExercises.map((exercise) => buildTemplateExerciseInsertPayload({
    templateId: template.id,
    userId: args.userId,
    exercise,
  }));
  const insertedExercisesResult = exerciseRows.length > 0
    ? await args.supabase
        .from("workout_plan_template_exercises")
        .insert(exerciseRows)
        .select(WORKOUT_PLAN_TEMPLATE_EXERCISE_SELECT)
        .order("position", { ascending: true })
    : { data: [] as WorkoutPlanTemplateExerciseRow[], error: null };

  return {
    data: template,
    exercises: (insertedExercisesResult.data ?? []) as WorkoutPlanTemplateExerciseRow[],
    error: insertedExercisesResult.error,
  };
}

async function updateRoutineDayTemplateMetadata(args: {
  supabase: SupabaseServerClient;
  routineDayIds: string[];
  userId: string;
  templateId: string;
  editChoiceRequired: boolean;
}) {
  if (args.routineDayIds.length === 0) {
    return { error: null };
  }

  const payload = {
    workout_plan_template_id: args.templateId,
    workout_plan_template_edit_choice_required: args.editChoiceRequired,
  };
  let result = await args.supabase
    .from("routine_days")
    .update(payload)
    .in("id", args.routineDayIds)
    .eq("user_id", args.userId);

  if (
    result.error
    && (isMissingRoutineDayTemplateColumnError(result.error) || isMissingRoutineDayTemplateChoiceColumnError(result.error))
  ) {
    result = await args.supabase
      .from("routine_days")
      .update(omitRoutineDayTemplateColumns(payload))
      .in("id", args.routineDayIds)
      .eq("user_id", args.userId);
  }

  return { error: result.error };
}

export async function updateLinkedWorkoutPlanTemplateChoiceRequirement(args: {
  supabase: SupabaseServerClient;
  userId: string;
  templateId: string;
  editChoiceRequired: boolean;
  fallbackRoutineDayIds?: string[];
}) {
  const linkedDaysResult = await loadRoutineDaysWithTemplateCompat({
    supabase: args.supabase,
    userId: args.userId,
  });

  if (linkedDaysResult.error) {
    return { error: linkedDaysResult.error };
  }

  const linkedRoutineDayIds = linkedDaysResult.data
    .filter((day) => day.workout_plan_template_id === args.templateId)
    .map((day) => day.id);
  const routineDayIds = linkedRoutineDayIds.length > 0
    ? linkedRoutineDayIds
    : (args.fallbackRoutineDayIds ?? []);

  return updateRoutineDayTemplateMetadata({
    supabase: args.supabase,
    routineDayIds,
    userId: args.userId,
    templateId: args.templateId,
    editChoiceRequired: args.editChoiceRequired,
  });
}

async function attachRoutineDayExercisesToTemplate(args: {
  supabase: SupabaseServerClient;
  userId: string;
  routineDayId: string;
  orderedExercises: TemplateAwareRoutineDayExercise[];
  templateExercises: WorkoutPlanTemplateExerciseRow[];
}) {
  const templateExerciseIdsByPosition = new Map(
    args.templateExercises.map((exercise) => [exercise.position, exercise.id]),
  );

  for (const exercise of args.orderedExercises) {
    const templateExerciseId = templateExerciseIdsByPosition.get(exercise.position) ?? null;
    if (!templateExerciseId) {
      continue;
    }

    const payload = { workout_plan_template_exercise_id: templateExerciseId };
    let result = await args.supabase
      .from("routine_day_exercises")
      .update(payload)
      .eq("id", exercise.id)
      .eq("routine_day_id", args.routineDayId)
      .eq("user_id", args.userId);

    if (result.error && isMissingRoutineDayExerciseTemplateColumnError(result.error)) {
      result = await args.supabase
        .from("routine_day_exercises")
        .update(omitRoutineDayExerciseTemplateColumn(payload))
        .eq("id", exercise.id)
        .eq("routine_day_id", args.routineDayId)
        .eq("user_id", args.userId);
    }

    if (result.error) {
      return { error: result.error };
    }
  }

  return { error: null };
}

export async function ensureWorkoutPlanTemplateForRoutineDay(args: {
  supabase: SupabaseServerClient;
  userId: string;
  routineDay: TemplateAwareRoutineDay;
  dayExercises: TemplateAwareRoutineDayExercise[];
  markEditChoiceRequired: boolean;
  capacityError?: Error | null;
}) {
  if (args.routineDay.workout_plan_template_id) {
    if (args.markEditChoiceRequired && !args.routineDay.workout_plan_template_edit_choice_required) {
      await updateLinkedWorkoutPlanTemplateChoiceRequirement({
        supabase: args.supabase,
        userId: args.userId,
        templateId: args.routineDay.workout_plan_template_id,
        editChoiceRequired: true,
        fallbackRoutineDayIds: [args.routineDay.id],
      });
    }

    const templateExercisesResult = await loadWorkoutPlanTemplateExercises({
      supabase: args.supabase,
      templateId: args.routineDay.workout_plan_template_id,
      userId: args.userId,
    });

    if (templateExercisesResult.error) {
      return {
        templateId: null,
        templateName: null,
        templateExercises: [] as WorkoutPlanTemplateExerciseRow[],
        error: templateExercisesResult.error,
      };
    }

    return {
      templateId: args.routineDay.workout_plan_template_id,
      templateName: null,
      templateExercises: templateExercisesResult.data,
      error: null,
    };
  }

  const createResult = await createWorkoutPlanTemplateFromDay({
    supabase: args.supabase,
    userId: args.userId,
    routineDay: args.routineDay,
    dayExercises: args.dayExercises,
    capacityError: args.capacityError,
  });

  if (createResult.error || !createResult.data) {
    return {
      templateId: null,
      templateName: null,
      templateExercises: [] as WorkoutPlanTemplateExerciseRow[],
      error: createResult.error ?? new Error("Could not create workout plan."),
    };
  }

  const canonicalSourceDayId = args.routineDay.duplicate_source_routine_day_id ?? args.routineDay.id;
  const connectedDaysResult = await loadRoutineDaysWithTemplateCompat({
    supabase: args.supabase,
    userId: args.userId,
  });
  if (connectedDaysResult.error) {
    return {
      templateId: null,
      templateName: null,
      templateExercises: [] as WorkoutPlanTemplateExerciseRow[],
      error: connectedDaysResult.error,
    };
  }

  const connectedDays = connectedDaysResult.data.filter((day) => (
    day.id === canonicalSourceDayId
    || day.duplicate_source_routine_day_id === canonicalSourceDayId
    || day.id === args.routineDay.id
  ));
  const dayIdsToLink = connectedDays.length > 0
    ? connectedDays.map((day) => day.id)
    : [args.routineDay.id];
  const metadataResult = await updateRoutineDayTemplateMetadata({
    supabase: args.supabase,
    routineDayIds: dayIdsToLink,
    userId: args.userId,
    templateId: createResult.data.id,
    editChoiceRequired: args.markEditChoiceRequired,
  });

  if (metadataResult.error) {
    return {
      templateId: null,
      templateName: null,
      templateExercises: [] as WorkoutPlanTemplateExerciseRow[],
      error: metadataResult.error,
    };
  }

  const connectedExercisesResult = await loadRoutineDayExercisesWithTemplateCompat({
    supabase: args.supabase,
    userId: args.userId,
    routineDayIds: dayIdsToLink,
  });
  if (connectedExercisesResult.error) {
    return {
      templateId: null,
      templateName: null,
      templateExercises: [] as WorkoutPlanTemplateExerciseRow[],
      error: connectedExercisesResult.error,
    };
  }

  for (const linkedDayId of dayIdsToLink) {
    const orderedExercises = connectedExercisesResult.data
      .filter((exercise) => exercise.routine_day_id === linkedDayId)
      .sort((left, right) => left.position - right.position);
    const attachResult = await attachRoutineDayExercisesToTemplate({
      supabase: args.supabase,
      userId: args.userId,
      routineDayId: linkedDayId,
      orderedExercises,
      templateExercises: createResult.exercises,
    });
    if (attachResult.error) {
      return {
        templateId: null,
        templateName: null,
        templateExercises: [] as WorkoutPlanTemplateExerciseRow[],
        error: attachResult.error,
      };
    }
  }

  return {
    templateId: createResult.data.id,
    templateName: createResult.data.name,
    templateExercises: createResult.exercises,
    error: null,
  };
}

export async function saveRoutineDayAsNewWorkoutPlanTemplate(args: {
  supabase: SupabaseServerClient;
  userId: string;
  routineDay: TemplateAwareRoutineDay;
  dayExercises: TemplateAwareRoutineDayExercise[];
  requestedName: string;
  capacityError?: Error | null;
}) {
  const createResult = await createWorkoutPlanTemplateFromDay({
    supabase: args.supabase,
    userId: args.userId,
    routineDay: args.routineDay,
    dayExercises: args.dayExercises,
    requestedName: args.requestedName,
    capacityError: args.capacityError,
  });

  if (createResult.error || !createResult.data) {
    return {
      templateId: null,
      templateName: null,
      templateExercises: [] as WorkoutPlanTemplateExerciseRow[],
      error: createResult.error ?? new Error("Could not create workout plan."),
    };
  }

  const metadataResult = await updateRoutineDayTemplateMetadata({
    supabase: args.supabase,
    routineDayIds: [args.routineDay.id],
    userId: args.userId,
    templateId: createResult.data.id,
    editChoiceRequired: false,
  });
  if (metadataResult.error) {
    return {
      templateId: null,
      templateName: null,
      templateExercises: [] as WorkoutPlanTemplateExerciseRow[],
      error: metadataResult.error,
    };
  }

  const renameResult = await args.supabase
    .from("routine_days")
    .update({ name: createResult.data.name })
    .eq("id", args.routineDay.id)
    .eq("user_id", args.userId);
  if (renameResult.error) {
    return {
      templateId: null,
      templateName: null,
      templateExercises: [] as WorkoutPlanTemplateExerciseRow[],
      error: renameResult.error,
    };
  }

  const attachResult = await attachRoutineDayExercisesToTemplate({
    supabase: args.supabase,
    userId: args.userId,
    routineDayId: args.routineDay.id,
    orderedExercises: args.dayExercises,
    templateExercises: createResult.exercises,
  });

  return {
    templateId: createResult.data.id,
    templateName: createResult.data.name,
    templateExercises: createResult.exercises,
    error: attachResult.error,
  };
}

export async function cloneWorkoutPlanTemplateIntoRoutineDay(args: {
  supabase: SupabaseServerClient;
  userId: string;
  templateId: string;
  targetRoutineDayId: string;
}) {
  const templateExercisesResult = await loadWorkoutPlanTemplateExercises({
    supabase: args.supabase,
    templateId: args.templateId,
    userId: args.userId,
  });
  if (templateExercisesResult.error) {
    return { error: templateExercisesResult.error };
  }

  if (templateExercisesResult.data.length === 0) {
    return { error: null };
  }

  const insertPayload = templateExercisesResult.data.map((templateExercise) => (
    buildRoutineDayExercisePayloadFromTemplate({
      routineDayId: args.targetRoutineDayId,
      userId: args.userId,
      templateExercise,
    })
  ));

  const insertResult = await args.supabase
    .from("routine_day_exercises")
    .insert(insertPayload);

  if (insertResult.error && isMissingRoutineDayExerciseTemplateColumnError(insertResult.error)) {
    const fallback = await args.supabase
      .from("routine_day_exercises")
      .insert(insertPayload.map((payload) => omitRoutineDayExerciseTemplateColumn(payload)));
    return { error: fallback.error };
  }

  return { error: insertResult.error };
}

export type LinkedWorkoutPlanRoutineDay = TemplateAwareRoutineDay;

export type LinkedWorkoutPlanExercise = TemplateAwareRoutineDayExercise;

export type WorkoutPlanTemplateRow = WorkoutPlanRow;

export type WorkoutPlanTemplateExerciseRow = WorkoutPlanExerciseRow;

export const WORKOUT_PLAN_SELECT = WORKOUT_PLAN_TEMPLATE_SELECT;

export const WORKOUT_PLAN_EXERCISE_SELECT = WORKOUT_PLAN_TEMPLATE_EXERCISE_SELECT;

export const isMissingWorkoutPlanTableError = isMissingWorkoutPlanTemplateTableError;

export const loadWorkoutPlanNames = loadWorkoutPlanTemplateNames;

export const loadRoutineDayWithWorkoutPlanCompat = loadRoutineDayWithTemplateCompat;

export const loadRoutineDaysWithWorkoutPlanCompat = loadRoutineDaysWithTemplateCompat;

export const loadRoutineDayExercisesWithWorkoutPlanCompat = loadRoutineDayExercisesWithTemplateCompat;

export const omitRoutineDayWorkoutPlanColumns = omitRoutineDayTemplateColumns;

export const omitRoutineDayExerciseWorkoutPlanColumn = omitRoutineDayExerciseTemplateColumn;

export const updateLinkedWorkoutPlanChoiceRequirement = updateLinkedWorkoutPlanTemplateChoiceRequirement;

export const ensureWorkoutPlanForRoutineDay = ensureWorkoutPlanTemplateForRoutineDay;

export const saveRoutineDayAsNewWorkoutPlan = saveRoutineDayAsNewWorkoutPlanTemplate;

export const cloneWorkoutPlanIntoRoutineDay = cloneWorkoutPlanTemplateIntoRoutineDay;

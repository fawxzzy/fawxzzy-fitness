import type { ProgressionAnalyticsEvent } from "@/lib/progression-event-analytics";

export const PROGRESSION_HISTORY_EVENT_TYPES = [
  "promotion_applied",
  "promotion_reverted",
  "lock_in",
  "deload_applied",
  "review_acknowledged",
  "manual_target_change",
] as const;

export type ProgressionHistoryEventType = (typeof PROGRESSION_HISTORY_EVENT_TYPES)[number];

export type ProgressionHistorySearchParams = {
  eventType?: string | string[] | null;
  routineId?: string | string[] | null;
  exerciseId?: string | string[] | null;
  dateFrom?: string | string[] | null;
  dateTo?: string | string[] | null;
};

export type ProgressionHistoryFilters = {
  eventType: ProgressionHistoryEventType | null;
  routineId: string | null;
  exerciseId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
};

export type ProgressionHistoryFilterOption = {
  value: string;
  label: string;
};

export type ProgressionHistoryFilterOptions = {
  eventTypes: ProgressionHistoryFilterOption[];
  routines: ProgressionHistoryFilterOption[];
  exercises: ProgressionHistoryFilterOption[];
};

type FilterOptionEvent = Pick<ProgressionAnalyticsEvent, "event_type" | "routine_id" | "exercise_id">;

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_PROGRESSION_HISTORY_FILTERS: ProgressionHistoryFilters = {
  eventType: null,
  routineId: null,
  exerciseId: null,
  dateFrom: null,
  dateTo: null,
};

function getSingleSearchParam(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

function isProgressionHistoryEventType(value: string): value is ProgressionHistoryEventType {
  return PROGRESSION_HISTORY_EVENT_TYPES.includes(value as ProgressionHistoryEventType);
}

function normalizeOptionalId(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeDate(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || !ISO_DATE_ONLY.test(trimmed)) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== trimmed) {
    return null;
  }

  return trimmed;
}

export function parseProgressionHistoryFilters(searchParams?: ProgressionHistorySearchParams | null): ProgressionHistoryFilters {
  const eventTypeCandidate = getSingleSearchParam(searchParams?.eventType)?.trim() ?? "";

  return {
    eventType: isProgressionHistoryEventType(eventTypeCandidate) ? eventTypeCandidate : null,
    routineId: normalizeOptionalId(getSingleSearchParam(searchParams?.routineId)),
    exerciseId: normalizeOptionalId(getSingleSearchParam(searchParams?.exerciseId)),
    dateFrom: normalizeDate(getSingleSearchParam(searchParams?.dateFrom)),
    dateTo: normalizeDate(getSingleSearchParam(searchParams?.dateTo)),
  };
}

export function serializeProgressionHistoryFilters(filters: ProgressionHistoryFilters) {
  const params = new URLSearchParams();

  if (filters.eventType) {
    params.set("eventType", filters.eventType);
  }
  if (filters.routineId) {
    params.set("routineId", filters.routineId);
  }
  if (filters.exerciseId) {
    params.set("exerciseId", filters.exerciseId);
  }
  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  return params;
}

export function hasProgressionHistoryFilters(filters: ProgressionHistoryFilters) {
  return Boolean(
    filters.eventType
    || filters.routineId
    || filters.exerciseId
    || filters.dateFrom
    || filters.dateTo,
  );
}

export function getProgressionHistoryDateRangeStartIso(date: string | null) {
  if (!date || !ISO_DATE_ONLY.test(date)) {
    return null;
  }

  return `${date}T00:00:00.000Z`;
}

export function getProgressionHistoryDateRangeEndIso(date: string | null) {
  if (!date || !ISO_DATE_ONLY.test(date)) {
    return null;
  }

  return `${date}T23:59:59.999Z`;
}

export function getProgressionHistoryEventTypeLabel(eventType: ProgressionHistoryEventType) {
  switch (eventType) {
    case "promotion_applied":
      return "Promotion applied";
    case "promotion_reverted":
      return "Promotion reverted";
    case "lock_in":
      return "Lock-in";
    case "deload_applied":
      return "Deload applied";
    case "review_acknowledged":
      return "Review acknowledged";
    case "manual_target_change":
      return "Manual target change";
    default:
      return eventType;
  }
}

export function applyProgressionHistoryFilters(events: ProgressionAnalyticsEvent[], filters: ProgressionHistoryFilters) {
  const startIso = getProgressionHistoryDateRangeStartIso(filters.dateFrom);
  const endIso = getProgressionHistoryDateRangeEndIso(filters.dateTo);

  return events.filter((event) => {
    if (filters.eventType && event.event_type !== filters.eventType) {
      return false;
    }
    if (filters.routineId && event.routine_id !== filters.routineId) {
      return false;
    }
    if (filters.exerciseId && event.exercise_id !== filters.exerciseId) {
      return false;
    }
    if (startIso && event.created_at < startIso) {
      return false;
    }
    if (endIso && event.created_at > endIso) {
      return false;
    }
    return true;
  });
}

export function buildProgressionHistoryFilterOptions(args: {
  events: FilterOptionEvent[];
  routineNameById?: Map<string, string>;
  exerciseNameById?: Map<string, string>;
  filters: ProgressionHistoryFilters;
}): ProgressionHistoryFilterOptions {
  const eventTypesPresent = new Set(args.events.map((event) => event.event_type));
  const routineIdsPresent = new Set(args.events.map((event) => event.routine_id).filter(Boolean));
  const exerciseIdsPresent = new Set(args.events.map((event) => event.exercise_id).filter(Boolean));

  return {
    eventTypes: PROGRESSION_HISTORY_EVENT_TYPES
      .filter((eventType) => eventTypesPresent.has(eventType) || args.filters.eventType === eventType)
      .map((eventType) => ({
        value: eventType,
        label: getProgressionHistoryEventTypeLabel(eventType),
      })),
    routines: [...routineIdsPresent]
      .map((routineId) => ({
        value: routineId,
        label: args.routineNameById?.get(routineId) ?? "Routine",
      }))
      .sort((left, right) => left.label.localeCompare(right.label) || left.value.localeCompare(right.value)),
    exercises: [...exerciseIdsPresent]
      .map((exerciseId) => ({
        value: exerciseId,
        label: args.exerciseNameById?.get(exerciseId) ?? "Exercise",
      }))
      .sort((left, right) => left.label.localeCompare(right.label) || left.value.localeCompare(right.value)),
  };
}

export function buildProgressionHistoryActiveFilterLabels(args: {
  filters: ProgressionHistoryFilters;
  options: ProgressionHistoryFilterOptions;
}) {
  const labels: string[] = [];

  if (args.filters.eventType) {
    const option = args.options.eventTypes.find((entry) => entry.value === args.filters.eventType);
    labels.push(`Type: ${option?.label ?? getProgressionHistoryEventTypeLabel(args.filters.eventType)}`);
  }
  if (args.filters.routineId) {
    const option = args.options.routines.find((entry) => entry.value === args.filters.routineId);
    labels.push(`Routine: ${option?.label ?? "Routine"}`);
  }
  if (args.filters.exerciseId) {
    const option = args.options.exercises.find((entry) => entry.value === args.filters.exerciseId);
    labels.push(`Exercise: ${option?.label ?? "Exercise"}`);
  }
  if (args.filters.dateFrom) {
    labels.push(`From: ${args.filters.dateFrom}`);
  }
  if (args.filters.dateTo) {
    labels.push(`To: ${args.filters.dateTo}`);
  }

  return labels;
}

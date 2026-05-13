export type HeaderInfoRailTone = "default" | "muted" | "accent" | "success" | "warning";

export type HeaderInfoRailItem = {
  id: string;
  label: string;
  value?: string | number | null;
  tone?: HeaderInfoRailTone;
  title?: string;
  valuePosition?: "before" | "after";
};

function normalizeCount(value: number | null | undefined) {
  if (!Number.isFinite(value ?? null)) {
    return 0;
  }

  return Math.max(0, Math.floor(value as number));
}

export function buildRoutineTrainingRestInfoRailItems(args: {
  trainingDays: number | null | undefined;
  restDays: number | null | undefined;
}): HeaderInfoRailItem[] {
  return [
    {
      id: "training-days",
      label: "training",
      value: normalizeCount(args.trainingDays),
      tone: "accent",
      title: "Training days in this routine cycle",
    },
    {
      id: "rest-days",
      label: "rest",
      value: normalizeCount(args.restDays),
      tone: "muted",
      title: "Rest days in this routine cycle",
    },
  ];
}

export function buildRoutineBrowseInfoRailItems(args: {
  activeRoutineName?: string | null;
  routineCount: number | null | undefined;
}): HeaderInfoRailItem[] {
  const items: HeaderInfoRailItem[] = [];

  if (args.activeRoutineName?.trim()) {
    items.push({
      id: "active-routine",
      label: "Active",
      value: args.activeRoutineName.trim(),
      tone: "accent",
      title: "Current active routine",
      valuePosition: "after",
    });
  }

  const routineCount = normalizeCount(args.routineCount);
  items.push({
    id: "routine-count",
    label: routineCount === 1 ? "routine total" : "routines total",
    value: routineCount,
    tone: "default",
    title: "Total available routines",
  });

  return items;
}

export function buildDayTaxonomyInfoRailItems(args: {
  strength: number | null | undefined;
  cardio: number | null | undefined;
  bodyweight: number | null | undefined;
  unknown?: number | null | undefined;
}): HeaderInfoRailItem[] {
  const items: HeaderInfoRailItem[] = [];
  const strength = normalizeCount(args.strength);
  const cardio = normalizeCount(args.cardio);
  const bodyweight = normalizeCount(args.bodyweight);
  const unknown = normalizeCount(args.unknown);

  if (strength > 0) {
    items.push({
      id: "strength",
      label: strength === 1 ? "strength" : "strength",
      value: strength,
      tone: "accent",
      title: "Strength exercises on this day",
    });
  }

  if (cardio > 0) {
    items.push({
      id: "cardio",
      label: "cardio",
      value: cardio,
      tone: "success",
      title: "Cardio exercises on this day",
    });
  }

  if (bodyweight > 0) {
    items.push({
      id: "bodyweight",
      label: "bodyweight",
      value: bodyweight,
      tone: "default",
      title: "Bodyweight exercises on this day",
    });
  }

  if (unknown > 0) {
    items.push({
      id: "other",
      label: "other",
      value: unknown,
      tone: "muted",
      title: "Other tracked exercises on this day",
    });
  }

  return items;
}

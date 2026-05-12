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

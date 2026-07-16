export type RoutineDayKind = "required" | "optional" | "rest";

export type RoutineDayKindSource = {
  is_rest?: boolean | null;
  is_optional?: boolean | null;
};

export function getRoutineDayKind(day: RoutineDayKindSource): RoutineDayKind {
  if (day.is_rest) return "rest";
  return day.is_optional ? "optional" : "required";
}

export function getRoutineDayKindLabel(dayKind: RoutineDayKind) {
  if (dayKind === "required") return "Active";
  if (dayKind === "optional") return "Optional";
  return "Rest";
}

export function getNextRoutineDayKind(dayKind: RoutineDayKind): RoutineDayKind {
  if (dayKind === "required") return "optional";
  if (dayKind === "optional") return "rest";
  return "required";
}

export function isRequiredRoutineDay(day: RoutineDayKindSource) {
  return getRoutineDayKind(day) === "required";
}

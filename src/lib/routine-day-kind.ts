export type RoutineDayKind = "required" | "optional" | "rest";

export type RoutineDayKindSource = {
  is_rest?: boolean | null;
  is_optional?: boolean | null;
};

export function getRoutineDayKind(day: RoutineDayKindSource): RoutineDayKind {
  if (day.is_rest) return "rest";
  return day.is_optional ? "optional" : "required";
}

export function isRequiredRoutineDay(day: RoutineDayKindSource) {
  return getRoutineDayKind(day) === "required";
}

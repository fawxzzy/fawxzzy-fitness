import type { ProgressionMeasurementKey } from "@/lib/progression-active-measurements";

export type ProgressionExampleMetricChange = "higher" | "lower" | "same" | "neutral";

export type ProgressionExampleSequenceGroup = {
  measurements: ProgressionMeasurementKey[];
  sessionCount: number;
};

export type ProgressionExampleSequenceStep = {
  dayIndex: number;
  dayNumber: number;
  roundIndex: number;
  groupIndex: number;
  sessionIndex: number;
  sessionCount: number;
  measurements: ProgressionMeasurementKey[];
  isFirstStepOfRound: boolean;
  isLastStepOfRound: boolean;
  isFinalSessionForGroup: boolean;
};

function parseDurationDisplayValue(input: string) {
  const mmssMatch = input.match(/^(\d+):(\d{1,2})(.*)$/u);
  if (mmssMatch) {
    const minutes = Number(mmssMatch[1]);
    const seconds = Number(mmssMatch[2]);
    if (Number.isInteger(minutes) && Number.isInteger(seconds)) {
      return {
        comparableSeconds: (minutes * 60) + seconds,
        fullValueText: mmssMatch[1] && mmssMatch[2] ? `${mmssMatch[1]}:${mmssMatch[2]}` : input,
        trailingLabelText: mmssMatch[3]?.trim() ?? "",
      };
    }
  }

  const minuteSecondMatch = input.match(/^(\d+)m\s+(\d+)s$/iu);
  if (minuteSecondMatch) {
    const minutes = Number(minuteSecondMatch[1]);
    const seconds = Number(minuteSecondMatch[2]);
    if (Number.isInteger(minutes) && Number.isInteger(seconds)) {
      return {
        comparableSeconds: (minutes * 60) + seconds,
        fullValueText: input,
        trailingLabelText: "",
      };
    }
  }

  const minuteOnlyMatch = input.match(/^(\d+)\s*(?:m|min)$/iu);
  if (minuteOnlyMatch) {
    const minutes = Number(minuteOnlyMatch[1]);
    if (Number.isInteger(minutes)) {
      return {
        comparableSeconds: minutes * 60,
        fullValueText: input,
        trailingLabelText: "",
      };
    }
  }

  const secondOnlyMatch = input.match(/^(\d+)\s*s$/iu);
  if (secondOnlyMatch) {
    const seconds = Number(secondOnlyMatch[1]);
    if (Number.isInteger(seconds)) {
      return {
        comparableSeconds: seconds,
        fullValueText: input,
        trailingLabelText: "",
      };
    }
  }

  return null;
}

export function buildProgressionExampleSequence(args: {
  cycleLengthDays: number;
  groups: ProgressionExampleSequenceGroup[];
}) {
  const normalizedCycleLength = Number.isFinite(args.cycleLengthDays)
    ? Math.max(1, Math.floor(args.cycleLengthDays))
    : 1;
  const normalizedGroups = args.groups
    .map((group) => ({
      measurements: group.measurements.filter((measurement) => measurement !== "calories"),
      sessionCount: Number.isFinite(group.sessionCount) ? Math.max(1, Math.floor(group.sessionCount)) : 1,
    }))
    .filter((group) => group.measurements.length > 0);

  if (normalizedGroups.length === 0) {
    return [] satisfies ProgressionExampleSequenceStep[];
  }

  const perRoundSteps = normalizedGroups.flatMap((group, groupIndex) => Array.from(
    { length: group.sessionCount },
    (_, sessionIndex) => ({
      groupIndex,
      sessionIndex: sessionIndex + 1,
      sessionCount: group.sessionCount,
      measurements: [...group.measurements],
      isFinalSessionForGroup: sessionIndex + 1 === group.sessionCount,
    }),
  ));

  const totalSections = Math.max(normalizedCycleLength, perRoundSteps.length);

  return Array.from({ length: totalSections }, (_, sectionIndex) => {
    const roundStepIndex = sectionIndex % perRoundSteps.length;
    const roundIndex = Math.floor(sectionIndex / perRoundSteps.length);
    const step = perRoundSteps[roundStepIndex]!;

    return {
      dayIndex: sectionIndex % normalizedCycleLength,
      dayNumber: (sectionIndex % normalizedCycleLength) + 1,
      roundIndex,
      groupIndex: step.groupIndex,
      sessionIndex: step.sessionIndex,
      sessionCount: step.sessionCount,
      measurements: step.measurements,
      isFirstStepOfRound: roundStepIndex === 0,
      isLastStepOfRound: roundStepIndex === perRoundSteps.length - 1,
      isFinalSessionForGroup: step.isFinalSessionForGroup,
    } satisfies ProgressionExampleSequenceStep;
  });
}

export function parseComparableProgressionExampleValue(part: string) {
  const trimmed = part.trim();
  if (!trimmed) {
    return null;
  }

  const durationValue = parseDurationDisplayValue(trimmed);
  if (durationValue) {
    return durationValue.comparableSeconds;
  }

  const numberMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)(.*)$/u);
  if (!numberMatch) {
    return null;
  }

  const parsed = Number(numberMatch[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function splitProgressionExampleMetricPart(part: string) {
  const trimmed = part.trim();
  if (!trimmed) {
    return { valueText: "", labelText: "" };
  }

  const durationValue = parseDurationDisplayValue(trimmed);
  if (durationValue) {
    return {
      valueText: durationValue.fullValueText,
      labelText: durationValue.trailingLabelText,
    };
  }

  const numberMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)(.*)$/u);
  if (numberMatch) {
    return {
      valueText: numberMatch[1],
      labelText: numberMatch[2]?.trim() ?? "",
    };
  }

  return {
    valueText: trimmed,
    labelText: "",
  };
}

export function classifyProgressionExampleMetricChange(valuePart: string, comparePart?: string | null): ProgressionExampleMetricChange {
  if (!comparePart) {
    return "neutral";
  }

  const currentValue = parseComparableProgressionExampleValue(valuePart);
  const compareValue = parseComparableProgressionExampleValue(comparePart);

  if (currentValue == null || compareValue == null) {
    return valuePart.trim() === comparePart.trim() ? "same" : "neutral";
  }

  if (currentValue === compareValue) {
    return "same";
  }

  return currentValue > compareValue ? "higher" : "lower";
}

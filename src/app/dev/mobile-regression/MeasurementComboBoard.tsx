"use client";

import { useMemo, useState } from "react";
import { MeasurementPanelV2 } from "@/components/ui/measurements/MeasurementPanelV2";
import type { MeasurementMetrics, MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { AppHeader } from "@/components/ui/app/AppHeader";

const METRIC_ORDER: Array<{ key: keyof MeasurementMetrics; label: string }> = [
  { key: "reps", label: "Reps" },
  { key: "weight", label: "Weight" },
  { key: "time", label: "Time" },
  { key: "distance", label: "Distance" },
  { key: "calories", label: "Calories" },
];

const SAMPLE_VALUES: MeasurementValues = {
  reps: "8",
  weight: "135",
  duration: "12:30",
  distance: "1.25",
  calories: "240",
  weightUnit: "lbs",
  distanceUnit: "mi",
};

type ComboDefinition = {
  id: string;
  title: string;
  activeMetrics: MeasurementMetrics;
};

function buildMeasurementCombos(): ComboDefinition[] {
  const combos: ComboDefinition[] = [];
  const metricCount = METRIC_ORDER.length;

  for (let mask = 0; mask < 1 << metricCount; mask += 1) {
    const activeMetrics: MeasurementMetrics = {
      reps: Boolean(mask & (1 << 0)),
      weight: Boolean(mask & (1 << 1)),
      time: Boolean(mask & (1 << 2)),
      distance: Boolean(mask & (1 << 3)),
      calories: Boolean(mask & (1 << 4)),
    };
    const activeLabels = METRIC_ORDER.filter(({ key }) => activeMetrics[key]).map(({ label }) => label);
    combos.push({
      id: `combo-${mask}`,
      title: activeLabels.length > 0 ? activeLabels.join(" + ") : "None Active",
      activeMetrics,
    });
  }

  return combos.sort((left, right) => {
    const leftCount = Object.values(left.activeMetrics).filter(Boolean).length;
    const rightCount = Object.values(right.activeMetrics).filter(Boolean).length;
    if (leftCount !== rightCount) {
      return leftCount - rightCount;
    }
    return left.title.localeCompare(right.title);
  });
}

function valuesForCombo(activeMetrics: MeasurementMetrics): MeasurementValues {
  return {
    reps: activeMetrics.reps ? SAMPLE_VALUES.reps : "",
    weight: activeMetrics.weight ? SAMPLE_VALUES.weight : "",
    duration: activeMetrics.time ? SAMPLE_VALUES.duration : "",
    distance: activeMetrics.distance ? SAMPLE_VALUES.distance : "",
    calories: activeMetrics.calories ? SAMPLE_VALUES.calories : "",
    weightUnit: SAMPLE_VALUES.weightUnit,
    distanceUnit: SAMPLE_VALUES.distanceUnit,
  };
}

export function MeasurementComboBoard({ section = "all" }: { section?: "all" | "q1" | "q2" | "q3" | "q4" }) {
  const combos = useMemo(() => {
    const allCombos = buildMeasurementCombos();
    if (section === "q1") {
      return allCombos.slice(0, 8);
    }
    if (section === "q2") {
      return allCombos.slice(8, 16);
    }
    if (section === "q3") {
      return allCombos.slice(16, 24);
    }
    if (section === "q4") {
      return allCombos.slice(24);
    }
    return allCombos;
  }, [section]);
  const [rpeValues, setRpeValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(combos.map((combo) => [combo.id, "8"])),
  );

  return (
    <div className="space-y-3">
      <SurfaceCard>
        <AppHeader
          title="Measurement Combos"
          subtitle="All primary logger field combinations with Effort visible for session context"
          meta={`${combos.length} combinations`}
          className="-mx-4 -mt-1 pb-1 sm:-mx-5"
        />
      </SurfaceCard>

      {combos.map((combo) => (
        <SurfaceCard key={combo.id} data-testid={combo.id}>
          <AppHeader
            title={combo.title}
            meta={Object.values(combo.activeMetrics).filter(Boolean).length === 0 ? "No primary metrics" : "Logger fields"}
            titleAs="h2"
            className="-mx-4 -mt-1 pb-1 sm:-mx-5"
            titleClassName="text-[1rem] font-semibold leading-[1.1]"
          />
          <MeasurementPanelV2
            values={valuesForCombo(combo.activeMetrics)}
            activeMetrics={combo.activeMetrics}
            isExpanded={false}
            onExpandedChange={() => {}}
            onChange={() => {}}
            visibleMetrics={METRIC_ORDER.filter(({ key }) => combo.activeMetrics[key]).map(({ key }) => key)}
            rpe={rpeValues[combo.id] ?? "8"}
            onRpeChange={(value) => {
              setRpeValues((current) => ({
                ...current,
                [combo.id]: value,
              }));
            }}
            showInnerHeader={false}
          />
        </SurfaceCard>
      ))}
    </div>
  );
}

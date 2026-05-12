"use client";

import { useState } from "react";
import { TodayExerciseRows } from "@/app/today/TodayExerciseRows";
import { ExercisePicker } from "@/components/ExercisePicker";
import { HistoryMetaLine } from "@/components/history/HistoryMetaLine";
import { DayDetailExerciseList } from "@/components/routines/day-detail/DayDetailExerciseList";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { appTokens } from "@/components/ui/app/tokens";
import { HistoryExerciseCard } from "@/components/history/HistoryExerciseCard";
import { StretchSessionPreview } from "@/app/dev/stretch-hub/StretchSessionPreview";
import {
  stretchPreviewDayPlanItems,
  stretchPreviewHistoryRow,
  stretchPreviewPickerExercises,
  stretchPreviewTodayRows,
} from "@/app/dev/stretch-hub/previewData";
import { cn } from "@/lib/cn";
import { getStretchHubMetaItems } from "@/lib/stretch-library";
import { buildHistoryExerciseCardViewModel } from "@/lib/workout-card-view-models";

const stretchHistoryMeta = <HistoryMetaLine items={getStretchHubMetaItems()} />;

export function StretchCardPassSurface() {
  const [activePlanItemId, setActivePlanItemId] = useState<string | null>(stretchPreviewDayPlanItems[0]?.id ?? null);
  const historyViewModel = buildHistoryExerciseCardViewModel(stretchPreviewHistoryRow);

  return (
    <div className="space-y-3">
      <AppPanel className={cn(appTokens.detailSection, "space-y-3 p-3")}>
        <div className="space-y-1 px-2 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent)/0.9)]">Stretch card pass</p>
          <h2 className={cn(appTokens.detailSectionTitle, "text-left")}>Browse, plan, today, and live-session surfaces for the Stretch hub</h2>
          <p className={appTokens.detailBodyMutedText}>This stacks the main contexts so the Stretch card can be reviewed as a single system instead of isolated screens.</p>
        </div>
      </AppPanel>

      <AppPanel className={cn(appTokens.detailSection, "space-y-3 p-3")}>
        <div className="space-y-1 px-2 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent)/0.9)]">Add exercise</p>
          <h3 className={cn(appTokens.detailSectionTitle, "text-left")}>Picker row treatment</h3>
        </div>
        <ExercisePicker
          exercises={stretchPreviewPickerExercises}
          name="previewExercise"
          initialSelectedId="preview-picker-stretch"
          renderFooter={() => null}
        />
      </AppPanel>

      <AppPanel className={cn(appTokens.detailSection, "space-y-3 p-3")}>
        <div className="space-y-1 px-2 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent)/0.9)]">Exercise browser</p>
          <h3 className={cn(appTokens.detailSectionTitle, "text-left")}>Compact and detailed card states</h3>
        </div>
        <div className="space-y-2">
          <HistoryExerciseCard
            exercise={stretchPreviewHistoryRow}
            title="Stretch"
            summaryLabel={historyViewModel.summaryLabel}
            summary={historyViewModel.summary}
            metadata={stretchHistoryMeta}
            badgeText={historyViewModel.badgeText}
            metrics={historyViewModel.detailedMetrics}
            density="compact"
            tone={historyViewModel.semanticTone}
            onPress={() => {}}
          />
          <HistoryExerciseCard
            exercise={stretchPreviewHistoryRow}
            title="Stretch"
            summaryLabel={historyViewModel.summaryLabel}
            summary={historyViewModel.summary}
            metadata={stretchHistoryMeta}
            badgeText={historyViewModel.badgeText}
            metrics={historyViewModel.detailedMetrics}
            density="detailed"
            tone={historyViewModel.semanticTone}
            onPress={() => {}}
          />
        </div>
      </AppPanel>

      <AppPanel className={cn(appTokens.detailSection, "space-y-3 p-3")}>
        <div className="space-y-1 px-2 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent)/0.9)]">Workout day</p>
          <h3 className={cn(appTokens.detailSectionTitle, "text-left")}>How Stretch sits inside a planned day</h3>
        </div>
        <div className="space-y-3">
          <DayDetailExerciseList items={stretchPreviewDayPlanItems} mode="read_only" />
          <DayDetailExerciseList
            items={stretchPreviewDayPlanItems}
            mode="editable"
            activeItemId={activePlanItemId}
            onSelectItem={(item) => setActivePlanItemId((current) => current === item.id ? null : item.id)}
            renderExpandedContent={() => (
              <div className="space-y-2 px-1 py-1">
                <p className={appTokens.detailBodyText}>Stretch stays reference-only in a plan. It marks a mobility block instead of prescribing a normal logged set sequence.</p>
                <p className={appTokens.detailBodyMutedText}>Use it when the day needs a guided reset, cooldown, or extra range-of-motion work.</p>
              </div>
            )}
          />
        </div>
      </AppPanel>

      <AppPanel className={cn(appTokens.detailSection, "space-y-3 p-3")}>
        <div className="space-y-1 px-2 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent)/0.9)]">Today</p>
          <h3 className={cn(appTokens.detailSectionTitle, "text-left")}>Compact and detailed today-card views</h3>
        </div>
        <div className="space-y-3">
          <TodayExerciseRows exercises={stretchPreviewTodayRows} emptyMessage="No exercises" density="compact" />
          <TodayExerciseRows exercises={stretchPreviewTodayRows} emptyMessage="No exercises" density="detailed" />
        </div>
      </AppPanel>

      <AppPanel className={cn(appTokens.detailSection, "space-y-3 p-3")}>
        <div className="space-y-1 px-2 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent)/0.9)]">Current session</p>
          <h3 className={cn(appTokens.detailSectionTitle, "text-left")}>Expanded card and live reference mode</h3>
        </div>
        <StretchSessionPreview />
      </AppPanel>
    </div>
  );
}

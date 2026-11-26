"use client";

import { useId, useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { CardHeader, CardNotice, CardSurface } from "@/components/ui/card-system";
import { ROUTINE_ARCHIVE_COPY } from "@/lib/routine-archive";

export type ArchivedRoutineListItem = {
  id: string;
  name: string;
  /** "Archived Nov 26", formatted on the server in the person's time zone. */
  archivedLabel: string;
};

/**
 * Archived routines, at the bottom of Routines (2026-11-26). Collapsed by default; the header shows the count and
 * toggles the list. Each row has Restore. When the Free plan is already at its 3 listed routines, a neutral note
 * explains why Restore will not add another (Restore still answers with the same plain copy, never red text).
 * Renders nothing when there are no archived routines.
 */
export function ArchivedRoutinesSection({
  routines,
  atRestoreLimit,
  pendingRoutineId,
  disabled = false,
  defaultExpanded = false,
  onRestore,
}: {
  routines: ArchivedRoutineListItem[];
  atRestoreLimit: boolean;
  pendingRoutineId: string | null;
  disabled?: boolean;
  defaultExpanded?: boolean;
  onRestore: (routine: ArchivedRoutineListItem) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();

  if (routines.length === 0) {
    return null;
  }

  const countLabel = routines.length === 1 ? "1 routine" : `${routines.length} routines`;

  return (
    <CardSurface as="section" tone="neutral" showRail={false} className="mt-3" data-routines-archived-section={expanded ? "open" : "closed"}>
      <CardHeader
        headingLevel={2}
        title="Archived"
        titleSecondary={`(${routines.length})`}
        meta={<span className="text-sm text-[rgb(var(--text-secondary))]">{`${countLabel}. Their workouts stay in History.`}</span>}
        interaction={{ kind: "toggle", expanded, onToggle: () => setExpanded((current) => !current), controlsId: panelId }}
      />
      <div id={panelId} hidden={!expanded} className="space-y-3 border-t border-[rgb(var(--border-strong)/0.14)] px-4 pb-4 pt-3">
        {atRestoreLimit ? (
          <CardNotice tone="neutral">
            {ROUTINE_ARCHIVE_COPY.restoreLimit}
          </CardNotice>
        ) : null}
        <ul className="divide-y divide-[rgb(var(--border-strong)/0.14)]" aria-label="Archived routines">
          {routines.map((routine) => {
            const isRestoring = pendingRoutineId === routine.id;
            return (
              <li key={routine.id} className="flex min-w-0 items-center gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-[rgb(var(--text-primary))]">{routine.name}</p>
                  <p className="text-sm text-[rgb(var(--text-secondary))]">{routine.archivedLabel}</p>
                </div>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  loading={isRestoring}
                  disabled={disabled && !isRestoring}
                  aria-label={`${ROUTINE_ARCHIVE_COPY.restoreLabel} ${routine.name}`}
                  onClick={() => onRestore(routine)}
                >
                  {ROUTINE_ARCHIVE_COPY.restoreLabel}
                </AppButton>
              </li>
            );
          })}
        </ul>
      </div>
    </CardSurface>
  );
}

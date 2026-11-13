import type { CardActionDefinition } from "@/components/ui/card-system";

export type RoutineCardActionRoutine = { id: string; name: string; isActive?: boolean };

/**
 * Action row for a routine card: Delete first (destructive, left), Set Active only for an inactive routine.
 * Pure so the wiring is testable: Delete hands the routine to the confirm flow (it never deletes directly),
 * Set Active hands the routine id to the caller. The accessible name starts with the visible label (WCAG 2.5.3).
 */
export function buildRoutineCardActions(args: {
  routine: RoutineCardActionRoutine;
  isPending: boolean;
  canDelete: boolean;
  canSetActive: boolean;
  onRequestDelete: (routine: RoutineCardActionRoutine) => void;
  onSetActive: (routineId: string) => void;
}): CardActionDefinition[] {
  const { routine } = args;
  const actions: CardActionDefinition[] = [
    {
      key: "delete",
      label: "Delete",
      ariaLabel: `Delete ${routine.name}`,
      intent: "danger",
      disabled: args.isPending || !args.canDelete,
      onPress: () => args.onRequestDelete(routine),
    },
  ];

  if (!routine.isActive) {
    const label = args.isPending ? "Saving..." : "Set Active";
    actions.push({
      key: "set-active",
      label,
      ariaLabel: `${args.isPending ? "Saving" : "Set Active"}: ${routine.name}`,
      intent: "toggle",
      disabled: args.isPending || !args.canSetActive,
      onPress: () => args.onSetActive(routine.id),
    });
  }

  return actions;
}

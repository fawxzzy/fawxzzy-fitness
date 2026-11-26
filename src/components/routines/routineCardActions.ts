import type { CardActionDefinition } from "@/components/ui/card-system";

export type RoutineCardActionRoutine = { id: string; name: string; isActive?: boolean };

/**
 * Menu for a routine card (DESIGN #8): Set active (inactive routines only), Edit, Duplicate, Rename, then
 * Delete last. Pure so the wiring is testable:
 * - Delete hands the routine to the confirm flow (it never deletes directly).
 * - Set active hands the routine id to the caller.
 * - Edit and Rename open the existing routine settings screen (Rename focuses the name; the rename is saved
 *   by the existing owner-scoped `updateRoutineAction` autosave, there is no separate rename action).
 * - Duplicate opens the existing duplicate chooser with this routine preselected (`duplicateRoutineAction`).
 * Edit/Duplicate/Rename are listed only when the caller wires them.
 * The accessible name starts with the visible label (WCAG 2.5.3).
 */
export function buildRoutineCardActions(args: {
  routine: RoutineCardActionRoutine;
  isPending: boolean;
  canDelete: boolean;
  canSetActive: boolean;
  onRequestDelete: (routine: RoutineCardActionRoutine) => void;
  onSetActive: (routineId: string) => void;
  onEdit?: (routineId: string) => void;
  onDuplicate?: (routineId: string) => void;
  onRename?: (routineId: string) => void;
}): CardActionDefinition[] {
  const { routine } = args;
  const actions: CardActionDefinition[] = [];

  if (!routine.isActive) {
    const label = args.isPending ? "Saving..." : "Set active";
    actions.push({
      key: "set-active",
      label,
      ariaLabel: `${args.isPending ? "Saving" : "Set active"}: ${routine.name}`,
      intent: "toggle",
      disabled: args.isPending || !args.canSetActive,
      onPress: () => args.onSetActive(routine.id),
    });
  }

  const navigation: Array<[key: string, label: string, handler: ((routineId: string) => void) | undefined]> = [
    ["edit", "Edit", args.onEdit],
    ["duplicate", "Duplicate", args.onDuplicate],
    ["rename", "Rename", args.onRename],
  ];
  for (const [key, label, handler] of navigation) {
    if (!handler) continue;
    actions.push({
      key,
      label,
      ariaLabel: `${label} ${routine.name}`,
      intent: "neutral",
      disabled: args.isPending,
      onPress: () => handler(routine.id),
    });
  }

  actions.push({
    key: "delete",
    label: "Delete",
    ariaLabel: `Delete ${routine.name}`,
    intent: "danger",
    disabled: args.isPending || !args.canDelete,
    onPress: () => args.onRequestDelete(routine),
  });

  return actions;
}

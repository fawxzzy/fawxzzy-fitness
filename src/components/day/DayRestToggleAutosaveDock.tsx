"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { DayRestToggleDockControl } from "@/components/day/DayRestToggleDockControl";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";

type Props = {
  routineId: string;
  routineDayId: string;
  initialIsRest: boolean;
  name: string;
};

export function DayRestToggleAutosaveDock({ routineId, routineDayId, initialIsRest, name }: Props) {
  const [isRest, setIsRest] = useState(initialIsRest);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  return (
    <DayRestToggleDockControl
      isRest={isRest}
      disabled={isPending}
      onToggle={() => {
        if (isPending) return;
        const nextIsRest = !isRest;
        setIsRest(nextIsRest);
        startTransition(async () => {
          const formData = new FormData();
          formData.set("routineId", routineId);
          formData.set("routineDayId", routineDayId);
          formData.set("name", name);
          if (nextIsRest) {
            formData.set("isRest", "on");
          }
          const result = await updateRoutineDaySettingsAction(formData);
          if (!result.ok) {
            setIsRest(!nextIsRest);
            toast.error(result.error ?? "Could not update rest day status.");
            return;
          }
          toast.info(nextIsRest ? REST_DAY_BEHAVIOR_CONTRACT.copy.enabled : REST_DAY_BEHAVIOR_CONTRACT.copy.disabled, {
            id: "day-rest-toggle-status",
            durationMs: 2600,
          });
          router.refresh();
        });
      }}
    />
  );
}

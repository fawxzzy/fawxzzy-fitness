import type { ReactNode } from "react";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { StickyActionBar } from "@/components/ui/app/StickyActionBar";

export function EditRoutineStickyActions({ primary, secondary }: { primary: ReactNode; secondary: ReactNode }) {
  return (
    <PublishBottomActions>
      <StickyActionBar
        primary={primary}
        secondary={secondary}
        className="border-white/12 bg-[rgb(var(--surface)/0.94)]"
      />
    </PublishBottomActions>
  );
}

import type { ReactNode } from "react";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { StickyActionBar } from "@/components/ui/app/StickyActionBar";

export function EditRoutineStickyActions({
  primary,
  secondary,
  helper,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  helper?: ReactNode;
}) {
  return (
    <PublishBottomActions>
      <StickyActionBar
        primary={(
          <div className="space-y-2">
            {helper ? <div className="px-1 text-center text-[11px] text-[rgb(var(--text)/0.68)]">{helper}</div> : null}
            {primary}
          </div>
        )}
        secondary={secondary}
        className="border-white/12 bg-[rgb(var(--surface)/0.96)]"
      />
    </PublishBottomActions>
  );
}

import type { ReactNode } from "react";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";

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
      {secondary ? (
        <BottomActionSplit
          primary={(
            <div className="space-y-2">
              {helper ? <div className="rounded-full border border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] px-3 py-1.5 text-center text-[11px] text-[rgb(var(--text)/0.68)]">{helper}</div> : null}
              {primary}
            </div>
          )}
          secondary={secondary}
        />
      ) : (
        <BottomActionSingle>
          <div className="space-y-2">
            {helper ? <div className="rounded-full border border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] px-3 py-1.5 text-center text-[11px] text-[rgb(var(--text)/0.68)]">{helper}</div> : null}
            {primary}
          </div>
        </BottomActionSingle>
      )}
    </PublishBottomActions>
  );
}

import type { ReactNode } from "react";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";

export function EditRoutineStickyActions({
  primary,
  secondary}: {
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <PublishBottomActions>
      {secondary ? (
        <BottomActionSplit
          primary={(
            <div className="space-y-2">{primary}</div>
          )}
          secondary={secondary}
        />
      ) : (
        <BottomActionSingle>
          <div className="space-y-2">{primary}</div>
        </BottomActionSingle>
      )}
    </PublishBottomActions>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { BottomActionStackedPrimary } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";

export function EditRoutineStickyActions({
  primary,
  secondary,
  cancelHref,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  cancelHref: string;
}) {
  return (
    <PublishBottomActions>
      <BottomActionStackedPrimary
        utility={(
          <>
            <Link href={cancelHref} className={getAppButtonClassName({ variant: "secondary", size: "md", fullWidth: true })}>
              Cancel
            </Link>
            {secondary ?? <div aria-hidden="true" />}
          </>
        )}
        primary={<div className="space-y-2">{primary}</div>}
      />
    </PublishBottomActions>
  );
}

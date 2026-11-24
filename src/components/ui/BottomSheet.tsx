"use client";

import type { ReactNode } from "react";
import { Sheet } from "@/components/ui/Sheet";

// Legacy name kept for existing callers. The bottom sheet itself (focus, Escape, scroll lock, stacking, safe area)
// lives in Sheet.tsx; new code imports `Sheet` (docs/ui/FOUNDATION.md).
type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  contentClassName?: string;
  footer?: ReactNode;
  /** Small label above the title. None by default (the old generic "Sheet" eyebrow is gone); null also means none. */
  eyebrow?: string | null;
};

export function BottomSheet({ eyebrow, ...props }: BottomSheetProps) {
  return <Sheet {...props} eyebrow={eyebrow ?? undefined} />;
}

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
};

export function BottomSheet(props: BottomSheetProps) {
  return <Sheet {...props} />;
}

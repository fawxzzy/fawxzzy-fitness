"use client";

import type { ReactNode } from "react";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";

export function PublishBottomActions({ children }: { children: ReactNode | null }) {
  usePublishBottomActions(children);
  return null;
}

"use client";

import type { ReactNode } from "react";

type ProtectedAppInstallGateProps = {
  children: ReactNode;
};

export function ProtectedAppInstallGate({ children }: ProtectedAppInstallGateProps) {
  return children;
}

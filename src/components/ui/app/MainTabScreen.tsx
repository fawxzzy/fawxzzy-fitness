import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type MainTabScreenProps = {
  children: ReactNode;
  className?: string;
};

export function MainTabScreen({ children, className }: MainTabScreenProps) {
  return <section className={cn("space-y-3", className)}>{children}</section>;
}


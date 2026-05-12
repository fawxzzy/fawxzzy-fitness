import type { ReactNode } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { appTokens } from "@/components/ui/app/tokens";
import { fitnessDesignPrimitiveClassNames } from "@/components/ui/app/designSystem";
import { cn } from "@/lib/cn";

export function FormSectionCard({
  children,
  className,
  insetClassName,
}: {
  children: ReactNode;
  className?: string;
  insetClassName?: string;
}) {
  return (
    <AppPanel className={cn(appTokens.exerciseLogInsetPanel, className)}>
      <div className={cn(fitnessDesignPrimitiveClassNames.sectionLayout.sectionBodyDenseClassName, insetClassName)}>{children}</div>
    </AppPanel>
  );
}

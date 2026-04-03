import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { resolveScreenRecipe, type ScreenContractName } from "@/components/ui/app/screenContract";

export function ScreenScaffold({
  children,
  className,
  recipe,
}: {
  children: ReactNode;
  className?: string;
  recipe?: ScreenContractName;
}) {
  const resolvedRecipe = recipe ? resolveScreenRecipe(recipe) : null;

  return (
    <section
      data-screen-scaffold={resolvedRecipe?.scaffold}
      data-section-chrome={resolvedRecipe?.sectionChrome}
      data-footer-dock={resolvedRecipe?.footerDock}
      data-row-interaction={resolvedRecipe?.rowInteraction}
      className={cn("bg-[rgb(var(--bg))]", resolvedRecipe?.scaffoldClassName, className)}
    >
      {children}
    </section>
  );
}

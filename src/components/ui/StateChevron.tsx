"use client";

import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { cn } from "@/lib/cn";

type ChevronDirection = "down" | "right" | "up";

function renderChevron(direction: ChevronDirection, className?: string) {
  switch (direction) {
    case "down":
      return <ChevronDownIcon className={className} />;
    case "up":
      return <ChevronUpIcon className={className} />;
    case "right":
    default:
      return <ChevronRightIcon className={className} />;
  }
}

export function StateChevron({
  expanded,
  className,
  collapsedClassName,
  expandedClassName,
  collapsedDirection = "right",
  expandedDirection = "down",
}: {
  expanded: boolean;
  className?: string;
  collapsedClassName?: string;
  expandedClassName?: string;
  collapsedDirection?: ChevronDirection;
  expandedDirection?: ChevronDirection;
}) {
  return renderChevron(
    expanded ? expandedDirection : collapsedDirection,
    cn(className, expanded ? expandedClassName : collapsedClassName),
  );
}

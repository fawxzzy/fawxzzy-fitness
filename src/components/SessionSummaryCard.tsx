import type { ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";

const defaultChevron = <ChevronRightIcon className="h-5 w-5 text-[rgb(var(--text-muted)/0.92)]" />;

const densityStyles = {
  compact: {
    content: "space-y-2",
    summary: "text-sm leading-snug text-[rgb(var(--text)/0.86)]",
    detail: "text-[11px] leading-[1.45] text-[rgb(var(--text-muted)/0.94)]",
    variant: "list" as const,
  },
  detailed: {
    content: "space-y-2.5",
    summary: "text-[0.95rem] leading-[1.45] text-[rgb(var(--text)/0.9)]",
    detail: "text-xs leading-[1.5] text-[rgb(var(--text-secondary)/0.9)]",
    variant: "standard" as const,
  },
} as const;

export function SessionSummaryCard({
  title,
  subtitle,
  summary,
  detail,
  children,
  badgeText,
  rightIcon = defaultChevron,
  onPress,
  className,
  tone = "neutral",
  density = "compact",
}: {
  title: string;
  subtitle?: ReactNode;
  summary?: ReactNode;
  detail?: ReactNode;
  children?: ReactNode;
  badgeText?: string;
  rightIcon?: ReactNode;
  onPress?: () => void;
  className?: string;
  tone?: CardSemanticTone;
  density?: "compact" | "detailed";
}) {
  const styles = densityStyles[density];
  return (
    <ExerciseCard
      title={title}
      subtitle={subtitle}
      subtitleLabel={subtitle ? "Session" : undefined}
      badgeText={badgeText}
      rightIcon={rightIcon}
      onPress={onPress}
      className={cn("shadow-none", className)}
      variant={styles.variant}
      density={density}
      semanticTone={tone}
      titleClassName="[text-wrap:pretty]"
      subtitleClassName="[text-wrap:pretty]"
    >
      {(summary || detail || children) ? (
        <div className={styles.content}>
          {summary ? <p className={cn("[text-wrap:pretty]", styles.summary)}>{summary}</p> : null}
          {detail ? <p className={cn("[text-wrap:pretty]", styles.detail)}>{detail}</p> : null}
          {children}
        </div>
      ) : null}
    </ExerciseCard>
  );
}

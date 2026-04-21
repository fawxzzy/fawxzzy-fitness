import type { ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { appTokens } from "@/components/ui/app/tokens";
import { type CardSemanticTone } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";

const defaultChevron = <ChevronRightIcon className="h-5 w-5 text-[rgb(var(--text-muted)/0.92)]" />;

const densityStyles = {
  compact: {
    content: appTokens.workoutCardContentCompact,
    summary: appTokens.workoutCardSummaryCompact,
    detail: appTokens.workoutCardDetailCompact,
    variant: "list" as const,
  },
  detailed: {
    content: appTokens.workoutCardContentDetailed,
    summary: appTokens.workoutCardSummaryDetailed,
    detail: appTokens.workoutCardDetailDetailed,
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

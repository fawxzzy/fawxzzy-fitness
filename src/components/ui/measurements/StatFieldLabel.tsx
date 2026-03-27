import { cn } from "@/lib/cn";

const statFieldLabelClassName = "inline-flex select-none items-center gap-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.16em] [-webkit-tap-highlight-color:transparent] [user-select:none]";

export function StatFieldLabel({
  title,
  suffix,
  emphasis = "default",
  className,
}: {
  title: string;
  suffix?: string;
  emphasis?: "default" | "target";
  className?: string;
}) {
  const normalizedTitle = title.trim().toUpperCase();
  const normalizedSuffix = suffix?.trim().toUpperCase();

  return (
    <span
      className={cn(
        statFieldLabelClassName,
        emphasis === "target" ? "text-emerald-100" : "text-emerald-100/90",
        className,
      )}
    >
      <span className={cn(emphasis === "target" ? "font-semibold" : "font-medium")}>{normalizedTitle}</span>
      {normalizedSuffix ? (
        <span
          className={cn(
            "text-[10px] tracking-[0.1em]",
            emphasis === "target" ? "text-emerald-200/80" : "text-emerald-200/72",
          )}
        >
          ({normalizedSuffix})
        </span>
      ) : null}
    </span>
  );
}

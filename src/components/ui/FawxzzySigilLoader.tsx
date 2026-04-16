import { cn } from "@/lib/cn";

type FawxzzySigilLoaderProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const sizeClassNames = {
  sm: {
    shell: "h-10 w-10",
    core: "h-5 w-5 text-[0.54rem]",
  },
  md: {
    shell: "h-14 w-14",
    core: "h-7 w-7 text-[0.7rem]",
  },
  lg: {
    shell: "h-16 w-16",
    core: "h-8 w-8 text-[0.78rem]",
  },
  xl: {
    shell: "h-24 w-24",
    core: "h-11 w-11 text-[1.05rem]",
  },
};

export function FawxzzySigilLoader({
  className,
  size = "md",
}: FawxzzySigilLoaderProps) {
  const scale = sizeClassNames[size];

  return (
    <div className={cn("relative grid place-items-center", scale.shell, className)} aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-[rgb(var(--accent)/0.18)] blur-[18px]" />
      <div className="absolute inset-0 rounded-full border border-[rgb(var(--accent)/0.18)]" />
      <div className="absolute inset-[4px] animate-spin rounded-full border border-transparent border-r-[rgb(var(--ambient-line-cyan)/0.48)] border-t-[rgb(var(--accent)/0.9)]" />
      <div className="absolute inset-[9px] rounded-full border border-[rgb(var(--text)/0.08)]" />
      <div className="absolute inset-[11px] animate-pulse rounded-full bg-[radial-gradient(circle,rgba(71,215,196,0.28),rgba(71,215,196,0.04)_68%,transparent_100%)]" />
      <div className={cn("relative grid place-items-center rounded-full border border-[rgb(var(--accent)/0.26)] bg-[rgb(var(--surface-2-rgb)/0.86)] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--text)/0.94)]", scale.core)}>
        F
      </div>
      <div
        className="absolute inset-0 animate-spin rounded-full [mask-image:conic-gradient(from_0deg,transparent_0deg,black_38deg,transparent_82deg)] bg-[conic-gradient(from_0deg,rgba(71,215,196,0)_0deg,rgba(71,215,196,0.55)_34deg,rgba(160,214,255,0.18)_68deg,rgba(71,215,196,0)_118deg)]"
        style={{ animationDuration: "2.4s" }}
      />
    </div>
  );
}

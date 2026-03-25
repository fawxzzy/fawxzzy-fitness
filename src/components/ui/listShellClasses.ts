export const listShellClasses = {
  viewport: "pr-1.5",
  list: "space-y-2.5 scroll-py-2 snap-y snap-mandatory",
  card: "snap-start rounded-[1.05rem] border border-[rgb(var(--glass-tint-rgb)/var(--glass-current-border-alpha))] bg-[rgb(var(--glass-tint-rgb)/0.74)] p-3.5 shadow-[0_10px_20px_-14px_rgba(0,0,0,0.88)]",
  pillAction: "inline-flex min-h-9 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold",
  iconAction: "inline-flex h-9 w-9 items-center justify-center rounded-md text-xs font-semibold",
  rowAction: "inline-flex min-h-9 items-center justify-center rounded-md px-3 py-2 text-xs font-semibold",
  rowActionCompact: "inline-flex min-h-8 items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-semibold",
} as const;

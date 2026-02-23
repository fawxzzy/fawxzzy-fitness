export const listShellClasses = {
  viewport: "h-[68vh] overflow-y-auto overscroll-contain pr-1 md:h-auto md:max-h-[72vh]",
  list: "space-y-3 scroll-py-2 snap-y snap-mandatory",
  card: "snap-start rounded-xl border border-[rgb(var(--glass-tint-rgb)/var(--glass-current-border-alpha))] bg-[rgb(var(--glass-tint-rgb)/0.72)] p-4",
  pillAction: "inline-flex min-h-9 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold",
  rowAction: "inline-flex min-h-9 items-center justify-center rounded-md px-3 py-2 text-xs font-semibold",
} as const;


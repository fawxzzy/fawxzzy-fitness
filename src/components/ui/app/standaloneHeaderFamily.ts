import { headerTokens } from "@/components/ui/app/headerTokens";

export const standaloneHeaderFamily = {
  panelClassName: "space-y-0 rounded-[1.8rem] border-white/14 shadow-[0_20px_42px_rgba(0,0,0,0.28)]",
  headerClassName: "",
  titleClassName: headerTokens.titleClassName,
  actionClassName: "",
  actionButtonClassName: "h-10 w-10 rounded-full border border-white/18 bg-[rgb(var(--surface-rgb)/0.58)] px-0 shadow-[0_10px_22px_-12px_rgba(0,0,0,0.92)] hover:border-white/30 hover:bg-[rgb(var(--surface-rgb)/0.78)]",
  metaClassName: "px-5 pb-4",
  dividerClassName: "px-5 pb-4",
} as const;

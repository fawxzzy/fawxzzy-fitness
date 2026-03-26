import { headerTokens } from "@/components/ui/app/headerTokens";

export const standaloneHeaderFamily = {
  panelClassName: "space-y-0 rounded-[1.8rem] border-white/14 shadow-[0_20px_42px_rgba(0,0,0,0.28)]",
  headerClassName: "",
  titleClassName: headerTokens.titleClassName,
  actionClassName: "",
  metaClassName: "px-5 pb-4",
  dividerClassName: "px-5 pb-4",
} as const;

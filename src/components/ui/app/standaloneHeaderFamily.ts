import { fitnessDesignPrimitiveClassNames } from "@/components/ui/app/designSystem";
import { headerTokens } from "@/components/ui/app/headerTokens";

export const standaloneHeaderFamily = {
  panelClassName: fitnessDesignPrimitiveClassNames.headerFamily.panelClassName,
  headerClassName: "",
  titleClassName: headerTokens.titleClassName,
  actionClassName: "",
  actionButtonClassName: fitnessDesignPrimitiveClassNames.headerFamily.actionButtonClassName,
  metaClassName: fitnessDesignPrimitiveClassNames.headerFamily.metaClassName,
  dividerClassName: fitnessDesignPrimitiveClassNames.headerFamily.dividerClassName,
} as const;

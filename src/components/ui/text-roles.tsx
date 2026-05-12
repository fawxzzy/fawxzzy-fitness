import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

const textRoleClassNames = {
  title: "text-[rgb(var(--text)/0.98)]",
  subtitle: "text-[rgb(var(--text-secondary)/0.98)]",
  accentSubtitle: "text-[rgb(var(--accent))]",
  eyebrow: "text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]",
} as const;

type TextRole = keyof typeof textRoleClassNames;

type SemanticTextProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

function createSemanticText<TDefault extends ElementType>(
  role: TextRole,
  defaultElement: TDefault,
  defaultClassName: string,
) {
  return function SemanticText<T extends ElementType = TDefault>({
    as,
    children,
    className,
    ...props
  }: SemanticTextProps<T>) {
    const Component = (as ?? defaultElement) as ElementType;
    return (
      <Component className={cn(defaultClassName, textRoleClassNames[role], className)} {...props}>
        {children}
      </Component>
    );
  };
}

export const TitleText = createSemanticText("title", "span", "block pl-[2px] pr-px py-px font-semibold leading-tight tracking-[-0.02em]");
export const SubtitleText = createSemanticText("subtitle", "span", "block px-px py-px text-sm leading-snug");
export const AccentSubtitleText = createSemanticText("accentSubtitle", "span", "block px-px py-px text-sm font-medium leading-snug");
export const EyebrowText = createSemanticText("eyebrow", "span", "block px-px py-px");

export const textRoles = textRoleClassNames;

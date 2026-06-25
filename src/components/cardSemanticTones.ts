export type CardSemanticTone = "neutral" | "current" | "logged" | "completed" | "attention" | "pr";

export const cardAccentRailClassNames: Record<CardSemanticTone, string> = {
  neutral: "bg-[rgb(var(--accent-divider-rgb)/0.96)]",
  current: "bg-[rgb(var(--selection-rgb)/0.78)]",
  logged: "bg-[rgb(var(--success-rgb)/0.74)]",
  completed: "bg-[rgb(var(--success-rgb)/1)]",
  attention: "bg-[rgb(var(--warning-rgb)/0.9)]",
  pr: "bg-[rgb(var(--accent-divider-rgb)/0.92)]",
};

export const cardShellToneClassNames: Record<CardSemanticTone, string> = {
  neutral: "",
  current: "shadow-[inset_0_0_0_1px_rgb(var(--selection-rgb)/0.16),0_0_0_1px_rgb(var(--selection-rgb)/0.05)]",
  logged: "shadow-[inset_0_0_0_1px_rgb(var(--success-rgb)/0.18),0_0_0_1px_rgb(var(--success-rgb)/0.06)]",
  completed: "shadow-[inset_0_0_0_1px_rgb(var(--success-rgb)/0.62),0_0_0_1px_rgb(var(--success-rgb)/0.28)]",
  attention: "shadow-[inset_0_0_0_1px_rgb(var(--warning-rgb)/0.2),0_0_0_1px_rgb(var(--warning-rgb)/0.08)]",
  pr: "shadow-[inset_0_0_0_1px_rgb(var(--accent-divider-rgb)/0.28),0_0_0_1px_rgb(var(--accent-divider-rgb)/0.11)]",
};

export const cardMediaToneClassNames: Record<CardSemanticTone, string> = {
  neutral: "",
  current: "border-[rgb(var(--selection-rgb)/0.3)]",
  logged: "border-[rgb(var(--success-rgb)/0.32)]",
  completed: "border-[rgb(var(--success-rgb)/0.7)]",
  attention: "border-[rgb(var(--warning-rgb)/0.34)]",
  pr: "border-[rgb(var(--accent-divider-rgb)/0.42)]",
};

export const cardBadgeToneClassNames: Record<CardSemanticTone, string> = {
  neutral: "",
  current: "border-[rgb(var(--selection-rgb)/0.3)] bg-[rgb(var(--selection-rgb)/0.12)]",
  logged: "border-[rgb(var(--success-rgb)/0.3)] bg-[rgb(var(--success-rgb)/0.12)]",
  completed: "border-[rgb(var(--success-rgb)/0.64)] bg-[rgb(var(--success-rgb)/0.32)]",
  attention: "border-[rgb(var(--warning-rgb)/0.3)] bg-[rgb(var(--warning-rgb)/0.13)] text-[rgb(255_241_213)]",
  pr: "border-[rgb(var(--accent-divider-rgb)/0.36)] bg-[rgb(var(--accent-divider-rgb)/0.16)] text-[rgb(var(--text-primary)/0.98)]",
};

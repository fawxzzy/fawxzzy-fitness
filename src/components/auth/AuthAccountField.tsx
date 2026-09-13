import type { ReactNode } from "react";
import {
  LabeledEditorField,
  labeledEditorFieldControlClassName,
} from "@/components/ui/LabeledEditorField";
import { cn } from "@/lib/cn";

export const AUTH_ACCOUNT_FIELD_CLASS_NAME =
  "auth-account-field mx-auto w-[15rem] max-w-full border-[rgb(var(--border-strong)/0.18)] !bg-transparent shadow-none";

export const AUTH_ACCOUNT_INPUT_CLASS_NAME =
  `${labeledEditorFieldControlClassName} auth-input-plain auth-account-input h-[54px] w-full min-w-0 px-[18px] py-0 text-center !text-base placeholder:text-center !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0`;

export const AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME =
  `${labeledEditorFieldControlClassName} auth-input-plain auth-account-input h-[54px] w-full min-w-0 !px-12 py-0 text-center !text-base placeholder:text-center !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0`;

export function AuthAccountField({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <LabeledEditorField label={label} className={cn(AUTH_ACCOUNT_FIELD_CLASS_NAME, className)}>
      {children}
    </LabeledEditorField>
  );
}

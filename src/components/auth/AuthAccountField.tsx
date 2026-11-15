import type { ReactNode } from "react";
import { AuthLockIcon } from "@/components/auth/AuthShell";
import { cn } from "@/lib/cn";

// Auth Surface v2 field: a 60px outlined box, label notched into the top-right border, value centred.
// `invalid` outlines it in the error colour (the field the notice is about); `locked` is a read-only value with a
// lock icon (remembered username, signed-in email, sent states). Styles: `.fx-fld` in globals.css.

export const AUTH_ACCOUNT_FIELD_CLASS_NAME = "fx-fld auth-account-field";

export const AUTH_ACCOUNT_INPUT_CLASS_NAME = "fx-fld__input auth-input-plain auth-account-input";

export const AUTH_ACCOUNT_PASSWORD_INPUT_CLASS_NAME = "fx-fld__input fx-fld__input--password auth-input-plain auth-account-input";

export function AuthAccountField({
  label,
  htmlFor,
  invalid = false,
  locked = false,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  invalid?: boolean;
  locked?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(AUTH_ACCOUNT_FIELD_CLASS_NAME, className)}
      data-invalid={invalid ? "true" : undefined}
      data-locked={locked ? "true" : undefined}
      data-testid="auth-field"
    >
      <label className="fx-fld__label" htmlFor={htmlFor}>{label}</label>
      {children}
      {locked ? <AuthLockIcon /> : null}
    </div>
  );
}

/** A locked, read-only value (never typed): remembered username, the signed-in email, the address a link went to. */
export function AuthLockedField({
  id,
  label,
  value,
  name,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  name?: string;
  autoComplete?: string;
}) {
  return (
    <AuthAccountField label={label} htmlFor={id} locked>
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        readOnly
        aria-readonly="true"
        autoComplete={autoComplete}
        className={AUTH_ACCOUNT_INPUT_CLASS_NAME}
      />
    </AuthAccountField>
  );
}

"use client";

import { useActionState, useMemo } from "react";
import { updateAccountEmailAction, type EmailUpdateState } from "@/app/settings/actions";
import { GlassButton } from "@/components/ui/GlassButton";

const INITIAL_EMAIL_STATE: EmailUpdateState = { status: "idle" };

export function AccountSettingsForm({ email }: { email: string }) {
  const [emailState, emailAction, emailPending] = useActionState(updateAccountEmailAction, INITIAL_EMAIL_STATE);

  const emailMessageTone = useMemo(() => {
    if (emailState.status === "error") return "text-red-200";
    if (emailState.status === "success") return "text-emerald-200";
    return "text-[rgb(var(--text-muted)/0.78)]";
  }, [emailState.status]);

  return (
    <form action={emailAction} className="space-y-2.5">
      <div className="space-y-1.5">
        <label htmlFor="settings-email" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Email</label>
        <input
          id="settings-email"
          name="email"
          type="email"
          defaultValue={email}
          autoComplete="email"
          className="w-full rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-[rgb(var(--text)/0.96)] outline-none ring-0 placeholder:text-[rgb(var(--text-muted)/0.7)] focus:border-white/20"
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <GlassButton type="submit" disabled={emailPending} className="px-3 py-2 text-sm font-semibold">
          {emailPending ? "Saving…" : "Update Email"}
        </GlassButton>
        <p className={`text-xs ${emailMessageTone}`}>{emailState.message ?? "Email changes may require confirmation."}</p>
      </div>
    </form>
  );
}

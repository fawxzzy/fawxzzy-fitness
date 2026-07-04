"use client";

import { useEffect, useState } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import { deriveRememberedLoginDisplayName } from "@/lib/remembered-login";
import { readRememberedLoginState } from "@/lib/remembered-login";

export function SettingsHeaderIdentity({
  email,
  username,
}: {
  email: string;
  username: string;
}) {
  const [resolvedUsername, setResolvedUsername] = useState(username.trim());

  useEffect(() => {
    if (username.trim()) {
      setResolvedUsername(username.trim());
      return;
    }

    const rememberedDisplayName = readRememberedLoginState()?.displayName?.trim() ?? "";
    if (rememberedDisplayName) {
      setResolvedUsername(rememberedDisplayName);
      return;
    }

    if (email.trim()) {
      setResolvedUsername(deriveRememberedLoginDisplayName(email).toLowerCase());
    }
  }, [email, username]);

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {resolvedUsername ? (
        <>
          <div className="hidden items-center justify-center gap-2 sm:flex">
            <span className={cn(appTokens.settingsBodyText, "text-[rgb(var(--text-primary)/0.96)]")}>
              {resolvedUsername}
            </span>
            <span aria-hidden="true" className="h-5 w-[0.2rem] rounded-full bg-[rgb(var(--accent)/0.9)]" />
            <span className={cn(appTokens.settingsBodyText, "text-[rgb(var(--text-primary)/0.96)]")}>
              {email || "Unknown email"}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center sm:hidden">
            <span className={cn(appTokens.settingsBodyText, "text-[rgb(var(--text-primary)/0.96)]")}>
              {resolvedUsername}
            </span>
            <span className={cn(appTokens.settingsBodyText, "text-[rgb(var(--text-primary)/0.96)]")}>
              {email || "Unknown email"}
            </span>
            <MetricAccentBar variant="thin" className="mt-1 w-full min-w-[8rem] opacity-80" />
          </div>
        </>
      ) : (
        <>
          <span className={cn(appTokens.settingsBodyText, "text-[rgb(var(--text-primary)/0.96)]")}>
            {email || "Unknown email"}
          </span>
          <MetricAccentBar variant="thin" className="mt-1 w-full min-w-[8rem] opacity-80" />
        </>
      )}
    </div>
  );
}

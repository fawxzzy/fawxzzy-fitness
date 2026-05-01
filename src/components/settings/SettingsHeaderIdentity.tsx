"use client";

import { useEffect, useState } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { deriveRememberedLoginDisplayName, readRememberedLoginState } from "@/lib/remembered-login";

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

  const items = resolvedUsername ? [resolvedUsername, email || "Unknown email"] : [email || "Unknown email"];

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-center">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-[rgb(var(--accent-divider-rgb)/1)]" /> : null}
          <span className={cn(appTokens.settingsBodyText, "text-[rgb(var(--text-primary)/0.96)]")}>{item}</span>
        </span>
      ))}
    </div>
  );
}

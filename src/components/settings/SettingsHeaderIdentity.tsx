"use client";

import { useEffect, useState } from "react";
import { SignatureInlineList } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
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
      <SignatureInlineList
        items={resolvedUsername ? [resolvedUsername, email || "Unknown email"] : [email || "Unknown email"]}
        separator="pipe"
        className="justify-center"
        itemClassName={cn(appTokens.settingsBodyText, "text-[rgb(var(--text-primary)/0.96)]")}
      />
    </div>
  );
}

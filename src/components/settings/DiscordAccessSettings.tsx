"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useIsOnline } from "@/components/session/useIsOnline";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { AppButton } from "@/components/ui/AppButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { CardMeta } from "@/components/ui/card-system";
import { FormField, formFieldControlClassName } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";
import { FITNESS_DISCORD_INVITE_URL } from "@/lib/legal-documents";

type DiscordTokenResponse =
  | {
    ok: true;
    token: string;
    expiresAt: string;
  }
  | {
    ok: false;
    error?: string;
  };

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) {
    return null;
  }

  const parsedDate = new Date(expiresAt);
  if (Number.isNaN(parsedDate.valueOf())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

export function DiscordAccessSettings() {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [isGenerating, startGenerateTransition] = useTransition();
  const toast = useToast();
  const isOnline = useIsOnline();

  useEffect(() => {
    if (copyLabel !== "Copied") {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyLabel("Copy"), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [copyLabel]);

  const expiryLabel = useMemo(() => formatExpiry(expiresAt), [expiresAt]);

  const generateToken = () => {
    startGenerateTransition(async () => {
      setCopyLabel("Copy");

      try {
        const response = await fetch("/api/discord/verification-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await response.json().catch(() => ({ ok: false, error: "Unable to generate a Discord token right now." })) as DiscordTokenResponse;

        if (!response.ok || !result.ok) {
          const nextError =
            "error" in result && typeof result.error === "string"
              ? result.error
              : "Unable to generate a Discord token right now.";
          setToken(null);
          setExpiresAt(null);
          toast.error(nextError, { id: "discord-access-generate-error" });
          return;
        }

        setToken(result.token);
        setExpiresAt(result.expiresAt);
        toast.success("Discord verification token ready.", { id: "discord-access-generated" });
      } catch {
        const nextError = "Unable to generate a Discord token right now.";
        setToken(null);
        setExpiresAt(null);
        toast.error(nextError, { id: "discord-access-generate-error" });
      }
    });
  };

  const copyToken = async () => {
    if (!token) {
      return;
    }

    try {
      await navigator.clipboard.writeText(token);
      setCopyLabel("Copied");
      toast.success("Discord token copied.", { id: "discord-access-copy" });
    } catch {
      toast.error("Unable to copy the Discord token on this device.", { id: "discord-access-copy-error" });
    }
  };

  return (
    <div className="space-y-3">
      <SettingsCard
        title="Join the Discord"
        meta={<CardMeta items={["Community, support, beta notes and launch updates"]} />}
      >
        <a
          href={FITNESS_DISCORD_INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={getAppButtonClassName({ variant: "secondary", fullWidth: true, className: "min-h-11" })}
        >
          Join Fawxzzy Fitness Discord
        </a>
      </SettingsCard>

      <SettingsCard
        title="One-time key"
        meta={<CardMeta items={[expiryLabel ? `Expires ${expiryLabel}` : "Use Generate to create a key"]} />}
      >
        <FormField label="Discord verification token" className="w-full">
          {(control) => (
            <input
              {...control}
              type="text"
              value={token ?? ""}
              readOnly
              className={cn(formFieldControlClassName, "text-center font-semibold tracking-[0.14em]")}
            />
          )}
        </FormField>
        <div className="grid grid-cols-2 gap-2">
          <AppButton
            type="button"
            variant={copyLabel === "Copied" ? "primary" : "secondary"}
            fullWidth
            onClick={() => void copyToken()}
            disabled={!token}
          >
            {copyLabel}
          </AppButton>
          <AppButton
            type="button"
            variant={token ? "secondary" : "primary"}
            fullWidth
            onClick={generateToken}
            disabled={!isOnline}
            loading={isGenerating}
          >
            Generate
          </AppButton>
        </div>
        {!isOnline ? (
          <p className="m-0 text-xs leading-snug text-[rgb(var(--text-secondary)/0.95)]" role="status">
            You are offline. Reconnect to generate a key.
          </p>
        ) : null}
      </SettingsCard>
    </div>
  );
}

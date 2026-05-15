"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { useToast } from "@/components/ui/ToastProvider";
import { appTokens } from "@/components/ui/app/tokens";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { cn } from "@/lib/cn";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [isGenerating, startGenerateTransition] = useTransition();
  const toast = useToast();

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
      setErrorMessage(null);
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
          setErrorMessage(nextError);
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
        setErrorMessage(nextError);
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
    <section className="space-y-3 border-t border-[rgb(var(--border-strong)/0.12)] pt-3">
      <div className={appTokens.settingsBlockStack}>
        <div className="space-y-1">
          <h3 className={cn(appTokens.settingsSectionTitle, "text-left")}>Discord Access</h3>
          <p className={appTokens.settingsBodyText}>
            Generate a short-lived one-time token to verify your Fitness account in the Discord server.
          </p>
        </div>
      </div>

      {token ? (
        <div className="space-y-3">
          <LabeledEditorField label="Verification token">
            <div className="relative">
              <input
                type="text"
                value={token}
                readOnly
                aria-label="Discord verification token"
                className={cn(
                  labeledEditorFieldControlClassName,
                  "h-12 pr-24 pl-4 py-3 font-semibold tracking-[0.14em] !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
                )}
              />
              <button
                type="button"
                onClick={() => void copyToken()}
                className={getAppButtonClassName({
                  variant: copyLabel === "Copied" ? "secondary" : "tertiary",
                  size: "sm",
                  className: "absolute right-2 top-1/2 min-h-[2.1rem] -translate-y-1/2 px-3 text-xs",
                })}
              >
                {copyLabel}
              </button>
            </div>
          </LabeledEditorField>

          <div className={appTokens.settingsStatusStack}>
            {expiryLabel ? (
              <p className={appTokens.settingsStatusMuted}>
                Expires at {expiryLabel}. Tokens can only be used once.
              </p>
            ) : (
              <p className={appTokens.settingsStatusMuted}>Tokens can only be used once.</p>
            )}
            <div className={appTokens.settingsActionRow}>
              <button
                type="button"
                onClick={generateToken}
                disabled={isGenerating}
                className={getAppButtonClassName({
                  variant: "secondary",
                  size: "sm",
                  className: "px-4",
                })}
              >
                {isGenerating ? "Generating..." : "Generate new token"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <LabeledEditorField label="Verification token">
            <input
              type="text"
              value=""
              readOnly
              placeholder="No token generated yet"
              aria-label="Discord verification token"
              className={cn(
                labeledEditorFieldControlClassName,
                "h-12 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
              )}
            />
          </LabeledEditorField>

          <div className={appTokens.settingsActionRow}>
            <button
              type="button"
              onClick={generateToken}
              disabled={isGenerating}
              className={getAppButtonClassName({
                variant: "primary",
                size: "sm",
                className: "px-4",
              })}
            >
              {isGenerating ? "Generating..." : "Generate token"}
            </button>
          </div>
        </div>
      )}

      {errorMessage ? <p className={appTokens.settingsStatusError}>{errorMessage}</p> : null}
    </section>
  );
}

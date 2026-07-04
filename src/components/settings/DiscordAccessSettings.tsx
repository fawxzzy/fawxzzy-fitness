"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { useToast } from "@/components/ui/ToastProvider";
import { cn } from "@/lib/cn";

const FITNESS_DISCORD_INVITE_URL = "https://discord.gg/tnnV7BNJ7h";

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
    <>
      <PublishBottomActions>
        <BottomActionSplit
          secondary={(
            <BottomDockButton
              type="button"
              intent={copyLabel === "Copied" ? "toggleActive" : "info"}
              onClick={() => void copyToken()}
              disabled={!token}
            >
              {copyLabel}
            </BottomDockButton>
          )}
          primary={(
            <BottomDockButton
              type="button"
              intent={token ? "info" : "positive"}
              onClick={generateToken}
              disabled={isGenerating}
              loading={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </BottomDockButton>
          )}
        />
      </PublishBottomActions>

      <div className="space-y-4 pt-2">
        <div className="mx-auto flex max-w-[22rem] flex-col items-center gap-2 text-center">
          <a
            href={FITNESS_DISCORD_INVITE_URL}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex w-full flex-col items-center rounded-[calc(var(--radius-lg)-0.18rem)] bg-[rgb(var(--surface-2-rgb)/0.12)] px-4 py-3 transition hover:bg-[rgb(var(--surface-2-rgb)/0.18)]"
          >
            <span className="text-sm font-semibold text-[rgb(var(--accent)/0.96)] transition group-hover:text-[rgb(var(--text-primary)/0.98)]">
              Join Fawxzzy Fitness Discord
            </span>
            <MetricAccentBar variant="thin" className="mt-1 w-full max-w-[12rem] opacity-85" />
            <span className="mt-1 text-[11px] leading-4 text-[rgb(var(--text-secondary)/0.78)]">
              Community, support, beta notes, and launch updates.
            </span>
          </a>
        </div>

        <div className="mx-auto max-w-[22rem]">
          <input
            type="text"
            value={token ?? ""}
            readOnly
            aria-label="Discord verification token"
            className={cn(
              labeledEditorFieldControlClassName,
              "h-12 px-4 py-3 text-center font-semibold tracking-[0.14em] !border-0 !bg-transparent !shadow-none placeholder:text-[rgb(var(--text-muted)/0.58)] focus-visible:!border-0 focus-visible:!ring-0",
            )}
          />
        </div>

        <div className="mx-auto flex max-w-[22rem] flex-col items-center gap-1.5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.88)]">
            {expiryLabel ? `Generate One-Time Key | ${expiryLabel}` : "Generate One-Time Key"}
          </p>
          <MetricAccentBar variant="thin" className="w-full opacity-85" />
          {errorMessage ? (
            <p className="text-xs leading-5 text-[rgb(var(--danger-rgb)/0.92)]">{errorMessage}</p>
          ) : null}
        </div>
      </div>
    </>
  );
}

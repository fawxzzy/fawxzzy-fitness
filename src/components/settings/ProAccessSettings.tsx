"use client";

import { useTransition } from "react";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { LegalInlineLinks } from "@/components/legal/LegalInlineLinks";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import type { ProAccessSnapshot } from "@/lib/billing/pro-access-snapshot";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/ToastProvider";

function formatGrantedAt(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function getPurchaseStatusLabel(status: ProAccessSnapshot["lastPurchaseStatus"]) {
  switch (status) {
    case "completed":
      return "Completed";
    case "pending":
      return "Pending";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Failed";
    default:
      return "No purchase yet";
  }
}

export function ProAccessSettings({
  snapshot,
  billingNotice = null,
}: {
  snapshot: ProAccessSnapshot;
  billingNotice?: "success" | "cancel" | null;
}) {
  const [isStartingCheckout, startCheckoutTransition] = useTransition();
  const toast = useToast();
  const grantedAtLabel = formatGrantedAt(snapshot.grantedAt);
  const badgeTone = snapshot.accessState === "lifetime_pro" ? "success" : "default";
  const setupTone = snapshot.checkoutConfigured ? "success" : "warning";
  const canStartCheckout = snapshot.schemaReady && snapshot.checkoutConfigured && snapshot.accessState !== "lifetime_pro";

  const startCheckout = () => {
    if (!canStartCheckout) {
      return;
    }

    startCheckoutTransition(async () => {
      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await response.json().catch(() => ({ ok: false, error: "Unable to start the Lifetime Pro checkout." })) as {
          ok?: boolean;
          url?: string;
          error?: string;
        };

        if (!response.ok || !result.ok || typeof result.url !== "string" || result.url.length === 0) {
          throw new Error(typeof result.error === "string" ? result.error : "Unable to start the Lifetime Pro checkout.");
        }

        window.location.assign(result.url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to start the Lifetime Pro checkout.", {
          id: "billing-checkout-start-error",
        });
      }
    });
  };

  return (
    <>
      <PublishBottomActions>
        <BottomDockButton
          type="button"
          intent={canStartCheckout ? "positive" : "info"}
          onClick={startCheckout}
          disabled={!canStartCheckout}
          loading={isStartingCheckout}
        >
          Upgrade to Pro
        </BottomDockButton>
      </PublishBottomActions>

      <div className="space-y-4 pt-2">
        <div className="relative -mx-5 overflow-hidden rounded-[var(--radius-lg)] border border-transparent bg-transparent shadow-none">
          <div className="relative space-y-4 p-4 sm:p-5">
            <div className="mx-auto flex max-w-[24rem] flex-col items-center gap-1.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.88)]">
                Pro Access
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <AppBadge tone={badgeTone}>{snapshot.accessLabel}</AppBadge>
                <AppBadge tone={setupTone}>{snapshot.offerLabel}</AppBadge>
              </div>
              <MetricAccentBar variant="thin" className="w-full opacity-85" />
              {billingNotice === "success" ? (
                <p className="text-xs leading-5 text-[rgb(var(--success-text-rgb)/0.92)]">
                  Checkout returned successfully. Pro access may take a moment to reflect after billing verification completes.
                </p>
              ) : null}
              {billingNotice === "cancel" ? (
                <p className="text-xs leading-5 text-[rgb(var(--text-secondary)/0.88)]">
                  Checkout was cancelled. Your account remains on the current access tier.
                </p>
              ) : null}
              <p className="text-sm leading-6 text-[rgb(var(--text-secondary)/0.9)]">
                {snapshot.supportNote}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[calc(var(--radius-lg)-0.2rem)] border border-[rgb(var(--border-rgb)/0.42)] bg-[rgb(var(--surface-2-rgb)/0.14)] px-4 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.82)]">
                  Status
                </p>
                <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary)/0.98)]">
                  {snapshot.accessLabel}
                </p>
              </div>
              <div className="rounded-[calc(var(--radius-lg)-0.2rem)] border border-[rgb(var(--border-rgb)/0.42)] bg-[rgb(var(--surface-2-rgb)/0.14)] px-4 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.82)]">
                  Checkout
                </p>
                <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary)/0.98)]">
                  {snapshot.checkoutConfigured ? "Configured" : "Not ready"}
                </p>
              </div>
              <div className="rounded-[calc(var(--radius-lg)-0.2rem)] border border-[rgb(var(--border-rgb)/0.42)] bg-[rgb(var(--surface-2-rgb)/0.14)] px-4 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.82)]">
                  Last Purchase
                </p>
                <p className="mt-2 text-sm font-semibold text-[rgb(var(--text-primary)/0.98)]">
                  {getPurchaseStatusLabel(snapshot.lastPurchaseStatus)}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-center">
              {grantedAtLabel ? (
                <p className="text-xs leading-5 text-[rgb(var(--text-secondary)/0.88)]">
                  Lifetime Pro granted on <span className="font-semibold text-[rgb(var(--text-primary)/0.96)]">{grantedAtLabel}</span>.
                </p>
              ) : null}
              {!snapshot.schemaReady ? (
                <p className="text-xs leading-5 text-[rgb(var(--text-secondary)/0.82)]">
                  Billing schema is still missing on this runtime, so this surface is currently operating in fallback mode.
                </p>
              ) : null}
              <p
                className={cn(
                  "text-xs leading-5",
                  snapshot.checkoutConfigured
                    ? "text-[rgb(var(--success-text-rgb)/0.9)]"
                    : "text-[rgb(var(--text-secondary)/0.82)]",
                )}
              >
                {snapshot.checkoutConfigured
                  ? "Stripe configuration and hosted checkout wiring are active on this surface."
                  : "Add Stripe keys and Lifetime Pro price ids to unlock the hosted checkout slice."}
              </p>
              <div className="pt-1">
                <p className="text-[11px] leading-5 text-[rgb(var(--text-secondary)/0.82)]">
                  By continuing to checkout, review the legal terms for accounts, workout data, and payment handling.
                </p>
                <LegalInlineLinks
                  className="mt-1"
                  linkClassName="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent)/0.96)]"
                  separatorClassName="text-[rgb(var(--text-muted)/0.58)]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useTransition } from "react";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { LegalInlineLinks } from "@/components/legal/LegalInlineLinks";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { appTokens } from "@/components/ui/app/tokens";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import type { ProAccessSnapshot } from "@/lib/billing/pro-access-snapshot";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/ToastProvider";

const proFooterBodyTextClassName = "text-[11px] leading-4 text-[rgb(var(--text-secondary)/0.9)]";
const proFooterBodyStrongClassName = "font-semibold text-[rgb(var(--text-primary)/0.96)]";
const proFooterMiniLabelClassName = "text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.78)]";

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

function formatBillingBadgeDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function getProHeroSummary(snapshot: ProAccessSnapshot) {
  if (snapshot.accessState === "pro") {
    return snapshot.accessSource === "subscription"
      ? snapshot.cancellationScheduledFor
        ? `Subscription ends ${formatBillingBadgeDate(snapshot.cancellationScheduledFor) ?? "soon"}`
        : "Monthly subscription active"
      : "Pro access active";
  }

  return snapshot.checkoutConfigured ? "Monthly Pro available" : "Checkout not ready";
}

function ProStatusTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1 py-0.5 text-center">
      <div className="flex flex-col items-center gap-1">
        <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-[rgb(var(--text-secondary)/0.8)]">
          {label}
        </p>
        <MetricAccentBar variant="thin" className="w-full min-w-[2.2rem] opacity-80" />
      </div>
      <p className="text-[12px] font-semibold leading-4 text-[rgb(var(--text-primary)/0.98)]">
        {value}
      </p>
    </div>
  );
}

function getCurrentPlanLabel(snapshot: ProAccessSnapshot) {
  if (snapshot.accessState !== "pro") {
    return "Free";
  }

  return snapshot.accessSource === "subscription" ? "Pro active" : "Legacy Pro";
}

function getBillingStateLabel(snapshot: ProAccessSnapshot) {
  if (snapshot.accessSource === "subscription") {
    return "$5/month";
  }

  return snapshot.accessState === "pro" ? "Included" : "$5/month";
}

function getAccessStateLabel(snapshot: ProAccessSnapshot) {
  if (snapshot.accessState !== "pro") {
    return snapshot.checkoutConfigured ? "Ready to subscribe" : "Checkout unavailable";
  }

  if (snapshot.accessSource === "subscription") {
    return snapshot.cancellationScheduledFor ? "Cancels at period end" : "Renews monthly";
  }

  return "Access active";
}

function SettingsFooterNote({
  children,
  bodyClassName,
}: {
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className="rounded-[calc(var(--radius-lg)-0.18rem)] bg-[rgb(var(--surface-2-rgb)/0.12)] px-4 py-3">
      <div className={cn("space-y-1.5", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}

function getProHeroDescription(snapshot: ProAccessSnapshot) {
  if (snapshot.accessState === "free") {
    return "Subscribe for $5/month. Renews monthly until cancelled, and payments are processed by Stripe.";
  }

  if (snapshot.accessSource === "subscription") {
    return snapshot.cancellationScheduledFor ? "" : "Your monthly subscription is active. It renews monthly until cancelled.";
  }

  return "This account already has active Pro access.";
}

export function ProAccessSettings({
  snapshot,
  billingNotice = null,
}: {
  snapshot: ProAccessSnapshot;
  billingNotice?: "success" | "cancel" | null;
}) {
  const [isSubmitting, startActionTransition] = useTransition();
  const toast = useToast();
  const grantedAtLabel = formatGrantedAt(snapshot.grantedAt);
  const renewsAtLabel = formatGrantedAt(snapshot.renewsAt);
  const cancellationScheduledForLabel = formatGrantedAt(snapshot.cancellationScheduledFor);
  const canStartCheckout = snapshot.schemaReady && snapshot.checkoutConfigured && snapshot.accessState === "free";
  const canManageBilling =
    snapshot.accessState === "pro"
    && snapshot.accessSource === "subscription"
    && snapshot.customerPortalAvailable;
  const buttonLabel = canManageBilling
    ? "Manage Billing"
    : snapshot.accessState === "pro"
      ? snapshot.accessSource === "subscription"
        ? "Pro Active"
        : "Legacy Pro Active"
      : "Upgrade to Pro";
  const buttonIntent = canManageBilling || canStartCheckout ? "positive" : "info";
  const heroSummary = getProHeroSummary(snapshot);

  const startAction = () => {
    if (!canStartCheckout && !canManageBilling) {
      return;
    }

    startActionTransition(async () => {
      try {
        const response = await fetch(canManageBilling ? "/api/billing/portal" : "/api/billing/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await response.json().catch(() => ({
          ok: false,
          error: canManageBilling
            ? "Unable to open the billing portal."
            : "Unable to start the Monthly Pro checkout.",
        })) as {
          ok?: boolean;
          url?: string;
          error?: string;
        };

        if (!response.ok || !result.ok || typeof result.url !== "string" || result.url.length === 0) {
          throw new Error(
            typeof result.error === "string"
              ? result.error
              : canManageBilling
                ? "Unable to open the billing portal."
                : "Unable to start the Monthly Pro checkout.",
          );
        }

        window.location.assign(result.url);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : canManageBilling
              ? "Unable to open the billing portal."
              : "Unable to start the Monthly Pro checkout.",
          {
            id: canManageBilling ? "billing-portal-open-error" : "billing-checkout-start-error",
          },
        );
      }
    });
  };

  return (
    <>
      <PublishBottomActions>
        <BottomDockButton
          type="button"
          intent={buttonIntent}
          onClick={startAction}
          disabled={!canStartCheckout && !canManageBilling}
          loading={isSubmitting}
        >
          {buttonLabel}
        </BottomDockButton>
      </PublishBottomActions>

      <div className="space-y-2 pt-0">
        <div className="relative -mx-5 overflow-hidden rounded-[var(--radius-lg)] border border-transparent bg-transparent shadow-none">
          <div className="relative space-y-3 px-4 pb-4 pt-2 sm:px-5 sm:pb-5 sm:pt-2">
            <div className={cn(appTokens.settingsCardHeader, "gap-2 text-center")}>
              <AppBadge
                tone={snapshot.accessState === "pro" ? "success" : snapshot.checkoutConfigured ? "warning" : "default"}
                className="px-4 py-1.5"
              >
                {heroSummary}
              </AppBadge>
              {getProHeroDescription(snapshot) ? (
                <div className="mx-auto max-w-[28rem] space-y-1">
                  <p className="text-[11px] leading-4.5 text-[rgb(var(--text-secondary)/0.84)]">
                    {getProHeroDescription(snapshot)}
                  </p>
                </div>
              ) : null}
              {billingNotice === "success" ? (
                <p className="text-xs leading-5 text-[rgb(var(--success-text-rgb)/0.92)]">
                  {snapshot.accessState === "pro"
                    ? "Checkout returned successfully and Pro is now active on this account."
                    : "Checkout returned successfully. Pro access may take a moment to reflect after billing verification completes."}
                </p>
              ) : null}
              {billingNotice === "cancel" ? (
                <p className="text-xs leading-5 text-[rgb(var(--text-secondary)/0.88)]">
                  Checkout was cancelled. Your account remains on the current access tier.
                </p>
              ) : null}
            </div>

            <div className="mx-auto grid w-full max-w-[23rem] grid-cols-3 items-start gap-2 rounded-[calc(var(--radius-lg)-0.28rem)] bg-[rgb(var(--surface-2-rgb)/0.1)] px-2 py-2">
              <ProStatusTile label="Plan" value={getCurrentPlanLabel(snapshot)} />
              <ProStatusTile label="Billing" value={getBillingStateLabel(snapshot)} />
              <ProStatusTile label="Status" value={getAccessStateLabel(snapshot)} />
            </div>

            <div className={cn(appTokens.settingsBlockStack, "gap-3 pb-24")}>
              <SettingsFooterNote bodyClassName="text-[10.5px] leading-4.5">
                <div className="grid grid-cols-2 gap-3 text-center">
                  {grantedAtLabel ? (
                    <div className="space-y-0.5">
                      <p className={proFooterMiniLabelClassName}>Purchase date</p>
                      <p className={proFooterBodyTextClassName}>
                        <span className={proFooterBodyStrongClassName}>{grantedAtLabel}</span>
                      </p>
                    </div>
                  ) : null}
                  {renewsAtLabel ? (
                    <div className="space-y-0.5">
                      <p className={proFooterMiniLabelClassName}>
                        {snapshot.cancellationScheduledFor ? "Current access ends" : "Renewal date"}
                      </p>
                      <p className={proFooterBodyTextClassName}>
                        <span className={proFooterBodyStrongClassName}>{renewsAtLabel}</span>
                      </p>
                    </div>
                  ) : null}
                </div>
                {cancellationScheduledForLabel && cancellationScheduledForLabel !== renewsAtLabel ? (
                  <p className={cn(proFooterBodyTextClassName, "text-center")}>
                    Stripe cancellation date:{" "}
                    <span className={proFooterBodyStrongClassName}>{cancellationScheduledForLabel}</span>.
                  </p>
                ) : null}
                {!snapshot.schemaReady ? (
                  <p className={cn(appTokens.settingsStatusMuted, "text-center")}>
                    Billing schema is still missing on this runtime, so this surface is currently operating in fallback mode.
                  </p>
                ) : null}
              </SettingsFooterNote>

              <p className="text-center text-[11px] leading-4.5 text-[rgb(var(--text-secondary)/0.82)]">
                By subscribing, you agree to the Terms of Service and acknowledge the Privacy Policy.
              </p>

              <LegalInlineLinks
                className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.35rem)] z-30 mx-auto flex w-full max-w-[26rem] flex-nowrap justify-center rounded-full bg-[rgb(var(--app-bg)/0.78)] px-3 py-2 text-center shadow-[0_0_22px_rgb(var(--accent)/0.12)] backdrop-blur-md"
                returnTo="/settings?section=pro"
                linkClassName="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--accent)/0.96)] sm:text-[11px] sm:tracking-[0.12em]"
                separatorClassName="text-[rgb(var(--text-muted)/0.58)]"
              />

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

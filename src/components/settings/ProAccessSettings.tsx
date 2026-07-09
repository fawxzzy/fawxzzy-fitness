"use client";

import { useTransition } from "react";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { LegalInlineLinks } from "@/components/legal/LegalInlineLinks";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import type { ProAccessSnapshot } from "@/lib/billing/pro-access-snapshot";
import { cn } from "@/lib/cn";
import { FITNESS_SUPPORT_EMAIL } from "@/lib/legal-documents";
import { useToast } from "@/components/ui/ToastProvider";

const proFooterBodyTextClassName = "text-[11px] leading-4 text-[rgb(var(--text-secondary)/0.9)]";
const proFooterBodyStrongClassName = "font-semibold text-[rgb(var(--text-primary)/0.96)]";
const proHeaderDateLabelClassName = "text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-secondary)/0.8)]";

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
    <div className="flex min-w-0 flex-col items-center gap-0.5 px-1 py-0.5 text-center">
      <div className="flex flex-col items-center gap-0.5">
        <p className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[rgb(var(--text-secondary)/0.82)]">
          {label}
        </p>
        <MetricAccentBar variant="thin" className="w-full min-w-[2.2rem] opacity-80" />
      </div>
      <p className="text-[13px] font-semibold leading-4 text-[rgb(var(--text-primary)/0.98)]">
        {value}
      </p>
    </div>
  );
}

function DatePipe() {
  return (
    <SignatureMiniPipe
      className="mx-0.5 h-[0.88em] w-[0.34rem]"
      barClassName="w-[2px] shadow-[0_0_9px_rgb(var(--accent-divider-rgb)/0.45)]"
    />
  );
}

function getCurrentPlanLabel(snapshot: ProAccessSnapshot) {
  if (snapshot.accessState !== "pro") {
    return "Free";
  }

  return snapshot.accessSource === "subscription" ? "Pro active" : "Included Pro";
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

  return "";
}

function getProValueSummary(snapshot: ProAccessSnapshot) {
  const items = [
    {
      title: "Routine capacity",
      description: snapshot.accessState === "pro"
        ? "Pro keeps routine creation unlimited while access is active."
        : "Base includes up to 3 routines. Extra routines stay hidden and locked until Pro is restored.",
    },
    {
      title: "Saved workout plans",
      description: snapshot.accessState === "pro"
        ? "Pro keeps saved workout plan creation unlimited while access is active."
        : "Base includes up to 14 saved workout plans. Extra saved plans stay hidden and locked until Pro is restored.",
    },
  ];

  if (snapshot.accessState === "free") {
    return {
      title: "Pro unlocks",
      items,
    };
  }

  return {
    title: "Unlocked now",
    items,
  };
}

function ProFeatureList({
  title,
  items,
  active,
}: {
  title: string;
  items: Array<{
    title: string;
    description: string;
  }>;
  active: boolean;
}) {
  return (
    <div className="mx-auto mt-3 w-full max-w-[24rem] rounded-[calc(var(--radius-lg)-0.32rem)] bg-[linear-gradient(135deg,rgb(var(--surface-2-rgb)/0.16),rgb(var(--surface-1-rgb)/0.08))] px-4 py-3 text-center shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.08),0_0_20px_rgb(var(--accent)/0.07)]">
      <div className="mb-2 inline-flex flex-col items-center gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent)/0.92)]">
          {title}
        </p>
        <MetricAccentBar variant="thin" className="w-full min-w-[3.4rem] opacity-80" />
      </div>
      <div className="space-y-2 text-left">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-[calc(var(--radius-md)-0.18rem)] bg-[rgb(var(--app-bg)/0.28)] px-3 py-2 shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.07)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11.5px] font-semibold leading-4 text-[rgb(var(--text-primary)/0.96)]">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[10.5px] leading-4 text-[rgb(var(--text-secondary)/0.78)]">
                  {item.description}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-[0.12em]",
                  active
                    ? "bg-[rgb(var(--success-rgb)/0.14)] text-[rgb(var(--success-text-rgb)/0.95)]"
                    : "bg-[rgb(var(--warning-rgb)/0.12)] text-[rgb(var(--warning-text-rgb)/0.92)]",
                )}
              >
                {active ? "Active" : "Locked"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
        : "Included Pro Active"
      : "Upgrade to Pro";
  const buttonIntent = canManageBilling || canStartCheckout ? "positive" : "info";
  const heroSummary = getProHeroSummary(snapshot);
  const featureSummary = getProValueSummary(snapshot);
  const hasBillingDates = Boolean(grantedAtLabel || renewsAtLabel);
  const hasSecondaryBillingNote = Boolean(
    (cancellationScheduledForLabel && cancellationScheduledForLabel !== renewsAtLabel) || !snapshot.schemaReady,
  );

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

      <div className="pt-0">
        <div className="relative -mx-5 overflow-visible rounded-[var(--radius-lg)] border border-transparent bg-transparent shadow-none">
          <div className="relative flex min-h-[calc(100dvh-14.5rem)] flex-col px-4 pb-2 pt-0 sm:min-h-[calc(100dvh-13rem)] sm:px-5 sm:pb-3">
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
              {hasBillingDates ? (
                <div className="mx-auto mt-3 flex max-w-[28rem] flex-col items-center justify-center gap-1.5 text-center text-[11.5px] leading-5">
                  {grantedAtLabel ? (
                    <span className="inline-flex items-baseline gap-1.5">
                      <span className={proFooterBodyStrongClassName}>{grantedAtLabel}</span>
                      <DatePipe />
                      <span className={proHeaderDateLabelClassName}>Purchase date</span>
                    </span>
                  ) : null}
                  {renewsAtLabel ? (
                    <span className="inline-flex items-baseline gap-1.5">
                      <span className={proFooterBodyStrongClassName}>{renewsAtLabel}</span>
                      <DatePipe />
                      <span className={proHeaderDateLabelClassName}>
                        {snapshot.cancellationScheduledFor ? "Current access ends" : "Renewal date"}
                      </span>
                    </span>
                  ) : null}
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

            <div className="mt-7 flex items-center justify-center py-1.5 sm:mt-8">
              <div className="mx-auto grid w-full max-w-[21.5rem] grid-cols-3 items-start gap-2 rounded-full bg-[rgb(var(--surface-2-rgb)/0.08)] px-3 py-2 shadow-[0_0_18px_rgb(var(--accent)/0.08)]">
                <ProStatusTile label="Plan" value={getCurrentPlanLabel(snapshot)} />
                <ProStatusTile label="Billing" value={getBillingStateLabel(snapshot)} />
                <ProStatusTile label="Status" value={getAccessStateLabel(snapshot)} />
              </div>
            </div>

            <ProFeatureList
              title={featureSummary.title}
              items={featureSummary.items}
              active={snapshot.accessState === "pro"}
            />

            {hasSecondaryBillingNote ? (
            <div className={cn(appTokens.settingsBlockStack, "mt-3 gap-3")}>
              <SettingsFooterNote bodyClassName="text-[10.5px] leading-4.5">
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
            </div>
            ) : null}

            <div
              className={cn(
                "z-30 mt-auto space-y-2 rounded-[calc(var(--radius-lg)-0.25rem)] bg-[rgb(var(--app-bg)/0.78)] px-3 py-2.5 text-center shadow-[0_0_22px_rgb(var(--accent)/0.12)] backdrop-blur-md",
                "mb-[calc(env(safe-area-inset-bottom)+4.95rem)]",
              )}
            >
              <p className="text-center text-[11px] leading-4.5 text-[rgb(var(--text-secondary)/0.82)]">
                By subscribing, you agree to the Terms of Service and acknowledge the Privacy Policy.
              </p>

              <p className="inline-flex w-full flex-wrap items-center justify-center gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-secondary)/0.78)]">
                <span>Support</span>
                <SignatureMiniPipe className="align-middle" />
                <a
                  className="text-[rgb(var(--accent)/0.96)] underline-offset-4 hover:underline"
                  href={`mailto:${FITNESS_SUPPORT_EMAIL}`}
                >
                  {FITNESS_SUPPORT_EMAIL}
                </a>
              </p>

              <LegalInlineLinks
                className="mx-auto flex w-full max-w-[26rem] flex-nowrap justify-center text-center"
                returnTo="/settings?section=pro"
                linkClassName="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--accent)/0.96)] sm:text-[11px] sm:tracking-[0.12em]"
                separator={<SignatureMiniPipe className="mx-1.5 align-middle" />}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

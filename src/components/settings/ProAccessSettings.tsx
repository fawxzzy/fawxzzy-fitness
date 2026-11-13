"use client";

import { useTransition } from "react";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { LegalInlineLinks } from "@/components/legal/LegalInlineLinks";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { CardChip, CardMeta, CardNotice, StatBlock } from "@/components/ui/card-system";
import type { ProAccessSnapshot } from "@/lib/billing/pro-access-snapshot";
import { FITNESS_SUPPORT_EMAIL } from "@/lib/legal-documents";
import { useToast } from "@/components/ui/ToastProvider";

const LEGAL_LINK_CLASS_NAME =
  "inline-flex min-h-11 items-center text-xs font-semibold text-[rgb(var(--accent)/0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.5)]";

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
  const heroDescription = getProHeroDescription(snapshot);
  const featureSummary = getProValueSummary(snapshot);
  const isPro = snapshot.accessState === "pro";
  const showCancellationNote = Boolean(cancellationScheduledForLabel && cancellationScheduledForLabel !== renewsAtLabel);

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

      <div className="space-y-3">
        {billingNotice === "success" ? (
          <CardNotice>
            {isPro
              ? "Checkout returned successfully and Pro is now active on this account."
              : "Checkout returned successfully. Pro access may take a moment to reflect after billing verification completes."}
          </CardNotice>
        ) : null}
        {billingNotice === "cancel" ? (
          <CardNotice>Checkout was cancelled. Your account remains on the current access tier.</CardNotice>
        ) : null}

        <SettingsCard
          title={heroSummary}
          tone={isPro ? "current" : "neutral"}
          meta={(
            <CardMeta
              items={[
                grantedAtLabel ? `Purchase date: ${grantedAtLabel}` : "",
                renewsAtLabel ? `${snapshot.cancellationScheduledFor ? "Current access ends" : "Renewal date"}: ${renewsAtLabel}` : "",
              ]}
            />
          )}
        >
          {heroDescription ? (
            <p className="m-0 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]">{heroDescription}</p>
          ) : null}
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-3">
            <StatBlock label="Plan" values={[getCurrentPlanLabel(snapshot)]} />
            <StatBlock label="Billing" values={[getBillingStateLabel(snapshot)]} />
            <StatBlock label="Status" values={[getAccessStateLabel(snapshot)]} />
          </div>
        </SettingsCard>

        <SettingsCard title={featureSummary.title}>
          <ul className="m-0 grid list-none gap-0 divide-y divide-[rgb(var(--border-strong)/0.14)] p-0">
            {featureSummary.items.map((item) => (
              <li key={item.title} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold leading-snug text-[rgb(var(--text-primary))]">{item.title}</p>
                  <p className="m-0 mt-0.5 text-xs leading-snug text-[rgb(var(--text-secondary)/0.95)]">{item.description}</p>
                </div>
                <CardChip tone={isPro ? "success" : "attention"} className="shrink-0">{isPro ? "Active" : "Locked"}</CardChip>
              </li>
            ))}
          </ul>
        </SettingsCard>

        {showCancellationNote ? (
          <CardNotice>Stripe cancellation date: {cancellationScheduledForLabel}.</CardNotice>
        ) : null}
        {!snapshot.schemaReady ? (
          <CardNotice tone="attention">Billing is not fully set up on this server yet, so some details may be missing.</CardNotice>
        ) : null}

        <SettingsCard title="Terms and support" bodyClassName="space-y-1">
          <p className="m-0 text-xs leading-snug text-[rgb(var(--text-secondary)/0.95)]">
            By subscribing, you agree to the Terms of Service and acknowledge the Privacy Policy.
          </p>
          <p className="m-0 flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-[rgb(var(--text-secondary)/0.95)]">
            <span>Support</span>
            <SignatureMiniPipe className="align-middle" />
            <a className={`${LEGAL_LINK_CLASS_NAME} underline-offset-4 hover:underline`} href={`mailto:${FITNESS_SUPPORT_EMAIL}`}>
              {FITNESS_SUPPORT_EMAIL}
            </a>
          </p>
          <LegalInlineLinks
            className="flex w-full flex-wrap justify-start"
            returnTo="/settings?section=pro"
            linkClassName={LEGAL_LINK_CLASS_NAME}
            separator={<SignatureMiniPipe className="mx-1.5 align-middle" />}
          />
        </SettingsCard>
      </div>
    </>
  );
}

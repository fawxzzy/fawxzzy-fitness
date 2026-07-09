import "server-only";

import {
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_OPTIONAL,
  STRIPE_PRO_ACTIVE_PRICE_MODE_OPTIONAL,
  STRIPE_PRO_FOUNDING_PRICE_ID_OPTIONAL,
  STRIPE_PRO_STANDARD_PRICE_ID_OPTIONAL,
  STRIPE_SECRET_KEY_OPTIONAL,
  STRIPE_WEBHOOK_SECRET_OPTIONAL,
  PAID_LAUNCH_ENABLED,
} from "@/lib/env";

export type ProPriceMode = "founding" | "standard";

export type StripeBillingConfigSnapshot = {
  secretKeyConfigured: boolean;
  publishableKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  foundingPriceConfigured: boolean;
  standardPriceConfigured: boolean;
  activePriceMode: ProPriceMode | null;
  activePriceId: string | null;
  recurringInterval: "month";
  paidLaunchEnabled: boolean;
  checkoutTechnicallyConfigured: boolean;
  checkoutConfigured: boolean;
};

export function getStripeBillingConfigSnapshot(): StripeBillingConfigSnapshot {
  const secretKey = STRIPE_SECRET_KEY_OPTIONAL();
  const publishableKey = NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_OPTIONAL();
  const webhookSecret = STRIPE_WEBHOOK_SECRET_OPTIONAL();
  const foundingPriceId = STRIPE_PRO_FOUNDING_PRICE_ID_OPTIONAL();
  const standardPriceId = STRIPE_PRO_STANDARD_PRICE_ID_OPTIONAL();
  const requestedMode = STRIPE_PRO_ACTIVE_PRICE_MODE_OPTIONAL();
  const paidLaunchEnabled = PAID_LAUNCH_ENABLED();

  const activePriceMode: ProPriceMode | null =
    requestedMode
    ?? (foundingPriceId ? "founding" : standardPriceId ? "standard" : null);

  const activePriceId =
    activePriceMode === "founding"
      ? foundingPriceId
      : activePriceMode === "standard"
        ? standardPriceId
        : null;

  return {
    secretKeyConfigured: Boolean(secretKey),
    publishableKeyConfigured: Boolean(publishableKey),
    webhookSecretConfigured: Boolean(webhookSecret),
    foundingPriceConfigured: Boolean(foundingPriceId),
    standardPriceConfigured: Boolean(standardPriceId),
    activePriceMode,
    activePriceId: activePriceId ?? null,
    recurringInterval: "month",
    paidLaunchEnabled,
    checkoutTechnicallyConfigured: Boolean(secretKey && publishableKey && activePriceId),
    checkoutConfigured: Boolean(paidLaunchEnabled && secretKey && publishableKey && activePriceId),
  };
}

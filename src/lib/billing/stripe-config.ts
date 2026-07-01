import "server-only";

import {
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_OPTIONAL,
  STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE_OPTIONAL,
  STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID_OPTIONAL,
  STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID_OPTIONAL,
  STRIPE_SECRET_KEY_OPTIONAL,
  STRIPE_WEBHOOK_SECRET_OPTIONAL,
} from "@/lib/env";

export type LifetimeProPriceMode = "founding" | "standard";

export type StripeBillingConfigSnapshot = {
  secretKeyConfigured: boolean;
  publishableKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  foundingPriceConfigured: boolean;
  standardPriceConfigured: boolean;
  activePriceMode: LifetimeProPriceMode | null;
  activePriceId: string | null;
  checkoutConfigured: boolean;
};

export function getStripeBillingConfigSnapshot(): StripeBillingConfigSnapshot {
  const secretKey = STRIPE_SECRET_KEY_OPTIONAL();
  const publishableKey = NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_OPTIONAL();
  const webhookSecret = STRIPE_WEBHOOK_SECRET_OPTIONAL();
  const foundingPriceId = STRIPE_LIFETIME_PRO_FOUNDING_PRICE_ID_OPTIONAL();
  const standardPriceId = STRIPE_LIFETIME_PRO_STANDARD_PRICE_ID_OPTIONAL();
  const requestedMode = STRIPE_LIFETIME_PRO_ACTIVE_PRICE_MODE_OPTIONAL();

  const activePriceMode: LifetimeProPriceMode | null =
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
    checkoutConfigured: Boolean(secretKey && publishableKey && activePriceId),
  };
}

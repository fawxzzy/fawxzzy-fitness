import type Stripe from "stripe";

export type StripeWebhookSecretLabel = "primary" | "test";

export type StripeWebhookSecretCandidate = {
  label: StripeWebhookSecretLabel;
  secret: string | null | undefined;
};

export type StripeWebhookVerificationResult = {
  event: Stripe.Event;
  matchedSecretLabel: StripeWebhookSecretLabel;
};

export class StripeWebhookNotConfiguredError extends Error {
  constructor() {
    super("No Stripe webhook signing secret is configured.");
    this.name = "StripeWebhookNotConfiguredError";
  }
}

function normalizeSecret(secret: string | null | undefined) {
  return typeof secret === "string" && secret.trim().length > 0 ? secret.trim() : null;
}

export function buildStripeWebhookSecretCandidates(args: {
  primarySecret: string | null | undefined;
  testSecret?: string | null | undefined;
}): StripeWebhookSecretCandidate[] {
  const seen = new Set<string>();
  const candidates: StripeWebhookSecretCandidate[] = [];

  for (const candidate of [
    { label: "primary" as const, secret: args.primarySecret },
    { label: "test" as const, secret: args.testSecret },
  ]) {
    const secret = normalizeSecret(candidate.secret);
    if (!secret || seen.has(secret)) {
      continue;
    }

    seen.add(secret);
    candidates.push({
      label: candidate.label,
      secret,
    });
  }

  return candidates;
}

export function constructStripeWebhookEvent(args: {
  rawBody: string;
  secrets: StripeWebhookSecretCandidate[];
  signature: string;
  stripe: Stripe;
}): StripeWebhookVerificationResult {
  const configuredSecrets = args.secrets.filter((candidate): candidate is {
    label: StripeWebhookSecretLabel;
    secret: string;
  } => Boolean(normalizeSecret(candidate.secret)));

  if (configuredSecrets.length === 0) {
    throw new StripeWebhookNotConfiguredError();
  }

  let lastError: unknown = null;

  for (const candidate of configuredSecrets) {
    try {
      return {
        event: args.stripe.webhooks.constructEvent(
          args.rawBody,
          args.signature,
          candidate.secret,
        ),
        matchedSecretLabel: candidate.label,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Stripe webhook signature verification failed.");
}

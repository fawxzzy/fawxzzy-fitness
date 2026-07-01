import "server-only";

import Stripe from "stripe";
import { STRIPE_SECRET_KEY_OPTIONAL } from "@/lib/env";

let stripeServerClient: Stripe | null = null;

export function getStripeServerClient() {
  const secretKey = STRIPE_SECRET_KEY_OPTIONAL();
  if (!secretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  if (!stripeServerClient) {
    stripeServerClient = new Stripe(secretKey);
  }

  return stripeServerClient;
}

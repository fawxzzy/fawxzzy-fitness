import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function normalizeVercelSignature(signature: string | null | undefined): string | null {
  if (typeof signature !== "string") {
    return null;
  }

  const trimmed = signature.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("sha1=") ? trimmed.slice(5) : trimmed;
}

export function computeVercelWebhookSignature(rawBody: string, secret: string): string {
  return createHmac("sha1", secret)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("hex");
}

export function verifyVercelWebhookSignature(args: {
  rawBody: string;
  headerSignature: string | null | undefined;
  secret: string | null | undefined;
}): boolean {
  if (typeof args.secret !== "string" || args.secret.length === 0) {
    return false;
  }

  const normalizedHeaderSignature = normalizeVercelSignature(args.headerSignature);
  if (!normalizedHeaderSignature) {
    return false;
  }

  const expectedSignature = computeVercelWebhookSignature(args.rawBody, args.secret);
  const actualBuffer = Buffer.from(normalizedHeaderSignature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

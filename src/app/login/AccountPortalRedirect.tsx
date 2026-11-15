"use client";

import { useEffect, useState } from "react";
import { AuthLinks, AuthStatusScreen } from "@/components/auth/AuthShell";

/** After this long the hand-off probably stalled (slow network, blocked redirect): offer the link by hand. */
export const ACCOUNT_PORTAL_FALLBACK_MS = 6000;

// Browser tabs sign in on the Fawxzzy account site. This is the one status screen while the page leaves; it never
// becomes a dead end because the same link appears if the redirect has not happened yet.
export function AccountPortalRedirect({ href }: { href: string }) {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    window.location.replace(href);
    const timer = window.setTimeout(() => setShowFallback(true), ACCOUNT_PORTAL_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [href]);

  return (
    <AuthStatusScreen
      testId="account-portal-redirect"
      title="Signing you in…"
      lead="Using your Fawxzzy account."
      working
      action={showFallback ? (
        <AuthLinks>
          <a className="fx-link" href={href} data-testid="account-portal-fallback">Open the sign-in page</a>
        </AuthLinks>
      ) : null}
    />
  );
}

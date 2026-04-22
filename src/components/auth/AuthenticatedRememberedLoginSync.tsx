"use client";

import { useEffect } from "react";
import {
  readRememberedLoginState,
  syncRememberedLoginFromAuthenticatedSession,
} from "@/lib/remembered-login";

export function AuthenticatedRememberedLoginSync({
  displayName,
  email,
}: {
  displayName?: string | null;
  email?: string | null;
}) {
  useEffect(() => {
    if (!email) {
      return;
    }

    const rememberedLogin = readRememberedLoginState();
    syncRememberedLoginFromAuthenticatedSession({
      email,
      displayName: displayName?.trim() || rememberedLogin?.displayName || undefined,
    });
  }, [displayName, email]);

  return null;
}

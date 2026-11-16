"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ACCOUNT_PORTAL_LINK_ATTRIBUTE } from "@/lib/account-portal";

/**
 * Reads the username and email back after a trip to the account portal. Settings and Account are server-rendered on
 * every request (force-dynamic, getUser()), so a fresh render is the read-back:
 * - Back button: the browser may restore this page from its back/forward cache (`pageshow` with `persisted`), which
 *   would show the old identity, so it re-renders.
 * - Portal opened in another tab: when this tab is shown again after a portal link was opened, it re-renders.
 * Coming back through the portal's own return link is a full navigation and is already fresh.
 */
export function AccountPortalReturnRefresh() {
  const router = useRouter();

  useEffect(() => {
    let leftForPortal = false;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest(`[${ACCOUNT_PORTAL_LINK_ATTRIBUTE}]`) : null;
      if (target) {
        leftForPortal = true;
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        leftForPortal = false;
        router.refresh();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && leftForPortal) {
        leftForPortal = false;
        router.refresh();
      }
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}

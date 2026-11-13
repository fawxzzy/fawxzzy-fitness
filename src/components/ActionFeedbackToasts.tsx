"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { resolveSignupRouteMessages, SIGNUP_ROUTE_ERROR_TOAST_ID } from "@/components/auth/signupFeedback";
import { useToast } from "@/components/ui/ToastProvider";

export function ActionFeedbackToasts() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const error = searchParams.get("error");
    // /signup carries allow-listed codes only: it never shows `?success=` text, and `?error=` is resolved to fixed copy.
    const success = pathname === "/signup" ? null : searchParams.get("success");

    if (!error && !success) {
      return;
    }

    if (error && pathname === "/signup") {
      // Never render arbitrary query text here. The signup screen toasts the same fixed copy under the same id.
      const message = resolveSignupRouteMessages({ errorCode: error }).error;
      if (message) {
        toast.error(message, { id: SIGNUP_ROUTE_ERROR_TOAST_ID });
      }
    } else if (error) {
      // The login screen shows its own error toast for ?error=, keyed by this id. Sharing the id makes the two
      // toasts collapse into one instead of rendering the same message twice.
      toast.error(error, pathname === "/login" ? { id: "login-route-error" } : undefined);
    }

    if (success) {
      toast.success(success);
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("error");
    next.delete("success");

    const nextQuery = next.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, toast]);

  return null;
}

"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

// Auth Surface v2: /login, /signup and /reset-password show their allow-listed codes in the screen's one reserved
// notice slot (authMessages.ts), never as a toast, and never show `?success=` text.
const INLINE_NOTICE_ROUTES = new Set(["/login", "/signup"]);

export function ActionFeedbackToasts() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    // /reset-password keeps its query: the page picks the request screen or the form from the code, and a stripped
    // query would re-render the other one.
    if (pathname === "/reset-password") {
      return;
    }
    const inlineNoticeRoute = INLINE_NOTICE_ROUTES.has(pathname);
    const error = searchParams.get("error");
    const success = inlineNoticeRoute ? null : searchParams.get("success");

    if (!error && !success) {
      return;
    }

    // /login and /signup already read the code from their props and show it inline. The query is still cleared so a
    // repeat of the same failure is a new prop value the screen reacts to.
    if (error && !inlineNoticeRoute) {
      toast.error(error);
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

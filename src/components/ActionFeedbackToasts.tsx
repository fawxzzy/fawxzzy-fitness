"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

export function ActionFeedbackToasts() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const error = searchParams.get("error");
    const success = searchParams.get("success");

    if (!error && !success) {
      return;
    }

    if (error) {
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

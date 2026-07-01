import Link from "next/link";
import { cn } from "@/lib/cn";

export function LegalInlineLinks({
  className,
  linkClassName,
  separatorClassName,
}: {
  className?: string;
  linkClassName?: string;
  separatorClassName?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1", className)}>
      <Link href="/privacy" className={cn("underline-offset-4 hover:underline", linkClassName)}>
        Privacy Policy
      </Link>
      <span aria-hidden="true" className={cn("text-[rgb(var(--text-muted)/0.72)]", separatorClassName)}>
        |
      </span>
      <Link href="/terms" className={cn("underline-offset-4 hover:underline", linkClassName)}>
        Terms of Service
      </Link>
    </span>
  );
}

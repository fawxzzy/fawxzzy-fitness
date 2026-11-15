import type { ReactNode } from "react";
import { ScreenBackLink } from "@/components/ui/app/ScreenBackButton";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import {
  FITNESS_DISCORD_INVITE_URL,
  FITNESS_DISCORD_SUPPORT_LABEL,
  FITNESS_PRIVATE_SUPPORT_PATH_LABEL,
  FITNESS_SUPPORT_EMAIL,
  FITNESS_SUPPORT_CONTACT_LABEL,
  FITNESS_SUPPORT_SENSITIVE_INFO_WARNING,
} from "@/lib/legal-documents";

// Legal pages are detail screens (DESIGN-CONTRACT.md section 15): Back on the left, the document name as the
// title, no eyebrow, no accent bar, no decorative grid. The copy below the header is owned by the legal docs.
export function LegalDocumentLayout({
  title,
  lastUpdated,
  children,
  returnTo,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
  returnTo?: string;
}) {
  void lastUpdated;

  const backHref = returnTo && returnTo.startsWith("/") ? returnTo : "/settings";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[rgb(var(--app-bg))] pt-[max(var(--app-safe-top),var(--vv-top,0px))] text-[rgb(var(--text-primary)/0.96)]">
      <ScreenHeader kind="detail" title={title} back={<ScreenBackLink href={backHref} label="Back" />} />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-12 sm:px-6 lg:px-8">
        <section className="px-1 pb-5 sm:px-4 sm:pb-7">
          <div className="mx-auto max-w-3xl space-y-6 text-sm leading-7 text-[rgb(var(--text-secondary)/0.92)] sm:text-[0.98rem]">
            {children}
          </div>

          <footer className="mx-auto mt-8 max-w-3xl px-2 py-3 text-center text-sm leading-6 text-[rgb(var(--text-secondary)/0.88)]">
            <p className="mx-auto max-w-2xl">
              <a
                href={`mailto:${FITNESS_SUPPORT_EMAIL}`}
                className="font-semibold text-[rgb(var(--text-primary)/0.96)] underline-offset-4 hover:text-[rgb(var(--accent)/0.96)] hover:underline"
              >
                {FITNESS_SUPPORT_CONTACT_LABEL}
              </a>
            </p>
            <p className="mx-auto mt-2 max-w-2xl">
              <a
                href={FITNESS_DISCORD_INVITE_URL}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[rgb(var(--text-primary)/0.92)] underline-offset-4 hover:text-[rgb(var(--accent)/0.96)] hover:underline"
              >
                {FITNESS_DISCORD_SUPPORT_LABEL}
              </a>
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-[12px] leading-5 text-[rgb(var(--text-secondary)/0.82)]">
              {FITNESS_SUPPORT_SENSITIVE_INFO_WARNING}
            </p>
            <p className="mx-auto mt-1.5 max-w-2xl text-[12px] leading-5 text-[rgb(var(--text-secondary)/0.82)]">
              {FITNESS_PRIVATE_SUPPORT_PATH_LABEL}
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}

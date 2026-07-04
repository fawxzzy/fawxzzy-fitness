import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { FITNESS_SUPPORT_CONTACT_LABEL } from "@/lib/legal-documents";

export function LegalDocumentLayout({
  eyebrow,
  title,
  lastUpdated,
  children,
  returnTo,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: ReactNode;
  returnTo?: string;
}) {
  void lastUpdated;

  const backHref = returnTo && returnTo.startsWith("/") ? returnTo : "/settings";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[rgb(var(--app-bg))] text-[rgb(var(--text-primary)/0.96)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgb(var(--accent)/0.14),_transparent_45%),linear-gradient(180deg,_rgb(var(--surface-1-rgb)/0.96),_rgb(var(--app-bg))_68%)]" />
        <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "linear-gradient(rgb(var(--border-rgb)/0.14) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--border-rgb)/0.14) 1px, transparent 1px)", backgroundSize: "2.5rem 2.5rem" }} />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:px-8">
        <Link
          href={backHref}
          aria-label="Back"
          className="absolute right-4 top-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgb(var(--accent)/0.38)] bg-[rgb(var(--surface-2-rgb)/0.2)] text-[rgb(var(--accent)/0.96)] shadow-[0_0_18px_rgb(var(--accent)/0.14)] backdrop-blur-md transition hover:border-[rgb(var(--accent)/0.66)] hover:text-[rgb(var(--text-primary)/0.98)] sm:right-6 sm:top-7"
        >
          <ChevronRightIcon className="h-5 w-5 rotate-180" />
        </Link>

        <section className="px-1 py-5 sm:px-4 sm:py-7">
          <header className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--text-secondary)/0.84)]">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[rgb(var(--text-primary)/0.98)] sm:text-[2.05rem]">
              {title}
            </h1>
            <MetricAccentBar variant="thin" className="mx-auto mt-4 w-full max-w-[18rem] opacity-85" />
          </header>

          <div className="mx-auto mt-6 max-w-3xl space-y-6 text-sm leading-7 text-[rgb(var(--text-secondary)/0.92)] sm:text-[0.98rem]">
            {children}
          </div>

          <footer className="mx-auto mt-8 max-w-3xl px-2 py-3 text-center text-sm leading-6 text-[rgb(var(--text-secondary)/0.88)]">
            <p>
              <span className="font-semibold text-[rgb(var(--text-primary)/0.96)]">{FITNESS_SUPPORT_CONTACT_LABEL}</span>
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}

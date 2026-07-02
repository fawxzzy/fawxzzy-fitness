import Link from "next/link";
import type { ReactNode } from "react";
import { LegalInlineLinks } from "@/components/legal/LegalInlineLinks";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import {
  FITNESS_SUPPORT_CONTACT_LABEL,
  LEGAL_NOT_ADVICE_NOTICE,
} from "@/lib/legal-documents";

export function LegalDocumentLayout({
  eyebrow,
  title,
  lastUpdated,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[rgb(var(--app-bg))] text-[rgb(var(--text-primary)/0.96)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgb(var(--accent)/0.14),_transparent_45%),linear-gradient(180deg,_rgb(var(--surface-1-rgb)/0.96),_rgb(var(--app-bg))_68%)]" />
        <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "linear-gradient(rgb(var(--border-rgb)/0.14) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--border-rgb)/0.14) 1px, transparent 1px)", backgroundSize: "2.5rem 2.5rem" }} />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-6 pb-12 sm:px-6 sm:pt-8 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/settings"
            className="inline-flex items-center rounded-full border border-[rgb(var(--border-rgb)/0.42)] bg-[rgb(var(--surface-2-rgb)/0.16)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-secondary)/0.88)] transition hover:border-[rgb(var(--accent)/0.4)] hover:text-[rgb(var(--text-primary)/0.98)]"
          >
            Back
          </Link>
          <LegalInlineLinks
            linkClassName="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent)/0.96)]"
            separatorClassName="text-[rgb(var(--text-muted)/0.58)]"
          />
        </div>

        <section className="rounded-[1.75rem] border border-[rgb(var(--border-rgb)/0.42)] bg-[rgb(var(--surface-2-rgb)/0.18)] px-5 py-5 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-md sm:px-7 sm:py-7">
          <header className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--text-secondary)/0.84)]">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[rgb(var(--text-primary)/0.98)] sm:text-[2.05rem]">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary)/0.86)]">
              Last updated {lastUpdated}
            </p>
            <MetricAccentBar variant="thin" className="mx-auto mt-4 w-full max-w-[18rem] opacity-85" />
          </header>

          <div className="mx-auto mt-6 max-w-3xl space-y-6 text-sm leading-7 text-[rgb(var(--text-secondary)/0.92)] sm:text-[0.98rem]">
            {children}
          </div>

          <footer className="mx-auto mt-8 max-w-3xl rounded-[1.25rem] border border-[rgb(var(--border-rgb)/0.36)] bg-[rgb(var(--surface-3-rgb)/0.16)] px-4 py-4 text-sm leading-6 text-[rgb(var(--text-secondary)/0.88)]">
            <p>
              <span className="font-semibold text-[rgb(var(--text-primary)/0.96)]">{FITNESS_SUPPORT_CONTACT_LABEL}</span>
            </p>
            <p className="mt-2">
              {LEGAL_NOT_ADVICE_NOTICE}
            </p>
          </footer>
        </section>
      </div>
    </main>
  );
}

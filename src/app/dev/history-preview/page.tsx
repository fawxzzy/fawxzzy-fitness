import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getHistoryPreviewLinks,
  HISTORY_PREVIEW_FLAG_ENV,
  HISTORY_PREVIEW_PRIMARY_SESSION_ID,
  isHistoryPreviewEnabledInEnv,
} from "@/lib/history-preview-fixtures";
import { isHistoryPreviewAvailableForRequest, isHistoryPreviewActiveForRequest } from "@/lib/history-preview.server";
import { SignatureInlineList } from "@/components/ui/app/SignatureSeparator";

export const dynamic = "force-dynamic";

export default function DevHistoryPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const previewAvailable = isHistoryPreviewAvailableForRequest();
  const previewActive = isHistoryPreviewActiveForRequest();
  const previewLinks = getHistoryPreviewLinks();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10 text-[rgb(var(--text)/0.98)]">
      <section className="rounded-[1.5rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.88)] px-6 py-5 shadow-[0_18px_40px_rgb(0_0_0/0.18)] backdrop-blur-[10px]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--text-muted)/0.92)]">History QA preview</p>
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.04em]">Deterministic local history lane</h1>
          <p className="text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
            When the local preview flag is enabled, localhost history routes render deterministic preview data directly without needing a live login.
          </p>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.88)] px-6 py-5 shadow-[0_18px_40px_rgb(0_0_0/0.18)] backdrop-blur-[10px]">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-[-0.03em]">Status</h2>
          <p className="text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
            <SignatureInlineList
              items={[
                <>Env flag: <code>{HISTORY_PREVIEW_FLAG_ENV}=1</code></>,
                <>Request host allowed: <strong>{previewAvailable ? "yes" : "no"}</strong></>,
                <>Preview lane active: <strong>{previewActive ? "yes" : "no"}</strong></>,
              ]}
              separator="pipe"
              className="align-middle"
            />
          </p>
          {!isHistoryPreviewEnabledInEnv() ? (
            <p className="text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
              Set <code>{HISTORY_PREVIEW_FLAG_ENV}=1</code> in local env and restart the dev server to enable this lane.
            </p>
          ) : null}
          {isHistoryPreviewEnabledInEnv() && !previewAvailable ? (
            <p className="text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
              The preview gate only activates on <code>localhost</code>, <code>127.0.0.1</code>, or <code>[::1]</code>.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.88)] px-6 py-5 shadow-[0_18px_40px_rgb(0_0_0/0.18)] backdrop-blur-[10px]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-[-0.03em]">Route checks</h2>
          <ul className="space-y-3">
            {previewLinks.map((link) => (
              <li key={link.href} className="rounded-[1.15rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.74)] px-4 py-3">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{link.label}</p>
                  <p className="text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">{link.description}</p>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={link.href}
                      className="inline-flex min-h-[2.75rem] items-center justify-center rounded-[1rem] border border-[rgb(var(--accent)/0.3)] bg-[rgb(var(--accent)/0.14)] px-4 text-sm font-semibold"
                    >
                      Open route
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
            The detail preview uses session id <code>{HISTORY_PREVIEW_PRIMARY_SESSION_ID}</code>.
          </p>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import { ContentRail } from "@/components/layout/ContentRail";
import { APP_BACKDROP_VARIANTS, TODAY_APP_BACKDROP_VARIANT } from "@/lib/ambient/app-backdrop";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

const BACKDROP_NOTES: Record<(typeof APP_BACKDROP_VARIANTS)[number], string> = {
  aurora: "Two soft accent/cyan glows over the base gradient. Calm depth, no shapes.",
  grid: "A faint dot grid that fades out from the top, plus a small top glow.",
  contour: "Thin topographic wave lines that fade toward the bottom.",
};

const FRAMES = [
  ...APP_BACKDROP_VARIANTS.map((variant, index) => ({
    key: variant,
    label: `${String.fromCharCode(65 + index)}. ${variant}${variant === TODAY_APP_BACKDROP_VARIANT ? " (Today default)" : ""}`,
    note: BACKDROP_NOTES[variant],
    backdrop: variant,
  })),
  { key: "ambient", label: "Before: animated ambient scene", note: "The scene Today drew before this change.", backdrop: "ambient" },
];

/**
 * Dev-only comparison of the Today backdrops. Each frame is the live Today screen (/dev/mobile-regression, the
 * same components /today renders, with static fixtures) at 390x844, so the comparison is the real app UI, not a
 * mock. Availability is the shared dev-route guard (see `src/lib/dev-route-guard.ts`); the frames are dev routes too.
 */
export default async function DevTodayBackgroundsPage() {
  await assertDevPageAvailable();

  return (
    <ContentRail className="pb-24 pt-6">
      <div className="grid gap-6">
        <header className="grid gap-1">
          <h1 className="m-0 text-lg font-semibold text-[rgb(var(--text-primary))]">Today backgrounds</h1>
          <p className="m-0 text-sm text-[rgb(var(--text-secondary))]">
            Live Today screen per backdrop. Add <code>&amp;backdrop=a|b|c|ambient</code> to any Today regression URL.
          </p>
        </header>
        {FRAMES.map((frame) => (
          <section key={frame.key} data-today-backdrop-frame={frame.key} className="grid gap-2">
            <h2 className="m-0 text-sm font-semibold text-[rgb(var(--text-primary))]">{frame.label}</h2>
            <p className="m-0 text-xs text-[rgb(var(--text-muted))]">{frame.note}</p>
            <div className="flex flex-wrap gap-3">
              {[
                { key: "day", title: "Day view", src: `/dev/mobile-regression?screen=today&fixture=default&backdrop=${frame.backdrop}` },
                { key: "picker", title: "Switch Day open", src: `/dev/mobile-regression/switch-day?variant=standard&backdrop=${frame.backdrop}` },
              ].map((view) => (
                <iframe
                  key={view.key}
                  title={`${frame.label}: ${view.title}`}
                  src={view.src}
                  loading="lazy"
                  width={390}
                  height={844}
                  className="max-w-full shrink-0 rounded-[1.25rem] border border-[rgb(var(--glass-tint-rgb)/var(--glass-current-border-alpha))] bg-[rgb(var(--bg-0))]"
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </ContentRail>
  );
}

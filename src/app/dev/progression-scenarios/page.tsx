import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import {
  WRITABLE_PROGRESSION_SCENARIO_SUMMARIES,
  buildProgressionScenarioFixtures,
  type ProgressionScenario,
} from "@/lib/progression-scenarios";
import { canAccessQaLlelUi } from "@/lib/qa-data-visibility";

export const dynamic = "force-dynamic";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.24)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.9)]">
      {children}
    </span>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.9)]">{title}</h3>
      <ul className="space-y-1.5 text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--accent-rgb)/0.95)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CandidateBlock({ scenario }: { scenario: ProgressionScenario }) {
  if (!scenario.candidate) {
    return null;
  }

  const display = scenario.candidateDisplay;

  return (
    <div className="rounded-[1.15rem] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-2-rgb)/0.26)] px-4 py-3">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-warning)/0.95)]">Candidate Output</h3>
      <div className="mt-2 space-y-1.5 text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
        <p><strong className="text-[rgb(var(--text-primary)/0.96)]">Type:</strong> {scenario.candidate.type}</p>
        <p><strong className="text-[rgb(var(--text-primary)/0.96)]">Reason:</strong> {scenario.candidate.reason}</p>
        {display ? (
          <>
            <p><strong className="text-[rgb(var(--text-primary)/0.96)]">Card:</strong> {display.summary}</p>
            <p><strong className="text-[rgb(var(--text-primary)/0.96)]">Action:</strong> {display.actionLabel}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: ProgressionScenario }) {
  const hasConcreteInspectRoute = !scenario.inspectRoute.includes("[");

  return (
    <article id={scenario.id} className="rounded-[1.5rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.22)] p-4 shadow-[0_18px_40px_rgb(0_0_0/0.16)] backdrop-blur-[10px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <Pill>{scenario.category}</Pill>
              <Pill>{scenario.id}</Pill>
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[rgb(var(--text-primary)/0.98)]">{scenario.title}</h2>
          </div>
          {hasConcreteInspectRoute ? (
            <Link
              href={scenario.inspectRoute}
              className="inline-flex min-h-[2.5rem] items-center justify-center rounded-[1rem] border border-[rgb(var(--accent)/0.28)] bg-[rgb(var(--surface-3-rgb)/0.28)] px-3 text-sm font-semibold text-[rgb(var(--text-primary)/0.94)]"
            >
              Inspect route
            </Link>
          ) : (
            <span className="inline-flex min-h-[2.5rem] items-center justify-center rounded-[1rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.16)] px-3 text-sm font-semibold text-[rgb(var(--text-muted)/0.84)]">
              Session route required
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ListBlock title="Simulated State" items={scenario.simulatedState} />
          <ListBlock title="Expected UI" items={scenario.expectedUi} />
        </div>

        <CandidateBlock scenario={scenario} />

        <ListBlock title="Engine Summary" items={scenario.engineSummary} />

        <div className="rounded-[1rem] border border-[rgb(var(--border-strong)/0.1)] bg-[rgb(var(--surface-2-rgb)/0.18)] px-3 py-2 text-sm text-[rgb(var(--text-secondary)/0.92)]">
          <strong className="text-[rgb(var(--text-primary)/0.95)]">Reset:</strong> {scenario.reset}
        </div>
      </div>
    </article>
  );
}

export default async function DevProgressionScenariosPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const user = await requireUser({ route: "/dev/progression-scenarios" });
  const profile = await ensureProfile(user.id);
  if (!canAccessQaLlelUi(profile)) {
    notFound();
  }

  const scenarios = buildProgressionScenarioFixtures();

  return (
    <main className="min-h-dvh bg-[rgb(var(--bg-app))] px-4 py-8 text-[rgb(var(--text-primary))]">
      <section className="mx-auto max-w-[980px] space-y-5">
        <header className="rounded-[1.5rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.22)] px-5 py-5 text-center shadow-[0_18px_40px_rgb(0_0_0/0.16)] backdrop-blur-[10px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent-divider-rgb)/0.9)]">Dev Only</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">Progression Scenario Fixtures</h1>
          <p className="mx-auto mt-3 max-w-[680px] text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
            Read-only simulated fixtures for FIT-04 LLEL. These cases exercise candidate math, cycle labels, training focus customization,
            Sets Flow defaults, and logger input ordering without creating or deleting database rows.
          </p>
        </header>

        <section className="rounded-[1.5rem] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-1-rgb)/0.18)] px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-warning)/0.95)]">Safety Contract</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
            <li>No Supabase writes.</li>
            <li>No production route exposure.</li>
            <li>No destructive reset path because no scenario data is persisted.</li>
            <li>Use the inspect routes in a logged-in local browser for real UI smoke.</li>
          </ul>
        </section>

        <section className="rounded-[1.5rem] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-1-rgb)/0.18)] px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.95)]">Writable Codex QA Scenarios</h2>
              <p className="mt-2 max-w-[720px] text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">
                These create real routines, sessions, session exercises, and sets under the Codex automation user only.
                Use them for repeatable Apply/Revert and history-matching smoke without mutating a human account.
              </p>
            </div>
            <Link
              href="/dev/progression-audit"
              className="inline-flex min-h-[2.5rem] items-center justify-center rounded-[1rem] border border-[rgb(var(--accent)/0.28)] bg-[rgb(var(--surface-3-rgb)/0.28)] px-3 text-sm font-semibold text-[rgb(var(--text-primary)/0.94)]"
            >
              Open audit
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {WRITABLE_PROGRESSION_SCENARIO_SUMMARIES.map((scenario) => (
              <article key={scenario.id} className="rounded-[1rem] border border-[rgb(var(--border-strong)/0.1)] bg-[rgb(var(--surface-2-rgb)/0.18)] px-3 py-3">
                <h3 className="text-sm font-semibold text-[rgb(var(--text-primary)/0.96)]">{scenario.title}</h3>
                <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-secondary)/0.9)]">{scenario.expected}</p>
                <div className="mt-3 space-y-1 rounded-[0.8rem] border border-[rgb(var(--border-strong)/0.08)] bg-[rgb(var(--surface-1-rgb)/0.18)] px-2.5 py-2 font-mono text-[11px] leading-5 text-[rgb(var(--text-muted)/0.92)]">
                  <p>npm run qa:codex:seed -- --scenario {scenario.id}</p>
                  <p>npm run qa:codex:reset -- --scenario {scenario.id}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <nav className="flex flex-wrap gap-2">
          {scenarios.map((scenario) => (
            <a
              key={scenario.id}
              href={`#${scenario.id}`}
              className="rounded-full border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-2-rgb)/0.22)] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--text-secondary)/0.94)]"
            >
              {scenario.title}
            </a>
          ))}
        </nav>

        <div className="space-y-4">
          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>
      </section>
    </main>
  );
}

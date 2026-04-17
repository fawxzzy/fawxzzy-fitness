"use client";

import { useMemo, useState, useTransition } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";

type SnapshotCountMap = {
  profiles: number;
  user_owned_exercises: number;
  routines: number;
  routine_days: number;
  routine_day_exercises: number;
  sessions: number;
  session_exercises: number;
  sets: number;
};

type ImportSummary = {
  legacyUserId: string;
  newUserId: string;
  resolvedGlobalExercises: number;
  createdGlobalExercises: number;
  importedUserOwnedExercises: number;
  importedCounts: SnapshotCountMap;
};

type ParityCount = {
  metric: string;
  snapshot: number;
  database: number;
  matches: boolean;
};

type ParityResponse = {
  counts: ParityCount[];
  notes: string[];
};

const DEFAULT_SNAPSHOT_TEXT = "";

function formatCounts(counts: SnapshotCountMap) {
  return [
    `profiles ${counts.profiles}`,
    `user exercises ${counts.user_owned_exercises}`,
    `routines ${counts.routines}`,
    `days ${counts.routine_days}`,
    `day exercises ${counts.routine_day_exercises}`,
    `sessions ${counts.sessions}`,
    `session exercises ${counts.session_exercises}`,
    `sets ${counts.sets}`,
  ].join(" | ");
}

export function LegacyMigrationSettings({
  legacyBridgeConfigured,
}: {
  legacyBridgeConfigured: boolean;
}) {
  const [legacyEmail, setLegacyEmail] = useState("");
  const [legacyPassword, setLegacyPassword] = useState("");
  const [snapshotText, setSnapshotText] = useState(DEFAULT_SNAPSHOT_TEXT);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [exportCounts, setExportCounts] = useState<SnapshotCountMap | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [parity, setParity] = useState<ParityResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const statusClassName = useMemo(() => {
    if (status?.tone === "error") {
      return "text-[rgb(var(--button-destructive-text))]";
    }

    return "text-[rgb(var(--text-secondary)/0.92)]";
  }, [status]);

  function parseSnapshotText() {
    try {
      return JSON.parse(snapshotText) as unknown;
    } catch {
      throw new Error("Snapshot JSON is invalid.");
    }
  }

  const handleExport = () => {
    setStatus(null);
    setParity(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/migration/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            legacyEmail: legacyEmail.trim(),
            legacyPassword,
          }),
        });
        const result = (await response.json()) as {
          ok: boolean;
          error?: string;
          data?: { snapshot: unknown; counts: SnapshotCountMap };
        };

        if (!response.ok || !result.ok || !result.data) {
          throw new Error(result.error ?? "Legacy export failed.");
        }

        setSnapshotText(JSON.stringify(result.data.snapshot, null, 2));
        setExportCounts(result.data.counts);
        setImportSummary(null);
        setStatus({
          tone: "success",
          text: "Legacy snapshot exported. Review the payload, then import it into this account.",
        });
      } catch (error) {
        setStatus({
          tone: "error",
          text: error instanceof Error ? error.message : "Legacy export failed.",
        });
      }
    });
  };

  const handleImport = () => {
    setStatus(null);
    setParity(null);
    startTransition(async () => {
      try {
        const snapshot = parseSnapshotText();
        const response = await fetch("/api/migration/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot }),
        });
        const result = (await response.json()) as {
          ok: boolean;
          error?: string;
          data?: ImportSummary;
        };

        if (!response.ok || !result.ok || !result.data) {
          throw new Error(result.error ?? "Legacy import failed.");
        }

        setImportSummary(result.data);
        setStatus({
          tone: "success",
          text: "Legacy snapshot imported into the current account.",
        });
      } catch (error) {
        setStatus({
          tone: "error",
          text: error instanceof Error ? error.message : "Legacy import failed.",
        });
      }
    });
  };

  const handleParity = () => {
    setStatus(null);
    startTransition(async () => {
      try {
        const snapshot = parseSnapshotText();
        const response = await fetch("/api/migration/parity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot }),
        });
        const result = (await response.json()) as {
          ok: boolean;
          error?: string;
          data?: ParityResponse;
        };

        if (!response.ok || !result.ok || !result.data) {
          throw new Error(result.error ?? "Parity check failed.");
        }

        setParity(result.data);
        setStatus({
          tone: "success",
          text: result.data.counts.every((count) => count.matches)
            ? "Parity counts match the imported snapshot."
            : "Parity completed with one or more count mismatches.",
        });
      } catch (error) {
        setStatus({
          tone: "error",
          text: error instanceof Error ? error.message : "Parity check failed.",
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={legacyBridgeConfigured ? "success" : "warning"}>
          {legacyBridgeConfigured ? "Legacy bridge ready" : "Legacy env missing"}
        </Chip>
        <p className="text-sm text-[rgb(var(--text-secondary)/0.92)]">
          Export from the old Supabase project, import into the current signed-in account, then run parity from the same snapshot.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="legacy-email" className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">
            Legacy email
          </label>
          <Input
            id="legacy-email"
            type="email"
            autoComplete="email"
            value={legacyEmail}
            onChange={(event) => setLegacyEmail(event.target.value)}
            placeholder="legacy@email.com"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="legacy-password" className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">
            Legacy password
          </label>
          <Input
            id="legacy-password"
            type="password"
            autoComplete="current-password"
            value={legacyPassword}
            onChange={(event) => setLegacyPassword(event.target.value)}
            placeholder="Required for export"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <AppButton
          type="button"
          variant="secondary"
          onClick={handleExport}
          loading={isPending}
          disabled={!legacyBridgeConfigured || !legacyEmail.trim() || !legacyPassword}
        >
          Export legacy snapshot
        </AppButton>
        <AppButton
          type="button"
          variant="primary"
          onClick={handleImport}
          loading={isPending}
          disabled={!snapshotText.trim()}
        >
          Import into this account
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          onClick={handleParity}
          loading={isPending}
          disabled={!snapshotText.trim()}
        >
          Run parity
        </AppButton>
      </div>

      <div className="space-y-2">
        <label htmlFor="legacy-snapshot" className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.98)]">
          Snapshot JSON
        </label>
        <textarea
          id="legacy-snapshot"
          value={snapshotText}
          onChange={(event) => setSnapshotText(event.target.value)}
          rows={12}
          spellCheck={false}
          className="min-h-[16rem] w-full rounded-[var(--radius-md)] border border-[rgb(var(--border)/0.22)] bg-[rgb(var(--surface-2)/0.92)] px-4 py-3 font-mono text-[13px] leading-5 text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted)/0.92)] focus-visible:border-[rgb(var(--accent)/0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]"
          placeholder='{"metadata":{"snapshot_version":"fitness-legacy-v1"}}'
        />
      </div>

      <div className="space-y-2">
        {exportCounts ? (
          <p className="text-sm text-[rgb(var(--text-secondary)/0.92)]">
            Export counts: {formatCounts(exportCounts)}
          </p>
        ) : null}
        {importSummary ? (
          <p className="text-sm text-[rgb(var(--text-secondary)/0.92)]">
            Imported {formatCounts(importSummary.importedCounts)}. Global exercises resolved {importSummary.resolvedGlobalExercises}; created {importSummary.createdGlobalExercises}.
          </p>
        ) : null}
        {parity ? (
          <div className="space-y-1 text-sm text-[rgb(var(--text-secondary)/0.92)]">
            {parity.counts.map((count) => (
              <p key={count.metric}>
                {count.metric}: snapshot {count.snapshot} / database {count.database} / {count.matches ? "match" : "mismatch"}
              </p>
            ))}
          </div>
        ) : null}
        <p className={`text-sm leading-5 ${statusClassName}`}>
          {status?.text ?? "This is a preview/dev migration tool. Import assumes the current account is blank or already contains only this snapshot."}
        </p>
      </div>
    </div>
  );
}

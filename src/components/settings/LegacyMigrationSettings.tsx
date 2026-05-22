"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { SignatureInlineList } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

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
  rebuiltExerciseStatsCount?: number;
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

const LEGACY_MIGRATION_STATUS_KEY = "fawxzzy:legacy-migration-status";

type LegacyMigrationStatus = {
  state: "not-migrated" | "imported";
  importedAt?: string;
};

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
  ];
}

function readLegacyMigrationStatus(): LegacyMigrationStatus {
  if (typeof window === "undefined") {
    return { state: "not-migrated" };
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_MIGRATION_STATUS_KEY);
    if (!raw) {
      return { state: "not-migrated" };
    }

    const parsed = JSON.parse(raw) as LegacyMigrationStatus;
    if (parsed.state !== "imported") {
      return { state: "not-migrated" };
    }

    return {
      state: "imported",
      importedAt: parsed.importedAt,
    };
  } catch {
    return { state: "not-migrated" };
  }
}

function writeLegacyMigrationStatus(status: LegacyMigrationStatus) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LEGACY_MIGRATION_STATUS_KEY, JSON.stringify(status));
  } catch {}
}

function formatMigrationStatus(status: LegacyMigrationStatus) {
  if (status.state !== "imported") {
    return null;
  }

  if (!status.importedAt) {
    return "Imported";
  }

  const parsedDate = new Date(status.importedAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Imported";
  }

  return `Imported on ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(parsedDate)}`;
}

export function LegacyMigrationSettings({
  legacyBridgeConfigured,
  defaultLegacyEmail = "",
}: {
  legacyBridgeConfigured: boolean;
  defaultLegacyEmail?: string;
}) {
  const router = useRouter();
  const [legacyEmail, setLegacyEmail] = useState(defaultLegacyEmail);
  const [legacyPassword, setLegacyPassword] = useState("");
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [exportCounts, setExportCounts] = useState<SnapshotCountMap | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [parity, setParity] = useState<ParityResponse | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<LegacyMigrationStatus>({ state: "not-migrated" });
  const [isPending, startTransition] = useTransition();

  const statusClassName = useMemo(() => {
    if (status?.tone === "error") {
      return appTokens.settingsStatusError;
    }

    if (status?.tone === "success") {
      return appTokens.settingsStatusSuccess;
    }

    return appTokens.settingsStatusMuted;
  }, [status]);
  const migrationStatusLabel = useMemo(() => formatMigrationStatus(migrationStatus), [migrationStatus]);

  useEffect(() => {
    setMigrationStatus(readLegacyMigrationStatus());
  }, []);

  const canRunMigration = legacyBridgeConfigured && legacyEmail.trim().length > 0 && legacyPassword.length > 0;

  const handleRunMigration = () => {
    setStatus(null);
    setExportCounts(null);
    setImportSummary(null);
    setParity(null);
    startTransition(async () => {
      try {
        const exportResponse = await fetch("/api/migration/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            legacyEmail: legacyEmail.trim(),
            legacyPassword,
          }),
        });
        const exportResult = (await exportResponse.json()) as {
          ok: boolean;
          error?: string;
          data?: { snapshot: unknown; counts: SnapshotCountMap };
        };

        if (!exportResponse.ok || !exportResult.ok || !exportResult.data) {
          throw new Error(exportResult.error ?? "Legacy export failed.");
        }

        setExportCounts(exportResult.data.counts);

        const importResponse = await fetch("/api/migration/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot: exportResult.data.snapshot }),
        });
        const importResult = (await importResponse.json()) as {
          ok: boolean;
          error?: string;
          data?: ImportSummary;
        };

        if (!importResponse.ok || !importResult.ok || !importResult.data) {
          throw new Error(importResult.error ?? "Legacy import failed.");
        }

        setImportSummary(importResult.data);
        const nextStatus = { state: "imported" as const, importedAt: new Date().toISOString() };
        writeLegacyMigrationStatus(nextStatus);
        setMigrationStatus(nextStatus);

        const parityResponse = await fetch("/api/migration/parity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot: exportResult.data.snapshot }),
        });
        const parityResult = (await parityResponse.json()) as {
          ok: boolean;
          error?: string;
          data?: ParityResponse;
        };

        if (!parityResponse.ok || !parityResult.ok || !parityResult.data) {
          throw new Error(parityResult.error ?? "Parity check failed.");
        }

        setParity(parityResult.data);
        const parityMatches = parityResult.data.counts.every((count) => count.matches);
        setStatus({
          tone: parityMatches ? "success" : "error",
          text: parityMatches
            ? "Legacy export, import, and parity completed."
            : "Legacy import completed, but parity found one or more mismatches.",
        });
        router.refresh();
      } catch (error) {
        setStatus({
          tone: "error",
          text: error instanceof Error ? error.message : "Legacy migration failed.",
        });
      }
    });
  };

  return (
    <div className="space-y-3 pt-2">
      <PublishBottomActions>
        <BottomActionSingle>
          <BottomDockButton
            type="button"
            intent="positive"
            onClick={handleRunMigration}
            loading={isPending}
            disabled={!canRunMigration}
          >
            Run Migration
          </BottomDockButton>
        </BottomActionSingle>
      </PublishBottomActions>

      {migrationStatusLabel ? (
        <p className={cn(appTokens.settingsBodyText, "text-[rgb(var(--text-secondary)/0.92)]")}>{migrationStatusLabel}</p>
      ) : null}

      <div className={appTokens.settingsTwoColumnGrid}>
        <div className={appTokens.settingsFieldStack}>
          <LabeledEditorField label="Legacy email">
            <Input
              id="legacy-email"
              type="email"
              autoComplete="email"
              value={legacyEmail}
              onChange={(event) => setLegacyEmail(event.target.value)}
              placeholder="legacy@email.com"
              className={cn(
                labeledEditorFieldControlClassName,
                "h-12 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
              )}
            />
          </LabeledEditorField>
        </div>
        <div className={appTokens.settingsFieldStack}>
          <LabeledEditorField label="Legacy password">
            <PasswordInput
              id="legacy-password"
              autoComplete="current-password"
              value={legacyPassword}
              onChange={(event) => setLegacyPassword(event.target.value)}
              placeholder="Required for export"
              className={cn(
                labeledEditorFieldControlClassName,
                "auth-input-plain h-12 px-4 py-3 !border-0 !bg-transparent !shadow-none focus-visible:!border-0 focus-visible:!ring-0",
              )}
            />
          </LabeledEditorField>
        </div>
      </div>

      <div className={appTokens.settingsFieldStack}>
        {exportCounts ? (
          <p className={appTokens.settingsBodyText}>
            Export counts: <SignatureInlineList items={formatCounts(exportCounts)} separator="pipe" className="align-middle" />
          </p>
        ) : null}
        {importSummary ? (
          <p className={appTokens.settingsBodyText}>
            Imported <SignatureInlineList items={formatCounts(importSummary.importedCounts)} separator="pipe" className="align-middle" />. Global exercises resolved {importSummary.resolvedGlobalExercises}; created {importSummary.createdGlobalExercises}.
          </p>
        ) : null}
        {parity ? (
          <div className={cn(appTokens.settingsBodyText, appTokens.settingsStatusStack)}>
            {parity.counts.map((count) => (
              <p key={count.metric}>
                {count.metric}: snapshot {count.snapshot} / database {count.database} / {count.matches ? "match" : "mismatch"}
              </p>
            ))}
          </div>
        ) : null}
        {status?.text ? (
          <p className={cn(appTokens.settingsBodyText, statusClassName)}>
            {status.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

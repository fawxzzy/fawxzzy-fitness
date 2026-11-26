import assert from "node:assert/strict";
import test from "node:test";
import {
  ROUTINE_ARCHIVE_COPY,
  describeRoutineArchiveConsequence,
  excludeArchivedRoutines,
  formatRoutineArchivedLabel,
  isBodylessRoutineArchiveProbeError,
  isMissingRoutineArchivedAtColumnError,
  isRoutineArchived,
  partitionRoutinesByArchiveState,
  selectWithRoutineArchiveCompat,
  sortArchivedRoutines,
} from "@/lib/routine-archive";
import { canAddListedRoutineForTier, selectAccessibleRoutineIdsForTier } from "@/lib/pro-tier-limits";

test("missing archived_at column is detected from PostgREST select and schema-cache errors only", () => {
  assert.equal(isMissingRoutineArchivedAtColumnError({ message: "column routines.archived_at does not exist", code: "42703" }), true);
  assert.equal(isMissingRoutineArchivedAtColumnError({ message: "Could not find the 'archived_at' column of 'routines' in the schema cache", code: "PGRST204" }), true);
  assert.equal(isMissingRoutineArchivedAtColumnError({ message: "column routines.archived_at bad", code: "42703" }), true);
  assert.equal(isMissingRoutineArchivedAtColumnError({ message: "column routines.foo does not exist", code: "42703" }), false);
  assert.equal(isMissingRoutineArchivedAtColumnError({ message: "permission denied for table routines", code: "42501" }), false);
  assert.equal(isMissingRoutineArchivedAtColumnError(null), false);
  assert.equal(isMissingRoutineArchivedAtColumnError(undefined), false);
});

test("compat select uses the archive query when the column exists", async () => {
  const seen: boolean[] = [];
  const result = await selectWithRoutineArchiveCompat<string[]>(async (withArchive) => {
    seen.push(withArchive);
    return { data: ["with"], error: null, count: 1 };
  });
  assert.deepEqual(seen, [true]);
  assert.deepEqual(result, { data: ["with"], error: null, count: 1, archiveSupported: true });
});

test("compat select falls back to the legacy query when archived_at is missing", async () => {
  const seen: boolean[] = [];
  const result = await selectWithRoutineArchiveCompat<string[]>(async (withArchive) => {
    seen.push(withArchive);
    return withArchive
      ? { data: null, error: { message: "column routines.archived_at does not exist", code: "42703" } }
      : { data: ["legacy"], error: null, count: 2 };
  });
  assert.deepEqual(seen, [true, false]);
  assert.deepEqual(result, { data: ["legacy"], error: null, count: 2, archiveSupported: false });
});

test("compat select returns other errors as is, without a retry", async () => {
  let calls = 0;
  const result = await selectWithRoutineArchiveCompat<string[]>(async () => {
    calls += 1;
    return { data: null, error: { message: "timeout" } };
  });
  assert.equal(calls, 1);
  assert.equal(result.archiveSupported, true);
  assert.deepEqual(result.error, { message: "timeout" });
});

test("compat select retries the legacy query on a body-less HEAD-style 400 (pre-migration head:true count)", async () => {
  // postgrest-js gives a failed HEAD request no body, so the error is { message: "" } with no code.
  const seen: boolean[] = [];
  const result = await selectWithRoutineArchiveCompat<null>(async (withArchive) => {
    seen.push(withArchive);
    return withArchive
      ? { data: null, error: { message: "" }, count: null, status: 400 }
      : { data: null, error: null, count: 2, status: 200 };
  });
  assert.deepEqual(seen, [true, false]);
  assert.equal(result.error, null);
  assert.equal(result.count, 2);
  assert.equal(result.archiveSupported, false);
});

test("body-less errors only count as a missing column for a 400 or unknown status, never with a message or code", () => {
  assert.equal(isBodylessRoutineArchiveProbeError({ message: "" }, 400), true);
  assert.equal(isBodylessRoutineArchiveProbeError({ message: "  " }), true);
  assert.equal(isBodylessRoutineArchiveProbeError({ message: null, code: null }), true);
  assert.equal(isBodylessRoutineArchiveProbeError({ message: "" }, 401), false);
  assert.equal(isBodylessRoutineArchiveProbeError({ message: "" }, 500), false);
  assert.equal(isBodylessRoutineArchiveProbeError({ message: "timeout" }), false);
  assert.equal(isBodylessRoutineArchiveProbeError({ message: "", code: "42501" }), false);
  assert.equal(isBodylessRoutineArchiveProbeError(null), false);
});

test("a body-less error that the legacy query also hits is returned (real outage, not a missing column)", async () => {
  let calls = 0;
  const result = await selectWithRoutineArchiveCompat<null>(async () => {
    calls += 1;
    return { data: null, error: { message: "" }, status: 400 };
  });
  assert.equal(calls, 2);
  assert.deepEqual(result.error, { message: "" });
});

test("archive filters: archived = non-empty archived_at; legacy rows without the field count as listed", () => {
  const rows = [
    { id: "a", archived_at: null },
    { id: "b", archived_at: "2026-11-20T10:00:00Z" },
    { id: "c" },
    { id: "d", archived_at: "  " },
  ];
  assert.equal(isRoutineArchived(rows[1]), true);
  assert.equal(isRoutineArchived(rows[2]), false);
  assert.equal(isRoutineArchived(null), false);
  assert.deepEqual(excludeArchivedRoutines(rows).map((row) => row.id), ["a", "c", "d"]);
  const { active, archived } = partitionRoutinesByArchiveState(rows);
  assert.deepEqual(active.map((row) => row.id), ["a", "c", "d"]);
  assert.deepEqual(archived.map((row) => row.id), ["b"]);
});

test("archived list is most recently archived first, then name, then id", () => {
  const sorted = sortArchivedRoutines([
    { id: "3", name: "Beta", archived_at: "2026-11-01T00:00:00Z" },
    { id: "2", name: "Alpha", archived_at: "2026-11-01T00:00:00Z" },
    { id: "1", name: "Zed", archived_at: "2026-11-20T00:00:00Z" },
    { id: "0", name: "Alpha", archived_at: "2026-11-01T00:00:00Z" },
  ]);
  assert.deepEqual(sorted.map((row) => row.id), ["1", "0", "2", "3"]);
});

test("archived label uses the person's time zone and falls back safely", () => {
  assert.equal(formatRoutineArchivedLabel("2026-11-26T03:00:00Z", "America/Los_Angeles"), "Archived Nov 25");
  assert.equal(formatRoutineArchivedLabel("2026-11-26T03:00:00Z", "UTC"), "Archived Nov 26");
  assert.equal(formatRoutineArchivedLabel("2026-11-26T03:00:00Z", "Not/AZone"), "Archived Nov 26");
  assert.equal(formatRoutineArchivedLabel("garbage", "UTC"), "Archived");
  assert.equal(formatRoutineArchivedLabel(null), "Archived");
});

test("archive copy says history is kept and names Today for the active routine; no delete wording", () => {
  const plain = describeRoutineArchiveConsequence({ isActive: false });
  const active = describeRoutineArchiveConsequence({ isActive: true });
  assert.match(plain, /stay in History/);
  assert.doesNotMatch(plain, /Today/);
  assert.match(active, /Today will ask you to choose another/);
  for (const text of [plain, active, ...Object.values(ROUTINE_ARCHIVE_COPY)]) {
    assert.doesNotMatch(text, /delete|permanent|can't be undone/i);
  }
  assert.equal(ROUTINE_ARCHIVE_COPY.confirmLabel, "Archive");
});

test("Free routine limit counts listed routines only; archived routines never count or become accessible", () => {
  assert.equal(canAddListedRoutineForTier({ listedRoutineCount: 2, accessState: "free" }), true);
  assert.equal(canAddListedRoutineForTier({ listedRoutineCount: 3, accessState: "free" }), false);
  assert.equal(canAddListedRoutineForTier({ listedRoutineCount: 30, accessState: "pro" }), true);

  const routines = [
    { id: "archived-new", created_at: "2026-11-25T00:00:00Z", updated_at: "2026-11-25T00:00:00Z", archived_at: "2026-11-25T01:00:00Z" },
    { id: "a", created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z", archived_at: null },
    { id: "b", created_at: "2026-11-02T00:00:00Z", updated_at: "2026-11-02T00:00:00Z", archived_at: null },
    { id: "c", created_at: "2026-11-03T00:00:00Z", updated_at: "2026-11-03T00:00:00Z", archived_at: null },
  ];
  const freeIds = selectAccessibleRoutineIdsForTier({ routines, accessState: "free" });
  const proIds = selectAccessibleRoutineIdsForTier({ routines, accessState: "pro" });
  assert.equal(freeIds.has("archived-new"), false);
  assert.equal(proIds.has("archived-new"), false);
  assert.deepEqual([...freeIds].sort(), ["a", "b", "c"]);
});

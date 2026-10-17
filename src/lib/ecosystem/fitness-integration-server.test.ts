import assert from "node:assert/strict";
import test from "node:test";

import { buildFitnessSnapshotSourceStateFromApp } from "./fitness-integration-server.ts";
import type { FitnessSupabaseClient } from "@/lib/supabase/schema";

test("standalone follow-up snapshot uses its supplied client without request context", async () => {
  const tables: string[] = [];
  const client = {
    from(table: string) {
      tables.push(table);
      const query = new Proxy({}, {
        get(_target, property) {
          if (property === "then") {
            return (resolve: (value: unknown) => void) => resolve({ data: [], count: 0, error: null });
          }
          if (property === "maybeSingle") {
            return async () => ({ data: null, error: null });
          }
          return () => query;
        },
      });
      return query;
    },
  } as unknown as FitnessSupabaseClient;

  const state = await buildFitnessSnapshotSourceStateFromApp(
    "fixture-member",
    new Date("2026-10-17T03:09:55.111Z"),
    client,
  );

  assert.equal(state.memberId, "fixture-member");
  assert.ok(tables.includes("profiles"));
  assert.ok(tables.includes("sessions"));
});

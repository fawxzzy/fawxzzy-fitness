import "server-only";

import {
  createPlannerRoutineFromIntentV1,
  type PlannerRoutineCreateExactInputsV1,
  type PlannerRoutineCreateReceiptV1,
  type PlannerRoutineCreateRpcClient,
} from "./planner-routine-create";

export const PLANNER_ROUTINE_EXECUTOR_VERSION =
  "fitness.planner-routine-executor.2026-07-30.v1" as const;

type PlannerRoutineExecutorDependenciesV1 = {
  requireAuthenticatedUser(): Promise<{ id: string }>;
  createServerProviderClient(): Promise<PlannerRoutineCreateRpcClient>;
};

export type ExecutePlannerRoutinePersistenceArgsV1 = {
  intent: unknown;
  exactInputs: PlannerRoutineCreateExactInputsV1;
  providerContext: unknown;
};

const DEFAULT_DEPENDENCIES: PlannerRoutineExecutorDependenciesV1 = {
  requireAuthenticatedUser: async () => {
    const { requireUser } = await import("@/lib/auth");
    return await requireUser({
      gate: "planner.persistence-executor.require-user",
      route: "/curated-onboarding",
      blockingReason: "Waiting for the authenticated planner owner.",
    });
  },
  createServerProviderClient: async () => {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    return supabaseAdmin() as unknown as PlannerRoutineCreateRpcClient;
  },
};

async function executePlannerRoutinePersistenceWithDependenciesV1(
  args: ExecutePlannerRoutinePersistenceArgsV1,
  dependencies: PlannerRoutineExecutorDependenciesV1,
): Promise<PlannerRoutineCreateReceiptV1> {
  const user = await dependencies.requireAuthenticatedUser();
  const supabase: PlannerRoutineCreateRpcClient = {
    async rpc(name, rpcArgs) {
      const client = await dependencies.createServerProviderClient();
      return await client.rpc(name, rpcArgs);
    },
  };

  return await createPlannerRoutineFromIntentV1({
    authenticatedUserId: user.id,
    intent: args.intent,
    exactInputs: args.exactInputs,
    providerContext: args.providerContext,
    supabase,
  });
}

export async function executePlannerRoutinePersistenceV1(
  args: ExecutePlannerRoutinePersistenceArgsV1,
): Promise<PlannerRoutineCreateReceiptV1> {
  return await executePlannerRoutinePersistenceWithDependenciesV1(
    args,
    DEFAULT_DEPENDENCIES,
  );
}

import {
  digestHandoffSecret,
  type FitnessHandoffRecord,
  type FitnessHandoffStore,
} from "@/lib/auth-handoff";

export const FITNESS_HANDOFF_BEGIN_RPC = "begin_fitness_auth_handoff";
export const FITNESS_HANDOFF_CONSUME_RPC = "consume_fitness_auth_handoff";

type RpcResult = {
  data: unknown;
  error: unknown;
};

export type FitnessHandoffRpcClient = {
  rpc(name: string, args: Record<string, string>): PromiseLike<RpcResult>;
};

type ConsumeArgs = Parameters<FitnessHandoffStore["consume"]>[0];

function toIsoTimestamp(epochSeconds: number) {
  return new Date(epochSeconds * 1000).toISOString();
}

function getReturnTo(data: unknown) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return null;
  }

  const returnTo = (row as { return_to?: unknown }).return_to;
  return typeof returnTo === "string" ? returnTo : null;
}

function beginArgs(record: FitnessHandoffRecord) {
  return {
    p_audience: record.audience,
    p_binding_digest: record.bindingDigest,
    p_expires_at: toIsoTimestamp(record.expiresAt),
    p_handoff_digest: digestHandoffSecret(record.handoffId),
    p_issuer: record.issuer,
    p_return_to: record.returnTo,
  };
}

function consumeArgs(args: ConsumeArgs) {
  return {
    p_audience: args.audience,
    p_binding_digest: args.bindingDigest,
    p_handoff_digest: digestHandoffSecret(args.handoffId),
    p_issuer: args.issuer,
    p_now: toIsoTimestamp(args.now),
  };
}

/**
 * The runtime calls master-side RPCs with its server-only service role. The
 * installation contract deliberately grants these RPCs to no browser role.
 */
export function createFitnessHandoffSupabaseStore(client: FitnessHandoffRpcClient): FitnessHandoffStore {
  return {
    async begin(record) {
      try {
        const result = await client.rpc(FITNESS_HANDOFF_BEGIN_RPC, beginArgs(record));
        return result.error === null && result.data === true;
      } catch {
        return false;
      }
    },
    async consume(args) {
      try {
        const result = await client.rpc(FITNESS_HANDOFF_CONSUME_RPC, consumeArgs(args));
        const returnTo = result.error === null ? getReturnTo(result.data) : null;
        return returnTo ? { returnTo } : null;
      } catch {
        return null;
      }
    },
  };
}

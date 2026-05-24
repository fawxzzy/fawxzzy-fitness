import { supabaseAdmin } from "@/lib/supabase/admin";

export type DiscordMessageCommandClaimClient = {
  from: (table: "discord_message_command_claims") => any;
};

function readOptionalEnv(name: string, env: NodeJS.ProcessEnv) {
  const value = env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function isDiscordMessageCommandClaimStoreConfigured(env: NodeJS.ProcessEnv = process.env) {
  const hasAdminEnv = Boolean(
    readOptionalEnv("NEXT_PUBLIC_SUPABASE_URL", env)
    && readOptionalEnv("SUPABASE_SERVICE_ROLE_KEY", env),
  );
  if (!hasAdminEnv) {
    return false;
  }

  const override = readOptionalEnv("DISCORD_MESSAGE_COMMAND_CLAIMS_ENABLED", env);
  if (override === "true") {
    return true;
  }
  if (override === "false") {
    return false;
  }

  return env.NODE_ENV === "production";
}

export async function claimDiscordMessageCommand(args: {
  channelId: string;
  messageId: string;
  commandKind: string;
  adminClient?: DiscordMessageCommandClaimClient;
  env?: NodeJS.ProcessEnv;
}) {
  if (!isDiscordMessageCommandClaimStoreConfigured(args.env)) {
    return { ok: true as const, claimed: true as const, skippedStore: true as const };
  }

  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordMessageCommandClaimClient);
  const timestamp = new Date().toISOString();
  const { error } = await admin
    .from("discord_message_command_claims")
    .insert({
      channel_id: args.channelId,
      message_id: args.messageId,
      command_kind: args.commandKind,
      claim_status: "processing",
      claimed_at: timestamp,
      last_attempt_at: timestamp,
    });

  if (!error) {
    return { ok: true as const, claimed: true as const, skippedStore: false as const };
  }

  if (error.code === "23505" || error.status === 409) {
    return { ok: true as const, claimed: false as const, skippedStore: false as const };
  }

  return {
    ok: false as const,
    code: "DISCORD_MESSAGE_COMMAND_CLAIM_FAILED",
    message: typeof error.message === "string" ? error.message : "Could not claim Discord message command.",
  };
}

export async function finalizeDiscordMessageCommandClaim(args: {
  channelId: string;
  messageId: string;
  claimStatus: "completed" | "failed";
  resultCode?: string | null;
  responseAction?: string | null;
  adminClient?: DiscordMessageCommandClaimClient;
  env?: NodeJS.ProcessEnv;
}) {
  if (!isDiscordMessageCommandClaimStoreConfigured(args.env)) {
    return { ok: true as const, skippedStore: true as const };
  }

  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordMessageCommandClaimClient);
  const { error } = await admin
    .from("discord_message_command_claims")
    .update({
      claim_status: args.claimStatus,
      result_code: args.resultCode ?? null,
      response_action: args.responseAction ?? null,
      processed_at: new Date().toISOString(),
      last_attempt_at: new Date().toISOString(),
    })
    .eq("channel_id", args.channelId)
    .eq("message_id", args.messageId);

  if (error) {
    return {
      ok: false as const,
      code: "DISCORD_MESSAGE_COMMAND_CLAIM_FINALIZE_FAILED",
      message: typeof error.message === "string" ? error.message : "Could not finalize Discord message command claim.",
    };
  }

  return { ok: true as const, skippedStore: false as const };
}

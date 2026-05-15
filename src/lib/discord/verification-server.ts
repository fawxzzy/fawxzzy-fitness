import "server-only";

import {
  hashDiscordVerificationToken,
  isValidDiscordUsername,
  isValidDiscordVerificationToken,
  normalizeDiscordUserId,
  normalizeDiscordUsername,
} from "@/lib/discord-verification";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ConsumeDiscordVerificationTokenResult = {
  ok: boolean | null;
  user_id: string | null;
  user_number: number | null;
  user_kind: "human" | "automation" | "unknown" | null;
  expires_at: string | null;
  consumed_at: string | null;
  error: string | null;
};

type DiscordVerificationAdminClient = {
  rpc: (
    functionName: "consume_discord_verification_token",
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type DiscordVerificationConsumeSuccess = {
  ok: true;
  memberId: string;
  fitnessUserId: string;
  userNumber: number | null;
  userKind: "human" | "automation" | "unknown" | null;
  discordUserId: string;
  discordUsername: string | null;
};

export type DiscordVerificationConsumeFailureCode =
  | "DISCORD_VERIFICATION_INVALID_INPUT"
  | "DISCORD_VERIFICATION_INVALID_OR_EXPIRED"
  | "DISCORD_VERIFICATION_CONSUME_FAILED";

export type DiscordVerificationConsumeFailure = {
  ok: false;
  code: DiscordVerificationConsumeFailureCode;
};

export async function consumeDiscordVerificationTokenForDiscordUser(args: {
  token: string;
  discordUserId: unknown;
  discordUsername?: unknown;
  adminClient?: DiscordVerificationAdminClient;
}): Promise<DiscordVerificationConsumeSuccess | DiscordVerificationConsumeFailure> {
  if (!isValidDiscordVerificationToken(args.token)) {
    return { ok: false, code: "DISCORD_VERIFICATION_INVALID_INPUT" };
  }

  const discordUserId = normalizeDiscordUserId(args.discordUserId);
  if (!discordUserId) {
    return { ok: false, code: "DISCORD_VERIFICATION_INVALID_INPUT" };
  }

  let discordUsername: string | null = null;
  if (args.discordUsername !== undefined && args.discordUsername !== null) {
    if (!isValidDiscordUsername(args.discordUsername)) {
      return { ok: false, code: "DISCORD_VERIFICATION_INVALID_INPUT" };
    }

    discordUsername = normalizeDiscordUsername(args.discordUsername);
  }

  const admin = (args.adminClient ?? (supabaseAdmin() as unknown as DiscordVerificationAdminClient));

  try {
    const tokenHash = hashDiscordVerificationToken(args.token);
    const { data, error } = await admin.rpc("consume_discord_verification_token", {
      input_token_hash: tokenHash,
      input_discord_user_id: discordUserId,
      input_discord_username: discordUsername,
    });

    if (error) {
      return { ok: false, code: "DISCORD_VERIFICATION_CONSUME_FAILED" };
    }

    const result = Array.isArray(data)
      ? (data[0] as ConsumeDiscordVerificationTokenResult | null | undefined) ?? null
      : data as ConsumeDiscordVerificationTokenResult | null;

    if (!result?.ok || !result.user_id) {
      return { ok: false, code: "DISCORD_VERIFICATION_INVALID_OR_EXPIRED" };
    }

    return {
      ok: true,
      memberId: result.user_id,
      fitnessUserId: result.user_id,
      userNumber: result.user_number,
      userKind: result.user_kind,
      discordUserId,
      discordUsername,
    };
  } catch {
    return { ok: false, code: "DISCORD_VERIFICATION_CONSUME_FAILED" };
  }
}

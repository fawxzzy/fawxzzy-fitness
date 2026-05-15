import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  calculateDiscordVerificationExpiry,
  generateDiscordVerificationToken,
  hashDiscordVerificationToken,
} from "@/lib/discord-verification";
import { ensureProfile } from "@/lib/profile";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
};

type DiscordVerificationAdminClient = {
  from: (table: "discord_verification_tokens") => any;
};

function buildJsonResponse(body: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

function buildErrorResponse(args: {
  status: number;
  code: string;
  requestId: string;
  error: string;
}) {
  return buildJsonResponse({
    ok: false,
    code: args.code,
    error: args.error,
    requestId: args.requestId,
  }, { status: args.status });
}

export async function POST() {
  const requestId = randomUUID();
  const user = await requireUser({
    route: "/api/discord/verification-token",
    gate: "discord.verification-token",
    blockingReason: "Waiting for an authenticated user to generate a Discord verification token.",
  });

  try {
    const profile = await ensureProfile(user.id);

    if (profile.user_kind === "automation") {
      return buildErrorResponse({
        status: 403,
        code: "DISCORD_VERIFICATION_AUTOMATION_ACCOUNT_DISALLOWED",
        error: "Automation accounts cannot generate Discord verification tokens.",
        requestId,
      });
    }

    const admin = supabaseAdmin() as DiscordVerificationAdminClient;
    const { error: deleteError } = await admin
      .from("discord_verification_tokens")
      .delete()
      .eq("user_id", user.id)
      .is("consumed_at", null);

    if (deleteError) {
      throw new Error(`Failed to clear previous verification tokens: ${deleteError.message}`);
    }

    const token = generateDiscordVerificationToken();
    const expiresAt = calculateDiscordVerificationExpiry();
    const tokenHash = hashDiscordVerificationToken(token);
    const { error: insertError } = await admin
      .from("discord_verification_tokens")
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      throw new Error(`Failed to store verification token: ${insertError.message}`);
    }

    return buildJsonResponse({
      ok: true,
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[discord-verification-token] failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return buildErrorResponse({
      status: 500,
      code: "DISCORD_VERIFICATION_TOKEN_CREATE_FAILED",
      error: "Unable to create a Discord verification token right now.",
      requestId,
    });
  }
}

import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { DISCORD_VERIFICATION_BOT_SECRET } from "@/lib/env";
import {
  hashDiscordVerificationToken,
  isValidDiscordUsername,
  isValidDiscordVerificationToken,
  normalizeDiscordUserId,
  normalizeDiscordUsername,
} from "@/lib/discord-verification";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
};

type DiscordVerifyBody = {
  token?: unknown;
  discordUserId?: unknown;
  discordUsername?: unknown;
};

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
}) {
  return buildJsonResponse({
    ok: false,
    code: args.code,
    requestId: args.requestId,
  }, { status: args.status });
}

function timingSafeSecretMatch(providedSecret: string | null, expectedSecret: string): boolean {
  if (!providedSecret) {
    return false;
  }

  const providedBuffer = Buffer.from(providedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

async function parseBody(request: Request): Promise<DiscordVerifyBody | null> {
  try {
    return (await request.json()) as DiscordVerifyBody;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  let expectedSecret = "";

  try {
    expectedSecret = DISCORD_VERIFICATION_BOT_SECRET();
  } catch {
    return buildErrorResponse({
      status: 401,
      code: "DISCORD_VERIFICATION_UNAUTHORIZED",
      requestId,
    });
  }

  const providedSecret = request.headers.get("x-discord-verification-secret")?.trim() ?? null;
  if (!timingSafeSecretMatch(providedSecret, expectedSecret)) {
    return buildErrorResponse({
      status: 401,
      code: "DISCORD_VERIFICATION_UNAUTHORIZED",
      requestId,
    });
  }

  const body = await parseBody(request);
  if (!body) {
    return buildErrorResponse({
      status: 400,
      code: "DISCORD_VERIFICATION_INVALID_BODY",
      requestId,
    });
  }

  if (typeof body.token !== "string" || !isValidDiscordVerificationToken(body.token)) {
    return buildErrorResponse({
      status: 400,
      code: "DISCORD_VERIFICATION_INVALID_BODY",
      requestId,
    });
  }

  const discordUserId = normalizeDiscordUserId(body.discordUserId);
  if (!discordUserId) {
    return buildErrorResponse({
      status: 400,
      code: "DISCORD_VERIFICATION_INVALID_BODY",
      requestId,
    });
  }

  let discordUsername: string | null = null;
  if (body.discordUsername !== undefined && body.discordUsername !== null) {
    if (!isValidDiscordUsername(body.discordUsername)) {
      return buildErrorResponse({
        status: 400,
        code: "DISCORD_VERIFICATION_INVALID_BODY",
        requestId,
      });
    }

    discordUsername = normalizeDiscordUsername(body.discordUsername);
  }

  try {
    const tokenHash = hashDiscordVerificationToken(body.token);
    const admin = supabaseAdmin() as unknown as DiscordVerificationAdminClient;
    const { data, error } = await admin.rpc("consume_discord_verification_token", {
      input_token_hash: tokenHash,
      input_discord_user_id: discordUserId,
      input_discord_username: discordUsername,
    });

    if (error) {
      throw new Error(`Failed to consume verification token: ${error.message}`);
    }

    const result = Array.isArray(data)
      ? (data[0] as ConsumeDiscordVerificationTokenResult | null | undefined) ?? null
      : data as ConsumeDiscordVerificationTokenResult | null;

    if (!result?.ok || !result.user_id) {
      return buildErrorResponse({
        status: 404,
        code: "DISCORD_VERIFICATION_INVALID_OR_EXPIRED",
        requestId,
      });
    }

    return buildJsonResponse({
      ok: true,
      memberId: result.user_id,
      userNumber: result.user_number,
      userKind: result.user_kind,
    });
  } catch (error) {
    console.error("[discord-verify] failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return buildErrorResponse({
      status: 500,
      code: "DISCORD_VERIFICATION_VERIFY_FAILED",
      requestId,
    });
  }
}

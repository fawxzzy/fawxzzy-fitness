import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { DISCORD_GUILD_ID, DISCORD_MEMBER_SYNC_SECRET } from "@/lib/env";
import { formatDiscordMemberNickname, shouldDisplayDiscordMemberNumber } from "@/lib/discord/member-number";
import { updateDiscordGuildMemberNickname } from "@/lib/discord/rest";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
};

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 50;

type SyncRequestBody = {
  dryRun?: unknown;
  batchSize?: unknown;
};

type DiscordMemberLinkRow = {
  id: string;
  discord_user_id: string;
  discord_username: string | null;
  user_number: number | null;
  user_kind: "human" | "automation" | "unknown" | null;
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

async function parseBody(request: Request): Promise<SyncRequestBody | null> {
  const contentLength = request.headers.get("content-length");
  if (!contentLength || contentLength === "0") {
    return {};
  }

  try {
    return (await request.json()) as SyncRequestBody;
  } catch {
    return null;
  }
}

function normalizeBatchSize(value: unknown): number {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number.parseInt(value, 10)
      : NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.min(parsed, MAX_BATCH_SIZE);
}

function coerceLinkRow(value: unknown): DiscordMemberLinkRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.discord_user_id !== "string") {
    return null;
  }

  return {
    id: row.id,
    discord_user_id: row.discord_user_id,
    discord_username: typeof row.discord_username === "string" ? row.discord_username : null,
    user_number: typeof row.user_number === "number" ? row.user_number : null,
    user_kind: row.user_kind === "human" || row.user_kind === "automation" || row.user_kind === "unknown"
      ? row.user_kind
      : null,
  };
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  let expectedSecret = "";

  try {
    expectedSecret = DISCORD_MEMBER_SYNC_SECRET();
  } catch {
    return buildJsonResponse({
      ok: false,
      code: "DISCORD_MEMBER_SYNC_UNAUTHORIZED",
      requestId,
    }, { status: 401 });
  }

  const providedSecret = request.headers.get("x-discord-member-sync-secret")?.trim() ?? null;
  if (!timingSafeSecretMatch(providedSecret, expectedSecret)) {
    return buildJsonResponse({
      ok: false,
      code: "DISCORD_MEMBER_SYNC_UNAUTHORIZED",
      requestId,
    }, { status: 401 });
  }

  const body = await parseBody(request);
  if (body === null) {
    return buildJsonResponse({
      ok: false,
      code: "DISCORD_MEMBER_SYNC_INVALID_BODY",
      requestId,
    }, { status: 400 });
  }

  const dryRun = body.dryRun === true;
  const batchSize = normalizeBatchSize(body.batchSize);
  const admin = supabaseAdmin();
  const memberLinks = admin.from("discord_member_links") as any;

  const { data, error } = await memberLinks
    .select("id, discord_user_id, discord_username, user_number, user_kind")
    .in("nickname_sync_status", ["needs_sync", "failed", "not_attempted"])
    .eq("user_kind", "human")
    .gte("user_number", 0)
    .order("updated_at", { ascending: true })
    .limit(batchSize);

  if (error) {
    console.error("[discord-member-sync] load failed", {
      requestId,
      message: error.message,
    });

    return buildJsonResponse({
      ok: false,
      code: "DISCORD_MEMBER_SYNC_LOAD_FAILED",
      requestId,
    }, { status: 500 });
  }

  const rows = Array.isArray(data)
    ? data.map((row) => coerceLinkRow(row)).filter((row): row is DiscordMemberLinkRow => Boolean(row))
    : [];

  const summary = {
    ok: true,
    requestId,
    dryRun,
    batchSize,
    scanned: rows.length,
    eligible: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
  };

  for (const row of rows) {
    const eligible = shouldDisplayDiscordMemberNumber({
      userKind: row.user_kind,
      userNumber: row.user_number,
    });

    if (!eligible) {
      summary.skipped += 1;
      if (!dryRun) {
        await memberLinks
          .update({
            nickname_sync_status: "skipped",
            nickname_synced_at: null,
            last_error_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
      continue;
    }

    summary.eligible += 1;
    const nickname = formatDiscordMemberNickname({
      userNumber: row.user_number as number,
      currentDisplayName: row.discord_username,
    });

    if (dryRun) {
      continue;
    }

    const syncResult = await updateDiscordGuildMemberNickname({
      guildId: DISCORD_GUILD_ID(),
      userId: row.discord_user_id,
      nickname,
    });

    if (syncResult.ok) {
      summary.synced += 1;
      await memberLinks
        .update({
          nickname_sync_status: "synced",
          nickname_synced_at: new Date().toISOString(),
          last_error_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      continue;
    }

    summary.failed += 1;
    await memberLinks
      .update({
        nickname_sync_status: "failed",
        nickname_synced_at: null,
        last_error_code: syncResult.code,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
  }

  if (dryRun) {
    summary.skipped = rows.length - summary.eligible;
  }

  return buildJsonResponse(summary);
}

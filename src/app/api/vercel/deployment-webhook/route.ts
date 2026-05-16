import {
  VERCEL_DEPLOYMENT_WEBHOOK_SECRET,
  VERCEL_PROJECT_ID,
} from "@/lib/env";
import { upsertDiscordUpdateDraftFromVercelEvent } from "@/lib/discord/update-drafts";
import { verifyVercelWebhookSignature } from "@/lib/vercel/webhook-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

function jsonResponse(body: Record<string, unknown>, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headerSignature = request.headers.get("x-vercel-signature");
  const signatureSecret = VERCEL_DEPLOYMENT_WEBHOOK_SECRET();

  if (!verifyVercelWebhookSignature({ rawBody, headerSignature, secret: signatureSecret })) {
    return jsonResponse({ ok: false, error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody) as unknown;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid webhook payload." }, { status: 400 });
  }

  const result = await upsertDiscordUpdateDraftFromVercelEvent({
    event: event as { type?: unknown; payload?: unknown },
    configuredProjectId: VERCEL_PROJECT_ID(),
  });

  if (!result.ok) {
    return jsonResponse({ ok: false, error: result.code }, { status: 500 });
  }

  if (result.ignored) {
    return jsonResponse({ ok: true, ignored: true, reason: result.reason });
  }

  return jsonResponse({
    ok: true,
    ignored: false,
    created: result.created,
    draft_id: result.draft.id,
    deployment_id: result.draft.deployment_id,
    status: result.draft.status,
  });
}

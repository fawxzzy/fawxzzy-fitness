// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "@/app/api/vercel/deployment-webhook/route.ts";
import { computeVercelWebhookSignature } from "@/lib/vercel/webhook-signature";

function createSignedWebhookRequest(body, secret) {
  return new Request("http://localhost/api/vercel/deployment-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Vercel-Signature": computeVercelWebhookSignature(body, secret),
    },
    body,
  });
}

function buildDeploymentReadyPayload(overrides = {}) {
  return {
    type: "deployment.ready",
    payload: {
      target: "production",
      projectId: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
      project: {
        id: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
        name: "fawxzzy-fitness",
      },
      alias: ["fawxzzy-fitness-local.vercel.app"],
      deployment: {
        id: "dpl_123",
        url: "fawxzzy-fitness-preview.vercel.app",
        target: "production",
        name: "fawxzzy-fitness",
        meta: {
          githubCommitSha: "abcdef1234567890",
          githubCommitMessage: "internal raw message",
          githubCommitRef: "main",
        },
      },
      ...overrides,
    },
  };
}

test("Vercel deployment webhook rejects unsigned requests", async () => {
  process.env.VERCEL_DEPLOYMENT_WEBHOOK_SECRET = "webhook-secret";

  const response = await POST(new Request("http://localhost/api/vercel/deployment-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildDeploymentReadyPayload()),
  }));

  assert.equal(response.status, 401);
});

test("Vercel deployment webhook rejects invalid signatures", async () => {
  process.env.VERCEL_DEPLOYMENT_WEBHOOK_SECRET = "webhook-secret";

  const response = await POST(new Request("http://localhost/api/vercel/deployment-webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Vercel-Signature": "deadbeef",
    },
    body: JSON.stringify(buildDeploymentReadyPayload()),
  }));

  assert.equal(response.status, 401);
});

test("Vercel deployment webhook ignores preview deployments", async () => {
  process.env.VERCEL_DEPLOYMENT_WEBHOOK_SECRET = "webhook-secret";
  process.env.VERCEL_PROJECT_ID = "prj_rtlFVOMFAWCRoJ3SQjHloi89881K";

  const body = JSON.stringify(buildDeploymentReadyPayload({ target: "preview" }));
  const response = await POST(createSignedWebhookRequest(body, "webhook-secret"));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    ignored: true,
    reason: "ignored non-production target: preview",
  });
});

test("Vercel deployment webhook ignores non-Fitness projects when VERCEL_PROJECT_ID is configured", async () => {
  process.env.VERCEL_DEPLOYMENT_WEBHOOK_SECRET = "webhook-secret";
  process.env.VERCEL_PROJECT_ID = "prj_rtlFVOMFAWCRoJ3SQjHloi89881K";

  const body = JSON.stringify(buildDeploymentReadyPayload({ projectId: "prj_other" }));
  const response = await POST(createSignedWebhookRequest(body, "webhook-secret"));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    ignored: true,
    reason: "ignored non-Fitness project: prj_other",
  });
});

test("Vercel deployment webhook creates a bounded draft for production-ready deployments", async () => {
  process.env.VERCEL_DEPLOYMENT_WEBHOOK_SECRET = "webhook-secret";
  process.env.VERCEL_PROJECT_ID = "prj_rtlFVOMFAWCRoJ3SQjHloi89881K";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null;

    if (url.pathname.endsWith("/rest/v1/discord_update_drafts") && init?.method === "GET") {
      return new Response("null", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/discord_update_drafts") && init?.method === "POST") {
      return new Response(JSON.stringify({
        id: "11111111-1111-4111-8111-111111111111",
        source: "vercel",
        status: "draft",
        deployment_id: body.deployment_id,
        deployment_url: body.deployment_url,
        production_url: body.production_url,
        vercel_project_id: body.vercel_project_id,
        vercel_project_name: body.vercel_project_name,
        vercel_target: body.vercel_target,
        git_commit_sha: body.git_commit_sha,
        git_commit_ref: body.git_commit_ref,
        git_commit_message: body.git_commit_message,
        user_facing_title: null,
        user_facing_changes: null,
        user_facing_why_it_matters: null,
        discord_channel_id: null,
        discord_message_id: null,
        published_by_discord_user_id: null,
        published_at: null,
        skipped_by_discord_user_id: null,
        skipped_at: null,
        skip_reason: null,
        webhook_received_at: body.webhook_received_at,
        created_at: body.created_at,
        updated_at: body.updated_at,
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url.toString()} (${String(init?.method ?? "GET")})`);
  };

  try {
    const body = JSON.stringify(buildDeploymentReadyPayload());
    const response = await POST(createSignedWebhookRequest(body, "webhook-secret"));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      ignored: false,
      created: true,
      draft_id: "11111111-1111-4111-8111-111111111111",
      deployment_id: "dpl_123",
      status: "draft",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

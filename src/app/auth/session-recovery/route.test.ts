import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";
import { GET } from "@/app/auth/session-recovery/route";

test("session recovery route clears auth cookies and redirects to login", async () => {
  const response = await GET(new NextRequest("https://example.com/auth/session-recovery?error=session_expired"));

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://example.com/login?error=session_expired");
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /sb-access-token=;/);
  assert.match(setCookie, /sb-refresh-token=;/);
});

test("session recovery route preserves forwarded host and protocol for login redirect", async () => {
  const request = new NextRequest("http://localhost:3002/auth/session-recovery?error=session_expired", {
    headers: {
      "x-forwarded-host": "127.0.0.1:3002",
      "x-forwarded-proto": "http",
      host: "localhost:3002",
    },
  });
  const response = await GET(request);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "http://127.0.0.1:3002/login?error=session_expired");
});

test("session recovery route preserves a safe returnTo path", async () => {
  const request = new NextRequest("https://example.com/auth/session-recovery?error=session_expired&returnTo=%2Fsession%2Fabc123");
  const response = await GET(request);

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "https://example.com/login?error=session_expired&returnTo=%2Fsession%2Fabc123",
  );
});

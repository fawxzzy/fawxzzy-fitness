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

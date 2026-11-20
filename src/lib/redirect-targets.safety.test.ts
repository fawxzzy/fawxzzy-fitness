import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server.js";

import { proxy } from "@/proxy";
import { resolveAuthConfirmRedirectPath } from "./auth-confirm-redirect.ts";
import { renderDevBootstrapDocument } from "./dev-auth-bootstrap-document.ts";
import { serializeStringForInlineScript } from "./inline-script.ts";

const BACKSLASH = String.fromCharCode(0x5c);

test("auth confirm only honours a safe in-app next after a verified link", () => {
  for (const hostile of ["//evil.com", "https://evil.com", `/${BACKSLASH}evil.com`, "/%5Cevil.com", "javascript:alert(1)", "/\t/evil.com"]) {
    assert.equal(resolveAuthConfirmRedirectPath(hostile, false), "/entry", JSON.stringify(hostile));
  }

  assert.equal(resolveAuthConfirmRedirectPath(null, false), "/entry");
  assert.equal(resolveAuthConfirmRedirectPath("", false), "/entry");
  assert.equal(resolveAuthConfirmRedirectPath("/today", false), "/today");
  assert.equal(resolveAuthConfirmRedirectPath("/settings?tab=account", false), "/settings?tab=account");
  assert.equal(resolveAuthConfirmRedirectPath("//evil.com", true), "/reset-password");
  assert.equal(resolveAuthConfirmRedirectPath("/today", true), "/reset-password");
});

test("auth confirm route sends its post-verify redirect through the resolver", () => {
  const source = readFileSync(new URL("../app/auth/confirm/route.ts", import.meta.url), "utf8");
  assert.match(source, /const redirectPath = resolveAuthConfirmRedirectPath\(next, /);
  assert.doesNotMatch(source, /next \|\| "\/entry"/);
});

test("inline script serialisation escapes characters that can break out of a script element", () => {
  const payload = "/</script><script>alert(1)</script>&x" + String.fromCharCode(0x2028) + String.fromCharCode(0x2029);
  const serialized = serializeStringForInlineScript(payload);

  assert.doesNotMatch(serialized, /[<>&]/);
  assert.equal(serialized.includes(String.fromCharCode(0x2028)), false);
  assert.equal(serialized.includes(String.fromCharCode(0x2029)), false);
  assert.ok(serialized.includes(`${BACKSLASH}u003c/script${BACKSLASH}u003e`));
  assert.ok(serialized.includes(`${BACKSLASH}u2028${BACKSLASH}u2029`));
  assert.equal(JSON.parse(serialized), payload);
});

test("dev bootstrap page never lets next close its inline script", () => {
  const html = renderDevBootstrapDocument({ nextPath: "/</script><script>alert(1)</script>" });
  assert.equal(html.match(/<\/script>/g)?.length, 1);
  assert.equal(html.includes("<script>alert(1)"), false);

  assert.match(renderDevBootstrapDocument({ nextPath: "//evil.com" }), /location\.replace\("\/today"\)/);
  assert.match(renderDevBootstrapDocument({ nextPath: "/history" }), /location\.replace\("\/history"\)/);
});

test("legacy-host redirect keeps a protocol-relative request path on the branded origin", async () => {
  for (const path of ["//evil.com/x", "///evil.com", "/%2F%2Fevil.com", `/${BACKSLASH}evil.com`]) {
    const response = await proxy(new NextRequest(`https://fawxzzy-fitness-local.vercel.app${path}`));
    const location = response.headers.get("location") ?? "";
    assert.equal(response.status, 308);
    assert.equal(new URL(location).origin, "https://fitness.fawxzzy.com", `${path} -> ${location}`);
  }
});

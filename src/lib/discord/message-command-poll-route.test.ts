import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "@/app/api/discord/message-commands/poll/route.ts";

test("Discord message-command poll route is retired on Fitness after DiscordOS cutover", async () => {
  const response = await GET(new Request("http://localhost/api/discord/message-commands/poll"));

  assert.equal(response.status, 410);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    ok: false,
    message: "DiscordOS now owns message-command polling. This Fitness endpoint is retired.",
  });
});

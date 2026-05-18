import assert from "node:assert/strict";
import test from "node:test";
import { decryptSpotifySecret, encryptSpotifySecret } from "./crypto.ts";

test("Spotify secret crypto round-trips refresh token payloads", () => {
  const ciphertext = encryptSpotifySecret("refresh-token-value", "state-secret");

  assert.notEqual(ciphertext, "refresh-token-value");
  assert.equal(decryptSpotifySecret(ciphertext, "state-secret"), "refresh-token-value");
});

test("Spotify secret crypto rejects malformed payloads", () => {
  assert.throws(() => decryptSpotifySecret("nope", "state-secret"), /Invalid Spotify secret payload/);
});

import assert from "node:assert/strict";
import test from "node:test";
import nacl from "tweetnacl";
import { verifyDiscordInteractionSignature } from "./interaction-signature.ts";

function toHex(value: Uint8Array): string {
  return Buffer.from(value).toString("hex");
}

test("verifyDiscordInteractionSignature accepts a valid Discord signature", () => {
  const keyPair = nacl.sign.keyPair();
  const timestamp = "1715702400";
  const rawBody = JSON.stringify({ type: 1 });
  const payload = new TextEncoder().encode(`${timestamp}${rawBody}`);
  const signature = nacl.sign.detached(payload, keyPair.secretKey);

  const isValid = verifyDiscordInteractionSignature({
    rawBody,
    timestamp,
    signature: toHex(signature),
    publicKey: toHex(keyPair.publicKey),
  });

  assert.equal(isValid, true);
});

test("verifyDiscordInteractionSignature rejects an invalid signature", () => {
  const keyPair = nacl.sign.keyPair();
  const timestamp = "1715702400";
  const rawBody = JSON.stringify({ type: 1 });

  const isValid = verifyDiscordInteractionSignature({
    rawBody,
    timestamp,
    signature: "00".repeat(64),
    publicKey: toHex(keyPair.publicKey),
  });

  assert.equal(isValid, false);
});

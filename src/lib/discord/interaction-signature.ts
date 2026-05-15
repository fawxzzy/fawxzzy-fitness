import "server-only";

import nacl from "tweetnacl";
import { DISCORD_PUBLIC_KEY } from "@/lib/env";

const textEncoder = new TextEncoder();

function hexToUint8Array(value: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) {
    return null;
  }

  const output = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    output[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }

  return output;
}

export function verifyDiscordInteractionSignature(args: {
  rawBody: string;
  signature: string;
  timestamp: string;
  publicKey?: string;
}): boolean {
  const publicKey = hexToUint8Array((args.publicKey ?? DISCORD_PUBLIC_KEY()).trim());
  const signature = hexToUint8Array(args.signature.trim());

  if (!publicKey || !signature) {
    return false;
  }

  const payload = textEncoder.encode(`${args.timestamp}${args.rawBody}`);
  return nacl.sign.detached.verify(payload, signature, publicKey);
}

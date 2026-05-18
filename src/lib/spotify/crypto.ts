import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const SPOTIFY_SECRET_FORMAT_VERSION = "v1";
const AES_GCM_ALGORITHM = "aes-256-gcm";
const AES_GCM_IV_BYTES = 12;

function encodeBase64Url(value: Uint8Array | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function deriveCipherKey(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSpotifySecret(plaintext: string, secret: string): string {
  const iv = randomBytes(AES_GCM_IV_BYTES);
  const cipher = createCipheriv(AES_GCM_ALGORITHM, deriveCipherKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    SPOTIFY_SECRET_FORMAT_VERSION,
    encodeBase64Url(iv),
    encodeBase64Url(authTag),
    encodeBase64Url(ciphertext),
  ].join(".");
}

export function decryptSpotifySecret(ciphertext: string, secret: string): string {
  const parts = ciphertext.split(".");
  if (parts.length !== 4 || parts[0] !== SPOTIFY_SECRET_FORMAT_VERSION) {
    throw new Error("Invalid Spotify secret payload.");
  }

  const [, ivPart, authTagPart, ciphertextPart] = parts;
  const decipher = createDecipheriv(
    AES_GCM_ALGORITHM,
    deriveCipherKey(secret),
    decodeBase64Url(ivPart),
  );
  decipher.setAuthTag(decodeBase64Url(authTagPart));

  return Buffer.concat([
    decipher.update(decodeBase64Url(ciphertextPart)),
    decipher.final(),
  ]).toString("utf8");
}

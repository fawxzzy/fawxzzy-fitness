import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const [directory, serializedRecord] = process.argv.slice(2);
if (!directory || !serializedRecord) {
  process.exitCode = 1;
} else {
  const record = JSON.parse(serializedRecord);
  const database = new PGlite(directory);
  await database.query(`
    create table if not exists auth_handoffs (
      handoff_digest text primary key,
      audience text not null,
      binding_digest text not null,
      issuer text not null,
      return_to text not null,
      expires_at timestamptz not null
    )
  `);
  await database.query(`
    insert into auth_handoffs (handoff_digest, audience, binding_digest, issuer, return_to, expires_at)
    values ($1, $2, $3, $4, $5, $6::timestamptz)
  `, [
    createHash("sha256").update(record.handoffId, "utf8").digest("base64url"),
    record.audience,
    record.bindingDigest,
    record.issuer,
    record.returnTo,
    new Date(record.expiresAt * 1000).toISOString(),
  ]);
  await database.close();
}

#!/usr/bin/env node
import { writePlaybookStatus } from './status.mjs';

async function main() {
  await writePlaybookStatus({ promoted: 0 });
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});

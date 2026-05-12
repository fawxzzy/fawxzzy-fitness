#!/usr/bin/env node
process.argv.push("--reset");
await import("./fitness-codex-seed.mjs");

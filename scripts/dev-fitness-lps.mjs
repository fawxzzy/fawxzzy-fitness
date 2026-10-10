console.error(
  "FITNESS_LEGACY_DEV_RETIRED: dev:fitness:lps is retired. " +
    "Configure .env.local or an explicit FITNESS_ENV_FILE for master or your local emulator, " +
    "then use the ordinary dev command.",
);
process.exitCode = 1;

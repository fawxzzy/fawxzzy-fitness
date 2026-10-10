console.error(
  "FITNESS_LEGACY_MIRROR_RETIRED: db:mirror:prod-to-local is retired. " +
    "Use retained recovery archives or explicit local fixtures. " +
    "Do not repoint this standalone public-schema mirror at shared master.",
);
process.exitCode = 1;

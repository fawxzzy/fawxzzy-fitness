// Legacy compatibility wrapper. The app icon contract now lives in
// scripts/generate-icons.mjs and is sourced from public/brand/fitness-app-icon-source.jpg.
// Keep this file so old muscle memory cannot regenerate stale root-level PWA icons.
await import("./generate-icons.mjs");

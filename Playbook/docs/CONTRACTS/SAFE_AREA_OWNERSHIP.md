# SAFE_AREA_OWNERSHIP

## Contract
AppShell owns safe-area inset handling and fixed-bar reserve spacing.

## Why
Central ownership prevents phantom gaps and content overlap.

## Machine signal (v1)
- WARN when safe-area tokens are defined outside AppShell-related ownership files.

## Audit Rules (v1)
- Target globs: ["src/**/*.tsx", "src/**/*.jsx", "src/**/*.css"]
- Forbidden regex: ["safe-area-inset-(top|bottom)"]
- Allowlist globs: ["src/**/AppShell*", "src/**/SafeArea*"]

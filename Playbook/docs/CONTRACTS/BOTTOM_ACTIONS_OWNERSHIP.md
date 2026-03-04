# BOTTOM_ACTIONS_OWNERSHIP

## Contract
Fixed bottom action bars should be owned by a shared shell/bar contract, not ad-hoc per screen.

## Why
Prevents overlap, spacing drift, and inconsistent reserve handling.

## Machine signal (v1)
- WARN when fixed `bottom-0` markers appear without centralized ownership.

## Audit Rules (v1)
- Target globs: ["src/**/*.tsx", "src/**/*.jsx", "src/**/*.css"]
- Forbidden regex: ["fixed[\\s\\S]*bottom-0", "bottom-0[\\s\\S]*fixed"]
- Allowlist globs: ["src/**/AppShell*", "src/**/BottomActionBar*"]

# SINGLE_SCROLL_OWNER

## Contract
A page shell should define one primary vertical scroll owner.

## Why
Multiple scroll containers cause sticky/context breakage and unstable mobile interactions.

## Machine signal (v1)
- WARN when files show repeated `overflow-y-auto` ownership signals.

## Audit Rules (v1)
- Target globs: ["src/**/*.tsx", "src/**/*.jsx", "src/**/*.css"]
- Forbidden regex: ["overflow-y-auto[\\s\\S]*overflow-y-auto"]
- Allowlist globs: ["**/*.test.tsx", "**/*.stories.tsx"]

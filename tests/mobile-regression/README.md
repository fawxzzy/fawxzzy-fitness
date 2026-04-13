# Mobile Regression Tests

This directory is the consolidated mobile-regression verification surface.

Canonical ownership stays with the implementation modules:

- Scenario inventory: `src/features/mobile-regression/fixtures.ts`
- Contract validation: `src/features/mobile-regression/contracts.ts`
- Board-generation wrapper: `scripts/build-mobile-regression-boards.py`

The tests here verify that the fixture inventory stays deterministic, the contract set stays enforced, and the review-board wrapper continues to emit the stable board outputs behind `npm run qa:boards`.

Run the repo-owned mobile-regression suite with:

```bash
npm run test:mobile-regression-fixtures
```

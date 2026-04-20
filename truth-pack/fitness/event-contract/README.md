# Fitness Event Contract Pack

This folder is the owner contract surface for the Atlas/Fitness event lane inside the Fitness repo.

Boundary rules:

- Fitness owns the canonical pack for app events, metrics vocabulary, and dashboard acceptance checks.
- Atlas contributes doctrine and shared vocabulary references, but does not duplicate this pack.
- Stack-root docs may project this pack read-only; they should not restate its contents as canonical truth.

Current contents:

- `atlas-fitness-wave-2-metrics-pack.v1.json`: frozen shared nouns, denominators, KPI definitions, funnel stages, correlation keys, and dashboard acceptance checks for the Wave 2 metrics lane.
- `atlas-fitness-funnel-dashboard-pack.v1.json`: first repo-owned funnel/dashboard consumer pack built from the frozen metrics pack and the shadow receipt sink.
- `atlas-fitness-growth-pack.v1.json`: first repo-owned Wave 2 growth pack that freezes eligibility, suppression, placement, attribution, deep-link, cohort, and acceptance rules for one shadow-only placement measured against the pinned metrics/dashboard packs.
- `atlas-fitness-growth-pilot-readiness-pack.v1.json`: repo-owned pilot gate for the same growth placement, freezing the sample floor, attribution floor, shadow CTR, activation and retention floors, suppression and duplicate caps, dismissal/complaint cap, sticky rollout cap, and the stay-shadow or rollback conditions required before one narrow live cohort can open.
- `schemas/atlas-fitness-wave-2-metrics-pack.schema.v1.json`: machine-readable shape for the metrics pack.
- `schemas/atlas-fitness-funnel-dashboard-pack.schema.v1.json`: machine-readable shape for the funnel/dashboard consumer pack.
- `schemas/atlas-fitness-growth-pack.schema.v1.json`: machine-readable shape for the growth pack.
- `schemas/atlas-fitness-growth-pilot-readiness-pack.schema.v1.json`: machine-readable shape for the pilot-readiness pack.

Operator rule:

- The recovery-reset lane stays shadow-only until `atlas-fitness-growth-pilot-readiness-pack.v1.json` passes in owner truth through `npm run evaluate:fitness-pilot-readiness`.

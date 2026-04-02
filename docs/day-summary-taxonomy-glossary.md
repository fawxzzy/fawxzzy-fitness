# Day Summary Taxonomy Glossary

Canonical day-summary vocabulary across Edit Day, View Day, Today, and routine cards:

- `rest` → `Rest day`
- `strength` → `<n> strength`
- `cardio` → `<n> cardio`
- mixed days → `<total> total • <strength> strength • <cardio> cardio`
- unknown classification bucket → `<n> unknown`

## Guardrails

- Do not introduce `other` in day-summary labels.
- Do not surface fallback labels like `unknown` for normal, classified strength/cardio rows; reserve `unknown` for genuinely unresolved metadata only.
- Keep aggregate order deterministic: `total`, `strength`, `cardio`, then `unknown`.
- Rest-day label is canonical and route-agnostic: `Rest day`.

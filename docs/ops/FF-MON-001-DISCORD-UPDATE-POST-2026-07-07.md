# FF-MON-001 Discord Update Post - 2026-07-07

## Update

FF-MON-001 recurring Pro billing proof moved forward, but live paid production remains **NO-GO**.

What changed:

Completed:
- verified the app Pro surface around the current `$5/month` subscription model
- completed a Stripe sandbox Checkout purchase with a disposable QA account
- verified Stripe Customer Portal access and cancel-at-period-end behavior
- confirmed app access remains active through the paid period after cancellation
- fixed local webhook customer sync so subscription updates do not wipe billing email
- updated FF-MON-001, FF-QA-001, FF-LEGAL-001, and monetization roadmap docs with the real proof state
- repo verification passed after the billing proof/doc updates

Important blocker found:
- the enabled sandbox webhook endpoint delivered events, but the first natural fulfillment wrote legacy lifetime entitlement rows for a monthly Checkout session
- current local webhook replay writes the correct `pro_subscription` purchase and `pro` entitlement
- production/stable webhook freshness still needs a deployed-code proof before live paid launch

Current launch status:
- sandbox Checkout proof: complete
- Customer Portal cancel proof: complete
- app entitlement proof: complete after current-code replay
- live paid production: blocked

Remaining before live paid production:
- deploy/review the current webhook code only after UI/legal approval
- run a natural Stripe sandbox Checkout against the stable endpoint and verify it writes `pro_subscription`/`pro` without local replay
- finish private billing/privacy/deletion support path
- finish legal/business decisions
- run final FF-QA-001 launch smoke matrix

Proof:
- Stripe sandbox Checkout reached hosted payment and completed with test-mode card data
- Customer Portal showed the active `$5/month` subscription and cancellation behavior
- app DB and UI proof confirmed the corrected current-code subscription entitlement shape
- `npm run typecheck` passed
- targeted billing subscription tests passed
- `npm run verify` passed

No production paid deployment was made in this pass.

<!-- discordos-update-post-receipt:start -->
## Discord Publication

- status: `sent`
- sends messages: `true`
- Discord HTTP status: `200`
- channel id: `1504671871512346695`
- message id: `1524140949066879130`
- timestamp: `2026-07-07T19:51:59.427000+00:00`
- mentions disabled: `true`
<!-- discordos-update-post-receipt:end -->

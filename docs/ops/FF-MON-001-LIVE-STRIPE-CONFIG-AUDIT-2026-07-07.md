# FF-MON-001 Live Stripe Config Audit - 2026-07-07

## Status

Live paid production is Final QA / Soft-Launch Candidate, but public checkout is still disabled until explicit enablement.

Sandbox checkout, Customer Portal, current-deploy sandbox webhook freshness, live env installation, production redeploy, live public support email, live Customer Portal settings, bounded no-charge live webhook smoke, bounded live paid checkout, live paid Customer Portal cancel-at-period-end proof, receipt dedupe repair, legal/operator accepted-risk posture, accepted downgrade-equivalent proof, FF-SEC accepted-risk closure, and beta-skip risk acceptance are proof-closed for MVP. Live paid launch is still not open to real users because final whole-app launch smoke and explicit public-checkout enablement remain open.

## Scope

Read-only review of the live Stripe account and Vercel production environment shape before enabling real paid checkout.

## Live Stripe Account Reviewed

- Account: `acct_1ToSxw1n5lBbRYoV`
- Dashboard label: `fawxzzy`
- Mode: live dashboard routes, not `/test`

## Live Product / Price Findings

Live product catalog contains an active `$5/month` recurring price:

- Product id: `prod_Uo67WohHiQI1qE`
- Product name: `Fawxzzy Fitness Pro Monthly`
- Price id: `price_1ToU8R1n5lBbRYoV3VmWk3n6`
- Unit price: `$5.00 / month`
- Currency: `USD`
- Type: flat rate
- Interval: monthly
- Default price: yes
- Active subscriptions: `0`

Closure receipt:

- On `2026-07-07`, the live product was renamed from `test` to `Fawxzzy Fitness Pro Monthly`.
- Stripe Dashboard logs showed `POST /v1/products/prod_Uo67WohHiQI1qE 200 OK`.
- The product details page showed active `$5.00 USD` monthly recurring pricing after the rename.

## Live Webhook Findings

The live account now has a configured webhook destination.

Configured live webhook destination:

- URL: `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe`
- Destination id: `we_1Tqldd1n5lBbRYoVkvltrp1J`
- Description: `Live Stripe billing webhook for Fawxzzy Fitness Pro subscription events.`
- Status: enabled
- Events must include at minimum:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Closure receipt:

- On `2026-07-07`, a live Workbench webhook destination was created.
- The destination page showed the stable production alias endpoint URL.
- The destination page showed `Listening to 6 events`.
- The six displayed events matched the then-required event list from the `2026-07-07` pass.
- On `2026-07-07`, the dashboard-created endpoint `we_1TqlES1n5lBbRYoVNF2MxcIq` was replaced with API-created endpoint `we_1Tqldd1n5lBbRYoVkvltrp1J` so the signing secret could be captured at creation time without printing it.
- Stripe API readback showed exactly one live webhook endpoint, targeting the stable production alias, listening to the six required billing events.
- Vercel production `STRIPE_WEBHOOK_SECRET` was replaced with the signing secret for `we_1Tqldd1n5lBbRYoVkvltrp1J`.

Follow-up app-side requirement:

- On `2026-07-08`, the source webhook handler was expanded to process `invoice.payment_failed` through the same subscription-status policy used for cancellation/dunning truth.
- On `2026-07-08`, the live Stripe webhook destination was expanded to the seven-event list above, including `invoice.payment_failed`.
- On `2026-07-09`, production deploy `dpl_ChzYfyQjfdagrpdYaev28LvQHert` included the current webhook handler and subscription receipt dedupe repair.

## Live Customer Portal Findings

Live Customer Portal settings are ready at the Dashboard configuration layer:

- Invoice history: enabled
- Customer information: enabled
- Payment methods: enabled
- Cancel subscriptions: enabled
- Cancel behavior: cancel at end of billing period is available
- Cancel immediately: available in settings
- Subscription plan switching: not enabled
- Quantity changes: not enabled

Customer Portal / public details closure:

- Terms of service link: set to `https://fawxzzy-fitness-local.vercel.app/terms`.
- Privacy policy link: set to `https://fawxzzy-fitness-local.vercel.app/privacy`.
- Customer support email: set to `fawxzzy@gmail.com` in live `Business details > Public details`.
- Portal redirect/return behavior was later confirmed through the bounded live paid customer flow on `2026-07-09`.
- Customer Portal settings showed `Legal policies` links are managed through `Public business information`; no separate Customer Portal support-email field was exposed in the portal settings page.

Attempted closure:

- The live Stripe `Business details > Public details` form exposed `Privacy policy URL` and `Terms of service URL` fields.
- The intended URLs were filled:
  - `https://fawxzzy-fitness-local.vercel.app/privacy`
  - `https://fawxzzy-fitness-local.vercel.app/terms`
- Stripe Dashboard then showed an internal page issue and did not close the form or persist the values.
- A reload confirmed those links were not saved in that pass.
- A Stripe API account update was also attempted, but Stripe rejects updating the platform account's own business profile through that `accounts.update` method; that API path is only allowed for connected accounts.
- Follow-up Dashboard pass from the signed-in in-app browser reopened `Business details > Public details`, confirmed both URL fields contained the production app routes, saved the modal, and reopened the editor to verify the persisted values.
- Follow-up Dashboard pass on `2026-07-08` reopened `Business details > Public details`, filled `Customer support email` with `fawxzzy@gmail.com`, saved the modal, and read back the public details block showing `Support email` as `fawxzzy@gmail.com`.
- Follow-up Dashboard pass on `2026-07-08` opened live `Billing > Customer portal` settings and confirmed invoice history, customer information, payment methods, cancel subscriptions, cancel immediately, cancel at end of billing period, Terms link, Privacy link, and Public business information are visible in the live portal configuration.

Follow-up closure:

- On `2026-07-09`, the operator explicitly approved one bounded live `$5/month` paid smoke.
- Live QA account `atlas-fitness-live-paid-smoke@fawxzzy.test` completed Checkout Session `cs_live_a10u8ZHl7q2gQszAO07cqzGLMBrQAxPpVToGBPAaMcqH1G0aJ1r6F5za3m`, creating customer `cus_Uqsoov3SXetpJ3` and subscription `sub_1TrBAy1n5lBbRYoVnmxAwmFx`.
- The app-started Customer Portal opened for that customer and cancel-at-period-end was completed.
- The app returned to `/settings?section=pro` and showed active Pro access through `2026-08-09` with `Cancels at period end`.
- This closes the bounded live paid Customer Portal return/customer/cancel proof. It does not close public launch approval or final whole-app launch smoke.

## Vercel Production Env Findings

`vercel env ls production` confirms these billing variables exist in production:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRO_STANDARD_PRICE_ID`
- `STRIPE_PRO_ACTIVE_PRICE_MODE`

Latest Vercel env metadata readback on `2026-07-07` confirms these production variables were refreshed during the live-config pass:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRO_STANDARD_PRICE_ID`
- `STRIPE_PRO_ACTIVE_PRICE_MODE`

Sensitive values are intentionally not printed or stored in this doc.

Closure receipt:

- On `2026-07-07`, production `STRIPE_PRO_STANDARD_PRICE_ID` was replaced with `price_1ToU8R1n5lBbRYoV3VmWk3n6`.
- On `2026-07-07`, production `STRIPE_PRO_ACTIVE_PRICE_MODE` was replaced with `standard`.
- The first PowerShell write warned about newline input; both variables were immediately removed and re-added with no-newline input.
- `vercel env ls` showed both variables refreshed in Production seconds later.
- On `2026-07-07`, production `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_PUBLISHABLE_KEY` were replaced with live publishable key values read from the live Stripe Dashboard without printing them.
- On `2026-07-07`, production `STRIPE_SECRET_KEY` was replaced with the operator-provided live secret key.
- On `2026-07-07`, production `STRIPE_WEBHOOK_SECRET` was replaced with the signing secret from API-created live endpoint `we_1Tqldd1n5lBbRYoVkvltrp1J`.

- A production redeploy was performed after these env updates and after the app-side env-normalization guard was added.

Production env repair receipt on `2026-07-07`:

- `vercel env pull --environment=production` showed `STRIPE_SECRET_KEY`, `STRIPE_PRO_STANDARD_PRICE_ID`, and `STRIPE_PRO_ACTIVE_PRICE_MODE` were present but empty due to the prior stdin write path.
- `STRIPE_SECRET_KEY` was removed and re-added using the operator-approved live server key.
- `STRIPE_PRO_STANDARD_PRICE_ID` was removed and re-added as `price_1ToU8R1n5lBbRYoV3VmWk3n6`.
- `STRIPE_PRO_ACTIVE_PRICE_MODE` was removed and re-added as `standard`.
- The Vercel CLI stored literal `\r\n` suffixes from stdin for the repaired values; `src/lib/env.ts` now normalizes those suffixes before config validation.
- Redacted production env readback showed cleaned values with expected prefixes and lengths:
  - `STRIPE_SECRET_KEY`: `sk_live_...`, cleaned length `107`
  - `STRIPE_PRO_STANDARD_PRICE_ID`: `price_1T...`, cleaned length `30`
  - `STRIPE_PRO_ACTIVE_PRICE_MODE`: `standard`, cleaned length `8`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: `pk_live_...`, cleaned length `107`
  - `STRIPE_WEBHOOK_SECRET`: `whsec_tj...`, cleaned length `38`

Production redeploy receipt on `2026-07-07`:

- `npm run verify`: passed.
- `npm run test:billing`: passed, `23/23`.
- Production deployment id: `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R`.
- Deployment URL: `https://fawxzzy-fitness-r8ydk24r0-fawxzzy.vercel.app`.
- Stable alias: `https://fawxzzy-fitness-local.vercel.app`.
- `vercel inspect fawxzzy-fitness-local.vercel.app` confirmed the stable alias points at `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R`.
- `GET /api/app-version`: `200`.
- `GET /settings?section=pro` without auth: `307` to `/login`, expected protected-route behavior.

Bounded no-charge live smoke receipt on `2026-07-07`:

- Live webhook endpoint readback showed exactly one enabled endpoint:
  - `we_1Tqldd1n5lBbRYoVkvltrp1J`
  - `https://fawxzzy-fitness-local.vercel.app/api/billing/webhook/stripe`
  - events: `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
  - required follow-up before final paid smoke: deploy the failed-payment handler, then verify/add `invoice.payment_failed`
- Created live Checkout Session `cs_live_a1EQzcOj0aivMIdcA3kF04VXa2WB9AgxFRqFtgqCCsUVrOLTxSsAxPLHIZ` in `subscription` mode and immediately expired it without payment.
- Expired session status: `expired`; payment status: `unpaid`.
- Stripe event `evt_1TqmOH1n5lBbRYoVW3er3wW4` type `checkout.session.expired` reached `pending_webhooks=0`.
- Vercel production logs showed `POST /api/billing/webhook/stripe` on `fawxzzy-fitness-local.vercel.app` returned `200` at `2026-07-07 23:43:18 EDT`.
- No live payment was completed and no real customer was charged.

## Required Live-Mode Closure Steps

1. ~~Rename or replace the live monthly product named `test`.~~ Completed: product is now `Fawxzzy Fitness Pro Monthly`.
2. ~~Set live Stripe legal public business links.~~ Completed:
   - Terms of Service
   - Privacy Policy
3. ~~Set live Stripe public support email.~~ Completed: `fawxzzy@gmail.com`.
4. ~~Confirm Customer Portal redirect/return behavior from an app-started live Customer Portal session.~~ Completed for bounded live paid QA customer on `2026-07-09`.
5. ~~Create the live webhook destination for the production endpoint.~~ Completed: `we_1Tqldd1n5lBbRYoVkvltrp1J`.
6. ~~Copy the live webhook signing secret into Vercel production.~~ Completed for `we_1Tqldd1n5lBbRYoVkvltrp1J`.
7. ~~Re-verify production Stripe key modes during bounded live smoke.~~ Completed by redacted env readback plus no-charge live Checkout Session creation.
8. ~~Replace production recurring price id with the final live `$5/month` recurring price id.~~ Completed for `STRIPE_PRO_STANDARD_PRICE_ID`.
9. ~~Redeploy production after env changes.~~ Completed: `dpl_HZKzo5XwakgyBj1KGBdpNS1HbK1R`.
10. ~~Run a bounded live-mode readiness smoke without charging a real user.~~ Completed for no-charge checkout-session expiration and signed webhook delivery.
11. ~~Deploy the failed-payment handler and verify the live endpoint listens for `invoice.payment_failed`.~~ Completed; production deploy `dpl_ChzYfyQjfdagrpdYaev28LvQHert` includes the handler, and endpoint readiness includes `invoice.payment_failed`.
12. ~~Run the bounded live paid transaction smoke only after operator approves the exact real-money handling.~~ Completed for one `$5/month` QA subscription on `2026-07-09`.
13. ~~Recheck final downgrade truth after the live paid subscription period ends on `2026-08-09`, unless an accepted equivalent proof replaces it.~~ Superseded for MVP by accepted sandbox/test-clock downgrade-equivalent proof. Do not claim the actual live `2026-08-09` downgrade occurred until it is rechecked after that date.
14. Run final `FF-QA-001` launch smoke.
15. Explicitly approve and enable public checkout only after final smoke passes.

## Current Call

Live paid launch remains guarded.

The app-side recurring subscription implementation, live paid Customer Portal path, webhook receipt dedupe repair, legal/operator accepted-risk posture, beta-skip risk acceptance, FF-SEC accepted-risk closure, and accepted downgrade-equivalent proof are strong enough to proceed to the final `FF-QA-001` smoke. Public checkout must remain disabled until that smoke passes and the enable step is explicitly approved.

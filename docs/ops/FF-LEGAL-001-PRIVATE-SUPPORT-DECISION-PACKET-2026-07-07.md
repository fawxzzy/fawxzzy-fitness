# FF-LEGAL-001 Private Support Decision Packet - 2026-07-07

## Status

Live paid production is still NO-GO.

This packet converts the remaining private support, privacy, deletion, billing, refund, and sensitive wellness support gap into explicit operator decisions. It does not replace legal review.

## Next Blocker Order

1. Decide monitored private support path:
   - billing
   - privacy/deletion
   - refunds
   - account recovery
   - sensitive wellness/account issues
2. Decide business/legal posture:
   - legal identity
   - launch geography
   - counsel review of accepted refund/cancellation/deletion posture
   - governing law / venue / dispute posture
3. Resolve counsel-only health/privacy questions:
   - Washington consumer health-data exposure
   - FTC Health Breach Notification Rule classification
   - minors/teen posture
4. Complete beta proof.
5. Run final paid smoke only after the above are accepted:
   - successful live checkout after explicit operator approval
   - subscription creation
   - entitlement grant
   - Customer Portal
   - cancel-at-period-end
   - failed-payment states
   - final downgrade

Current implementation status on 2026-07-08:

- Product-facing legal pages and support copy exist.
- Stripe sandbox billing proof is closed.
- Live-mode no-charge webhook proof is closed.
- Live paid launch is still blocked on counsel-only geography, governing-law, venue, dispute, and health/privacy classification decisions, plus final billing smoke proof.

## Current Product State

The app now exposes the accepted MVP product-facing support path:

- Sensitive support points to the monitored email `fawxzzy@gmail.com`.
- Discord remains the community/product-discussion entry point.
- Users are warned not to post sensitive account, billing, privacy, or health-related information in public Discord channels.
- Billing, privacy, deletion, account recovery, refund, and sensitive wellness requests are directed to monitored email.
- `/privacy` and `/terms` are reachable without an authenticated session.
- Stable production alias proof on `2026-07-07` confirmed both legal routes render public legal copy and the interim support warning.

This is enough for sandbox/operator review. It still needs final live-route proof after deployment and counsel review for the counsel-only items below.

## Decision 1 - Monitored Private Support Intake

Pick exactly one launch contract.

### Option A - Discord Private Support For MVP

Use the official Fawxzzy Fitness Discord community as the public entry point. Sensitive requests must move into a private thread, direct support exchange, or restricted support channel before account details, billing identifiers, screenshots, or wellness context are discussed.

Status: `Rejected for paid launch`. Discord remains community/product discussion only.

Required operator commitments:

- Monitor Discord support daily during paid launch.
- Keep public channels free of account, billing, privacy, deletion, refund, and health-sensitive details.
- Record private request status outside the public Discord channel.
- Define who can access private support exchanges.
- Define response expectations for paid billing/privacy/deletion requests.

Launch risk:

- Lower setup cost, but weaker operational/legal posture than a dedicated mailbox or ticket path.
- Must be explicitly accepted by the business before launch.

### Option B - Dedicated Monitored Mailbox

Provision a monitored support mailbox and keep Discord as community/support discovery only.

Status: `Accepted for MVP` using `fawxzzy@gmail.com`.

Recommended examples:

- `support@...`
- `privacy@...`
- `billing@...`

Required operator commitments:

- The mailbox is actually monitored.
- Deletion, billing, refund, account recovery, and privacy requests have a written handling checklist.
- Legal docs and app surfaces are updated to include the mailbox.

Launch risk:

- Stronger paid-launch posture and easier audit trail.
- Requires mailbox provisioning and monitoring discipline.

### Option C - Ticketing/Helpdesk

Provision a support desk and route billing/privacy/deletion/refund/account recovery requests through ticket forms.

Launch risk:

- Best operational posture, but likely heavier than MVP needs.

## Decision 2 - Account Deletion With Active Subscription

Before live paid launch, define the exact behavior when a user requests account deletion while a Stripe subscription is active.

Recommended MVP contract:

- Verify the requester controls the Fitness account.
- Direct the user to cancel self-serve through Stripe Customer Portal when possible.
- If deletion is requested before the paid period ends, preserve only the minimum billing/dispute records required for payment, fraud, tax/accounting, and legal reasons.
- Delete or de-identify active app/workout records where reasonably available.
- Do not imply deleting the app or account automatically cancels an active Stripe subscription unless that is implemented and verified.

Launch blocker:

- The app must not leave users with an unmanaged paid subscription after they request deletion.

## Decision 3 - Refund Posture

Before live paid launch, decide the refund policy for the launch geography.

Required decision fields:

- Refund window, if any.
- Whether partial-month refunds are offered.
- Whether accidental duplicate payments are refunded.
- How disputes/chargebacks are handled.
- Whether refunds are processed only through Stripe.

Current state:

- Refund language is not counsel-final.
- Do not launch live paid subscription sales until this is accepted.

## Decision 4 - Launch Geography And Health-Data Review

Before live paid launch, decide the launch geography.

Required checks:

- Whether launch is United States only, Canada only, US + Canada, or broader.
- Whether Washington users can access paid launch.
- Whether workout/progression data triggers consumer health-data obligations.
- Whether FTC Health Breach Notification Rule exposure needs counsel review.

Current state:

- This remains open.

## Decision 5 - Legal Identity And Dispute Terms

Before live paid launch, confirm:

- Operating entity / business name.
- Governing law.
- Venue.
- Dispute process.
- Third-party provider list the business is willing to name publicly.

Current state:

- Draft legal copy is stronger, but not counsel-closed.

## Decision Blocker Table

Use this as the short-form closure table for the remaining decision blockers.

| Decision | Option A | Option B | Option C | Recommended default | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Legal identity | `Fawxzzy Fitness` | `Fawxzzy` | formal entity name | counsel to choose | counsel/operator | Open |
| Launch geography | U.S. only | Canada + U.S. | broader launch | start narrow | operator + counsel | Open |
| Support path | Discord only | Gmail + Discord | branded email + Discord | private email + Discord community | operator | Accepted for MVP |
| Refund policy | discretionary | short published window | required-by-law only | discretionary + duplicate/accidental review + required-by-law carveout | counsel/operator | Drafted |
| Account deletion vs subscription | delete account only | cancel then delete | user-choice workflow | documented support workflow | operator + counsel | Drafted |
| Governing law | TBD | TBD | TBD | counsel only | counsel | Open |
| Washington MHMDA posture | exclude Washington | add Washington-specific policy/controls | counsel says not covered | counsel only | counsel | Open |
| FTC HBNR posture | not covered | covered vendor posture | service-provider posture | counsel only | counsel | Open |

## Minimum Launch Closure Checklist

- [x] Support intake option chosen and written into legal docs.
- [x] Discord private support rejected for paid launch; Discord remains community/discovery only.
- [x] Mailbox support route chosen: `fawxzzy@gmail.com`.
- [x] Account deletion with active Stripe subscription procedure is written.
- [x] Customer Portal cancellation settings are live and verified at the Stripe Dashboard settings layer.
- [x] Refund posture is drafted for MVP: manual Stripe review, no guaranteed automatic refund window, no default partial-month promise.
- [ ] Customer Portal cancellation must still be proven from an app-started paid customer flow.
- [ ] Refund posture is counsel/operator-final for launch geography.
- [ ] Launch geography is finalized.
- [ ] Consumer health-data exposure is reviewed for launch geography.
- [ ] Governing law, venue, and dispute language are finalized.
- [ ] Final legal docs are reviewed by counsel or explicitly accepted by the operator as MVP risk.

## Operator Decision Form

Use this section as the final pre-launch decision record. Do not mark `FF-LEGAL-001` closed until every required row has an accepted value.

| Decision | Accepted value | Required before live paid launch |
| --- | --- | --- |
| Support intake | `Accepted - monitored email: fawxzzy@gmail.com` | Product copy must direct billing/privacy/deletion/refund/account-recovery/sensitive support to monitored email. Discord remains community/discovery only. |
| Support monitoring owner | `Accepted - Zachariah John Harold Redfield` | Operator checks the inbox during paid launch. |
| Paid-support response expectation | `Accepted - daily launch check; billing/deletion/refund priority` | Exact SLA can be tightened later; do not imply instant support. |
| Refund window | `Accepted - manual Stripe review; no guaranteed automatic refund window` | Refunds remain subject to law, checkout terms, Stripe evidence, duplicate-payment evidence, and operator approval. |
| Partial-month refunds | `Accepted - not guaranteed` | Partial-month refunds may be approved case by case, but are not promised by default. |
| Duplicate payment handling | `Accepted - manual Stripe review and refund when verified as duplicate/accidental` | Keep Stripe receipt evidence before refund. |
| Account deletion with active subscription | `Accepted - cancel through Stripe Customer Portal or support-assisted Stripe cancellation before destructive deletion` | Do not leave an unmanaged active subscription after deletion request. |
| Data retention after deletion | `Accepted - delete/de-identify active account and workout records where reasonably available; retain limited billing/dispute/tax/security/legal records as needed` | Do not promise full immediate erasure of records needed for payment, fraud, tax/accounting, security, backups, disputes, or legal reasons. |
| Launch geography | `Provisional - U.S.-first paid pilot; no intentional non-U.S. paid launch until reviewed` | TikTok/public promotion can reach broader users; treat live paid launch as not geography-closed until counsel or geo/availability controls are chosen. |
| Washington consumer health-data posture | `Counsel-blocked / no-go for Washington-specific paid launch claims` | Review My Health My Data Act exposure before intentional Washington launch. |
| FTC Health Breach Notification Rule posture | `Counsel-blocked / classify before broad paid launch` | Review whether the product is a covered health app/vendor before broad paid launch. |
| Legal identity / business name | `Provisional - Fawxzzy Fitness / Fawxzzy brand operated by Zachariah John Harold Redfield` | Counsel/operator must decide exact public legal identity before live paid launch. |
| Governing law | `Counsel-blocked` | Replace placeholder before launch. |
| Venue / dispute process | `Counsel-blocked` | Replace placeholder before launch. |
| Provider list | `Accepted draft - Stripe, Vercel, Supabase, Discord, analytics/diagnostics as implemented` | Reconfirm before launch against actual deployed services. |

## Recommended MVP Defaults For Review

These are now the accepted MVP defaults unless counsel or implementation proof overrides them:

- Support intake: monitored mailbox at `fawxzzy@gmail.com` for billing/privacy/deletion/refund/account recovery and sensitive wellness/account issues; Discord remains community entry and product discussion only.
- Response expectation: check paid-support inbox daily during launch; urgent billing/deletion requests get first priority.
- Refund posture: manual Stripe refund review for duplicate payments, accidental immediate purchases, and support-approved exceptions; no promise of automatic partial-month refunds unless counsel/operator chooses that.
- Deletion with active subscription: require cancellation through Stripe Customer Portal or operator-assisted Stripe cancellation before destructive account deletion; preserve minimum billing/dispute/tax/security records.
- Launch geography: start with a deliberately narrow U.S.-first paid pilot until counsel reviews consumer health-data exposure and any required geography controls.
- Legal identity: provisional public identity is Fawxzzy Fitness / Fawxzzy brand operated by Zachariah John Harold Redfield.
- Governing law/venue/dispute posture: counsel-blocked; do not invent final terms.

## Current Recommendation

For a real paid launch, use Option B: a monitored support mailbox for billing, privacy, deletion, account recovery, refund, and sensitive wellness requests, while keeping Discord as the community entry point.

If Option A is used for MVP, mark the launch decision explicitly as an accepted business risk and keep sensitive details out of public Discord channels.

## 2026-07-08 Operator Decision Receipt

Accepted:

- Sensitive support uses monitored email: `fawxzzy@gmail.com`.
- Refunds use manual Stripe review; verified duplicate/accidental payments can be refunded through Stripe.
- Partial-month refunds are not promised by default.
- Cancellation should be self-serve through Stripe Customer Portal when available; support can assist when self-service fails.
- Account deletion does not automatically cancel billing. Active subscriptions must be cancelled through Stripe or support before destructive account deletion.
- After deletion, account recovery is not promised. Limited billing/dispute/tax/security/legal records may be retained.
- Brand/legal identity is provisionally `Fawxzzy Fitness / Fawxzzy`, operated by `Zachariah John Harold Redfield`.

Still no-go / counsel-blocked:

- final governing law
- final venue and dispute posture
- Washington consumer health-data posture
- FTC Health Breach Notification Rule classification
- whether a public TikTok launch requires geography controls or extra legal copy before live paid availability

## Current Readiness Call

Closed for MVP documentation:

- monitored private support path
- refund posture draft
- duplicate payment handling draft
- active-subscription deletion procedure draft
- provisional brand/operator identity
- Stripe Customer Portal settings-layer cancellation availability

Still open before live paid launch:

- counsel/operator final approval for launch geography
- counsel/operator final approval for legal identity, governing law, venue, and dispute posture
- counsel review or explicit risk acceptance for Washington consumer health-data and FTC Health Breach Notification Rule exposure
- app-started Customer Portal cancellation proof from a bounded paid customer
- beta proof in `FF-BETA-001`
- final paid smoke in `FF-QA-001`

This packet is now a decision/proof tracker. It should not be treated as counsel signoff.

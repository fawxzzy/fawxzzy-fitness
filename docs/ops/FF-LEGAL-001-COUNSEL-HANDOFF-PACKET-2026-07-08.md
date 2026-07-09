# FF-LEGAL-001 Counsel Handoff Packet - 2026-07-08

Card: `FF-LEGAL-001 - Add Privacy Policy and Terms of Service`

## Status

Live paid production remains `NO-GO`.

This packet is not legal advice. It converts the remaining legal/business uncertainty into a focused review packet for counsel or an explicit operator risk decision.

## Current Product Facts

- Product: Fawxzzy Fitness, a workout tracking and progression app.
- Paid model: `$5/month` recurring Pro subscription.
- Payment provider: Stripe Checkout in subscription mode plus Stripe Customer Portal for billing management.
- Current Pro gates: capacity-only MVP gates.
  - Free tier: up to 3 routines.
  - Free tier: up to 14 saved workout plans.
  - Pro tier: unlimited routines and saved workout plans.
- Support inbox: `fawxzzy@gmail.com`.
- Community invite: `https://discord.gg/tnnV7BNJ7h`.
- Current legal routes:
  - `https://fawxzzy-fitness-local.vercel.app/privacy`
  - `https://fawxzzy-fitness-local.vercel.app/terms`
- Current operator identity draft: Fawxzzy Fitness / Fawxzzy, operated by Zachariah John Harold Redfield.

## Current Proof State

Closed/defined:

- Stripe sandbox checkout proof.
- Stripe sandbox Customer Portal proof.
- Live Stripe public support email proof.
- Live Stripe Customer Portal settings proof.
- Live no-charge expired-session webhook proof.
- Draft refund/deletion/support posture.

Still not closed:

- Successful live subscription checkout.
- Live Customer Portal customer-flow and cancellation proof.
- Failed-payment proof.
- Beta evidence.
- Final paid smoke.
- Counsel/business decisions listed below.

## Decision Status Table

| Decision | Default / Proposed Answer | Owner | Launch Impact | Status |
| --- | --- | --- | --- | --- |
| Legal identity | Fawxzzy Fitness / Fawxzzy, operated by Zachariah John Harold Redfield | Counsel/operator | Blocks live paid launch | Open |
| Launch geography | U.S.-first paid pilot; no intentional broad non-U.S. paid launch until reviewed | Counsel/operator | Blocks live paid launch | Open |
| Support path | `fawxzzy@gmail.com` for billing, privacy, deletion, refund, account recovery, and sensitive support; Discord community for product/community discussion only | Operator/counsel | Accepted unless counsel changes | Accepted |
| Refund posture | Duplicate/accidental payments reviewed case by case; no guaranteed partial-month refunds unless required by law or stated at checkout | Counsel/operator | Blocks live paid launch until approved | Open |
| Account deletion vs subscription | Deleting the app/account does not automatically cancel Stripe; active subscriptions should be cancelled through Portal or support before destructive deletion | Counsel/operator | Blocks live paid launch until approved | Open |
| Governing law / venue / disputes | TBD | Counsel | Blocks live paid launch | Open |
| Washington MHMDA | TBD; counsel-only if Washington users can access the app | Counsel | Blocks launch geography decision | Open |
| FTC Health Breach Notification Rule | TBD; counsel-only health/privacy classification | Counsel | Blocks health/privacy posture | Open |
| Minors / teens | Not under 13; minors require parent/guardian permission, pending counsel review | Counsel/operator | Blocks live paid launch until approved | Open |
| Provider list / data sharing | Stripe, Vercel, Supabase, Discord, and analytics/diagnostics if enabled | Counsel/operator | Blocks privacy closeout until reviewed | Open |

These decisions block live paid launch. They do not block safe beta execution, sandbox proof, no-charge webhook proof, or guarded deployed-source proof while public checkout remains disabled.

## Source Links For Review

- Stripe Billing subscriptions guidance: `https://docs.stripe.com/billing/subscriptions/designing-integration`
- Stripe Customer Portal guidance: `https://docs.stripe.com/customer-management/integrate-customer-portal`
- Stripe Checkout subscription mode guidance: `https://docs.stripe.com/payments/checkout/build-subscriptions`
- ROSCA / negative option statute: `https://uscode.house.gov/view.xhtml?req=(title:15%20section:8403%20edition:prelim)`
- FTC negative option guidance: `https://www.federalregister.gov/documents/2021/11/04/2021-24094/enforcement-policy-statement-regarding-negative-option-marketing`
- FTC Health Breach Notification Rule: `https://www.ftc.gov/business-guidance/privacy-security/health-privacy`
- FTC 2024 HBNR update: `https://www.ftc.gov/news-events/news/press-releases/2024/04/ftc-finalizes-changes-health-breach-notification-rule`
- Washington My Health My Data Act AG page: `https://www.atg.wa.gov/protecting-washingtonians-personal-health-data-and-privacy`
- Washington My Health My Data Act statute: `https://app.leg.wa.gov/RCW/default.aspx?cite=19.373&full=true`

## Decisions Needed Before Live Paid Launch

### 1. Legal Identity

Question:

- What exact legal/business identity should appear in the Terms, Privacy Policy, Stripe public details, and support copy?

Current draft:

- Fawxzzy Fitness / Fawxzzy, operated by Zachariah John Harold Redfield.

Counsel/operator must decide:

- whether to use personal name, DBA/brand wording, an entity name, or another formal identity
- whether the current Stripe public business name `fawxzzy` is sufficient or should be updated
- whether the support email `fawxzzy@gmail.com` is acceptable for paid support

### 2. Launch Geography

Question:

- Where is paid launch intentionally allowed first?

Current draft posture:

- U.S.-first paid pilot.
- No intentional broad non-U.S. paid launch until reviewed.

Counsel/operator must decide:

- whether to restrict promotion or paid availability by geography
- whether TikTok/public promotion creates unacceptable cross-jurisdiction exposure
- whether Canada or other locations require additional privacy/consumer terms before paid launch

### 3. Washington Consumer Health Data

Question:

- Does Fitness collect or process "consumer health data" under Washington's My Health My Data Act if Washington users can access the app?

Why it matters:

- Workout data can describe physical activity, training habits, goals, notes, and progression history.
- The current app says Fitness is not a medical product, but non-medical wellness data can still be sensitive.

Counsel/operator must decide:

- whether Washington paid availability should be blocked or delayed
- whether a separate Washington consumer health data privacy policy is required
- whether homepage/navigation must expose a separate consumer health data privacy-policy link
- whether additional consent language is required for collection, sharing, or processing

### 4. FTC Health Breach Notification Rule

Question:

- Could Fitness be classified as a health app, personal health record vendor, related entity, or service provider under the FTC Health Breach Notification Rule?

Counsel/operator must decide:

- whether the current workout/progression data model creates HBNR exposure
- whether breach-response docs need a specific user/FTC/media notification playbook before paid launch
- whether private notes or progression history should be treated as health data for incident response

### 5. Subscription / Cancellation / Negative Option Compliance

Question:

- Does the current $5/month checkout and Customer Portal cancellation flow satisfy recurring-subscription disclosure and cancellation requirements for the intended launch geography?

Current implementation posture:

- Stripe Checkout handles subscription signup.
- Stripe Customer Portal exposes cancellation settings.
- App settings expose billing state and links to legal pages.

Counsel/operator must decide:

- exact required subscription disclosure wording before checkout
- whether cancellation must be as easy as signup in every launch jurisdiction
- whether Stripe Customer Portal alone is enough
- whether email support must support cancellation requests if portal access fails
- whether cancellation should always preserve access through paid period by default

### 6. Refund Policy

Question:

- What refund policy is acceptable for the launch geography?

Current draft posture:

- Refund requests are reviewed case by case.
- Duplicate payments and accidental immediate purchases may be refunded through Stripe when verified.
- Partial-month refunds are not promised by default except where required by law or stated at checkout.

Counsel/operator must decide:

- whether to publish a refund window
- how to handle duplicate payments
- how to handle accidental purchases
- whether partial-month refunds are required or recommended
- whether support-approved exceptions are enough for MVP

### 7. Account Deletion With Active Subscription

Question:

- What exactly happens when a user requests account deletion while a Stripe subscription is active?

Current draft posture:

- Deleting the app or account does not automatically cancel billing.
- Active subscriptions must be cancelled through Stripe Customer Portal or support-assisted Stripe cancellation before destructive account deletion.
- Account/workout data is deleted or de-identified where reasonably available.
- Limited billing, dispute, tax/accounting, security, fraud, backup, and legal records may be retained.
- Account recovery after destructive deletion is not promised.

Counsel/operator must decide:

- whether deletion should be delayed until subscription cancellation is confirmed
- whether support can cancel on behalf of the user
- whether a grace/deactivation period is needed before destructive deletion
- what deletion confirmation copy must say
- whether refund eligibility changes if deletion happens mid-period

### 8. Governing Law / Venue / Dispute Process

Question:

- What governing law, venue, and dispute process should the Terms use?

Current state:

- Counsel-blocked.
- Do not invent final terms.

Counsel/operator must decide:

- governing law
- venue
- arbitration/class waiver/no-arbitration posture
- small claims treatment
- dispute notice process

### 9. Minors / Teens

Question:

- Is the current "not under 13; minors need parent/guardian permission" posture sufficient?

Counsel/operator must decide:

- whether paid subscriptions should be unavailable to minors
- whether age-gating or parental-consent copy is needed
- whether public TikTok promotion creates teen-user risk requiring stronger copy

### 10. Provider List / Data Sharing

Question:

- Is the public provider/service-provider list complete and accurate enough for launch?

Current known providers/surfaces:

- Stripe
- Vercel
- Supabase
- Discord
- product analytics/diagnostics if enabled

Counsel/operator must decide:

- whether each provider must be named specifically
- whether analytics or diagnostic providers are currently enabled
- whether any advertising pixels or targeted advertising tools exist
- whether the privacy policy needs a separate processor/provider table

## Recommended Launch Decision Rule

Do not run final paid launch until one of these is true:

1. Counsel signs off on the decisions above.
2. The operator explicitly accepts MVP legal risk in writing, with launch geography and support/refund/deletion posture defined.

Even with operator acceptance, do not launch if:

- subscription cancellation is unclear
- paid entitlement can be wrong
- beta evidence is missing
- final live paid smoke has not been completed
- health/privacy classification remains knowingly ignored for intended launch geography

## Closeout Receipt Required

Before `FF-LEGAL-001` can close, record:

- accepted legal identity
- accepted launch geography
- accepted governing law/venue/dispute posture
- accepted refund policy
- accepted deletion-with-active-subscription workflow
- accepted minors/teen posture
- Washington consumer health-data decision
- FTC Health Breach Notification Rule decision
- provider list review
- reviewer name/source and date

Until then, `FF-LEGAL-001` remains `confirmed / counsel-open`, and live paid production remains `NO-GO`.

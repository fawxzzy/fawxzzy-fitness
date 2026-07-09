# FF-LEGAL-001 - Launch Legal Decision Record

Status: OPERATOR-ACCEPTED MVP RISK / COUNSEL REVIEW DEFERRED

This record is not legal advice. It turns the live paid-launch legal and business unknowns into explicit owner decisions, counsel decisions, launch restrictions, or documented blockers.

The operator explicitly accepted the MVP legal/business risk on `2026-07-09` for a controlled launch posture using the defaults below. This is not counsel approval, and counsel review remains recommended before scaling or broad public promotion.

Live paid production remains blocked by product proof gates until:

- final post-period downgrade truth after `2026-08-09` or an accepted equivalent proof is recorded
- final whole-app launch smoke passes
- public paid checkout is explicitly enabled

## Product Truth

- Product name: Fawxzzy Fitness.
- Product type: workout tracking and progression app.
- Current entity posture: no formal Fawxzzy or Fawxzzy Fitness entity has been confirmed.
- Interim public operator identity: Zachariah John Harold Redfield operating Fawxzzy Fitness.
- Paid model: $5/month recurring Pro subscription.
- Current Pro gates: capacity-only MVP gates.
- Free tier: up to 3 routines.
- Free tier: up to 14 saved workout plans.
- Pro tier: unlimited routines and unlimited saved workout plans.
- Payments and subscription management: Stripe Checkout and Stripe Customer Portal.
- Sensitive support email: `fawxzzy@gmail.com`.
- Discord: community and product discussion only.
- Public legal routes:
  - `https://fawxzzy-fitness-local.vercel.app/privacy`
  - `https://fawxzzy-fitness-local.vercel.app/terms`

## Decision Rule

Every live-launch legal/business unknown must be one of:

1. decided by operator
2. approved or revised by counsel
3. explicitly deferred because paid launch remains blocked
4. converted into a product restriction such as limited geography or no under-13 use

`FF-LEGAL-001` can close only when those outcomes are recorded. Until then, `FF-QA-001` remains blocked from final paid smoke.

## Decision Summary

| Decision | Current value | Owner | Launch impact | Status |
|---|---|---|---|---|
| Sensitive support path | `fawxzzy@gmail.com` for billing, privacy, deletion, refunds, account recovery, and sensitive wellness/account issues | Operator | Required for launch | Accepted for MVP |
| Discord support posture | Community/product discussion only; no sensitive billing/privacy/deletion/refund/account recovery handling in public Discord | Operator | Required for launch | Accepted for MVP |
| Refund default | Case-by-case support review; duplicate/accidental payments may be reviewed; no guaranteed partial-month refunds unless required by law or stated at checkout | Operator; counsel recommended | MVP accepted risk | Accepted by operator |
| Cancellation default | Users cancel renewal through Stripe Customer Portal; cancel-at-period-end keeps Pro through paid period | Operator; counsel recommended | MVP accepted risk | Accepted by operator |
| Deletion with active subscription | Deleting app/account does not automatically cancel Stripe; support checks active subscription state before destructive deletion | Operator; counsel recommended | MVP accepted risk | Accepted by operator |
| Legal identity | Interim: Zachariah John Harold Redfield operating Fawxzzy Fitness; formal entity not confirmed | Operator; counsel recommended | MVP accepted risk | Accepted by operator |
| Launch geography | Controlled MVP launch; do not claim enforceable geo-restriction unless implemented | Operator; counsel recommended | MVP accepted risk | Accepted by operator |
| Governing law / venue / dispute posture | No public placeholder; counsel should decide before scale | Counsel recommended | MVP accepted risk | Deferred by operator |
| Washington MHMDA | Not resolved by counsel; operator accepts MVP risk and should avoid targeted Washington promotion until reviewed | Counsel recommended | MVP accepted risk | Deferred by operator |
| FTC HBNR | Not resolved by counsel; operator accepts MVP risk with non-medical workout/progression posture | Counsel recommended | MVP accepted risk | Deferred by operator |
| Minors posture | Not directed to children under 13; paid Pro intended for 18+ or age of majority | Operator; counsel recommended | MVP accepted risk | Accepted by operator |
| Provider list | Stripe, Vercel, Supabase, Discord, Gmail/Google, analytics/diagnostics if enabled | Operator | MVP accepted risk | Accepted by operator |

## Legal Identity Decision

Decision to make:

- `Fawxzzy Fitness`
- `Fawxzzy`
- a formal legal entity name
- individual/sole-proprietor operating as Fawxzzy Fitness

Selected public product name:

`Fawxzzy Fitness`

Selected legal / contracting party:

`Zachariah John Harold Redfield, operating Fawxzzy Fitness`

Entity note:

No formal Fawxzzy or Fawxzzy Fitness entity, registration, DBA, trademark, or similar official claim has been confirmed in this repo. The interim safest public posture is to identify the individual operator instead of implying a formal entity exists.

Counsel/entity follow-up:

Before public paid launch, decide whether to form/use a formal legal entity and update Terms, Privacy, Stripe public business info, receipts/invoices where applicable, support/refund communications, and counsel docs to match.

Rule:

The same legal/business identity must appear consistently in Terms, Privacy Policy, Stripe public business info, receipts/invoices where applicable, support/refund communications, and counsel docs.

Owner: operator + counsel

Launch impact: MVP accepted risk; counsel/entity follow-up remains recommended before scale.

## Launch Geography Decision

Current launch state:

Controlled MVP launch only until broader promotion/geography controls are reviewed.

Proposed first paid geography:

U.S.-only paid pilot, excluding Washington if enforceable.

Candidate:

U.S.-only paid pilot. Canada and broader/international paid launch remain blocked until reviewed.

Constraints:

- Do not claim a narrow launch geography unless it can actually be enforced.
- If Washington users can access/pay for Fitness, Washington MHMDA must be resolved before live paid launch.
- If Canadian users can access/pay for Fitness, Privacy Policy and consent disclosures must stay aligned to Canadian meaningful-consent expectations.

Owner: operator; counsel recommended

Launch impact: MVP accepted risk. Do not claim enforceable geography restrictions unless implemented.

## Governing Law / Venue / Dispute Decision

Public Terms:

No visible placeholder.

Internal status:

Counsel must finalize governing law, venue, dispute process, arbitration/class-waiver posture if any, and consumer-rights carveouts before live paid launch.

Operator MVP decision:

Defer governing-law/venue/dispute drafting for MVP; do not add public placeholder language.

Owner: operator; counsel recommended

Launch impact: MVP accepted risk; must be revisited before scale.

## Refund / Cancellation Posture

Operator default unless counsel changes it:

- Refund requests are reviewed case by case through support.
- Duplicate or accidental payments may be reviewed for refund.
- No guaranteed partial-month refunds unless required by law or expressly stated at checkout.
- Users can cancel renewal through Stripe Customer Portal.
- If a user cancels at period end, Pro access continues through the period already paid for.
- If payment fails or cannot be verified, Pro access may be withheld, delayed, suspended, or downgraded until billing is resolved.

Public copy target:

```md
Pro is a $5/month recurring subscription.

Your subscription renews monthly until cancelled. You can manage or cancel your subscription through Stripe Customer Portal. If you cancel at period end, you keep Pro access through the period you already paid for.

Refund requests are reviewed case by case through support. Duplicate or accidental payments may be reviewed. Unless required by law or expressly stated at checkout, we do not guarantee partial-month refunds after Pro access has been granted.
```

Owner: operator + counsel

Launch impact: MVP accepted risk; counsel review remains recommended before scale.

## Account Deletion Workflow

Public copy target:

```md
Deleting your account or uninstalling the app does not automatically cancel an active Stripe subscription. To stop future charges, cancel through Stripe Customer Portal or contact support.
```

Internal support workflow:

1. User emails support from the account email.
2. Support verifies account ownership.
3. Support checks Stripe customer/subscription state.
4. If an active subscription exists:
   - tell user deletion does not automatically cancel subscription
   - send/manage Stripe Customer Portal link or cancel through support if policy allows
   - confirm whether user wants immediate account deletion or deletion after paid period
5. Delete/de-identify account and workout records where available.
6. Retain minimal billing, fraud, dispute, security, tax/accounting, and compliance records where required.
7. Confirm completion by email.

Owner: operator + counsel

Launch impact: MVP accepted risk; counsel review remains recommended before scale.

## Washington MHMDA Decision

Status:

Operator accepts MVP risk without counsel classification.

Current launch rule:

If Washington users can access/pay for Fitness, live paid launch remains blocked until counsel decides whether MHMDA requires an additional policy, homepage link, consent, deletion, or operational handling.

MVP operator decision:

- Do not specifically target Washington users in MVP promotion.
- Do not claim Washington compliance until reviewed.
- If Washington support/payment issues appear, treat them as sensitive support escalations through `fawxzzy@gmail.com`.

Resolution options:

- Exclude Washington for paid launch.
- Include Washington with counsel-approved MHMDA posture.
- Counsel determines Fitness is not covered and records rationale.

Owner: operator; counsel recommended

Launch impact: MVP accepted risk; Washington-specific scale remains blocked until reviewed.

## FTC HBNR Decision

Status:

Operator accepts MVP risk without counsel classification.

Current product position:

Fitness is a workout tracking/progression app, not a medical provider. Workout and activity data are treated as potentially sensitive wellness/activity data.

Product data facts for counsel:

- account/auth data
- workout routines
- workout plans
- exercises
- session history
- notes
- progression/activity state
- subscription/entitlement state

Fitness currently does not claim to be:

- medical advice
- diagnosis
- treatment
- physical therapy
- emergency service
- clinical care

Counsel must decide whether Fitness is covered by the FTC Health Breach Notification Rule and whether breach-response procedures or public policy language need to change before live paid launch.

MVP operator decision:

- Keep product posture as workout tracking/progression, not medical care, diagnosis, treatment, physical therapy, or emergency service.
- Keep sensitive support through `fawxzzy@gmail.com`.
- Do not market Fitness as a medical/clinical/health-provider product.

Owner: operator; counsel recommended

Launch impact: MVP accepted risk; formal classification remains recommended before scale.

## Minors Decision

Selected posture:

Not directed to children under 13. Paid Pro subscriptions are intended only for users who are at least 18 years old or the age of majority where they live.

Counsel review:

Confirm whether this 18+/age-of-majority paid posture is sufficient for a fitness app with workout load/progression features and paid subscription billing.

Owner: operator + counsel

Launch impact: MVP accepted risk; counsel review remains recommended before scale.

## Provider List Decision

Status:

Provider inventory is accepted for MVP based on the current known provider list.

| Provider | Purpose | Data categories | Environment | User-facing disclosure needed? | Status |
|---|---|---|---|---|---|
| Vercel | Hosting/deployment | App traffic, logs, route data | prod/preview/dev | yes/category | confirm |
| Supabase | Auth/database | account, workout, app data | prod/dev | yes/category or named | confirm |
| Stripe | Checkout, billing, portal | billing identifiers, payment status, customer metadata | prod/test | yes/named | confirm |
| Discord | Community/product discussion | public messages, handles if user posts/contact | public/community | yes | confirm |
| Gmail / Google | Monitored support email | email address, support content, account/billing/privacy requests | support | yes | confirm |
| Analytics provider | Product analytics | events, diagnostics | prod/dev | yes if used | confirm |
| Error/log provider | Diagnostics | errors, logs, account/session metadata | prod/dev | yes if used | confirm |

Minimum public disclosure:

Privacy Policy must identify provider categories and named critical providers where appropriate:

- Stripe for payments/billing
- monitored email provider for support
- Discord for community/product discussion
- hosting/auth/database/analytics/diagnostics categories

Owner: operator

Launch impact: MVP accepted risk; update if a new provider is added.

## Canonical Support Path

Decision:

- Sensitive support email: `fawxzzy@gmail.com`
- Discord: community/product discussion only
- Do not use public Discord channels for billing, privacy, deletion, account recovery, refunds, or sensitive wellness issues.

Repo scan result on 2026-07-09:

- `foxy@gmail.com`: no hits in repo.
- `fawxzzy@gmail.com`: present in support/legal/beta/billing docs and `src/lib/legal-documents.ts`.
- Discord invite: `https://discord.gg/tnnV7BNJ7h`.

Required alignment surfaces:

- Privacy Policy
- Terms
- Pro Access screen
- Stripe Public Business Info
- Stripe Customer Portal business profile
- Billing proof packet
- `FF-LEGAL-001`
- `FF-QA-001`
- roadmap
- Discord card seed/source text

## FF-LEGAL-001 Definition of Done

### Operator decisions

- [x] Canonical support email chosen and consistent everywhere.
- [x] Discord positioned as community/product discussion only.
- [x] Provider list drafted.
- [x] Account deletion workflow selected as operator default.
- [x] Refund/cancellation operational workflow selected as operator default.
- [x] Stripe public legal/support/refund links updated and reverified for support/legal link posture.

### Business/counsel decisions

- [x] Legal identity selected as interim operator identity for MVP.
- [x] Interim operator identity selected for public docs.
- [x] Closed-beta/no-public-paid default selected.
- [x] Launch geography accepted as controlled MVP launch with no enforceable geography claim.
- [x] Governing law explicitly deferred by operator MVP risk acceptance.
- [x] Venue/dispute posture explicitly deferred by operator MVP risk acceptance.
- [x] Refund language accepted by operator for MVP.
- [x] Cancellation language accepted by operator for MVP.
- [x] Deletion vs active subscription language accepted by operator for MVP.
- [x] Minors posture accepted by operator for MVP.
- [x] Washington MHMDA posture deferred by operator MVP risk acceptance.
- [x] FTC HBNR posture deferred by operator MVP risk acceptance.

### Public docs

- [ ] Privacy Policy reflects selected identity, support path, provider categories, user rights, retention/deletion, breach notice, and wellness/activity data posture.
- [ ] Terms reflect selected identity, recurring subscription terms, cancellation, refund posture, deletion vs subscription cancellation, health disclaimer, minors posture, and dispute/governing-law language.
- [ ] No internal draft/counsel TODO language appears publicly.
- [ ] No obsolete support email appears.
- [ ] No obsolete Pro claims appear.

### Launch gate

- [x] Operator MVP risk acceptance recorded in `FF-LEGAL-001`.
- [ ] `FF-QA-001` remains blocked until final smoke and explicit public-checkout enablement.

## Current Card Status Text

`FF-LEGAL-001` is operator-accepted for MVP risk; counsel review remains recommended before scale.

Resolved defaults:

- Sensitive support path: `fawxzzy@gmail.com`
- Discord: community/product discussion only
- Refund posture: duplicate/accidental payments reviewed; no guaranteed partial-month refunds unless required by law or stated at checkout
- Deletion posture: account deletion/uninstall does not automatically cancel Stripe subscription; support checks active subscription state before deletion
- Pro subscription posture: $5/month recurring, cancel through Stripe Customer Portal, paid-period access continues when cancelled at period end
- Interim identity posture: Zachariah John Harold Redfield operating Fawxzzy Fitness; no formal Fawxzzy entity assumed
- Launch posture: controlled MVP soft launch candidate; do not claim enforceable geography restrictions unless implemented
- Minors posture: paid Pro intended for 18+ or age of majority

Counsel follow-up still recommended:

- formal legal/entity identity decision
- broader paid launch geography
- governing law
- venue/dispute posture
- refund language by jurisdiction
- Washington MHMDA
- FTC HBNR
- minors posture
- provider disclosure depth

## Source Links For Counsel Review

- Stripe Customer Portal: `https://docs.stripe.com/customer-management`
- Stripe refunds: `https://docs.stripe.com/refunds`
- ROSCA / 15 U.S.C. 8403: `https://www.law.cornell.edu/uscode/text/15/8403`
- Washington MHMDA AG page: `https://www.atg.wa.gov/protecting-washingtonians-personal-health-data-and-privacy`
- Washington Chapter 19.373 RCW: `https://app.leg.wa.gov/RCW/default.aspx?cite=19.373&full=true`
- FTC Health Breach Notification Rule: `https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0`
- FTC COPPA Rule: `https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa`
- OPC meaningful consent guidance: `https://www.priv.gc.ca/en/privacy-topics/business-privacy/collecting-personal-information/consent/gl_omc_201805/`
- OPC mobile app privacy guidance: `https://www.priv.gc.ca/en/privacy-topics/technology/mobile-and-digital-devices/mobile-apps/gd_app_201210/`

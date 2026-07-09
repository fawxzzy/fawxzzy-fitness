# FF-LEGAL-001 - ChatGPT / Counsel Review Packet

Status: NO-GO for public live paid production

Purpose: give ChatGPT or counsel one compact packet to review the safest current defaults, product truth, public copy posture, and remaining decisions before any public paid launch.

This is not legal advice. It is an operator-prepared review packet.

## Current Product Truth

- Product: Fawxzzy Fitness.
- Operator says there is no formal Fawxzzy or Fawxzzy Fitness entity/registration/official claim yet.
- Interim public identity now used in public legal pages: Zachariah John Harold Redfield operating Fawxzzy Fitness.
- Product type: workout tracking and progression app.
- Product is not a medical provider, diagnosis, treatment, physical therapy, emergency service, or individualized coaching service.
- Data stored: account/auth data, routines, workout plans, exercises, session history, notes, progression/activity state, subscription/entitlement state, diagnostics/logs, support/feedback content.
- Paid model: $5/month recurring Pro subscription.
- Current Pro gates are capacity-only:
  - Free tier: up to 3 routines.
  - Free tier: up to 14 saved workout plans.
  - Pro tier: unlimited routines and saved workout plans.
- Payments: Stripe Checkout subscription mode.
- Billing management: Stripe Customer Portal.
- Sensitive support: `fawxzzy@gmail.com`.
- Discord: community/product discussion only.

## Safest Defaults Selected

These are operator defaults, not counsel signoff.

| Topic | Selected safest default | Why |
|---|---|---|
| Legal identity | Zachariah John Harold Redfield operating Fawxzzy Fitness | Avoid implying a formal entity exists before one is created or confirmed. |
| Launch state | Closed beta only / no public paid production | Avoid public paid exposure while legal/geography/health-data posture remains unresolved. |
| First paid geography candidate | U.S.-only paid pilot, excluding Washington if enforceable | Narrower than international launch and avoids Washington MHMDA until reviewed. |
| Washington | Block Washington paid access if enforceable; otherwise treat Washington as included and resolve MHMDA first | Washington consumer health-data obligations may apply to wellness/activity apps. |
| Canada/international | Block public paid launch until reviewed | Canadian privacy/meaningful-consent and other jurisdiction issues require review. |
| Governing law / venue / disputes | No public placeholder; counsel must draft | Bad boilerplate dispute terms can create more risk than no invented terms. |
| Refunds | Case-by-case support review; duplicate/accidental payments may be reviewed; no guaranteed partial-month refunds unless required by law or stated at checkout | Fits Stripe/manual MVP posture while avoiding overpromising. |
| Cancellation | Stripe Customer Portal self-serve cancellation; cancel-at-period-end keeps Pro through paid period | Aligns with recurring subscription expectations and Stripe model. |
| Deletion vs subscription | Account deletion/uninstall does not automatically cancel Stripe subscription; support checks billing state before destructive deletion | Prevents unmanaged recurring charges after deletion requests. |
| Minors | Not under 13; paid Pro intended for 18+ or age of majority | Safer paid subscription posture than allowing minors to buy. |
| Support | `fawxzzy@gmail.com` for sensitive billing/privacy/deletion/refund/account recovery/wellness support | Private support path separate from public Discord. |
| Discord | Community/product discussion only | Avoids public handling of sensitive account/billing/privacy/health information. |
| Provider inventory | Vercel, Supabase, Stripe, Gmail/Google, Discord, analytics/diagnostics if enabled | Current known provider categories. |

## Public App Changes Already Made

- Terms now state Fitness is operated by Zachariah John Harold Redfield.
- Privacy now states Fitness is operated by Zachariah John Harold Redfield.
- Terms now state paid Pro subscriptions are intended for users at least 18 or age of majority.
- Privacy now states paid Pro subscriptions are intended for users at least 18 or age of majority.
- Public docs already include:
  - recurring subscription behavior
  - Stripe-hosted billing
  - cancellation before renewal
  - paid-period access through cancel-at-period-end
  - no guaranteed partial-month refunds unless required by law or stated at checkout
  - account deletion/uninstall does not automatically cancel Stripe subscription
  - support email path
  - medical/training disclaimer
  - no under-13 use

## Remaining Review Questions

Ask ChatGPT/counsel to answer these directly:

1. Is "Zachariah John Harold Redfield operating Fawxzzy Fitness" acceptable public identity for MVP, or should public paid launch wait for an LLC/DBA/formal entity?
2. If no formal entity exists, what exact wording should Terms, Privacy, Stripe public business info, invoices/receipts, and support emails use?
3. Is closed beta/no public paid launch the correct current status?
4. If first paid launch is U.S.-only, what practical controls are required to avoid misleading geography claims?
5. Should Washington be blocked until MHMDA is resolved?
6. If Washington cannot be blocked, what minimum MHMDA posture is needed?
7. Is the app likely covered by the FTC Health Breach Notification Rule, given workout/progression/notes data and no medical/wearable import claims?
8. Is "paid Pro intended for 18+ or age of majority" sufficient, or should all app use be 18+?
9. Is the refund policy acceptable: case-by-case review, duplicate/accidental review, no guaranteed partial-month refund unless law/checkout says otherwise?
10. Is Stripe Customer Portal enough for subscription cancellation, or must email cancellation also be accepted/processed?
11. What deletion workflow is required when a user has an active Stripe subscription?
12. What governing law, venue, dispute process, and consumer-rights carveouts should be used?
13. Is the provider inventory complete enough for launch disclosures?
14. Should Privacy name Vercel/Supabase/Stripe/Gmail/Discord specifically, or use categories plus Stripe named?
15. Are any homepage or checkout disclosures missing before public paid launch?

## Current NO-GO Items

- Formal legal/entity identity not counsel accepted.
- Public paid launch geography not accepted.
- Washington MHMDA not resolved.
- FTC HBNR not resolved.
- Governing law/venue/dispute posture not drafted by counsel.
- Refund/cancellation/deletion language not counsel accepted.
- Provider inventory not final.
- Beta proof not complete.
- Final paid smoke not approved or complete.

## Source Links For Review

- ROSCA / recurring charges: `https://www.law.cornell.edu/uscode/text/15/8403`
- FTC negative option policy: `https://www.ftc.gov/system/files/documents/public_statements/1598063/negative_option_policy_statement-10-22-2021-tobureau.pdf`
- Stripe Customer Portal: `https://docs.stripe.com/customer-management`
- Stripe refunds: `https://docs.stripe.com/refunds`
- Washington MHMDA AG page: `https://www.atg.wa.gov/protecting-washingtonians-personal-health-data-and-privacy`
- Washington Chapter 19.373 RCW: `https://app.leg.wa.gov/RCW/default.aspx?cite=19.373&full=true`
- FTC Health Breach Notification Rule: `https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0`
- FTC COPPA FAQ: `https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions`
- FTC COPPA Rule: `https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa`
- OPC meaningful consent guidance: `https://www.priv.gc.ca/en/privacy-topics/business-privacy/collecting-personal-information/consent/gl_omc_201805/`

## Recommended Ask To ChatGPT

Use this prompt:

```txt
Review this Fawxzzy Fitness paid-launch legal decision packet. I need practical, risk-ranked guidance, not boilerplate. Identify what can be accepted as an MVP operator decision, what needs counsel, what should block public paid launch, and what exact public Terms/Privacy/Stripe wording should change.
```


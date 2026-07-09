# FF-LEGAL-001 Paid Launch Review Notes

Date: 2026-07-02
Status: internal draft follow-up
Scope: legal-layer hardening before any live paid push

## 2026-07-07 Go / No-Go Call

Do not launch live paid production yet.

The current legal and monetization packet is stronger, but `FF-LEGAL-001` is not counsel-closed and live paid launch remains blocked by counsel-only or final-proof decisions that cannot be invented in code:

- final operating entity / business name wording
- final launch geography
- refund posture for intended jurisdictions
- Washington consumer health-data exposure review if Washington users can access the app
- FTC Health Breach Notification Rule classification review
- final governing law, venue, and dispute language
- final proof that Customer Portal cancellation plus the accepted support/deletion workflow do not leave unmanaged active subscriptions

Current public support copy uses monitored email for billing/privacy/deletion/account-recovery/refund/sensitive support and keeps Discord as community/product discussion only.

The support-path decision packet is now captured in:

- `docs/ops/FF-LEGAL-001-PRIVATE-SUPPORT-DECISION-PACKET-2026-07-07.md`

The counsel/business handoff packet is captured in:

- `docs/ops/FF-LEGAL-001-COUNSEL-HANDOFF-PACKET-2026-07-08.md`

2026-07-08 update:

- Live-mode no-charge Stripe webhook proof is closed for an expired unpaid subscription checkout event.
- The remaining `FF-LEGAL-001` blocker is now decision-only, not implementation discovery:
  - support intake
  - support monitoring owner
  - refund posture
  - deletion with active subscription
  - launch geography
  - health-data/regulatory posture
  - legal identity
  - governing law
  - venue/dispute process
  - public provider list
- The decision packet now includes an operator decision form and recommended MVP defaults for review.

## 2026-07-07 Private Support Path Conversion

Implemented as the accepted MVP product-facing support contract:

- Legal footer links sensitive support to monitored email `fawxzzy@gmail.com`.
- Legal footer links the official Fawxzzy Fitness Discord community as community/product discussion only.
- Legal footer warns users not to post sensitive account, billing, privacy, or health-related information in public Discord channels.
- Legal footer now directs billing, privacy, deletion, account recovery, refund, and sensitive wellness requests to monitored email.
- Privacy Policy deletion/account-control copy now references the private support path directly.
- Terms subscription/cancellation copy now references the private support path directly.
- Discord invite URL is centralized in `src/lib/legal-documents.ts` and reused by the Discord connector surface.
- `/privacy` and `/terms` are explicit authless routes in the shared auth-session route contract so paid checkout legal links are reachable before login and without session cookies.
- Stable production alias proof on `2026-07-07`: both legal routes returned `200` without auth cookies and included the then-current Discord invite URL, private-support path copy, and sensitive-info warning. Re-proof required after the monitored-email copy deploys.

Launch interpretation:

- This clears the previous blank-product-copy gap.
- It closes the support-path decision as monitored email for MVP.
- It does not close counsel-only geography, governing-law, venue, dispute, refund-jurisdiction, Washington consumer health-data, or FTC Health Breach Notification Rule classification review.

## Why This Exists

The product-facing Privacy Policy and Terms of Service have now been upgraded from thin placeholder copy to a materially more truthful pre-launch draft.

That does not mean the legal layer is finished for a real paid launch.

This note captures the remaining operator and counsel checkpoints so we do not confuse:

- stronger draft copy
with
- final legal signoff

## Product-Facing Improvements Landed

The current draft now more clearly covers:

- account and authentication information
- workout and progression history as potentially sensitive wellness data
- Stripe identifiers and entitlement state without falsely claiming zero billing storage
- diagnostics, support, and beta data
- retention and deletion limits
- access and correction rights
- children under 13 and age-of-majority language
- recurring subscription and cancellation truth
- user-content license boundaries
- third-party service provider use

## 2026-07-06 UI Sanity Receipt

This pass checked the current legal surfaces as product UI, not as legal counsel.

Verified:

- `/privacy?returnTo=%2Fsettings%3Fsection%3Dpro` renders the paid-launch privacy draft.
- `/terms?returnTo=%2Fsettings%3Fsection%3Dpro` renders the paid-launch terms draft.
- The visible support contact uses the approved Discord-community wording.
- The visible legal footer warns users not to post sensitive account, billing, privacy, or health-related information in public Discord channels.
- The pages keep the last-updated constants in code while not surfacing a visible last-updated row in the UI.
- The return path can route back to the expanded Pro settings surface through `returnTo=/settings?section=pro`.

Result:

- The legal surfaces remain acceptable for sandbox proof and operator review.
- They are still not final counsel signoff.

## Remaining Launch-Gate Checks

- [ ] Confirm the final operating entity name and canonical business wording with counsel; provisional operator record is Fawxzzy Fitness / Fawxzzy, operated by Zachariah John Harold Redfield
- [ ] Confirm launch geography with counsel; provisional posture is U.S.-first paid pilot with no intentional non-U.S. paid launch
- [x] Add interim product-facing private support path language for billing, privacy, deletion, account recovery, refund requests, and sensitive wellness issues
- [x] Convert the private support/deletion/refund decision gap into a launch decision packet
- [x] Add an operator decision form for support, refund, deletion, geography, legal identity, governing law, venue, and provider-list acceptance
- [x] Finalize the monitored private support intake mechanism: monitored email `fawxzzy@gmail.com` for billing/privacy/deletion/refund/account recovery/sensitive support; Discord remains community/discovery only
- [ ] Confirm the exact third-party provider list we are willing to name publicly
- [ ] Confirm whether any targeted advertising, pixels, or third-party tracking exists
- [x] Define account-deletion policy for active subscriptions: cancel through Stripe Customer Portal or support-assisted Stripe cancellation before destructive deletion
- [ ] Confirm the self-serve billing cancellation path from app UI is live and user-visible for a bounded paid customer
- [x] Confirm Stripe Customer Portal remains enabled for recurring subscriptions
- [ ] Confirm refund language with counsel for the intended jurisdictions; current draft uses manual Stripe review and no guaranteed partial-month refunds
- [ ] Replace the governing-law placeholder in Terms of Service after counsel review
- [ ] Counsel review Washington-state consumer health-data exposure if launch includes Washington users
- [ ] Counsel review FTC Health Breach Notification Rule exposure for workout/progression data
- [ ] Close counsel/business handoff packet: `docs/ops/FF-LEGAL-001-COUNSEL-HANDOFF-PACKET-2026-07-08.md`

## Shipping Rule

Do not treat `FF-LEGAL-001` as fully counsel-closed until the governing-law, dispute, refund, and jurisdiction details are finalized.

The current draft is acceptable for internal review, sandbox proof, and pre-launch operator validation. It is not a substitute for qualified legal review.

# FF-LEGAL-001 Paid Launch Review Notes

Date: 2026-07-02
Status: internal draft follow-up
Scope: legal-layer hardening before any live paid push

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

## Remaining Launch-Gate Checks

- [ ] Confirm the final operating entity name and canonical business wording
- [ ] Confirm whether launch geography is Canada and United States only or broader
- [ ] Confirm the exact third-party provider list we are willing to name publicly
- [ ] Confirm whether any targeted advertising, pixels, or third-party tracking exists
- [ ] Confirm the self-serve billing cancellation path is live and user-visible
- [ ] Confirm Stripe Customer Portal remains enabled for recurring subscriptions
- [ ] Confirm refund language with counsel for the intended jurisdictions
- [ ] Replace the governing-law placeholder in Terms of Service after counsel review
- [ ] Counsel review Washington-state consumer health-data exposure if launch includes Washington users

## Shipping Rule

Do not treat `FF-LEGAL-001` as fully counsel-closed until the governing-law, dispute, refund, and jurisdiction details are finalized.

The current draft is acceptable for internal review, sandbox proof, and pre-launch operator validation. It is not a substitute for qualified legal review.

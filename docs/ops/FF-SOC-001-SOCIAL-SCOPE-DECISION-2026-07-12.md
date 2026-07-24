# FF-SOC-001 Social Scope Decision

Date: 2026-07-12

Decision:
- The first social slice is explicit export/share of a deterministic workout recap.
- Do not build an in-app social graph in V1.

## Scope definition

In scope:
- A member explicitly copies or shares their own completed-workout recap.
- The recap is derived from member-owned session truth.
- The member chooses the destination outside Fitness through the device share surface.

Out of scope:
- friends or follows
- public profiles
- groups or clubs
- leaderboards
- comments, reactions, direct messages, or discovery feeds
- automatic posting
- public workout URLs
- location, health, readiness, or injury sharing

## Privacy boundaries

- Sharing is opt-in per recap and never enabled by default.
- Recaps must not include account email, member identifiers, private notes, billing state, authentication data, or hidden QA records.
- The member must see the exact text or artifact before sharing.
- Deleting or editing a Fitness session cannot recall a copy already shared to another service; future copy should explain that boundary if public URLs are introduced.
- No contact graph or address-book access is justified for this slice.

## Abuse and moderation

- External share destinations own moderation after a member exports content.
- Fitness still controls generated recap content and must avoid harassment prompts, body-shaming, unsafe volume contests, or medical claims.
- An in-app feed would require report, block, appeal, rate-limit, retention, and moderation-case workflows before implementation.
- Leaderboards would require anti-cheat, privacy, age, safety, and manipulation review and are not approved.
- Existing Discord moderation is not a substitute for an in-app social moderation system.

## MVP proposal

The MVP is the existing gated shareable recap artifact with:

- deterministic workout metrics
- bounded PR callouts backed by history truth
- Copy recap
- native Share recap with copy fallback
- no automatic audience, feed, or discoverability

Success criteria:

- Members can share without exposing private account data.
- Low-data workouts produce plain recaps without fake highlights.
- Share actions are explicit and cancellable.
- Product analytics, if later added, records only bounded action events and not destination content.

## Future decision gate

Any proposal for friends, groups, public profiles, or leaderboards needs a new card and must define:

- exact user value beyond external recap sharing
- data visibility and deletion behavior
- report/block/appeal workflow
- moderation staffing and response targets
- legal and age implications
- abuse, spam, scraping, and impersonation controls
- a reversible rollout flag and QA plan

Until that gate is approved, Fitness social work stops at member-controlled recap sharing.

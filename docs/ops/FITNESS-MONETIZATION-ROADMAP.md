# Fitness Monetization Roadmap

This doc is the operator summary for the monetization-readiness card set seeded into the Feedback Board.

Board status mapping:
- Prompt-level `Planned` cards are stored as board status `confirmed` plus the `Backlog` tag because the bounded feedback schema does not expose a dedicated `planned` status.
- Card sequencing lives in `card_id`, `card_phase`, `card_priority`, `depends_on`, and `dependency_notes`.
- Discord forum threads are render targets. The repo-owned roadmap data and seeded feedback rows remain the source of truth.

Canonical operator command:

```bash
npm run feedback:monetization:seed -- --apply
```

Board targeting:
- monetization roadmap cards belong on the dedicated `#fawxzzy-fitness` forum, not the general `#feedback` forum
- prefer `DISCORD_FITNESS_FEEDBACK_FORUM_CHANNEL_ID` as the default target
- use `--forum-channel-id <forumId>` only for an intentional one-off override

Dry-run command:

```bash
npm run feedback:monetization:seed
```

## Launch Blockers

Paid launch blockers:
- `FF-CORE-001` Complete Progression Engine V2
- `FF-CORE-002` Polish Routine Builder for Paid-User Readiness
- `FF-PWA-001` Complete Install Experience and Onboarding
- `FF-LEGAL-001` Add Privacy Policy and Terms of Service
- `FF-MON-002` Implement Stripe Lifetime Pro Purchase Flow
- `FF-BETA-001` Run 10-20 Real User Beta Before Paid Push
- `FF-MON-001` Monetization Readiness Gate
- `FF-QA-001` Monetization Launch Smoke Test Checklist

Go or no-go framing:
- A stranger should be able to onboard, build or select a routine, complete workouts, understand progression value, install or use the app confidently, and pay safely.
- Retention enhancers, social work, and deeper intelligence follow after the launch blockers are clear.

## Implementation Order

Recommended order:
1. `FF-CORE-001` Complete Progression Engine V2
2. `FF-CORE-002` Polish Routine Builder for Paid-User Readiness
3. `FF-PWA-001` Complete Install Experience and Onboarding
4. `FF-LEGAL-001` Add Privacy Policy and Terms of Service
5. `FF-MON-002` Implement Stripe Lifetime Pro Purchase Flow
6. `FF-BETA-001` Run 10-20 Real User Beta Before Paid Push
7. `FF-MON-001` Monetization Readiness Gate
8. `FF-QA-001` Monetization Launch Smoke Test Checklist
9. `FF-MON-003` Define Founding Offer and Pricing Copy
10. `FF-MKT-001` Founding User Launch Plan
11. `FF-RET-001` Add Calendar View
12. `FF-RET-002` Add Workout Streaks
13. `FF-RET-003` Add Consistency Heatmap
14. `FF-RET-004` Add Weekly and Monthly Progress Summaries
15. `FF-ENGINE-001` Build Curated Workout Engine V1
16. `FF-GAM-001` Add Achievements and Badges
17. `FF-ANALYTICS-001` Add Active User and Product Usage Statistics
18. `FF-ENGINE-002` Expand Curated Workout Engine Beyond V1
19. `FF-SOC-001` Explore Social Features

Do not start yet:
- `FF-ENGINE-002` waits on `FF-ENGINE-001` and `FF-RET-004`.
- `FF-GAM-001` waits on retention loops.
- `FF-SOC-001` waits on the paid core plus legal clarity.

## Recommended Execution Path

- `Codex` for implementation against the P0 and P1 cards.
- `ChatGPT` for quick copy refinement and operator phrasing.
- `Playbook CLI` for repeatable verify, export, and board-audit loops.

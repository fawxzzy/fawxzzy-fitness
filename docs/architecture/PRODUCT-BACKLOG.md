# Fawxzzy Fitness Product Backlog

Updated:
- 2026-04-28

Purpose:
- Keep one cleaned product backlog for the fitness app.
- Separate shipped or duplicate ideas from open work.
- Turn vague notes into buildable scopes with priority, dependencies, and explicit decision gaps.

Scope rules:
- This document tracks open product work for `repos/fawxzzy-fitness`.
- It does not reopen features that are already shipped in phase 1 form.
- Enhancement work can stay on the backlog when it clearly extends an existing shipped feature.

## Removed From Active Backlog

These items should not be treated as new net-new features.

### Already shipped in phase 1

1. Consistency badges and achievement system
   - Already covered by current streak, longest streak, total workouts logged, total sets logged, PR milestones, routine completion streaks, and starter badges.
   - Keep future work limited to expansion, balance, and presentation upgrades.

2. Shareable stats profile
   - Already covered by secure public profile link, public/private sharing, current streak, total workouts, recent activity, top lifts, and PR count.
   - Future social work should focus on friends, groups, leaderboards, and privacy controls.

3. Weekly and monthly workout summaries
   - Already covered by workouts completed, total sets, top exercises, PRs, consistency percentage, and longest streak.
   - Future work should focus on recap polish, visuals, exports, and sharing.

### Duplicate or merged lanes

1. Streaks, heatmaps, and retention visuals
   - Treat as one backlog lane: progress dashboard, calendar, heatmap, and streak UI.

2. Built-in programs and curated workouts
   - Treat as one backlog lane: curated templates, program metadata, preview flow, and one-off launch flow.

3. Pull-up variants, bodyweight math, and PR handling
   - Treat as linked work, not separate parallel initiatives.
   - Variation modeling is the prerequisite.

## Priority Summary

| Priority | Theme | Why now | Hard dependencies |
| --- | --- | --- | --- |
| P0 | Session reliability and logging accuracy | Protects workout data and trust | None |
| P1 | Progress UX and exercise-domain cleanup | Enables retention and cleaner programming features | P0 for session safety |
| P2 | Social accountability | Adds retention after personal progress is strong | Friends before groups |
| P3 | Platform and presentation polish | Improves premium feel after core flows are stable | Stable session model |
| P4 | Advanced personalization | High value but higher privacy and recommendation complexity | Stable workout generation and privacy model |

## Open Backlog

### P0 - Fix Before Expanding Features

#### 1. Current session persistence

Status:
- Open

Goal:
- Restore an interrupted workout without losing the user's place.

MVP:
- Persist:
  - active session id
  - current route or screen key
  - current exercise id
  - current set index
  - logged and skipped set state
  - last updated timestamp
- On reopen:
  - restore automatically if last activity was under 6 hours
  - show a `Resume workout?` prompt if last activity was between 6 and 24 hours
  - keep the session available but do not force resume if older than 24 hours

Dependencies:
- Active workout session state
- Stable exercise and set identifiers

Needs decision:
- Whether logout should preserve local session state by default or only after explicit confirmation
- Whether resume should return to the exact route or a safer session overview with a `Resume where you left off` action

#### 2. Quick log goal sync fix

Status:
- Open bug

Goal:
- Keep the active-session card and quick-log action in sync with edited target values.

MVP:
- When a user edits any target field for the active set, immediately update:
  - the stored session target
  - the exercise card summary
  - the quick-log button payload
- Supported fields:
  - weight
  - reps
  - time
  - distance
  - calories
  - RPE
  - any other set-target field already supported by the measurement model

Dependencies:
- Shared session target state
- Shared measurement summary helpers

Needs decision:
- Whether edits should apply only to the current set or optionally fan out to remaining sets in that exercise

#### 3. Exercise variation system

Status:
- Open design and data-model task

Goal:
- Support exercise families like pull-ups without either polluting the library or corrupting stats and PR logic.

MVP:
- Introduce a base exercise plus variation model.
- Example family:
  - base exercise: `Pull-Up`
  - variations: `Bodyweight Pull-Up`, `Weighted Pull-Up`, `Assisted Pull-Up`, `Neutral Grip Pull-Up`, `Wide Grip Pull-Up`, `Chin-Up`, `Band-Assisted Pull-Up`
- Logging must capture:
  - base exercise id
  - variation id
  - load type where relevant
  - assistance type where relevant
- Stats must support:
  - combined family summary
  - breakdown by variation
- PRs must be tracked separately when the movement meaningfully changes.

Dependencies:
- Exercise catalog cleanup
- Stats aggregation model
- PR logic

Needs decision:
- Which variations count as distinct enough for separate PRs versus shared family rollups
- Whether grip changes should be first-class variations or metadata on the same variation

#### 4. Body weight prompt for bodyweight calculations

Status:
- Open

Goal:
- Improve bodyweight-exercise calculations without forcing bodyweight entry on every user.

MVP:
- Add optional bodyweight capture in:
  - onboarding
  - profile settings
  - first-time logging flow for qualifying exercises
- Store:
  - bodyweight value
  - unit
  - date recorded
  - whether it is allowed in calculations
- Use it for effective load math in qualifying movements such as pull-ups, chin-ups, dips, push-ups, and weighted bodyweight work.

Dependencies:
- Exercise variation system
- Bodyweight exercise classification

Needs decision:
- Whether stale bodyweight values should trigger a refresh prompt after a set time window

### P1 - Retention And Core UX

#### 5. Calendar view, consistency heatmap, and streak UI

Status:
- Open, but should reuse shipped streak logic

Goal:
- Make workout consistency visible at a glance.

MVP:
- Add a dedicated progress screen with:
  - monthly calendar view
  - highlighted workout days
  - consistency heatmap
  - top-level streak indicator
- Day detail on tap:
  - completed workout or rest state
  - routine name
  - total sets
  - PRs hit
- Use existing streak calculations instead of rebuilding streak logic.

Dependencies:
- Existing streak data
- Workout-day summary data

Needs decision:
- Heatmap intensity thresholds for `light`, `normal`, and `high` activity
- Whether a rest day can be user-marked separately from a missed day

#### 6. Color-coordinated muscle groups

Status:
- Open

Goal:
- Make exercise and routine surfaces faster to scan.

MVP:
- Define one canonical color token per muscle group:
  - chest
  - back
  - shoulders
  - biceps
  - triceps
  - quads
  - hamstrings
  - glutes
  - calves
  - core
  - full body
  - cardio
- Use the same mapping on:
  - exercise cards
  - workout previews
  - calendar details
  - curated routines
  - summary cards
  - muscle charts

Dependencies:
- Shared design token path
- Stable exercise muscle tagging

Needs decision:
- Whether secondary muscles inherit blended color treatment or stay primary-muscle only in MVP

#### 7. Curated workouts and built-in programs

Status:
- Open, but downstream of exercise modeling cleanup

Goal:
- Give users high-quality ready-to-run training options.

MVP:
- Add built-in templates such as:
  - Push / Pull / Legs
  - Upper / Lower
  - Full Body
  - Strength Block
  - Hypertrophy Block
  - Beginner Routine
  - Bodyweight Routine
- Each template supports:
  - preview before adding
  - one-click add to routines
  - one-off workout launch
  - estimated duration
  - difficulty
  - equipment required
  - primary muscle groups
- Required metadata:
  - goal
  - experience level
  - days per week
  - equipment
  - muscle focus
  - estimated session duration

Dependencies:
- [CURATED-ENGINE-PREREQUISITES.md](C:\ATLAS\repos\fawxzzy-fitness\docs\architecture\CURATED-ENGINE-PREREQUISITES.md)
- Exercise variation system
- Exercise data cleanup

Needs decision:
- Whether built-in programs live as static seeded content, admin-managed content, or database-authored content

### P2 - Social Accountability

#### 8. Friends system

Status:
- Open

Goal:
- Let users share progress with people they know without building a full social feed first.

MVP:
- Users can:
  - send friend requests
  - accept or decline requests
  - remove friends
  - view friend profile cards
- Friend-visible stats:
  - current streak
  - total workouts
  - recent workouts
  - PR count
  - top lifts
- Add per-field privacy controls for:
  - streak
  - workouts
  - top lifts
  - PRs
  - activity timestamps

Dependencies:
- Profile sharing model
- Privacy controls

Needs decision:
- Default privacy posture for new accounts and existing accounts during migration

#### 9. Groups and small leaderboards

Status:
- Open

Goal:
- Create small-group accountability after the friend graph exists.

MVP:
- Users can:
  - create a private group
  - invite friends
  - join via invite
  - view a group leaderboard
- Start with leaderboard modes:
  - weekly workouts completed
  - current streak
- Add a simple activity feed with entries like:
  - `Zac logged Push Day`
  - `Maya hit a new PR`
  - `Chris completed 4 workouts this week`

Dependencies:
- Friends system
- Privacy controls
- Event generation for workouts and PRs

Needs decision:
- Maximum group size for MVP
- Whether ties are allowed or need deterministic tiebreak rules

### P3 - Platform And Presentation Polish

#### 10. Live Activities and lock-screen workout logging

Status:
- Open concept with partial product definition

Goal:
- Let users progress through an active workout from the lock screen.

MVP:
- During an active session, surface the current set with:
  - exercise name
  - set number
  - target weight
  - target reps
  - `Log Set` action
  - `Skip` action
- After log or skip, advance to the next set.
- After the final set, show `Complete Workout`.
- Keep detailed editing inside the app.

Dependencies:
- Stable current-session persistence
- Current exercise order
- Quick log sync
- Skip logic
- Workout completion logic

Needs decision:
- Whether the first release is iOS-only
- Whether timers or rest countdown belong in MVP or phase 2

#### 11. Themes and visual styles

Status:
- Open

Goal:
- Let users personalize the visual identity of the app without screen-by-screen hardcoding.

MVP:
- Build a theme token system first.
- Theme tokens should cover:
  - background
  - card background
  - primary text
  - secondary text
  - accent
  - button color
  - border color
  - success and error colors
  - gradients
  - optional background pattern or image
- Initial theme pack:
  - Clouds
  - Purple and Black
  - Dark Purple to Black Gradient
  - Camo
  - Red and White

Dependencies:
- Shared token bridge across major surfaces

Needs decision:
- Whether theme selection is free for all users or reserved for a premium tier

#### 12. Browser install button and PWA install behavior

Status:
- Open

Goal:
- Show install guidance only when the app is being used in a browser context that can act on it.

MVP:
- In browser:
  - show install CTA when installable
- In installed mode:
  - hide install CTA
- Platform-specific behavior:
  - desktop browser: show install button when supported
  - iOS Safari: show `Add to Home Screen` instructions
  - Android Chrome: trigger install prompt when available

Dependencies:
- Display-mode detection
- PWA install prompt support

Needs decision:
- Whether install education is one-time dismissible or always available from settings

### P4 - Advanced Personalization

#### 13. Menstrual cycle-aware workout and diet personalization

Status:
- Open

Goal:
- Offer optional cycle-aware adjustments without forcing users into medicalized UX.

MVP:
- Optional inputs:
  - cycle length
  - last period start date
  - symptoms or energy level
  - readiness notes
  - appetite or craving notes if diet tracking is present
- Optional recommendation outputs:
  - training intensity adjustment
  - volume adjustment
  - recovery emphasis
  - deload suggestion
  - exercise selection guidance

Guardrails:
- fully optional
- private by default
- no medical claims
- users can always override suggestions
- recommendations must explain themselves in plain language

Dependencies:
- Stable workout generation logic
- Privacy model

Needs decision:
- Whether diet guidance ships with workout guidance or waits for a later nutrition surface

### Supporting Content And Admin Work

#### 14. Active users and app usage analytics

Status:
- Open

Goal:
- Track real product usage rather than only account count.

MVP:
- Admin metrics:
  - users online now
  - active sessions today
  - app opens today
  - workouts started today
  - workouts completed today
  - DAU
  - WAU
  - MAU
  - workout completion rate
- Product metrics:
  - started but not completed workouts
  - average workout duration
  - average sets per session
  - most used routines
  - most logged exercises
  - 1-day, 7-day, and 30-day retention

Dependencies:
- Event instrumentation
- Admin reporting surface

Needs decision:
- Whether this belongs in the main app admin area or an external analytics stack first

#### 15. Add `Barbell Curl 21s` to the exercise library

Status:
- Open content task

Goal:
- Add a common biceps exercise with sane defaults.

MVP:
- Add:
  - exercise name: `Barbell Curl 21s`
  - primary muscle: `Biceps`
  - equipment: `Barbell`
  - movement type: `Curl`
  - tracking type: weight plus reps
- Default behavior:
  - either target `21` reps by default
  - or show helper copy that explains the `7/7/7` structure

Dependencies:
- Exercise catalog content path

Needs decision:
- Whether helper copy is enough or this should become a first-class structured-set pattern later

## Recommended Build Sequence

1. Fix current session persistence.
2. Fix quick log goal sync.
3. Design and ship the exercise variation system.
4. Add optional bodyweight support for bodyweight-aware calculations.
5. Ship the progress dashboard: calendar, heatmap, and visible streak UI.
6. Add muscle-group color tokens.
7. Expand curated workouts and built-in programs.
8. Ship friends.
9. Ship groups and small leaderboards.
10. Add live activities and lock-screen logging.
11. Add themes.
12. Add cycle-aware personalization.

## Product Notes

1. Do not rebuild streak logic inside retention UI work. The need is visual exposure, not new streak computation.
2. Do not expand curated programming before exercise variation rules are stable. Pull-ups, assisted movements, weighted bodyweight work, and grip variants will make the content system messy fast.
3. Social features should remain privacy-first. Friends and groups must respect visibility settings from day one.
4. Live activities are polish, not a substitute for fixing the core session-state model.

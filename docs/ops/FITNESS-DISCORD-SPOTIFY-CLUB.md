# Fitness Discord Spotify Club

Spotify Club lives in the Fitness-hosted Fawx Security stack so Discord interactions, Spotify OAuth, panel setup, and secure token storage stay inside the existing production path.

## Scope

Phase 1 shipped:

- `/spotify connect`
- `/spotify status`
- `/spotify disconnect`
- Spotify OAuth callback handling
- Premium / Not Premium / Unknown eligibility state
- encrypted refresh token storage

Phase 2 shipped:

- `/setup-spotify-club`
- `/jam-lobby open`
- `/jam-lobby close`
- `/jam-lobby status`
- one public Spotify Club panel
- Connect Spotify, Check Jam Ready Status, and Disconnect Spotify buttons
- basic Open / Closed lobby state

Phase 3 adds:

- `/jam-queue suggest`
- `/jam-queue list`
- `/jam-queue approve`
- `/jam-queue reject`
- `/jam-queue remove`
- `Suggest Track` panel button + modal
- `View Queue` panel button
- Discord-side queue suggestions
- host/staff approval, rejection, and removal workflow
- queue preview lines in the Spotify Club panel

Spotify Club still does not include:

- Spotify playback sync
- Spotify player control
- pushing tracks into Spotify playback queues
- Discord voice or audio behavior

Feedback cards:

- `f31e1150` — Spotify Club Phase 1 - Connect + Premium Check
- `1e185453` — Spotify Club Phase 2 - Public Jam Panel + Lobby State
- `b3483cf2` — Spotify Club Phase 3 - Queue Suggestions + Host Approval

## Product UX Rule

Phase 1 uses slash commands as a proof slice. Final Spotify Club UX should not depend on normal users memorizing slash commands.

Rules:

- admin and setup commands stay hidden from normal users
- public user actions should be exposed through a Spotify Club panel with buttons and modals
- future Jam actions should surface from the panel, not from command memorization

Target split:

- admin/staff: `/setup-spotify-club`, future `/jam-admin ...`
- users: `Connect Spotify`, `Check Jam Ready Status`, `Disconnect Spotify`, `Suggest Track`, `View Queue`

Reserved future panel actions:

- `Join Jam`
- `Leave Jam`

## OAuth Setup

Spotify Club uses Spotify Authorization Code with PKCE for Discord account linking.

Required Spotify redirect URI:

- `SPOTIFY_REDIRECT_URI`
- Example: `https://<fitness-host>/api/spotify/oauth/callback`

Add the same redirect URI in the Spotify Developer Dashboard allowlist exactly as configured in env.

Requested Phase 1 scope:

- `user-read-private`

## Environment Variables

Configure these in local env and Vercel before deploy:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`
- `SPOTIFY_TOKEN_ENCRYPTION_KEY`
- `SPOTIFY_OAUTH_STATE_SECRET`
- `DISCORD_SPOTIFY_CLUB_CHANNEL_ID`

Use long random secrets for the encryption and state values.

## Discord Commands

Phase 1 proof commands:

- `/spotify connect`
- `/spotify status`
- `/spotify disconnect`

Phase 2 setup and staff commands:

- `/setup-spotify-club`
- `/jam-lobby open`
- `/jam-lobby close`
- `/jam-lobby status`

Phase 3 queue commands:

- `/jam-queue suggest`
- `/jam-queue list`
- `/jam-queue approve`
- `/jam-queue reject`
- `/jam-queue remove`

Command behavior:

- `connect`: returns an OAuth link and the Phase 1 Jam Ready explanation.
- `status`: returns one of Premium, not Premium, unknown, or not connected.
- `disconnect`: tombstones the stored connection and removes live token material.
- `setup-spotify-club`: posts or refreshes the canonical Spotify Club panel in `DISCORD_SPOTIFY_CLUB_CHANNEL_ID`.
- `jam-lobby`: opens, closes, or reports lobby shell state only. No playback or queue behavior is allowed in this phase.
- `jam-queue suggest`: stores a pending queue suggestion for the active lobby.
- `jam-queue list`: shows the current approved queue and pending suggestion count.
- `jam-queue approve|reject|remove`: staff/host controls for the Discord-side queue only.

These commands are acceptable as proof/admin tools, but the public Spotify Club product should keep normal-user flows on the panel rather than command memorization.

## Phase 3 Queue Rule

Phase 3 manages queue state in Discord and Supabase only. It does not mutate Spotify playback queues or control playback.

Rules:

- users may suggest Spotify track URLs or `spotify:track:` URIs
- queue suggestions are stored as pending items for the active lobby only
- host/staff approves, rejects, or removes queue items
- non-Premium status does not block queue suggestions in this phase
- the panel shows the top approved queue items and the pending suggestion count
- Phase 3 must not request playback-control scopes
- Phase 3 must not call Spotify player endpoints or push items into the real Spotify queue

## Phase 3 Panel State

The Spotify Club panel now shows:

- lobby status: `Open` or `Closed`
- current host mention when a lobby is open
- queue preview:
  - `No approved tracks yet.` when empty
  - otherwise the top 3 approved queue items
- pending suggestion count

Panel actions:

- `Connect Spotify`
- `Check Jam Ready Status`
- `Disconnect Spotify`
- `Suggest Track`
- `View Queue`

Interaction reliability rule:

- panel buttons must either respond immediately or defer ephemerally first
- stale or unknown Spotify Club panel buttons should answer:
  - `This Spotify Club panel is outdated. Ask staff to run /setup-spotify-club.`
- `/setup-spotify-club` remains the recovery path for refreshing the canonical panel and pruning stale duplicates

Still reserved or parked:

- `Join Jam`
- playback sync

## Premium Eligibility

Spotify current-user profile data may include `product` when `user-read-private` is granted, but the field is deprecated and may be absent.

Rules:

- `premium` => Jam Ready
- `free` => connected but not Jam Ready
- `open` => connected but not Jam Ready
- missing or unknown product => connected, Premium unknown, not Jam Ready

## Token Storage Rules

- Store only encrypted Spotify refresh tokens.
- Do not store Spotify access tokens.
- Never print tokens in logs.
- Never send tokens into Discord messages.
- Never store raw OAuth state payloads server-side.
- Disconnect must remove active token material by tombstoning the connection row.

## Hard Boundary

Spotify Club coordinates Spotify-native listening flows later. It does not stream, rebroadcast, record, or pipe Spotify audio through Discord.

## Future Phases

- Phase 4: Spotify-native playback sync
- Phase 5: polish, stats, recurring jam nights

## Release Note Rule

Only post Spotify Club `#updates` messages for shipped user-facing phases. Queue-only or board-only hygiene changes do not get update posts.

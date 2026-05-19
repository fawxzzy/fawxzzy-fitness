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

Phase 2 adds:

- `/setup-spotify-club`
- `/jam-lobby open`
- `/jam-lobby close`
- `/jam-lobby status`
- one public Spotify Club panel
- Connect Spotify, Check Jam Ready Status, and Disconnect Spotify buttons
- basic Open / Closed lobby state

Spotify Club still does not include:

- `/jam start`, `/jam join`, `/jam queue`, or `/jam end`
- queue control
- playback sync
- Spotify player control
- Discord voice or audio behavior

Feedback card: `f31e1150`

## Product UX Rule

Phase 1 uses slash commands as a proof slice. Final Spotify Club UX should not depend on normal users memorizing slash commands.

Rules:

- admin and setup commands stay hidden from normal users
- public user actions should be exposed through a Spotify Club panel with buttons and modals
- future Jam actions should surface from the panel, not from command memorization

Target split:

- admin/staff: `/setup-spotify-club`, future `/jam-admin ...`
- users: `Connect Spotify`, `Check Jam Ready Status`, `Disconnect Spotify`

Reserved future panel actions:

- `Join Jam`
- `Suggest Track`
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

Command behavior:

- `connect`: returns an OAuth link and the Phase 1 Jam Ready explanation.
- `status`: returns one of Premium, not Premium, unknown, or not connected.
- `disconnect`: tombstones the stored connection and removes live token material.
- `setup-spotify-club`: posts or refreshes the canonical Spotify Club panel in `DISCORD_SPOTIFY_CLUB_CHANNEL_ID`.
- `jam-lobby`: opens, closes, or reports lobby shell state only. No playback or queue behavior is allowed in this phase.

These commands are acceptable for the early proof phase, but Phase 2 should introduce a public Spotify Club panel so normal users do not need slash commands for basic actions.

## Phase 2 UX Target

Phase 2 should begin with panel and lobby-state work before queue depth or playback sync.

Acceptance target:

- `/setup-spotify-club` is admin-only
- setup posts a public Spotify Club panel
- the panel includes `Connect Spotify`, `Check Jam Ready Status`, and `Disconnect Spotify`
- the panel reserves space for future `Join Jam` and `Suggest Track` actions
- the panel shows whether the Jam Lobby is Open or Closed
- `/jam-lobby open` and `/jam-lobby close` update state only and refresh the panel when it exists
- normal users do not need slash commands for basic Spotify Club actions
- do not add playback sync or queue mutation unless a later card explicitly approves it

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

- Phase 2: Public Jam panel + lobby state
- Phase 3: queue suggestions + host/mod approval
- Phase 4: Spotify-native playback sync
- Phase 5: polish, stats, recurring jam nights

## Release Note Rule

Do not post a Spotify Club `#updates` announcement until Phase 1 ships and is live-tested.

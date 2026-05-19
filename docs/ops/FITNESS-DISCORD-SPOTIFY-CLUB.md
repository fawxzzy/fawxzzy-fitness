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

Phase 4 adds:

- `Check Playback Device` panel button
- `Start Queue on Spotify` panel button
- playback-scope upgrade prompts for older Spotify connections
- active-device readiness checks
- user-requested Spotify-native playback handoff for the first approved queue item

Phase 5 adds:

- room-aware Spotify Club state anchored to the default public room `main`
- explicit `Join Spotify Club` and `Leave Jam` flows
- separate `Disconnect Spotify Auth` behavior
- Discord-side Spotify track search
- layered panel actions for connect, room, queue, and playback steps

Spotify Club still does not include:

- Discord voice or audio behavior
- perfect-sync promises
- auto-start playback when hosts open a lobby
- pushing multiple tracks into Spotify playback queues

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
- `/spotify` and `/jam-queue` stay available as staff or operator fallback commands only

Target split:

- admin/staff: `/setup-spotify-club`, `/jam-lobby`, `/jam-queue`, `/spotify`, future `/jam-admin ...`
- users: `Connect Spotify`, `Join Spotify Club`, `Leave Jam`, `Search Track`, `Suggest Track`, `View Queue`, `Check Playback Device`, `Start Queue on Spotify`, `Disconnect Spotify Auth`

Reserved future panel actions:

- private room entry
- room settings

## OAuth Setup

Spotify Club uses Spotify Authorization Code with PKCE for Discord account linking.

Required Spotify redirect URI:

- `SPOTIFY_REDIRECT_URI`
- Example: `https://<fitness-host>/api/spotify/oauth/callback`

Add the same redirect URI in the Spotify Developer Dashboard allowlist exactly as configured in env.

Requested Phase 1 scope:

- `user-read-private`

Phase 4 playback-readiness scopes:

- `user-read-playback-state`
- `user-modify-playback-state`

Reconnect or upgrade rule:

- older Phase 1 Spotify connections may be Jam Ready but still miss playback permissions
- Phase 4 must not silently escalate scopes
- readiness and handoff flows should explain why playback permissions are needed, then provide a reconnect link with the expanded scopes

## Environment Variables

Configure these in local env and Vercel before deploy:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`
- `SPOTIFY_TOKEN_ENCRYPTION_KEY`
- `SPOTIFY_OAUTH_STATE_SECRET`
- `DISCORD_SPOTIFY_CLUB_CHANNEL_ID`

Optional:

- `DISCORD_SPOTIFY_CLUB_TEST_CHANNEL_ID`

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
- `status`: returns one of not connected, not Premium, missing playback permissions, no active device, or Playback Ready.
- `disconnect`: tombstones the stored connection and removes live token material.
- `setup-spotify-club`: posts or refreshes the canonical Spotify Club panel in `DISCORD_SPOTIFY_CLUB_CHANNEL_ID`.
- `jam-lobby`: opens, closes, or reports lobby shell state only. No playback or queue behavior is allowed in this phase.
- `jam-queue suggest`: stores a pending queue suggestion for the active lobby.
- `jam-queue list`: shows the current approved queue and pending suggestion count.
- `jam-queue approve|reject|remove`: staff/host controls for the Discord-side queue only.

Visibility rule:

- `/setup-spotify-club`, `/jam-lobby`, `/jam-queue`, and `/spotify` are staff-facing commands
- normal users should not need slash commands for Spotify Club flows once the panel is live
- the public Spotify Club product should keep normal-user flows on the panel rather than command memorization

## Phase 5 Room Model

Phase 5 separates room membership from Spotify authorization.

Rules:

- the default public room is `main`
- joining a room does not require playback handoff
- leaving a room does not disconnect Spotify auth
- disconnecting Spotify auth should leave the active room and remove saved Spotify authorization
- private-room fields may exist in storage before private-room UX is exposed publicly

Current model:

- `discord_spotify_lobbies` carries the canonical room and panel linkage
- `discord_spotify_room_members` tracks joined vs left membership state
- all current production behavior still maps to the default public room unless a future room lane expands it

## Public Channel Hygiene

`#spotify-club` is the public product surface, not the ops log.

Rules:

- the canonical Spotify Club panel is the visible source of lobby and queue state
- `Suggest Track`, `View Queue`, `Approve`, `Reject`, `Remove`, and lobby open/close confirmations stay ephemeral
- public queue state changes should appear through panel refreshes, not scrolling audit spam
- if `DISCORD_SPOTIFY_CLUB_TEST_CHANNEL_ID` is configured, proof or regression logs may go there instead of the public channel
- testing and canary chatter belongs in a private Spotify Club testing lane, not the public community surface

Operational cleanup:

- `npm run spotify:club:cleanup` runs a dry-run against `DISCORD_SPOTIFY_CLUB_CHANNEL_ID`
- `npm run spotify:club:cleanup -- --apply` deletes known bot-authored Spotify queue rollout chatter while preserving the canonical panel
- the cleanup tool only targets the configured public Spotify Club channel

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

- room name and visibility
- lobby status: `Open` or `Closed`
- current host mention when a lobby is open
- joined member count
- queue preview:
  - `No approved tracks yet.` when empty
  - otherwise the top 3 approved queue items
- pending suggestion count

Panel actions:

- `Connect Spotify`
- `Join Spotify Club`
- `Leave Jam`
- `Search Track`
- `Suggest Track`
- `View Queue`
- `Check Playback Device`
- `Start Queue on Spotify`
- `Disconnect Spotify Auth`

Interaction model:

- the public panel stays short and low-noise
- button results are ephemeral where possible
- `Leave Jam` leaves the current room only
- `Disconnect Spotify Auth` removes saved Spotify authorization
- standalone public status checks are replaced by state-aware button flows and direct readiness copy when relevant

Search flow:

- `Search Track` opens a Discord modal for a Spotify search query
- the bot returns up to 5 track results as an ephemeral select menu
- choosing a result creates a pending suggestion in the current room queue
- URL or `spotify:track:` suggestion fallback still exists for staff and proof flows

Playback readiness states:

- `Jam Ready`: Premium is verified
- `Missing playback permissions`: reconnect Spotify with playback scopes
- `Open Spotify first`: no active Spotify device is available
- `Playback Ready`: permissions and an active device are available for handoff

Playback handoff rule:

- Phase 4 starts only the first approved queue item
- playback begins only after a user explicitly clicks `Start Queue on Spotify`
- playback stays inside Spotify on the user's own active device
- Phase 4 must not call Spotify Add to Queue
- Phase 4 must not promise exact sync

Interaction reliability rule:

- panel buttons must either respond immediately or defer ephemerally first
- stale or unknown Spotify Club panel buttons should answer:
  - `This Spotify Club panel is outdated. Ask staff to run /setup-spotify-club.`
- `/setup-spotify-club` remains the recovery path for refreshing the canonical panel and pruning stale duplicates
- panel refresh failures on aged Discord messages should recreate the canonical panel instead of leaving the public state stale

Still reserved or parked:

- playback sync
- multiple public rooms
- private room keys

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

- Phase 5: Spotify-native playback sync, if explicitly approved later
- Phase 6: polish, stats, recurring jam nights

## Release Note Rule

Only post Spotify Club `#updates` messages for shipped user-facing phases. Queue-only or board-only hygiene changes do not get update posts.

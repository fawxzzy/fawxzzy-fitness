# Fitness Discord Spotify Club

Phase 1 of Spotify Club lives in the Fitness-hosted Fawx Security stack so Discord interactions, Spotify OAuth, and secure token storage stay inside the existing production path.

## Scope

Phase 1 only includes:

- `/spotify connect`
- `/spotify status`
- `/spotify disconnect`
- Spotify OAuth callback handling
- Premium / Not Premium / Unknown eligibility state
- encrypted refresh token storage

Phase 1 does not include:

- Jam Lobby commands
- queue control
- playback sync
- Spotify player control
- Discord voice or audio behavior

Feedback card: `f31e1150`

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

Use long random secrets for the encryption and state values.

## Discord Commands

- `/spotify connect`
- `/spotify status`
- `/spotify disconnect`

Command behavior:

- `connect`: returns an OAuth link and the Phase 1 Jam Ready explanation.
- `status`: returns one of Premium, not Premium, unknown, or not connected.
- `disconnect`: tombstones the stored connection and removes live token material.

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

- Phase 2: Jam Lobby state + public panel
- Phase 3: queue suggestions + host/mod approval
- Phase 4: Spotify-native playback sync
- Phase 5: polish, stats, recurring jam nights

## Release Note Rule

Do not post a Spotify Club `#updates` announcement until Phase 1 ships and is live-tested.

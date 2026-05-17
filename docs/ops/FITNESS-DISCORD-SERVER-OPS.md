# Fitness Discord Server Ops

Purpose:
- inventory the live Discord server ids and topology that Fawx Security depends on
- keep the server low-noise without pretending the bot can force personal mute settings

Core rule:
- only `Updates` and `Main` are loud channels

What the bot can do:
- export channel, category, role, emoji, and forum-tag ids
- audit broad-ping behavior and mention permissions
- recommend conservative permission follow-ups

What the bot cannot do:
- force a user's personal Discord mute settings
- silently widen moderation or announcement scope

Scripts:
- `npm run discord:inventory`
- `npm run discord:noise:audit`
- `npm run discord:noise:apply`

Slash command:
- `/server-inventory`

Inventory output:
- `runtime/discord-inventory/latest.md`
- `runtime/discord-inventory/latest.json`

Noise output:
- `runtime/discord-noise/latest.md`
- `runtime/discord-noise/latest.json`

Policy:
- Update Bot may use `@everyone` in `Updates`
- non-update workflows should avoid broad pings
- feedback and moderation should rely on bounded `allowed_mentions`
- review roles with Mention Everyone before treating a channel as quiet

Apply posture:
- `discord:noise:apply` is dry-run by default
- v1 is recommendation-first and intentionally conservative
- do not claim that the bot muted channels for users; it can only recommend or apply reviewed permission changes

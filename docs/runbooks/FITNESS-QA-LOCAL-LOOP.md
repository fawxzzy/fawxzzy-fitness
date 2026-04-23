# Fitness QA Local Loop

Use this loop for fast desktop and phone checks against the local Next.js server while keeping Git auto-deploys off. `_stack` remains the deployment boundary; these commands only run local dev and QA helpers.

## Fast LAN Loop

```bash
npm run qa:loop:mobile
```

What it does:
- resets the reusable QA user's app data to the deterministic baseline
- ensures a fresh QA session artifact
- starts the local Next dev server on `0.0.0.0:3000` if one is not already reachable
- prints the desktop localhost URL, the LAN phone URL, and a copy/paste block
- writes current loop status under the stack runtime area

For a foreground server in a separate terminal:

```bash
npm run qa:dev:lan
```

The phone should be on the same Wi-Fi network as the PC and should open the printed LAN URL, for example `http://192.168.x.x:3000`.

## Tunnel Loop

If a stable tunnel URL is already managed outside this repo, set it locally:

```bash
FITNESS_QA_TUNNEL_URL=https://fitness-dev.example.com
```

Then run:

```bash
npm run qa:tunnel
npm run qa:loop:mobile
```

For a temporary tunnel, install `cloudflared` and run:

```bash
npm run qa:tunnel
```

`qa:tunnel` defaults to:

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

For a custom tunnel command, set local-only env values:

```bash
FITNESS_QA_TUNNEL_COMMAND=cloudflared
FITNESS_QA_TUNNEL_ARGS_JSON=["tunnel","--url","{localUrl}"]
```

`{localUrl}` and `{port}` are replaced by the QA helper. Keep these values in `.env.local` or your shell; do not commit secrets or machine-specific tunnel config.

To let the mobile loop start the tunnel helper in the background:

```bash
npm run qa:loop:mobile -- --tunnel
```

## QA User

Use one permanent Supabase QA auth user:

```bash
npm run qa:user:ensure
npm run qa:user:reset
npm run qa:session
```

Required local env:
- `FITNESS_QA_EMAIL`
- `FITNESS_QA_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never create throwaway signup users for routine local/mobile verification.

## Safe Temp User Cleanup

Dry-run cleanup first:

```bash
npm run qa:user:cleanup -- --pattern "^codex[+._-].*@"
```

Apply only after reviewing the matched emails:

```bash
npm run qa:user:cleanup:apply -- --pattern "^codex[+._-].*@"
```

The cleanup command refuses patterns that do not clearly target Codex-created accounts and always excludes the permanent QA email.

## Auth Redirects

Password login works from LAN and tunnel URLs without special callback handling. For recovery, magic-link, or reset-password flows, add the active local/tunnel origin to Supabase Auth redirect URLs before testing:
- `http://127.0.0.1:3000`
- the printed LAN origin, for same-Wi-Fi phone testing
- the stable tunnel/custom domain, for public phone or PWA checks

Use a stable tunnel/custom domain for install/PWA and auth callback checks. Raw LAN IPs are best for fast edit and refresh cycles.

## Gotchas

- Next must bind to `0.0.0.0`; `qa:dev:lan` does that.
- Windows Firewall must allow inbound traffic for the selected port.
- Phone and PC must share the same network for LAN mode.
- Some guest Wi-Fi networks block client-to-client traffic.
- If port `3000` is occupied, set `FITNESS_QA_DEV_PORT` locally and run the scripts with `-- --port <port>` when needed.

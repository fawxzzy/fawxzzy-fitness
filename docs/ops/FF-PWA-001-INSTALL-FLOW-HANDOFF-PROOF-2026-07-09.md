# FF-PWA-001 Install Flow Handoff Proof - 2026-07-09

## Status

`FF-PWA-001 - Complete Install Experience and Onboarding` is proof-closed for deterministic app routing and install guidance.

Final physical-device proof remains part of `FF-QA-001` launch smoke because iOS Add-to-Home-Screen, Android install prompt behavior, and standalone launch behavior depend on browser and OS surfaces outside the local app runtime.

## Root Issue

The install surfaces already knew the right contexts:

- iOS in-app browser -> Open in Safari gate
- iOS Safari -> Add to Home Screen gate
- iOS standalone -> leave install route and open the app
- Android/desktop -> browser install or menu-install guidance

The fragile part was the handoff URL. The in-app browser gate used the plain canonical `/install` URL. If an in-app browser or OS handoff preserved an `installContext=ios-inapp` URL, Safari could keep rendering the in-app-browser gate instead of advancing to the Safari Add-to-Home-Screen step.

## Fix

The in-app handoff URL now explicitly targets the Safari install guidance step:

```txt
/install?installContext=ios-safari
```

This applies to both:

- the public `/install?installContext=ios-inapp` surface
- protected app routes blocked by `ProtectedAppInstallGate`

Plain `/install` is still preserved for normal browser install guidance, and standalone mode still redirects out of the install route.

## Files Changed

- `src/lib/install/config.ts`
- `src/lib/install/config.test.ts`
- `src/components/install/InstallRouteSurface.tsx`
- `src/components/install/ProtectedAppInstallGate.tsx`
- `scripts/feedback-monetization-roadmap.mjs`

## Verification

Targeted deterministic install tests:

```txt
node --import ./scripts/register-test-aliases.mjs --test src/lib/install/getInstallContext.test.ts src/lib/install/config.test.ts
```

Result:

```txt
15 tests passed
```

Repo verification:

```txt
npm run typecheck
npm run verify
```

Result:

```txt
typecheck passed
verify passed
```

Route-level sanity checks against local `3002`:

- `/install?installContext=ios-inapp` includes the Safari handoff URL query: `installContext=ios-safari`
- `/install?installContext=ios-safari` renders Add-to-Home-Screen guidance
- `/install?installContext=ios-standalone` does not render the in-app or install guidance shells server-side because standalone is handled by client redirect

## Card Relationship

This is the direct card:

- `FF-PWA-001 - Complete Install Experience and Onboarding`

This is adjacent but not the same card:

- `FF-PWA-002 - Offline/PWA resilience`

`FF-PWA-002` audits the install shell as part of the wider PWA/offline system, but the install-flow onboarding contract itself belongs to `FF-PWA-001`.

## Discord Board Sync

DiscordOS readiness was proven before live board mutation:

```txt
npm run ops:production-env:run -- npm run ops:discordos:env-readiness:json
```

Result:

```txt
status: ready
updatesPostReady: true
blockedCheckCount: 0
```

Scoped live sync:

```txt
npm run feedback:monetization:seed -- --card-id FF-PWA-001 --apply
```

Result:

```txt
Rows updated: 1
Threads synced: 1
Report ID: 9cc9c8b1-16cc-4db3-aa02-5492f0dd6af7
```

Scoped completed-board mirror:

```txt
npm run discord:feedback:completed-board -- --report-id 9cc9c8b1-16cc-4db3-aa02-5492f0dd6af7 --limit 1 --apply
```

Result:

```txt
Mirrored: 1
Completed-board thread: 1524827288674369710
```

## Follow-Up: Auth Entry Install Enforcement

After local review, direct auth entry routes still allowed browser users to bypass install guidance because `/login`, `/signup`, `/forgot-password`, and `/reset-password` were treated as public app routes.

The install gate now redirects those auth entry routes to `/install?returnTo=...` when the app is opened in a normal browser or in-app browser context.

Installed standalone mode still bypasses the install guide and opens the app directly.

The install screen `Open` action now returns to the intended auth route with a one-time install bypass flag so users can log in after seeing install guidance without getting caught in a loop.

Additional context detection was added for link-in-bio style in-app browsers:

- `LinkMe`
- `Linktree`
- `Beacons`

Browser proof:

```txt
Direct /login -> /install?returnTo=%2Flogin
Install screen rendered browser install guidance instead of login form.
Open from install did not loop; authenticated browser continued into /today.
```

Follow-up correction:

```txt
The first bypass implementation persisted the install bypass in sessionStorage.
That made later auth entry routes skip install after one Open click.
The bypass is now route-local and URL-triggered only.
Fresh /signup proof: /signup -> /install?returnTo=%2Fsignup.
```

Stability correction:

```txt
The install route no longer auto-opens auth routes after hydration for normal browser/in-app contexts.
Only the explicit ios-standalone QA context auto-opens the app.
/signup -> /install?returnTo=%2Fsignup stayed on the install screen after 7 seconds and again after 15 additional seconds.
In-app browser copy now says to open the link in the user's default browser.
```

Server-entry race correction:

```txt
Root, login, and signup now route to install before local-dev auth redirects can render.
This prevents the visible install screen from getting skipped by LocalDevAutoLoginRedirect after first paint.
The only route-local bypass is installBypass=1, which is generated by the install screen Open action.
```

Live smoke proof after server-entry correction:

```txt
Root desktop after 16s:
http://127.0.0.1:3002/install?returnTo=%2Flogin

Login desktop after 16s:
http://127.0.0.1:3002/install?returnTo=%2Flogin

Signup desktop after 16s:
http://127.0.0.1:3002/install?returnTo=%2Fsignup

Login bypass desktop after 16s:
http://127.0.0.1:3002/today

Root LinkMe iPhone in-app UA after 16s:
http://127.0.0.1:3002/install?returnTo=%2Flogin
Rendered copy: Open Fitness in your browser.
Rendered handoff URL: http://127.0.0.1:3002/install?installContext=ios-safari.

Forgot-password alias after 8s:
http://127.0.0.1:3002/install?returnTo=%2Fforgot-password

Normal reset-password after 8s:
http://127.0.0.1:3002/install?returnTo=%2Freset-password

Recovery reset-password after 8s:
http://127.0.0.1:3002/reset-password?recovery=1
Recovery remains outside the install gate so password reset links are not broken.
```

Current caveat:

```txt
If the real TikTok/LinkMe link targets the public deployed app, this local fix will not appear there until the repaired build is deployed to that public target.
```

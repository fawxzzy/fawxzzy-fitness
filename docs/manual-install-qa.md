# Fitness Manual Install QA

## iOS in-app browser

1. Open `https://fawxzzy-fitness-local.vercel.app/install` from TikTok or another in-app browser.
2. Confirm the `Open Fitness in Safari` gate appears.
3. Confirm the install URL is visible.
4. Confirm `Copy link` copies the install URL.
5. Open Safari, paste the link, and continue there.

## iOS Safari

1. Open the Fitness install URL in Safari.
2. Confirm the `Add Fitness to your Home Screen` gate appears.
3. Confirm the steps say `Share, then Add to Home Screen`.
4. Add the app to the Home Screen.
5. Launch Fitness from the Home Screen.
6. Confirm protected routes open normally.

## Browser auth doctrine

1. Open `/login`, `/signup`, `/forgot-password`, and `/reset-password` in an iPhone browser tab.
2. Confirm those routes remain usable even when protected routes are gated.
3. Confirm `/auth/confirm` still completes its callback behavior.

## Android and desktop

1. Open `/install` in Chrome.
2. If the browser exposes `beforeinstallprompt`, confirm `Install app` appears.
3. If installability is not exposed, confirm the screen still allows `Continue to app`.
4. Confirm protected routes remain usable and are not hard-blocked.

## QA overrides

Use only outside production:

- `?installContext=ios-inapp`
- `?installContext=ios-safari`
- `?installContext=ios-standalone`
- `?installContext=android`
- `?installContext=desktop`

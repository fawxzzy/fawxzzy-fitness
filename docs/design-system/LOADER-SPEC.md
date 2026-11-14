# Loader spec (shared by Fitness and Mazer)

One loading screen for boot and for every wait: the app image centred on the dark shell colour, a soft ring that grows
and fades once per beat, a 3% icon breath. It appears only if the wait lasts, never blinks, fades in and out, and never
touches the layout. This file is the written definition both apps follow; each app keeps its own implementation (no
cross-repo imports) and pins these numbers with its own test.

- Fitness implementation: `src/lib/app-loader.ts` (pure timeline), `src/lib/app-loader-controller.ts` (wait registry),
  `src/components/AppLoaderHost.tsx` (the one overlay), `.app-loader` in `src/app/globals.css`, pinned by
  `src/lib/app-loader.contract.test.ts` and `src/lib/app-loader.test.ts`.
- Mazer implementation: `src/render/appLoader.ts`, `src/boot/bootSplash.ts`, `src/render/appLoaderOverlay.ts`, `index.html`.
- Origin: `docs/ops/MAZER-LOADER-STUDY-2026-11-13.md` in Mazer. Fitness mirrors Mazer's API and constants; where Fitness adds
  something it is marked "Fitness only".

## Timing (ms)

| Constant | Value | Meaning |
| --- | --- | --- |
| LOADER_SHOW_DELAY_MS | 150 | A wait shorter than this never shows the loader. |
| LOADER_MIN_HOLD_MS | 350 | Once shown, it stays at least this long, counted from the first visible frame. |
| LOADER_FADE_IN_MS | 200 | Fade in (smoothstep). |
| LOADER_FADE_OUT_MS | 300 | Fade out (smoothstep), a crossfade into the first real frame. |
| LOADER_REDUCED_CROSSFADE_MS | 200 | Reduced Motion: both fades are this one crossfade; delay and hold are unchanged. |
| LOADER_PULSE_PERIOD_MS | 1200 | One beat: ring cycle and icon breath. |

A new wait during a fade-out turns the fade around from the CURRENT opacity (opacity is continuous in every case).
The pulse restarts at the icon edge each time the loader becomes visible.

## Icon, ring and halo geometry

| Constant | Value | Meaning |
| --- | --- | --- |
| LOADER_ICON_SIZE_RATIO | 0.3 | Icon edge = 30% of the short side of the viewport. |
| LOADER_ICON_MIN_PX | 88 | Clamp floor. |
| LOADER_ICON_MAX_PX | 150 | Clamp ceiling. |
| LOADER_ICON_PULSE_SCALE | 0.03 | Peak icon scale on the beat is 1.03 (`ease-in-out`, 0% = 100% = 1, 50% = 1.03). |
| LOADER_RING_GROWTH | 0.22 | Ring scale goes 1 to 1.22 over one beat (`ease-out`). |
| LOADER_RING_PEAK_ALPHA | 0.5 | Ring opacity goes 0.5 to 0 over the same beat. |
| LOADER_RING_REDUCED_SCALE | 1.08 | Reduced Motion: still ring scale. |
| LOADER_RING_REDUCED_ALPHA | 0.28 | Reduced Motion: still ring opacity. |

- Ring: same size as the icon (`inset: 0`), `border-radius: 22%`, 2 px solid in the icon's ring colour, `box-sizing: border-box`.
- Icon: `border-radius: 20%`. CSS: `clamp(88px, min(30vw, 30vh), 150px)`.
- Static glow behind the icon: radial gradient from 16% of the ring colour to transparent at 62%, `inset: -70%`. Never animated.
- Reduced Motion: no icon breath, the ring is a still halo (scale 1.08, opacity 0.28); fades become the 200 ms crossfade.
- Pose maths (`resolveLoaderPose`): `phase = (t / 1200) mod 1`; `breath = sineInOut(phase < .5 ? 2*phase : 2*(1-phase))`;
  `iconScale = 1 + 0.03 * breath`; `ringScale = 1 + 0.22 * easeOutCubic(phase)`; `ringAlpha = 0.5 * (1 - easeOutCubic(phase))`.
- Easing: `smoothstep(x) = x*x*(3-2x)`, `easeOutCubic(x) = 1-(1-x)^3`, `sineInOut(x) = 0.5*(1-cos(pi*x))` (x clamped to 0..1).
- No blur, no blend mode, no mask on the loader. Motion is opacity and transform only.

## Colours

| App | Backdrop | Ring and glow |
| --- | --- | --- |
| Fitness | `#07111b` (the manifest `background_color` and `theme_color`) | `#c8ed66`, sampled from the Fitness icon's neon ring |
| Mazer | `#02080f` | `#3ddbd4` |

## Behaviour contract

- One overlay for boot and route waits. Waiting screens (route `loading.tsx`, Suspense fallbacks, gates) only REGISTER a
  wait; none owns a timer. (Fitness only: `src/lib/app-loader-controller.ts`.)
- The backdrop is opaque from the first paint (server-rendered or static markup), so the page behind and a white flash never show.
  Only the stage (icon, ring) fades in after 150 ms, by CSS, before any script runs.
- Exit after boot: wait out whatever is left of the 350 ms hold (`resolveBootCoverExitDelayMs` / Mazer's
  `resolveBootSplashExitDelayMs`: `0` if the stage never showed, otherwise `150 + 350 - elapsed`), then fade out over 300 ms.
- The icon is a small inline data URI with its size reserved (`width`/`height` attributes and CSS): no request, no pop-in, no layout jump.
- The overlay takes no pointer events and no focus; app chrome is never hidden or re-shown by the loader (it is covered, then uncovered).
- Accessibility (Fitness): the visual overlay is `aria-hidden`; a separate polite `role="status"` live region carries the wait's
  label; `aria-busy` is set on `<main>` while a wait is open.
- A failed boot (scripts never take over) removes the cover by itself after 12 s (CSS only).

## App image: one source

| App | Source file | Derived |
| --- | --- | --- |
| Fitness | `public/app/icon-512.png`, byte-identical (SHA-256 `5F1011EF2DB7A4725E991D5FB6347F3E589028669F74BC35F273E6E800F11F03`) to the FawxzzyWeb site's Fitness app image `public/apps/fitness/icon.png` | `src/lib/app-loader-icon.ts`: 256 px lossy WebP (quality 80) data URI, by `scripts/generate-app-loader-icon.mjs` (`--check` re-derives and compares) |
| Mazer | `public/apps/mazer/icon.png` of FawxzzyWeb, copied to `src/brand/source-art/mazer-app-icon-master.png` | see `MAZER-APP-IMAGE-SOURCE-2026-11-13.md` |

Fitness's installed-app icons (`public/app/icon-192.png`, `icon-512.png`, the apple-touch and favicon outputs of
`scripts/generate-icons.mjs`) and its link-preview image (`/brand/fitness-app-icon.png`) already come from the same artwork
(`public/brand/fitness-app-icon-source.jpg`), and the site image is the same bytes as `icon-512.png`, so no icon asset was
swapped. Fitness ships no iOS launch (`apple-touch-startup-image`) art; the OS paints the manifest `background_color`, which equals the
loader backdrop, so launch screen and boot cover are the same colour.

# Exercise Icons

Drop new correctly named icons into `/public/exercises/icons/`, then run:

```bash
npm run sync:exercise-icons
```

The sync command validates canonical filenames (`<slug>.png`), regenerates the icon manifest, and writes `icon-sync-report.md` with deterministic new/changed/invalid reporting.

The UI resolves exercise icons by slug/name to `/exercises/icons/<slug>.png` (with existing fallback behavior when an icon is missing).

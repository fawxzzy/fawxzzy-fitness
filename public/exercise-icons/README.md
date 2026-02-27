# Exercise Icons

Drop new exercise PNGs into `/exerciseIcons/`, then run:

```bash
npm run sync:exercise-icons
```

The sync command normalizes filenames to kebab-case and copies them into `/public/exercises/icons/`.

The UI resolves exercise icons by slug/name to `/exercises/icons/<slug>.png` (with existing fallback behavior when an icon is missing).

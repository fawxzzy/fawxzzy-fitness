# Discord Emoji Assets

This folder contains the controlled local art used by:

```txt
npm run discord:emoji:bootstrap
```

Required filenames:
- `Bug.png`
- `Feature.png`
- `FawxzzyLogo.png`
- `FawxzzyLogoWhite.png`

Rules:
- keep these assets local and repo-owned
- target `128x128` when possible
- stay under Discord's `256 KiB` emoji upload limit after processing
- the bootstrap script may normalize or recompress images before upload
- these assets are decoration only; feedback must still work when emoji upload or validation fails

Preferred usage:
- application emojis for bot-owned UI
- guild emojis only when server-owned community emoji are intentionally needed

# FORGE ASCII MAGIC

Animated ASCII art for web pages, loading states, empty states, 404 pages and README banners.

## Installed

```text
Package: ascii-magic-art 1.0.2
Licence: MIT
Pieces:  634
CLI:     ascii-magic-art
Source:  https://github.com/kailashsr38/ascii-magic-art
Web:     https://www.ascii-magic.com/ascii
```

The library is installed globally; Forge does **not** copy the 634 pieces into the repo.

## Commands

```powershell
ascii-magic-art --list                 # all 634 names
ascii-magic-art prompt <piece>         # print/copy the integration prompt
ascii-magic-art <piece> --seconds=3    # play in terminal
ascii-magic-art <piece> --look=dots --chars=" .oO@"
```

## Web integration

```html
<script type="module" src="https://www.ascii-magic.com/ascii/ascii.js"></script>
<ascii-art piece="aurora-cabin-snowfall"></ascii-art>
```

For SSR frameworks, load the script **client-only**.

## Forge rules

- Use ASCII art as **decoration**, not as the only content or only navigation.
- Keep a real heading/text beside it.
- Mark purely decorative art `aria-hidden="true"` and provide a text fallback.
- Respect `prefers-reduced-motion`; offer a static frame or pause.
- Size deliberately; do not let it push game controls off-screen.
- Record the piece name and source URL in the UI note.
- Do not bulk-copy the catalog; use the public script or one generated still.
- Check trademarks/recognizable real-world brands before using a piece in a commercial page.
- MIT covers the library; it does not grant rights to third-party marks or photos.

## Acceptance

- decorative art does not block controls/reading
- reduced-motion fallback exists
- no layout shift when the script loads
- the piece fits the art direction
- source/piece recorded

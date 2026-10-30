# ThreeUI Community — Forge web-UI pointer

**Source:** https://x.com/haoge6699/status/2113352942065725699  
**Repo:** https://github.com/MengTo/threeui  
**Package:** `@designcodeio/threeui` v1.2.0  
**Licence:** MIT (Community code/imagery; fonts OFL; Three.js MIT)  
**Decision:** **INSTALLED AS A TOOL LIBRARY.**

## What it is

The free Community edition of ThreeUI:

- **50** parent components
- **111** routes
- **141** free variant records + 23 singletons = **164 browse results**
- React + Three.js live renderers, controls, themes, search, source tabs
- install-free/preview site; npm package for a React project
- Pro/Beta components are not included

Verified package metadata:

```text
@designcodeio/threeui 1.2.0
MIT
unpacked 54,726,125 bytes
Installed at <FORGE_DIR>\tools\threeui
```

The package is installed in a **tool library** location, not imported by the Forge server. A
concrete React/Three.js project still installs it in that project’s own `node_modules`.

## Forge use

Use when a web project needs a **prebuilt interactive Three.js/React UI surface**:

- hero scenes
- 3D product/configurator sections
- interactive backgrounds
- transitions and shader effects

```bash
npm install @designcodeio/threeui
```

```tsx
import { AtTheHorizon } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

export function Hero() {
  return <AtTheHorizon />;
}
```

For a smaller import graph, use a component subpath.

## Rules

- **Do not** install the package globally or copy its 54 MB `node_modules` into Forge.
- Install only inside a concrete React/Three.js project.
- Copy required runtime assets from `node_modules/@designcodeio/threeui/lib-dist/assets/` into the app’s public directory when a component expects root-relative URLs.
- Use the component’s `sourceUrl` / `assetBaseUrl` override where available.
- **No Pro source**; do not attempt to extract it.
- Check `ASSET-LICENSES.md`, `FONT-LICENSES.md` and `THIRD_PARTY_NOTICES.md` for assets/fonts.
- No account/checkout runtime; do not add auth or paid tiers.
- Test performance on the 8 GB card/browser; heavy shaders can hurt low-end users.

## Forge paths

- `forge-web-worker`
- `forge-ui-worker`
- `forge-pixel-3d-render`
- `threejs` skill
- `docs/ENGINE_OPTIONS.md`

## Pointers

- https://github.com/MengTo/threeui
- https://threeui.com
- https://www.npmjs.com/package/@designcodeio/threeui

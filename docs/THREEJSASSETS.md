# ThreeJS Assets — Forge source pointer

**Source:** https://x.com/threejsassets/status/2112876107087110255  
**Site:** https://threejsassets.com/assets/free  
**Free assets:** 937  
**Licence:** Free Commercial License  
**Decision:** **POINTER/ASSET SOURCE. No bulk mirroring.**

## Licence

Free assets may be used in **personal, open-source, client and commercial projects**.

Restrictions:

- do not resell, mirror, share, repackage or redistribute the asset files
- do not redistribute download access
- per-asset README/pack exceptions must be checked
- premium packs have separate licences; Forge does not buy them

## What Forge uses

- web-optimized GLB models for Three.js/React Three Fiber scenes
- buildings, nature, vehicles, roads/streets, characters, icons
- Draco compression, KTX2 where relevant, documented scale/pivot
- MCP connector for searches/download links when signed in (no key)

## Forge pipeline

1. Search the free catalog for one asset that matches the task.
2. Open its exact asset page; record the Free Commercial License and any pack exception.
3. Download only that asset into the project’s `assets/_inbox/`.
4. Check GLB scale, pivot, materials and triangle count.
5. Register the Asset Pointer with source URL, licence, hash and task.
6. Do not mirror the catalog or include download access in a build.

## MCP

- Connector: `https://mcp.threejsassets.com/connect`
- It is an address, not a secret; access is approved in the browser and revocable.
- No Forge install; the operator may connect an assistant if desired.
- Do not pass private project data through a connector unnecessarily.

## Limits

- Free catalog changes; re-check the exact page at download time.
- No redistribution rights; assets stay project-bound.
- Premium tiers and Pro subscription are not adopted.
- Icons are a separate licence section; verify the icon page.

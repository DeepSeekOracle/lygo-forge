# Infinite Canvas / Image Prompt Registry — Forge pointer

**Link:** https://x.com/ZeroZ_JQ/status/2113503950641242129  
**Project:** https://github.com/basketikun/infinite-canvas

## Decision

**Infinite Canvas app: DISREGARD as a Forge install.**  
**Image Prompt Registry: POINTER — useful reference, no prompt import.**

## Why the app is not installed

- It is a complete frontend-first canvas + AI creation workbench, duplicating Forge's job,
  asset and dispatch surfaces.
- The project explicitly warns that it is in development and its local storage formats may change
  without compatibility guarantees.
- It requires Bun/Node and Docker for deployment, plus the operator's own OpenAI-compatible API
  credentials and provider accounts.
- It is MIT-licensed and free, but "free app" does not mean Forge needs a second canvas.

The post's income claim is not a capability argument and was not used.

## Useful pointer: Image Prompt Registry

- Registry: https://github.com/yukkcat/image-prompts
- Combined manifest: https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/manifest.json
- Prompt record spec: https://github.com/yukkcat/image-prompts/blob/main/docs/prompt-format.md
- License: MIT for the registry code/docs.
- **Prompts and images remain under their original upstream terms.** The registry does not relicense
  them. Do not bulk-copy prompts into a project or treat the registry as a licence grant.

The registry normalizes seven public sources into a static JSON schema. Forge may use it as a
**research/reference source** for image prompts, with source URL and rights review recorded.

## Forge use

- `forge-image-worker` may consult the registry for prompt structure and tags.
- A prompt must retain its `sourceUrl`, source ID, author and retrieved date.
- Prompt text is not an asset licence. Generated images still need the normal Forge provenance,
  human review and Asset Pointer.
- No prompt is copied into a shipped build unless its upstream terms allow it.

## Upstream sources listed by the registry

- Banana Prompt Quicker
- DavidWu GPT Image 2
- Freestylefly GPT Image 2
- Awesome GPT Image
- Awesome GPT-4o Image Prompts
- YouMind GPT Image 2
- YouMind Nano Banana Pro

Verify each upstream source independently before using its content.

## Verdict

Keep the **registry pointer**; do not install or merge the **Infinite Canvas** app.

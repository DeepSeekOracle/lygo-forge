---
name: unity-materials-and-surface-art
description: "Use when tinting, texturing or placing art in Unity."
---

# Materials, liveries and surface art in Unity (URP / glTF)

Trigger: recolouring a model, putting generated art on a surface, or making in-world text/signage read
correctly — in URP, usually on glTF-imported models. Every rule here was established by dumping the live
material or reading the rendered result, because these failures are **silent**: the code runs, nothing
errors, and the object keeps its old look. A wrong guess looks identical to a broken build.

Full recipes (art generation, property tables, verification commands): `references/generating-and-applying-art.md`.

## The three silent no-ops — check these before rewriting anything

1. **`material.mainTextureScale` / `mainTextureOffset` do nothing in URP.** They write `_MainTex_ST`,
   while URP's Lit shader keeps its tiling in `_BaseMap_ST`. Use `SetTextureScale("_BaseMap", ...)` /
   `SetTextureOffset("_BaseMap", ...)`. Symptom: the art is unchanged and it looks like the file never
   reached the build.
2. **A glTF model's colour is not its material colour.** glTFast materials
   (`Shader Graphs/glTF-pbrMetallicRoughness`, typically named `colormap`) have a **white** main colour
   and carry the paint in a *texture*. A recolor pass that tests `material.color` for the body colour
   never matches; one that assigns `material.color` changes nothing visible. Recolour by putting a flat
   colour texture on the base-map slot.
3. **`renderer.material` vs `sharedMaterial`.** Writing to `sharedMaterial` repaints every object that
   shares it. Write to `renderer.material`, which creates the per-renderer instance.

## Recolour a model (livery)

- **Probe the property names instead of assuming them** — a different importer or shader graph renames
  them. In order, first `HasProperty` wins:
  - colour factor: `baseColorFactor` -> `_BaseColor` -> `_Color`
  - base texture: `baseColorTexture` -> `_BaseMap` -> `_MainTex`
  For a glTF graph the texture slot is `baseColorTexture`, which none of the URP names would have found.
- **Use a flat colour texture, not a colour multiply.** Multiplying a factor into a textured body gives a
  muddy image, not a clean new livery. A 4x4 `Texture2D` filled with the colour, cached per colour in a
  `Dictionary<Color,Texture2D>`, is enough for a whole field.
- Force the colour factor to white after swapping the texture, or a previous tint multiplies into the new
  one.
- Skip parts that should keep their own look, by name: `if (r.name.ToLower().Contains("wheel")) continue;`
- **Log which property matched** (`painted=1 slot=baseColorTexture`). The probe list is the most likely
  thing to be wrong on a new model, and the log names it instead of leaving you to guess.

## Surface UV orientation: measure it, never guess it

The surface you apply art to may invert its UVs, per axis. Determine the transform from the rendered
result:

1. Put text on it, build, load, and magnify the surface with a clipped browser screenshot:
   `cdp('Page.captureScreenshot', format='png', clip={'x':..,'y':..,'width':..,'height':..,'scale':5})`
   returns base64 PNG data — write it to a file and read it. ~200 px of in-world sign is legible at 5x.
2. Name what you see:
   - **upside down** (word order correct, glyphs inverted) -> the **V** axis
   - **word order reversed** ("XIRP DNARG ECITTAL") -> the **U** axis
   - **both** -> a **180 degree** rotation: you need U and V
3. Fix on the path that works: `scale (-1,1)` + `offset (1,0)` for U, `scale (1,-1)` + `offset (0,1)` for
   V, on `_BaseMap`. Either half may instead be baked into the art (`transpose(FLIP_LEFT_RIGHT)` /
   `FLIP_TOP_BOTTOM)`), which costs only a rebuild — but then the art file is no longer canonical, so say
   so in the generator's comment.

## Apply generated art at runtime

- `Resources.Load<Texture2D>("<folder>/<name>")` from `Assets/Resources/...`, applied from a
  `[RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]` hook that finds its target by
  object name. No prefab wiring and no scene rebuild — which matters, because in Unity a scene rebuild is
  the step that silently does nothing while the editor is in play mode.
- Match the art to the target's aspect ratio (read `transform.localScale`) so type is not stretched.
- Log how many objects were painted. Zero is the tell that the name lookup missed.

## Verifying agent-authored visuals

- **Prove a build happened by the artifact's timestamp, not the command's result.** A build dispatched
  while the editor is still in play mode does not run, and the bridge can look successful either way. If
  `Build/<name>.data.gz` still carries the old mtime, nothing was rebuilt. A page post-processor that
  reports it had to re-inject its marker is independent confirmation.
- **Read the engine log as plain text.** Unity's `Logs/Editor.log` is not the console's JSON: grepping for
  `"message":"MY_MARKER"` never matches, which reads exactly like a probe that never ran. Grep the bare
  marker. And inside a bracket expression `[^\r]*` means the literal backslash and `r`, so it truncates at
  the first `r` — use `.*`.
- Prefer probes that log numbers over ones that log "ok": `painted=1 slot=baseColorTexture`,
  `applied=1 tex=2048x384`.
- Reading is not driving: screenshots work fine in a headless browser even when injected input does not,
  so visual claims are checkable without the operator — magnified reads included.

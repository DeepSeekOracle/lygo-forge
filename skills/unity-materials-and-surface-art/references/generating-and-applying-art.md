# Generating and applying art in Unity: worked recipes

Companion to the rules in SKILL.md. Everything here is a recipe that has produced a correct result, with
the numbers that were measured at the time.

## Livery: repainting a glTF car

Measured material dump of one glTFast car (body and wheels share one `colormap` material):

```
body         mat=colormap (Instance) sh=Shader Graphs/glTF-pbrMetallicRoughness col=RGBA(1,1,1,1) base=n/a
WheelFL_Mesh mat=colormap (Instance) sh=Shader Graphs/glTF-pbrMetallicRoughness col=RGBA(1,1,1,1) base=n/a
```

White main colour, no `_BaseColor`, paint in the texture — so the working shape is: swap the base-map
*texture*, force the factor white, skip the wheels.

```csharp
static readonly string[] ColourProps = { "baseColorFactor", "_BaseColor", "_Color" };
static readonly string[] MapProps    = { "baseColorTexture", "_BaseMap", "_MainTex" };
static readonly Dictionary<Color, Texture2D> Swatches = new Dictionary<Color, Texture2D>();

static Texture2D Solid(Color c)
{
    if (Swatches.TryGetValue(c, out var t) && t != null) return t;
    t = new Texture2D(4, 4, TextureFormat.RGBA32, false);
    var px = new Color[16];
    for (int i = 0; i < px.Length; i++) px[i] = c;
    t.SetPixels(px);
    t.Apply();
    Swatches[c] = t;
    return t;
}

public static void Tint(GameObject go, Color colour)
{
    int painted = 0; string slot = "-";
    foreach (var r in go.GetComponentsInChildren<Renderer>())
    {
        if (r.name.ToLower().Contains("wheel")) continue;
        var m = r.material;                       // instance, not shared
        if (m == null) continue;
        foreach (var p in MapProps)
            if (m.HasProperty(p)) { m.SetTexture(p, Solid(colour)); slot = p; painted++; break; }
        foreach (var p in ColourProps)
            if (m.HasProperty(p)) { m.SetColor(p, Color.white); break; }
    }
    Debug.Log("TINT " + colour.ToString("F2") + " painted=" + painted + " slot=" + slot);
}
```

Result: one cloned model in five liveries plus the player's own colour, verified on screen (not from the
code path).

## Reading a small in-world surface

```python
res = cdp('Page.captureScreenshot', format='png',
          clip={'x': 470, 'y': 135, 'width': 260, 'height': 80, 'scale': 5})
open(path, "wb").write(base64.b64decode(res['data']))
```

- Crop generously around the surface and let `scale` do the magnification; 4-6x is enough to read glyphs
  that are ~8 px tall at 1x.
- Capture the full frame in a separate call if you also want context — the magnified crop is often the
  only one you actually need.
- Reading order matters when diagnosing: an upside-down reading and a reversed reading are defects on
  different axes, so transcribe the characters rather than judging "looks mirrored".

## Generating banner/sign art (PIL)

- **Match the panel's aspect** so type is not stretched: read `panel.transform.localScale` and size the
  image to that ratio (a 7 x 1.3 m panel -> 2048 x 384).
- What reads from ~100 m: charcoal background (`#0e1016`), heavy white title with a black shadow offset a
  few px so it survives a bright sky behind the object, checkered strips along the top and bottom edges,
  and the studio/handle line in the accent colour beneath the title.
- Fonts on Windows: `C:/Windows/Fonts/ariblk.ttf` (title), `arialbd.ttf` (strap line).
- Import into `Assets/Resources/<folder>/` so `Resources.Load<Texture2D>` finds it, then apply at runtime
  to `renderer.material` on the target found by name — never `sharedMaterial`, or every sibling object
  (checkpoint gantries in the same scene, say) takes the same art.

## Verifying

```bash
# did the build actually run?
ls -la --time-style=+%H:%M "<build dir>/Build/<name>.data.gz"

# did the runtime code do its job? (plain-text log, bare marker)
grep -o "MY_MARKER.*" "<project>/Logs/Editor.log" | tail -3

# cost of a cycle in a small project: ~2.5 min recompile + ~3 min WebGL build
```

A page post-processor that prints "already present" vs "injected" tells you whether Unity regenerated
`index.html` — a cheap, independent confirmation that a real build landed.

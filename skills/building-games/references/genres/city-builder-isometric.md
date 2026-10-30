# Isometric city builder (2D canvas, endless map, static page)

Genre playbook for a SimCity-shaped builder: a big tile grid, zoning, services, a
population/economy sim that runs on its own, and sprite art. Written from a
build that rebuilt a 16x16 tile *painter* into a 96x96 builder on the art it
already shipped.

## 1. Get the real sprite geometry before writing any math

Sprites are usually square and contain a 2:1 diamond, not the tile itself.
Measure one with PIL instead of assuming:

```python
im = Image.open("r02_road_straight_ew.png").convert("RGBA")
rows = [(y, [x for x in range(im.width) if im.getpixel((x, y))[3] > 12]) for y in range(im.height)]
rows = [r for r in rows if r[1]]           # opaque span per row
print(rows[0][0], rows[-1][0], max(rows, key=lambda r: len(r[1])))
```

A 128x128 sprite whose opaque rows start at 63 and whose widest row spans x=0..127
is a 128x64 diamond sitting on the bottom edge: draw it at `(sx, sy - 63)` so the
diamond lands on the tile's bounding box. Buildings occupy the rows above the
diamond, which is why depth sorting matters (step 3).

```
px = (gx - gy) * 64 + cam.x
py = (gx + gy) * 32 + cam.y
```

Inverse (pick the tile under the pointer): step in by half a tile to reach the
diamond **centre**, then round — floor lands you one tile up-left on every edge:

```
const x = (sx - cam.x) / zoom - 64, y = (sy - cam.y) / zoom - 32;
const gx = Math.round((x / 64 + y / 32) / 2);
const gy = Math.round((y / 32 - x / 64) / 2);
```

Zoom belongs in both functions and nowhere else; wheel-zoom that anchors on the
cursor needs the before/after tile and the same inverse.

## 2. The art set may have no ground tiles: build a texture atlas

A prop/building pack often ships only the *objects*. A flat fill plus two speckles
per tile is the version that ships and reads as painted cardboard; the user asks
for "texture upgrades, forests, grass… it needs to feel alive". Render the ground
from a small atlas instead, once, at boot:

- **Three 128x64 diamond canvases per terrain**, drawn with a clipped diamond path
  and then the terrain's own grain: grass gets 150 short blade strokes in two
a  lighter and darker green plus a few tufts, forest floor the same darker with leaf
  litter, sand gets grain dots and drift lines, rock gets angular facets, water gets
  horizontal ripple strokes. Draw them with `drawImage(tex, x, y, zw, zh)` inside the
  per-tile loop — same cost as a fill, none of the flatness.
- **Overlap the textured diamond by 1-2 px** (`Math.round(s.x) - 1, …, zw + 2, zh + 2`).
  Exact tessellation still leaves a 1 px anti-aliased seam at every tile edge, which
  reads as a lattice drawn over the whole map; a stroke in the fill colour is the
  other half of that fix if you stay with fills.
- **Pick the variant by position, not by a hash with diagonal structure.**
  `hash2(gx, gy) * 3 | 0` correlates along the iso diagonals and paints visible
  bands; `((gx * 3 + gy * 5 + ((gx * gy) & 1)) & 7) % 3` varies aperiodically at tile
  scale. Keep the palette to two or three close values — three-plus distinct shades
  reads as a checkerboard of giant diamonds.
- **Shorelines are what stop water reading as torn strips.** In the same pass, test
  the four neighbours: land beside water gets a wet-sand lip along that edge, water
  beside land gets a foam line. Four lookups per visible tile is affordable; skip it
  below ~0.3 zoom where the line is sub-pixel.
- **Rock and other "empty" terrain still needs an identity.** Draw highland tiles
  from a mix of plateau / badlands / snow-moraine / caldera sprites picked by hash,
  or the unbuildable ground reads as grey filler.
- **Do not fake mountains with geometry extrusion in a 2:1 iso grid.** Lifting each
  tile's diamond by a per-tile height and dropping two side faces to the base draws one
  flat table when the heights match, green-topped cubes with holes beneath when they do
  not, and the base is only covered if you remember to draw the footprint first. Height
  above the grid is a *sprite* problem: source or generate mountain tiles (cliff faces,
  ridge lines, snow caps on transparency), place them by a height map and keep the
  ground flush. A stepped-block range reads as a bug next to hand-painted neighbours.
- **Generate the mountain set on a flat field, then key it, base-align it, and place it by ridge.**
  Prompt a single isolated asset at the pack's own 3/4 iso angle on one solid background colour
  (`flat magenta #FF00FF` or a flat mid-tone), no ground plane, no text. Post-process with PIL rather
  than shipping the render:
  1. **Flood the background away from the border**, not by colour distance alone — flood-fill from the
     four edges through pixels within ~45 of the sampled corner colour, so an interior colour that
     happens to match survives.
  2. **Kill the cast shadow by hue, not by saturation.** A rendered shadow reads as blue > green
     (`b - g > 6 && r - g > 18`) while warm rock never does; that one predicate removed the pink puddle
     the flood fill left and clipped nothing off the mountain.
  3. **Crop to `getbbox()`, then pad into a square canvas with the art sitting on the bottom edge** — the
     same anchor convention as every other tile sprite, so the renderer needs no special case.
  4. **Place one sprite per ridge:** give a mountain tile a sprite only when its height hash is the
     highest of its eight neighbours. Every mountain tile drawing art tiles into a mesa field; the
     local-maximum test leaves the ground flush and the peaks distinct, which is the difference between
     a range and a wall. Hold the rare landmark piece (a caldera, a volcano) under ~1%.
  5. **Check the licence against how the site earns.** A FLUX.1 `[dev]` checkpoint is non-commercial for
     the model even though the outputs feel like yours; on an ad-funded page either regenerate with a
     permissive checkpoint (schnell is Apache-2.0) or say plainly which model made the art.
  Look at the keyed PNG with your own vision before wiring it: a 20 px remnant of the backdrop at the
  base is invisible in a file listing and obvious on the map.
- **Never tile one landmark sprite across a whole terrain class.** The caldera piece is
  a *feature*: at 3% of tiles it is a peak, at 30% it is a field of identical volcanoes.
  Weight the rare sprite under ~1% and let plateau / moraine / badlands carry the bulk
  with per-tile hash variation.
- **Check the building set for half-pair sprites before assigning one to a tile.** Keys
  ending `_nw/_ne/_sw/_se` are halves of a two-tile building; a half in a single-tile
  slot draws half a house with its cut edge showing. Filter them out when building the
  per-zone/level table and keep only self-contained art.

Terrain thresholds from a value-noise field: sample the field, sort it, take
percentiles (`q(0.10)` water, `q(0.14)` sand, `q(0.93)` rock, `q(0.79)` forest).
Fixed cut-offs on [0,1] noise put ~40% of the map underwater because interpolation
of uniform randoms stays near-uniform — the percentile makes the *share* the
parameter.

## 3. Painter order

Iterate `sum = gx + gy` ascending, `gx` ascending inside a sum, and draw ground,
props and buildings in that single pass. Cull to the visible range first
(invert all four viewport corners), then pad the range by 1-2 tiles: a building
sprite rises ~100 px above its tile and pops out at the top edge otherwise.

## 4. Roads must be edge-connected, and a horizontal drag is not

Autotile by 4-neighbour mask (N=1, E=2, S=4, W=8) into the 16 road sprites
(straight x2, corners x4, tees x4, cross, plus stubs).

**The trap:** a screen-horizontal drag maps to `(gx+1, gy-1)` — corner-adjacent,
not edge-adjacent. Each painted tile then renders as an isolated diamond with a
gap to the next, and growth checks that ask for an edge-adjacent road never fire.
Interpolate the drag into a staircase (step one axis at a time between pointer
samples) so every drag produces a connected line:

```js
while (x !== tx || y !== ty) {
  if (x !== tx) x += Math.sign(tx - x);
  else if (y !== ty) y += Math.sign(ty - y);
  paint(tool, x, y);
}
```

Store the road as a boolean; compute the mask when drawing. Writing
`1 + mask/100` back into the road array makes `hasRoad()` (`=== 1`) false
everywhere and silently kills growth.

## 5. Sample growth from a zone list, never from the map

Random indices over a 96x96 map with 40 zoned tiles hit a zone ~0.1 times a tick:
the city never grows and it reads as "the sim is broken". Keep `zoneList` (set on
zone/bulldoze, rebuilt lazily), and each tick sample
`Math.min(64, Math.max(8, ceil(list.length * 0.8)))` entries from it.

## 6. Do not lock a utility behind the population it gates

If power/water are required for growth AND unlocked at a population milestone,
population can never rise: an unwinnable loop that ships, renders and reports no
error. Stage the requirement instead — **level 1 needs only a road, level 2 needs
power, level 3 needs power + water** — and sell utilities from the start; put
parks/plaza/library/monument behind milestones.

Adjacent rule: pre-build a small starter hamlet (road + a few homes + one shop +
one works) so the first screen is already a place and the first demand cycle has
something to move.

## 7. Demand model that produces a loop

Normalised 0..1 per R/C/I, shown as HUD bars, threshold ~0.3 to grow:

```
spare    = (jobs - pop * 0.8) / max(30, jobs)
R        = clamp(0.42 + spare * 0.62 + moodFactor, 0, 1)
C        = clamp(0.25 + (pop * 0.45 - shopCap) / max(20, pop * 0.45) * 0.8, 0, 1)
I        = clamp(0.20 + (pop * 0.35 + jobs * 0.15 - indCap) / max(20, pop * 0.35) * 0.8, 0, 1)
```

Mood from parks/plazas minus unemployment and smog; income `pop*0.85 + jobs*0.5`,
upkeep `roads*0.55 + services` so day one is net positive but thin. Decay only
below `dem < 0.08` — decaying at 0.12 wipes the starter hamlet in the first week.

**Show the unmet precondition on the map.** A zoned tile with no road nearby gets
a small marker; without it the player reads "nothing is happening" as a bug rather
than as "this needs a road".

## 8. Expose a QA handle from the IIFE

A closure-only game cannot be tested. Export a read-mostly handle:

```js
window.LC = { W, cam, tick, paint, counts: () => ({ road: ..., built: ... }) };
```

Then a test drives the sim deterministically without waiting on real time:
`for (let i = 0; i < 60; i++) LC.tick();` and asserts population/jobs/cash/level
deltas. This is how the growth chain, the staged utility unlocks and save/load
round-trips were each proven in one call.

## 9. Verifying a canvas sim in the agent browser

`requestAnimationFrame` is paused while `document.visibilityState === 'hidden'`,
which a CDP-driven window usually is — the page paints once and every clock,
timer and sim step freezes. It looks exactly like a broken game loop. Fix and
re-check before diagnosing anything:

```python
cdp('Emulation.setFocusEmulationEnabled', enabled=True)
cdp('Page.setWebLifecycleState', state='active')
js('document.visibilityState')      # must read 'visible'
```

Then prove the loop by reading the clock text twice a few seconds apart, and use
`LC.tick()` for the parts you want to exercise faster than real time. Screenshot
both ends (zoom out for terrain, zoom in for sprite anchoring) — a seam or a
wrong scale is only visible at one of them.

## 10. Pulling the art out of an existing bundle

When the only copy of the art is inlined in a built bundle
(`data:image/png;base64,...`), group it back into files instead of re-drawing:
for each data URI, search **backwards** ~400 chars for the nearest `key:` token
and group by it (multiple frames under one key = an animation). Write
`<key>.png` plus a `manifest.json`, then diff the captured keys against every
`[a-z]\d{2,3}_[a-z0-9_]+` token in the bundle — a non-zero difference means your
key search missed a shape and 80+ frames landed in an `unknown` bucket.

Count files and check dimensions before building on them (352 x 128x128 plus a
few small ones was the tell that the set was complete and uniform).

## 11. Scaling past one map: regions inside one world

When the ask is "the biggest map possible, or connected maps instead of one spot",
do not grow the single grid — partition it. Keep ONE global tile coordinate space and
make each region a sparse block inside it, so projection, culling and painter order
stay exactly as written and the seams are invisible.

- **Allocate on claim.** A region's arrays exist only after it is bought: a 4x4 world
  of 160x160 regions (409,600 tiles, 44x the single map) costs nothing unclaimed,
  generates in ~5 ms per region, and the empty world still renders.
- **Route every accessor through `regionOf(gx, gy)`** returning `{ r, lx, ly, i }` or
  null. The autotiler then matches a road against its neighbour across a border for
  free, because the mask is computed in global coordinates.
- **One painter pass over the visible range, never one pass per region.** Iterate
  `sum = gx + gy` globally; a per-region pass draws a neighbour's building over the
  one in front of it near the seam.
- **Join regions by border-road pairs, and make the link a strength.** Count matching
  road tiles along the shared edge and share jobs by
  `0.75 * min(1, pairs / 6)`; a boolean makes one lane a full merger and every town
  looks identical from the sim's side.
- **A region world wants more than one way to connect, and each mode is one service type.**
  Border roads first; then a dock placed **on water** (ferry, strength 5) and a depot on
  **dry land** (rail, strength 7). Both feed the same commuter share, so a harbour town can
  work a landlocked neighbour it shares no street with. Keep the placement rule per service
  (water tile vs empty dry tile), tag every link with a `kind`, and let the world map draw
  them apart — solid gold roads, dashed teal ferries, thick pale rail — so one glance says
  how two towns are joined. Give each mode its own moving thing (a ferry shuttling the
  line, a three-car train on sleepers with a lamp after dark), rate-limit the arrival
  callout (a platform chime plus a ticker line naming the town, at most every couple of
  days) or it becomes wallpaper.
- **Resolve a link's endpoints once per frame, not once per link.** Averaging a region's
  dock or depot tiles walks all RS x RS tiles; doing that inside the per-link draw loop is
  O(links x RS^2) every frame and the budget is gone at a handful of connections. Compute
  the centre list at the top of the draw pass and look the two regions up in it.

Pitfalls, each of which cost a round:

- **Derived per-tile arrays are not in the save and must be rebuilt on load.** A decor
  cache computed at generation is absent from the serialised fields, so every frame
  throws `Cannot read properties of undefined`, the rAF chain ends, and the canvas
  keeps its last painted frame: a black map behind a live HUD. Factor the derivation
  into `buildDecor(r)` and call it from both the generator and the loader.
- **Guard the frame loop and the boot chain.** Wrap the draw body so a throw reports
  once into the ticker instead of silently ending the loop, and `.catch` the boot into
  a visible message: an exception inside `loadSprites().then(boot)` aborts every line
  after it, including the `requestAnimationFrame` that starts the game.
- **Centre the camera on the densest region, not the world average.** Two clusters
  put the centroid on empty meadow; pick the region with the most built tiles, centre
  on its own centroid, and store `cam` in the save so a reload returns the player
  where they were.
- **Save size is the real ceiling on world size.** Store each array as RLE
  (`value x run`): 17 KB for two developed regions. Choose the grid from the measured
  size, and remember localStorage is a few MB — a dense 5x5 with string sprite keys
  per tile is the shape that overflows.
- **Precompute decoration; hash nothing per frame.** Moving the tree/rock/flower pick
  into a `Uint8Array` at generation, throttling the minimap to ~5 Hz and skipping the
  per-tile ground stroke below ~64 px tiles took the same scene from 31 to 60 fps.
- **Store a level and a theme, derive the sprite.** A tile needs `zone` + `level`; the
  sprite is a pure function of `(theme, zone, level)` with per-tile variation from a
  hash. A `bldg[i]` index into a key table also keeps memory flat, but then the table is
  part of the save format — reorder it and every old save shows the wrong buildings.
  Services stay an index into the service list.
- **Themes are how one art set makes distinct towns.** Pick a theme per region from its
  own land (water share -> harbour, rock share -> watch country, forest or sand -> mill
  country) and let it choose every R/C/I sprite by level, two variants per level drawn
  by hash. Derive the theme from terrain **plus the region's coordinates**, never
  `Math.random()`, or every reload re-rolls the town into different architecture. Name
  the region after its theme and show that name on the world map — a town with a name
  reads as a place, not as a grid cell.

## 12. Making it feel alive without new art

"It needs people, vehicles, things happening" does not mean "find citizen sprites".
A tile pack of buildings, landmarks and wildlife contains no pedestrians, and a
generated 6 px figure both costs an image call and will not match the tile palette.
Draw the life procedurally in the pack's own colours; at this camera distance a
handful of fills reads as a person, and it animates for free.

- **Anatomy that reads at 8-12 px:** shadow ellipse, two legs that counter-swing a
  frame apart, a coat rect in a per-agent colour, a head rect in a skin tone, then a
  hat or an umbrella on a probability. Six `fillRect`s per agent, no spritesheet.
- **Commuters, not wanderers.** A random walk on the road graph looks like ants. Keep
  a `homes` list (built R tiles) and a `workplaces` list (built C/I), pick one of each
  per spawn, route greedily from a road tile beside the home to one beside the job
  (neighbour minimising Manhattan distance + a little noise, cap ~90 steps), and
delete the agent on arrival so the next tick respawns it from another home. The street
then carries a visible rush hour instead of uniform noise.
- **A route is a snapshot, and a stale route walks over the meadow.** Roads get bulldozed
  under an agent and a loaded save replaces every tile, but the agent keeps walking the
  coordinates it was born with — reported as "people walking off the ends of the tiles,
  some pretty far". Validate on every step (`if (!next || !hasRoad(next.x, next.y))`
  retire the agent) and clear the agent, vehicle, boat and smoke arrays inside `load()`:
  they are not in the save to restore, so the previous world's walkers have no business
  in the new one. Null the lists they spawn from too (`homes`, `workplaces`,
  `roadSpots`) so the next update rebuilds them against the loaded map.
- **Vehicles are the same path with a heading — and the heading is used as it comes.**
  Take `atan2(dy, dx)` of the next tile's screen position and rotate by exactly that.
  Multiplying it by a fraction to soften the tilt (a `* 0.28`) collapses every direction
  to within ~7 degrees of horizontal; on a 26.57-degree isometric road the body then
  reads as driving across the road and off the end of the tile — the report is "they
  never turn, they just drive off the tile". Cap the body to the lane
  (`Math.min(raw, 34 * zoom)`) and draw shadow, wheels, windscreen and headlights inside
  the rotated frame, or a long bus overhangs the corner it is turning through. Vary kind
  by probability (car / truck / bus) with speed scaled inversely to size so buses do not
  outrun cars.
- **Everything else that moves is one array and one rule:** boats wander the water
  tiles, level-2+ industry emits puffs that rise and fade, lamps put a warm radial on
  every Nth road tile at night, and buildings light two to four window rects after dark
  (deterministic per tile, count scaled by level, skipped below ~0.45 zoom so a wide
  view does not crawl — the lit skyline is what makes night read from far out). Each is a
  list with a `life` or a `path`, advanced in the same delta-scaled step as the sim.
- **Weather is a value that drifts, not a toggle.** Hold a `rainTarget`, flip it on a
  timer of tens of ticks, and ease toward it (`rain += (target - rain) * 0.06`) so the
  sky changes over days. Feed that one number into street density, umbrella odds, a
  screen-space drop layer and a ticker line. Once the economy reads it, feed it into trade
  too (arrivals count for `1 - rain*0.45` commerce) and into vehicle speed
  (`1 - rain*0.35`): weather that only looks wet is scenery; weather that moves a number
  is a system, and the ticker can then say *why* the high street is quiet.
- **Let the clock thin the streets.** Full population by day, roughly a third after
  dark; cars are less affected than pedestrians. It costs one multiplier and is what
  makes night read as night rather than a darker filter.
- **Ambient audio is layers of noise, never bare oscillators.** Two detuned sine
  waves plus a triangle is not a city, it is a fridge: with no broadband content the
  ear locks onto the tone and hears a hum. Generate one 4 s pink-noise buffer at boot
  and reuse it for every layer — that buffer looped through a lowpass whose frequency
  drifts on a ~0.03 Hz LFO is the wash of a town heard from a street away, and the same
  buffer through a bandpass that swells and falls over ~5 s every 8-22 s, rising in
  pitch as it passes, is a car going by. Add a `setTimeout` chirp scheduler for birds by
  day and crickets by night, thin the wash after dark (x0.55) and thicken it in rain
  (x1.5), and gate the bed on the sound toggle, the ambience slider and the first
  gesture. Duck it to a whisper while the site's music player runs — a hum under music
  is worse than silence. Ship every synthesised layer under its own slider; "turn that
  down" should be a five-second fix, not a code change.

**Replace synthetic ambience with CC0 field recordings for production.** The synthetic
  pink-noise bed is a valid fallback, but real city ambience loops sound vastly better
  and cost nothing if sourced from CC0 libraries (freesound.org, opengameart.org).
  Structure the ambience as layered `AudioBufferSourceNode` loops:
  - `distant_city_loop` — constant low hum, always playing
  - `traffic_pass` — one-shot bandpassed passes every 8-22 s, triggered by `setTimeout`
  - `birds_day_loop` — daytime only, louder at dawn
  - `crickets_night_loop` — night only, louder at dusk
  - `wind_loop` — subtle, always playing
  Each layer gets its own `GainNode` → master gain → destination, so `OPT.ambience`
  and `OPT.master` sliders scale everything. Load with `fetch` + `decodeAudioData`
  at first user gesture; on load failure, fall back to the synthetic pink-noise
  implementation. Duck the entire ambience master to 0.05x while the site's music
  player is active. Stop all sources and clear timers in `stopAmbient()`.
- **Budget the counts and precompute the lists.** 150 pedestrians, 44 vehicles, 10
  boats, 70 puffs; rebuild `homes`/`workplaces`/`roadSpots`/`waterSpots` on a slow
  cadence (every few ticks), never per frame. With all of this on, the measured cost
  was 60 fps and 0.76 ms per sim tick — the layers are cheap, the *lookups* are what
  would not be.

## 12a. Landmark placement from existing sprite packs

The asset pack often contains 50+ landmark sprites (`l01`–`l50`) that are loaded but
never placed. Wire them into region generation so each town gets a distinct silhouette:

1. **Define a `LANDMARKS` array** with metadata: `key` (sprite name), `terrains`
   (array of TERRAIN constants where it can spawn), `coast` (boolean, needs water
   adjacent to land), `weight` (base rarity).
2. **At region generation**, count terrain tiles and filter landmarks whose
   `terrains` match terrain present at >2% coverage.
3. **Score candidates** by theme affinity (harbour → water/sand, watch → rock/mountain,
   mill → forest/sand, chapel → meadow) and terrain abundance. Multiply by 0.1 if
   `coast: true` but the region has no shoreline.
4. **Place 1–3 landmarks** per region: for each, scan all tiles, skip tiles with
   roads/zones/services/other landmarks, prefer tiles matching the landmark's
   terrain list, break ties with `hash2(gx, gy)` for deterministic variation.
5. **Render in the main draw pass** after buildings: `if (reg.landmarks) { const lm = reg.landmarks.find(l => l.i === i); if (lm) drawImage(SPRITES[lm.key], ...); }`
6. **Serialize to save** as `"key@tileIndex"` joined by commas in the region's RLE
   object. Restore in `load()` by splitting and rebuilding the landmark array.

This costs ~200 lines and makes every region feel unique without new art.
- **Close the loop with arrivals, not with inventory.** When a walker's route ends at a
  shop or a works, credit that building's region with one trade and roll the region's
  `commerce` daily (`commerce = commerce * 0.88 + trades`). Multiply C-zone growth by it
  (0.55x on a dead street, ~1.95x on a busy one) and give a shop under ~1.5 commerce a
  small daily chance to lose a storey, so a shop nobody walks to stops expanding and
  slowly closes; works take a gentler version of the same bonus. That is the smallest
  change that makes the streets load-bearing: homes -> commuters -> arrivals -> shops ->
  jobs -> homes. Surface the number ("quiet / steady / busy" in the region dossier, a
  weekly "the shops served N customers" line) or the player never sees why a shop stopped.
- **It is still not inventory.** A trade is a per-arrival credit against an aggregate
  economy, not stock leaving a shelf. Say that when reporting, or the next session will
  look for a stock field that was never modelled and "fix" a shop system that does not
  exist.

**Testing a regional world: `paint()` takes GLOBAL tile coordinates, the arrays are
local.** A harness that paints at local coordinates (or near the world origin instead
of `rx * RS + lx`) writes into unclaimed space, `paint()` returns `false`, and every
sweep of zones produces "nothing grows" — which reads as a broken sim, not a broken
test. Drive tests from the region's own origin (`const cx = r.rx * RS + RS / 2`), and
treat an unchanged `counts()` after a batch of paints as a coordinate bug before
touching the growth code.

## 13. Camera: zoom, quarter-turn rotation, a saved view

Rotation is a **view transform over one global tile space**, not a rebuild. The world
must be square (W === H) for a quarter turn to be a coordinate swap:

```
toView(rot 1): (gx, gy) -> (gy, WORLD_W - 1 - gx)      rot 2: both mirrored
fromView(rot1): (vx, vy) -> (WORLD_W - 1 - vy, vx)     rot 3: (vy, WORLD_H - 1 - vx)
```

- **Only three functions know about it.** `tileToScreen` applies `toView` then
  projects; `screenToTile` inverts the projection then applies `fromView`; a third,
  unrotated `screenToView`, feeds the visible-range cull. Everything else — painting,
  hover, walkers, minimap, region borders — keeps using world coordinates and needs no
  change at all.
- **Painter order has to iterate the VIEW grid.** `sum = vx + vy` ascending, then
  `fromView(vx, vy)` per tile to fetch its data. Iterating world sums draws the wrong
  tile over the right one under any rotation.
- **Recentre by converting exactly once.** `screenToTile` already returns world
  coordinates; feeding that through `fromView` before recentring flew the camera 160
  tiles off the map over four turns. The proof is cheap: four turns must return the
  tile under the screen centre to the one you started on — assert it.
- **Validate a restored camera.** A saved `cam` can point at land the player no longer
  owns (or at a region that was never claimed), which opens the game on empty
  wilderness. If the tile under the centre resolves to no region, recentre on the
  densest region instead.
- **Anchor zoom on a world point, never on a tile.** Reading the before/after tile and
  shifting `cam` by the difference looks right and is the zoom-jump bug: `screenToTile`
  returns *rounded* tile coordinates, so every wheel step moves the camera by a whole
  tile and the view snaps around under the cursor (worse again once the world is
  rotated). Convert to continuous world pixels instead, then restore the same point:

  ```js
  const wx = (sx - cam.x) / cam.zoom, wy = (sy - cam.y) / cam.zoom;
  cam.zoom = clamp(cam.zoom * factor, min, max);
  cam.x = sx - wx * cam.zoom;   cam.y = sy - wy * cam.zoom;
  ```

  Wheel events use the cursor's canvas offset; the zoom buttons and `+`/`-` keys pass
  the view centre to the same function. Prove it rather than eyeballing: hold a fixed
  point, fire ~16 wheel steps in and out, and assert the world coordinate under it does
  not move (0 drift is the expected result). A test that dispatches the wheel with
  client coordinates while the handler reads `offsetX` measures the wrong point and
  reports a phantom 20-50 unit drift — convert client to canvas offset first.
- Keys for the turn (`Q`/`E`) and options (`O`) cost nothing and make the camera feel
  finished.

## 14. Water as geography: bridges and islands

- **A road may cross water where the channel is narrow.** Allow the paint when the
  tile is water and two *opposite* neighbours are land or road; charge a bridge price
  (~15x a road tile) and draw a bridge sprite for a road tile whose terrain is water.
  Keep the road a boolean so `hasRoad()`, autotiling and growth checks keep working
  across the span — writing a mask value back into the array silently disconnects it.
- **Stamp a few islands into deep water at generation.** Require the candidate centre
  to have water in a 5x5 neighbourhood (so it never fuses with the shore), then write a
  sand rim and a meadow core. Islands give bridges a destination and make ferry demand
  legible.
- **A mountain is a wall until a road can climb it.** Allow the road tool on mountain
  terrain for a pass price (~7x a road), draw it with the switchback sprites the packs
  already carry, and skip the peak sprite on any mountain tile that has a road cut into
  it (`terr === MOUNTAIN && !road[i]`) or the mountain draws over its own pass. Zones and
  services stay refused, so the range becomes a route rather than a suburb.
- **Switchback roads need terrain-specific rendering.** In the draw pass, check
  `terr === TERRAIN.MOUNTAIN` and select from a `SWITCHBACK` sprite table (same 16
  masks as `ROAD`) instead of the flat road sprites. The switchback art already exists
  in the pack (`c13_switchback_road_n`, `c14_switchback_road_w`); wire it once and
  the autotiler handles corners/tees on slopes.
- **Verify water by pixels, not by looking.** Sample the canvas at known coordinates
  (and each minimap cell centre with `getImageData`) before calling a layer broken: a
  world map that "looks blank" in a downscaled screenshot was drawing correctly, and
  the real defect was contrast — dark cells and a thin `+` glyph. Raise the cell
  luminance floor, bold the glyph, and re-sample.

## 14a. Lazy DOM getters for canvas games

**Module-level `document.getElementById` calls fail when the script loads before the DOM is ready.** In a closure-based game, `const canvas = document.getElementById("map")` at file scope returns `null` if the script tag is in `<head>` or the element hasn't rendered yet. This causes `canvas.addEventListener` to throw `Cannot read properties of null`.

Fix: make canvas and context lazy getters:
```js
let canvas = null, ctx = null;
function getCanvas() { if (!canvas) { canvas = document.getElementById("map"); ctx = canvas?.getContext("2d"); } return canvas; }
function getCtx() { getCanvas(); return ctx; }
```
Call `getCanvas()`/`getCtx()` everywhere the old `canvas`/`ctx` were used. Apply the same pattern to minimap and any other DOM elements referenced at module scope. This also fixes hot-reload and save/load cycles where the DOM may be temporarily detached.

## 14b. Real logistics: emergency response with actual pathfinding

"Fire stations exist" is not a simulation. A real logistics layer means:

1. **Assets have real capacity.** A fire station at level 1 owns 1 truck, level 2 owns 2, level 3 owns 3. Trucks are objects with state (`idle` | `responding` | `on_scene` | `returning`), position, route, and target.
2. **Pathfinding runs on the road network, not straight-line.** Use A* on the boolean road grid (4-connected). Edge cost = 1 tile. Heuristic = Manhattan distance. The route is an array of `{x,y}` tiles.
3. **ETA = road distance / vehicle speed.** Fire trucks: 2.5 tiles/sec game time. Ambulances: 3.0. Police: 3.5. Convert to game minutes for dispatch announcements.
4. **Dispatch selects closest station with idle trucks.** Score = path length. If no station has idle trucks → mutual aid message. If no road path → unreachable.
5. **Trucks drive the route in real time.** Each tick: `routeIdx += dt * speed`. Visual position = `route[routeIdx]`. Arrival when `routeIdx >= route.length - 1` → state = `on_scene`.
6. **Fire simulation with spread and containment.** Fires start at industrial/commercial. Spread timer (30s game time) attempts spread to adjacent flammable tiles (30% chance). Damage accumulates without trucks on scene (buildings lose levels). Trucks on scene = containment progress (damage decays). 0 damage = contained → trucks return.
7. **TTS dispatch announcements.** Browser `SpeechSynthesisUtterance` reads: `"Engine 1, Engine 2 responding from Old town. Structure fire at 342,156. ETA 3.2 minutes."` Arrival: `"Engine 1 on scene. Beginning fire attack."` Containment: `"Fire under control. All units returning to quarters."` Queue utterances so they don't overlap. Respect `OPT.master` volume and `OPT.tts` toggle.
8. **Event log UI.** Chat-style panel above ticker with color-coded entries: emergency (red), high (amber), dispatch (green), arrival (blue). `eventLog.unshift({id, time, type, message, tts})`; keep last 50. Render `eventLog.slice(0, 10)` into a fixed-position `div`.
9. **Balance via coverage scoring.** `assessFireRisk(region)` = industrial density + adjacency bonus - station coverage (path length < 100 tiles = 0.5x risk, has path = 0.8x). No stations = uncontrolled burns. All trucks committed = mutual aid.

This turns a decorative service building into a load-bearing logistics node. The same architecture extends to ambulances (citizen health events) and police (traffic/crime).

## 15a. A city that runs on the player's clock

"The game runs on real time, no pause, no fast forward, saved games resync" is a
small model change with several load-bearing parts. Keep one beat for the economy and
take the *sky* from the player:

- **The hour is read, not advanced.** `S.hour = localHour()` (hours + minutes/60) at
  the top of every frame; delete the `hour += dt * speed` line and every pause/speed
  control with it. The HUD clock is the player's clock — `15:07 · LIVE · DAY` beside
  the local date and a `beat N` counter that is only a heartbeat for events and
  autosave.
- **Drive the beat from the wall clock, not from rAF.** Keep `TICK_SECONDS` (7 s here)
  and pump in a `setInterval(~900ms)` as well as from the frame loop:
  `while (now - lastTickWall >= TICK_SECONDS*1000 && n < 12) { lastTickWall += TICK_SECONDS*1000; tick(); }`.
  A hidden tab stops rAF, and a city that only steps while watched is not "no pause".
- **Bound the catch-up in both paths.** A tab that slept for hours must not replay all
  of it: clamp the gap to ~80 beats (`if (now - lastTickWall > maxGap) lastTickWall = now - maxGap`)
  so the pump and the loader agree.
- **Saves carry `savedAt` and the loader resyncs.** Stamp `Date.now()` on save; on load
  set `S.hour = localHour()` (never restore the saved hour — the sky belongs to the
  player) and replay `clamp(elapsed / TICK_SECONDS, 0, 80)` beats so the town kept
  living while it was closed. Say so in the toast ("caught up 34 beats of city life").
- **The sky is that clock's expression.** Ramp darkness across dawn/dusk instead of
  switching at a threshold, add a warm overlay for the hour either side of sunrise and
  sunset, layer a colder cast for deep night, and let windows, lamps and headlights ride
  the same darkness value so they come on with the light. A few soft ellipses drifting
  in world space and drawn with `globalCompositeOperation = 'multiply'` give cloud
  shadows that pass over roofs and roads, not just the grass; thin them at night.
- **Keep a 12/24-hour switch in options** and the phase word (dawn/day/dusk/night) in
  the clock; both cost a line and make the real-time rule read as intentional.

## 15. Options, the site's music player, and rare events

**Options** belongs in a modal built from a data list, not hand-written markup:
sliders for master / music / effects / ambience and toggles for weather, day-night,
tile grid, autosave and reduce-motion. Persist to `localStorage`, apply immediately,
and multiply rather than replace: `effects_gain = effects% * master%`, ambience scaled
the same way, music forwarded to the player. **Read each flag where it is used**
(`if (OPT.weather)` in the rain step, `if (OPT.night)` at the tint, `OPT.reduceMotion`
at the water shimmer) — caching them at boot makes a toggle look broken until reload.

**The site's music player is a module with a DOM contract — copy it, do not rewrite it.**
This estate ships `radio.js` + `radio.json` (a JSON track list on a public stream) and
the module owns a fixed set of ids: an `<audio id="radioEl">`, `#radioPlay`,
`#radioMute`, `#radioView`, `#radioTitle`, `#radioDock`, and any
`[data-radio-vol]` range. Copy both files beside the game, provide exactly those
elements, and the same catalogue, storage key and store links work with no new code.
Two additions make it feel native: put the dock at the **top** of the panel (below
the fold is a hidden feature) and **duck the game's own ambience** while it plays —
scaling the mix to a whisper and the traffic bed to zero, restored when it pauses.

A headless click cannot start audio (the autoplay gate counts trusted input only), so
assert on the element's `src` and the player's own title changing between tracks rather
than on `paused === false`; report that limitation instead of claiming playback.

**Rare events earn their interruption or they are wallpaper.** Gate on all of: one at
a time, a minimum gap of ~14 days (with jitter), not before the world is ~20 days old,
and not under a population floor. Then make each event move a number the player
already reads — commerce x1.6 for a market day, growth x1.5 for a boom, mood for a
festival, a lost storey and a smoking tile for a fire. Announce in the ticker *and* as
a toast, keep an active-event pill in the HUD with its own colour, and clear every
overlay when the event's last day passes, or the marker outlives the event and the
HUD lies.

**A bad event needs a counter the player can buy.** A fire that only ever destroys is a
dice roll; a fire-station service (price, upkeep, radius) that contains it turns the
same event into a decision — "FIRE CONTAINED" when a station covers the burning tile,
a lost floor when none does, and a harmless "fire scare" when the district has nothing
worth burning. Test coverage by distance from the hit tile to any station in that
region, and state which of the three outcomes happened in the announcement.

# Building a campaign from a prose source

Turning an author's book into authored levels: act → chapter → floor. Written from a 24-floor build out of a published novel, but the shape holds for any source with acts and chapters.

## Read the source, do not invent canon
- The corpus lives wherever the author keeps it and is usually NOT in the code repo — ask for the path, and check both the ebook/plain-text exports and any audio-only material. If only audio exists, transcribing it is the deliverable, so budget for that instead of writing lore from the title. (This user: `J:\FULL ADUIO BOOKS` — Eternal Haven series; Book I is *The Moonlit Slumber*, and the folder also holds a GAMEBOOK and PDFs.)
- Map by act, then by chapter: an act is a chapter of levels (three or four floors), a chapter is one floor.
- Cite what you used. Carry the book/act label plus the floor's own title as data fields on the level object and print them in the HUD, so a floor is a place in the story rather than a number.

## Story goes in a field, not in the way
One or two sentences per floor, in the author's own vocabulary, on a `story` field the HUD prints. Nobody reads a paragraph mid-run; the act title does most of the work.

## Author floors as shapes
Give each act a distinct silhouette drawn from its own imagery, built from a small vocabulary of passes so the shapes stay legible: `rings` (concentric walls with gaps), `cages` (a vault with one honest opening), `walls` (blocks, colonnades), `maze` (a winding pass), `inner` (a vault within a vault). Two or three per floor — using all of them everywhere makes every floor the same floor.

## Density is depth — but area sets the baseline
Ramp counts with the floor index (collectables, spawners, jobs, foes) so descending is felt, and guarantee at least one live objective beyond the authored set on every expanded floor. Author at a small resolution and expand through a single scale constant, scaling every density and the entity cap with it.

Index gives the *ramp*, area gives the *baseline*: when the region grows by a factor, rebase every count onto tile count and then ramp on top of that, or a doubled map is mostly empty stone holding the same handful of relics. A growth pass normally needs more structural sites (nexuses/gates) as well as more loot and foes — raise the counts and recalibrate the checker's minimums in the same edit, never lower a minimum to fit the new size.

Chambers must grow with the grid: give each authored room a fixed margin (a yard) so the extra area lands outside its walls, and grow wall blocks on a smaller factor than positions. Full multiplication turns a 1×4 divider into a slab across a hall while interiors stay closet-sized.

## Verify before the browser
Build all floors headless — the integrity checker template in this skill — before any playtest. Authored shapes plus procedural carving is exactly the combination that seals a wing, and the checker is what proves it did not.

Add a **shape** assertion next to the minimums: open-tile percentage per floor plus a campaign total. A build asserting only counts and reachability stays green while every floor quietly fills in with rock, so openness has to be a hard failure or it regresses on the next edit. Report the tightest floors, so the user can tell a deliberate bottleneck from an accident.

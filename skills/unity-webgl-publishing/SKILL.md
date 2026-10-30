---
name: unity-webgl-publishing
description: Use when shipping a Unity WebGL build to a static host.
---

# Publishing a Unity WebGL build on a real page

Trigger: a Unity WebGL build exists and must run on a live static host (GitHub Pages and friends), usually
embedded in a page that has its own header bar, player widget or hub chrome.

Companion material: building the project itself, template choice and the editor/build CLI belong to the
Unity game-building skill; this one starts at the build output. If the page belongs to a per-game hub with
its own conventions (chrome injected by a helper script, a shared site bar), read that property's game notes
first and treat this as the platform-level layer underneath them.

## Order of work
1. Decide the compression mode **before** the first deploy - it changes the emitted file names (see rule 1).
2. After each build: delete the DoNotShip folder, sync `Build/*` to the site, leave the site's own
   `index.html` alone (see rules 2-3).
3. Commit only the build's paths - a shared repo usually carries unrelated dirty files, and a blanket
   `git add -A` sweeps them into the push.
4. Poll the live document for a changed marker, then compare the served wasm's byte size against the local
   build (rule 7).
5. Load the live URL in a browser and click into gameplay: the menu rendering proves the loader, the first
   gameplay frame proves the scene, scripts and wasm all came up.

## The shell around the build

A stock template plus a host page's own chrome is its own source of "the game is broken": the engine
loads, the scene renders, and the visitor still gets a clipped canvas, dead controls or a black screen
with no message. Probe it with `references/webgl-shell-audit.md` before blaming the build.

- **Never gate the page's controls on a screen-state callback from the build - count the calls first.**
  Host chrome is usually wired to a `gameSetScreen(mode)` the C# is supposed to call, and every control
  behind it (radio, fullscreen, options, links) is then unreachable if the build never calls it. Wrap the
  callback before the game loads, log each call with a timestamp, and read it a minute later: zero calls
  means the game's screen machine is not wired to the page at all, and `data-screen` is just sitting at its
  initial value while the source looks correct. Render the controls on every screen and let the attribute
  only adjust them.
- **The container's own box, not the canvas, decides where the canvas lands.** The template centres
  `#unity-container` with `left/top: 50%` + `translate(-50%,-50%)` while the loader sizes the canvas in
  `vw/vh`, so a canvas larger than the box the transform was computed for hangs off the top-left corner
  (measured at 1264x569: `@ -7.5,-9.5`) and the overflow adds both scrollbars - a clipped scene, a
  half-visible title card, and `scrollHeight != clientHeight` for everything you measure afterwards. Pin the
  container (`position: fixed; inset: 0; transform: none`), keep `html, body { overflow: hidden }`, and
  check `canvas rect == 0,0 + viewport` with `scroll == client` as the verdict. The `!important`s are
  required: the template's rule is `id.class`.
- **The build owns the bottom-centre of the frame; host chrome may only use the edges.** A credit line that
  spans the width prints straight across the game's own title plate, and a top-left control can end up on
  top of the game's wordmark the moment a right-aligned sibling joins the same centred row — `margin-left:
  auto` on one child of a `justify-content: center` flex row shifts the whole group left. Keep chrome text at
  the far ends, leave the middle band empty, and settle the question by reading each child's
  `getBoundingClientRect()` against the centre band rather than from the screenshot, because the overlap
  only shows on the frame the game happens to be painting there.
- **Unity's error banner is invisible under the host chrome.** `#unity-warning` ships with no `z-index`
  and white/yellow/red inline styles, so a fixed chrome overlay paints over it and a WebGL failure reaches
  the visitor as a black canvas with no message. Raise it above the chrome, restyle it in the site's own
  language, and echo Unity's error text with `textContent` after stripping tags.
- **A loader with no `onerror`, and a `catch` that calls `alert()`, are the two ways a failure arrives as a
  dead page.** A missing engine file leaves the progress bar at `0%` forever; assign `onerror` on the script
  element *before* `onload` (inserting it inside the `onload` body is the easy mistake and it can never
  fire), render any failure into the page with a Reload button and a link to the non-engine build, and probe
  WebGL before requesting the payload so an unsupported browser gets a sentence instead of 29 MB and a
  black canvas.
- **A rebuild regenerates the page from Unity's template, so the customised shell must live outside
  `Build/*` and be re-applied.** Keep the page you edited (plus its chrome CSS and error handling) in its own
  folder in the repo with a README naming the copy step, or the next WebGL build silently reverts every
  shell fix while the commit history says otherwise.

## Rules

- **A static host serves `.gz` payloads as `application/gzip` with no `Content-Encoding`, and you cannot
  patch the host's handler - so ship the decompression-fallback build.** A stock gzip WebGL build answers
  exactly that way on GitHub Pages and the loader then stalls at the progress bar forever. Build with
  `PlayerSettings.WebGL.decompressionFallback = true` (a project setting, not a script argument - set it with
  a tiny eval file and log the value back to confirm it took): Unity emits `*.unityweb` payloads plus a loader
  that inflates them in JS, and the live wasm header should read `Content-Type: application/vnd.unity`.
  Delete the superseded `.gz` files rather than shipping both sets.
- **Delete `<Game>_BurstDebugInformation_DoNotShip/` before publishing.** It is written into the build output
  directory and its name is the instruction. It also bloats the repo.
- **A rebuild changes only `Build/*`; sync that and leave the site's page alone.** Asset names
  (`*.unityweb`, `loader.js`) and the loader reference are stable across builds, so the page's own chrome and
  any injected widget survive untouched - and re-copying Unity's template over the page only to re-apply the
  chrome destroys both. If a helper script does the widget injection, remember native tools need a native
  path: an MSYS `/d/...` argument can make such a script report "no index.html" and silently do nothing while
  the handler reports success.
- **Unity's template centres the canvas with `top: 50%` AND `transform: translate(-50%, -50%)` - override
  both or neither.** Replacing `top` with a fixed offset to clear a site header leaves the `-50%` lift in
  force, so the container is pulled up by half its own height and the visitor sees only the bottom strip of
  the game. Move them together - `top: calc(50% + 20px) !important; transform: translate(-50%, -50%)
  !important` for a 40 px header - and note the template's own rule is id+class, so a plain ID selector
  needs `!important` to win.
- **A fixed-size canvas cannot fit a short window; clamp it without touching the aspect.**
  `#unity-canvas { max-width: 100vw; max-height: calc(100vh - 100px); width: auto; height: auto }` - for a
  replaced element a clamped height with `width: auto` follows the intrinsic ratio, so it neither clips nor
  squashes. A fixed-size canvas that is merely re-centred still clips its own top on a short window; the
  clamp is what makes "I can see the whole game" true at every size.
- **A host-injected widget with an inline position needs `!important` to move.** A bar written as
  `style="position:fixed;top:10px;z-index:9999"` stays behind a fixed site header no matter what a stylesheet
  says without `!important`, and raising its z-index instead just puts it on top of the header. Offset it:
  Offset it: `#the-bar { top: 46px !important; }`, and park it inside the header's own 40 px strip
  (`top: 4px` with a z-index above the header) if offsetting it below the header covers the top of the game.
- **Escape can never be an in-game key on a web build.** In a browser Escape leaves fullscreen and drops
  canvas focus, so any menu bound to it quits the game instead of opening the menu. Bind TAB with a
  non-browser backstop (`KeyCode.Tab || KeyCode.M`) - a browser may still take Tab for focus navigation -
  and update the on-screen control line in the same edit, or the HUD keeps naming a key that ejects the
  player.
- **Prove the compiled code shipped, not just the page.** Poll the served document for a changed marker
  string (CDN lag has been one to three minutes, with different edges disagreeing in between - never conclude
  a deploy failed from one early read), then compare the served `.wasm.unityweb` byte size against the local
  build. An HTML change proves the page; only a size change in the wasm proves the new code is live rather
  than an older bundle being re-served. A cache-buster on the document is not a substitute for polling the
  bare URL a visitor actually gets.
- **Verify the layout numerically, and never from a screenshot alone.** Assert the container top equals
  `innerHeight/2 + headerHeight/2 - containerHeight/2` within a pixel, that `canvas.top >= headerHeight`, that
  `canvas.bottom <= innerHeight`, and that the width/height ratio is unchanged. The formula holds at any
  viewport, which matters because a test browser window is often far shorter than the visitor's - a clip seen
  there is usually the harness, not the page. Also read `innerWidth`/`innerHeight` back in every probe:
  `Emulation.setDeviceMetricsOverride` does not always take effect before the page's own scripts run.
- **Gate engine audibility on state and motion, never on rpm.** An idling engine sits above any near-zero
  rpm threshold, so an "idle bed" keyed off rpm plays on the page load, the title screen and the pre-race
  grid - the exact noise a player reports as "still on when you load the game". Make it audible only while
  the race is running AND the car is moving or on the throttle
  (`Mathf.Max(ThrottleInput, InverseLerp(0, 180, |speedKph|)) > 0.02`, ramping ~0.12 -> 0.55) and keep the
  menu, the load screen and the grid silent. One loop is resampled across a wide pitch range (0.95 -> 2.15
  on this build), so audition it at both ends; a clip that only sounds right at one is not shippable.
- **Trimming volume cannot fix a noise-derived engine clip's character.** A low pitch with a permanent
  volume floor on a broadband-noise loop is what reads as static, and cutting it (0.14 -> 0.045) does not
  change the character - only removing or replacing it does. An engine is harmonically related partials (the
  firing order) with a slow amplitude wobble, plus a thin filtered noise bed ~20 dB below the harmonics for
  air; diagnose a suspect clip with an FFT (flat broadband energy, no peaks = the mistake). Route every
  sound through one shared scale so the levels are one landing point later instead of per-clip edits.
- **Run the build call on its own.** A Unity WebGL build runs ~4 minutes; a single terminal command that
  builds, sleeps and then polls for the deploy exceeds the tool's ceiling and comes back with nothing, which
  looks like a failed build. Then copy `Build/*`, commit scoped and push in the next call.
- Verifying audio you cannot hear, and briefing another agent to produce or replace it:
  `references/game-audio-verification.md`.

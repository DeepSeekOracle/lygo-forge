# Auditing the page around a Unity WebGL build

The build can be healthy and the page still read as broken. These are the probes that separate "the
engine failed" from "the shell failed", in the order they are worth running. Every one is a measurement
printed next to its verdict; none is a look at a screenshot.

## 1 · Geometry: does the canvas actually fill the viewport?

```js
const c = document.getElementById('unity-canvas'), r = c.getBoundingClientRect();
const de = document.documentElement;
({ canvas: [r.left, r.top, r.width, r.height], buffer: [c.width, c.height],
   scroll: [de.scrollWidth, de.scrollHeight], client: [de.clientWidth, de.clientHeight],
   viewport: [innerWidth, innerHeight] })
```

Healthy: `canvas` starts at `0,0`, equals `viewport`, and `scroll === client`.

Two failure signatures, both from mixing the template's centring with a viewport-sized canvas:

- **Offset.** The template centres `#unity-container` with `left/top: 50%` + `translate(-50%,-50%)`,
  which centres the container's *own* box. The loader sizes the canvas `100vw/100vh`, so once the
  canvas is bigger than the box the transform was computed for, the canvas hangs off the top-left
  (measured: `canvas 1264x569 @ -7.5,-9.5`). The scene is clipped at its edges and the game's own
  bottom-of-frame title card is half outside the viewport.
- **Scrollbars.** The same overflow makes `scrollWidth/clientWidth` and `scrollHeight/clientHeight`
  disagree by the scrollbar thickness, which both shifts every measurement after it and gives a game
  page two scrollbars it should never have.

Fix both by owning the container instead of adjusting the transform:

```css
html, body { height: 100%; overflow: hidden; background: #080604; }
#unity-container, #unity-container.unity-desktop, #unity-container.unity-mobile {
  position: fixed !important; left: 0 !important; top: 0 !important;
  width: 100% !important; height: 100% !important; transform: none !important;
}
#unity-canvas { display: block; width: 100% !important; height: 100% !important; }
```

The `!important`s are load-bearing: the template's rule is `id.class`, so a plain ID selector loses.
`canvas.width/height` (the drawing buffer) lags a frame or two behind the CSS size and then catches up
on the engine's own resize — do not read a stale buffer size as a bug.

## 2 · State bridge: does the build ever tell the page what screen it is on?

Host pages commonly gate their chrome on a callback the game is supposed to call:

```js
window.gameSetScreen = function (mode) { root.setAttribute('data-screen', mode || 'intro'); };
```

Wrap it *before* the game loads and count the calls for a minute:

```js
cdp('Page.addScriptToEvaluateOnNewDocument', source=`
  window.__calls = [];
  (function () { var n = 0; var iv = setInterval(function () {
    if (window.gameSetScreen && !window.__wrapped) {
      var orig = window.gameSetScreen;
      window.gameSetScreen = function (m) {
        window.__calls.push({ t: Math.round(performance.now()), screen: String(m) });
        return orig.apply(this, arguments);
      };
      window.__wrapped = true;
    }
    if (++n > 200) clearInterval(iv);
  }, 50); })();`)
```

Then navigate and read `window.__calls` beside `data-screen` every few seconds. **Zero calls after a
minute means the build never wired the bridge**, so every control gated on it — radio, fullscreen,
options, the fallback link, any per-screen edge — is unreachable while looking perfectly styled.
The attribute still reads its initial value, which is why source review finds nothing wrong.

A shell must not depend on a state the build may never emit. Render the controls on every screen and
let the attribute only *adjust* them (an extra credit line, a different caption). If a build later
starts calling the bridge, the same markup still works.

## 3 · Error surface: is the failure message above the chrome?

```js
const w = document.getElementById('unity-warning');
({ exists: !!w, z: getComputedStyle(w).zIndex, display: getComputedStyle(w).display,
   parentZ: getComputedStyle(w.parentElement).zIndex })
```

Unity's template writes `#unity-warning` with no `z-index` and white/yellow/red inline styles. A host
page with a fixed chrome overlay paints over it, so a WebGL failure reads to the visitor as a black
canvas with nothing on it. Raise the element above the chrome, restyle it in the site's own language,
and set the text with `textContent` (Unity hands you HTML; strip tags before echoing it).

## 4 · Loader failure: what does the page do when a build file is missing?

Copy the published directory, delete `Build/<name>.loader.js`, serve it, load it. Expected: the page's
own message with a way out within a second or two. Two dead ends to look for by reading the loader
block:

- **No `script.onerror`.** The script tag appends, never loads, and the progress bar sits at `0%`
  forever with no message. Assign `onerror` on the script element *before* `onload` — and check the
  placement, because inserting the handler inside the `onload` body is the easy mistake and it can
  never fire (verified: the page stayed silent with the file missing until the handler moved out).
- **`.catch(alert)` on `createUnityInstance`.** `alert()` is blocked in some in-app browsers and leaves
  the page looking dead behind the dialog. Render the message into the page with a Reload button and a
  link to the non-engine build.

Also probe WebGL before requesting a 29 MB payload: `document.createElement('canvas').getContext('webgl2')
|| ...('webgl')`. No context means download-then-black-canvas, which is the slowest possible failure.

## 5 · Asset truth: what actually came down?

```js
performance.getEntriesByType('resource')
  .filter(e => /StreamingAssets|Build\//.test(e.name))
  .map(e => ({ f: e.name.split('/').pop().slice(0, 40), kb: Math.round(e.transferSize / 1024),
               st: e.responseStatus || 0, ms: Math.round(e.duration) }))
```

`responseStatus 0` with a long duration is a request that never completed (aborted, blocked, or blocked
by an autoplay gate), which no console error reports. Range responses on a menu video read `206` and
are healthy. This is the probe that finds a media file the game waits on and the DOM never mentions.

## 6 · Screenshot last, and read it yourself

A capture proves the scene renders — knights, crowd, torches, the title card — which no DOM metric can.
It does not prove layout: the same capture shows a clipped plate and a scrollbar as "the game", so pair
every screenshot with probes 1 and 2 and let the numbers decide. When a change looks right in the
numbers, take the screenshot anyway; two regressions in one pass (a handler inside `onload`, a credit
span with `margin-left:auto` dragging the title under a button) were each invisible to the metrics and
obvious in the image.

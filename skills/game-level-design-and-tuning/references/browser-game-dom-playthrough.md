# Proving a browser game's content and opening loop without a browser

For a game whose rooms/scenes are plain DOM (a `window.<DATA>` object, a renderer that appends paragraphs,
state in `localStorage`), jsdom is enough to walk the whole game and read what a player would read. It is
faster than a browser session, needs no install of Chromium, and it produces counts instead of impressions.

## The harness

```js
const { JSDOM, VirtualConsole } = require('jsdom');          // npm install jsdom in a scratch dir
const vc = new VirtualConsole();
const errs = [];
vc.on('jsdomError', e => {
  const s = String(e);
  if (!/Could not load img|Not implemented|parse CSS|iframe/i.test(s)) errs.push(s.slice(0, 160));
});
const dom = await JSDOM.fromFile('<game>/index.html', {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc
  // url: 'https://site/games/<slug>/'   <- add this to test the DEPLOYED build instead of local files
});
await new Promise(r => setTimeout(r, 2500));                 // let the game boot
```

Seed the state the game itself reads, then drive the real UI and read the DOM back:

```js
const V = window.HavenDesk.store.veil;                       // the game's own save object
dates.forEach(id => { V.unlocked[id] = true; V.solved[id] = { at: 'test', how: 'gate' }; });
window.HavenDesk.save();
window.HavenDesk.open('calendar');                           // the app's own registry, not a private fn
[...doc.querySelectorAll('.veil-node')][i].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const prose = [...doc.querySelectorAll('p.veil-prose')].map(n => n.textContent.trim());
```

Assert per item and print the distribution: routed count, passed count, min/max words, total words,
duplicate ids, and the JS error list. A pass/fail boolean hides the signature of a partially rendered run.

## Traps that cost a cycle each

- **The `url:` option decides which origin the page's own `<script>` tags load from.** With it, every
  relative script is fetched from the live site, so a change you have not deployed yet is simply absent
  (a 404 in the error list) while the old build runs and the test passes. Keep two harness copies: one
  with `url:` for post-deploy proof, one without for pre-deploy proof, and say which one produced a number.
- **A private render function is not reachable from the page context.** Click the UI element that calls it
  (a map node, a card button). Expose a small `window.<GAME>_API` from the game only where a test or the
  first-run loop genuinely needs routing — not the whole module.
- **jsdom has no `fetch`** in the window, so a game that loads data at runtime throws `ReferenceError`.
  Read the data through the page's already-loaded global instead, or stub `window.fetch` before load.
- **Iframes and canvas apps do not mount.** Absolute game paths (`/games/<other>/`) resolve against the
  file or fake origin and fail; those modules must be verified another way, and the report must say which
  ones were skipped rather than implying full coverage.
- **Gates that unlock on answer need the answer from the data, not a guess.** Read it from the same object
  the game reads (`strata[i].answer`), type it lower-case to prove the normaliser, and assert the rendered
  "UNSEALED" text — that is what proves the gate path, not the flag alone.
- **Synthetic clicks bypass hit testing.** They prove the handler, not that a visitor can press the control;
  a fixed overlay can cover a control that clicks perfectly in jsdom. Say so when it matters.

## What a finished run looks like

`routed: 60, passed: 60, minWords: 740, maxWords: 939, totalWords: 47046, duplicates: 0, jsErrors: []`
plus, for the opening loop: overlay present → wrong word produces the first hint → right word solves and
unlocks exactly the listed dates → note stays open on its second side → closing it works → `begin()` does
not re-show it while `reopen()` does → the thread line names the next room and clicking it renders that
room's paragraphs.

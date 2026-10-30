# Auditing a mode that removes a resource

For a game with two or more modes where one zeroes a currency (points/shop) or swaps a core loop. Write it as a mode-scoped change: the same pass has to prove the other mode is untouched.

## Order of work
1. Read the mode's entry path first — the menu handler that sets the flag, and the apply step the frame loop runs (mode flag on the options, resource zeroed, run record created). Once it is in, everything it paints is the only renderer allowed to own that slot for the rest of the session.
2. Grep the currency, not the buttons: `grep -ni "pts\|points\|gold\|coins" <game>.js | grep -v "state\.points"`. Every surviving hit needs a mode gate or a mode-neutral rewrite. The hits that matter: payout tags in the marks/goals list, credit call sites (`award(...)`, refunds, release bonuses), "Buy …" button labels, empty-state copy ("The tank is empty. Buy a fish."), how-to and flavour paragraphs, and the log strings.
3. Grep the automation path for affordability gates: `grep -n "\.points >=\|canAfford"`. Every gate either goes free in the money-free mode or must be deliberately skipped — never left reading a resource the mode does not have.
4. Check the row class's own `display` rule before trusting the `hidden` attribute; add `[hidden]{display:none!important}` at the end of the sheet and assert `getComputedStyle(el).display === "none"`.
5. Re-run every string assert in the smoke test after copy changes, and add asserts for the strings you *removed* as well as the ones you added.

## One set of controls
The failure shape: the default panel keeps painting its own row every frame while the mode inserts a second row above another section — dead controls next to live ones, both clickable, one of them working. Fix by handing the mode the existing slot: hide the default panel, re-point its heading and its sub-label to the mode's vocabulary, and paint the mode's rows where the default row was. Assert counts, not looks: `document.querySelectorAll('<default> [data-buy]').length === 0` plus the mode's own selector present.

## Browser harness recipe
Serve the repo root (threaded static server — see the title skill) and drive the real menu path instead of poking state directly:
- click through the menu card and each option. When a card is bound to a pointer event rather than a click, a plain `.click()` does not fire the listener — use `el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))`.
- read the game's own surface (`window.<Game>.get()`) for mode and resource values, and the DOM for control counts; keep a `window.__errs` counter and read it at the end.
- **re-load with a fresh `?cb=<n>` on every iteration.** The plain URL serves the previous script, so a fixed build looks broken and a broken one looks fixed.
- cheap static gates first (`node --check <game>.js`, `node tools/<game>_smoke.js`, `node tools/<game>_sim_check.js`), then the browser pass, then re-drive the *other* mode.

## Reporting
Report the two modes' observed state separately — mode flag, resource value, control counts, how many payouts the goals list still promises, console errors — and say plainly which parts are committed-and-waiting versus verified live. Bump the `?v=` on every changed asset in the HTML and confirm the served document names the new version before calling it live.

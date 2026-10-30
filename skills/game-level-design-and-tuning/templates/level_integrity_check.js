/* Headless level-integrity check.
 *
 * Copy into the game's tools/ dir and wire the TODO hooks to that game's own module and
 * factories. Run: node tools/<game>_level_check.js   (exit 1 on any failure)
 *
 * Why it works: the level builder is usually a browser IIFE/UMD that only needs `window`,
 * `globalThis` and the factories passed in as arguments. Stub those and the level *data* is
 * real while the render loop, canvas and input stay out of the picture.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ---- TODO: point these at the game -------------------------------------------------
const GAME = path.join(__dirname, "..");   // dir holding the module + index.html
const MODULE = "levels.js";                // file that exposes the builder
const EXPORT = "Levels";                   // sandbox global it publishes to
const LEN = 24;                             // number of levels/floors to build
const MIN_TILES = 500;                      // smallest acceptable walkable region
const WALK = new Set(["floor", "pad", "exit", "exit_lock", "door_open"]);
const STRUCT = new Set(["pad", "exit", "exit_lock"]);  // loot must NOT stand here
const DOOR = new Set(["door", "door_open"]);           // a wall until its key opens it
const GATE_TILES = 8;                                    // a door opening fewer gates nothing
// ------------------------------------------------------------------------------------

const sandbox = { console, Math, Date, JSON };
sandbox.window = sandbox;                   // browser IIFE expects these
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(GAME, MODULE), "utf8"), ctx, { filename: MODULE });

const api = sandbox[EXPORT];
if (!api || typeof api.build !== "function") {
  console.error("FAIL: " + MODULE + " did not export " + EXPORT + ".build");
  process.exit(1);
}

// TODO: match the real shapes — these only need to be non-null for the builder.
const makeFoe = (kind, x, y) => ({ kind: kind || "grunt", x: x || 0, y: y || 0, hp: 3, t: 0 });
const rollLoot = () => ({ kind: "coin", amount: 1 });

let fail = 0, doorsKept = 0, keysSeen = 0;
const must = (lv, n, cond, msg) => {
  if (!cond) { fail++; console.log("  x floor " + n + ": " + msg); }
};

/* `openSet` holds the "x,y" of every door held OPEN; every other door tile is a wall. Called
   with no set this is the all-shut state — the ground a key has to be reachable from. */
function walkable(lv, x, y, openSet) {
  if (x < 0 || y < 0 || x >= lv.W || y >= lv.H) return false;
  const t = lv.tiles[y][x];
  if (DOOR.has(t)) return !!(openSet && openSet.has(x + "," + y));
  return WALK.has(t);
}

/* Flood fill from the start; everything an objective can stand on must be in here. */
function reachFrom(lv, sx, sy, openSet) {
  const seen = new Uint8Array(lv.W * lv.H);
  const q = [sy * lv.W + sx];
  seen[q[0]] = 1;
  while (q.length) {
    const c = q.pop(), x = c % lv.W, y = (c / lv.W) | 0;
    const nbr = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of nbr) {
      const nx = x + dx, ny = y + dy;
      if (!walkable(lv, nx, ny, openSet)) continue;
      const n = ny * lv.W + nx;
      if (seen[n]) continue;
      seen[n] = 1;
      q.push(n);
    }
  }
  return seen;
}

for (let i = 0; i < LEN; i++) {
  let lv;
  try {
    lv = api.build(i, makeFoe, rollLoot);
  } catch (e) {
    fail++;
    console.log("  x floor " + i + ": threw " + e.message);
    continue;
  }
  must(lv, i, lv && lv.tiles && lv.tiles.length, "built nothing");
  if (!lv || !lv.tiles) continue;

  let open = 0;
  for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) if (WALK.has(lv.tiles[y][x])) open++;
  must(lv, i, open >= MIN_TILES, "region too small (" + open + " walkable < " + MIN_TILES + ")");

  const s = lv.start;
  must(lv, i, walkable(lv, s.x, s.y), "start sits on " + lv.tiles[s.y][s.x]);

  /* Doors, parsed once and then flooded in the states that matter:
       shutAll  every door shut  -> the exit must still be reachable (a door may never trap
                                    forward progress) and this is where KEYS must be found.
       openAll  every door open  -> the state the player reaches with the keys in hand; the
                                    objective assertions below all use it.
     Per door, flood with just that door open and diff against shutAll: the diff is the only
     thing the door is for. A handful of tiles or no prize inside means it is decoration. */
  const doors = (lv.doors || []).map((d) => ({
    x: d.x !== undefined ? d.x : d[0],
    y: d.y !== undefined ? d.y : d[1],
  }));
  const dkey = (d) => d.x + "," + d.y;
  const shutAll = reachFrom(lv, s.x, s.y);
  const reach = reachFrom(lv, s.x, s.y, new Set(doors.map(dkey)));
  doorsKept += doors.length;

  /* Exit: find the exit tiles and require one to be reachable. A sealed/locked level is
     allowed to have it locked, but never unreachable. */
  const exits = [];
  for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
    const t = lv.tiles[y][x];
    if (t === "exit" || t === "exit_lock") exits.push({ x, y, t });
  }
  must(lv, i, exits.length > 0, "no exit tile");
  must(lv, i, exits.some((e) => reach[e.y * lv.W + e.x]), "exit unreachable");

  /* Every objective must stand on reachable, non-structural ground. Field names are the
     TODO here: add whatever arrays the level object actually carries. */
  const obj = []
    .concat((lv.items || []).map((o) => ["item", o]))
    .concat((lv.gens || []).map((o) => ["spawner", o]))
    .concat((lv.foes || []).map((o) => ["foe", o]))
    .concat((lv.pads || []).map((o) => ["pad", o]));
  for (const [kind, o] of obj) {
    if (typeof o.x !== "number" || typeof o.y !== "number") continue;
    const n = o.y * lv.W + o.x;
    const t = lv.tiles[o.y] && lv.tiles[o.y][o.x];
    must(lv, i, reach[n], kind + " at " + o.x + "," + o.y + " is unreachable (" + t + ")");
    if (kind === "item" || kind === "spawner") {
      must(lv, i, !STRUCT.has(t), kind + " stands on a " + t + " tile");
    }
  }

  must(lv, i, (lv.items || []).length > 0, "no collectables");

  /* --- the door doctrine ---------------------------------------------------------- */
  must(lv, i, !exits.length || exits.some((e) => shutAll[e.y * lv.W + e.x]),
    "a shut door strands the exit");
  for (const d of doors) {
    const t = (lv.tiles[d.y] && lv.tiles[d.y][d.x]) || "";
    must(lv, i, DOOR.has(t), "door at " + d.x + "," + d.y + " but the tile is " + t);
    const one = reachFrom(lv, s.x, s.y, new Set([dkey(d)]));
    const gained = (o) => one[o.y * lv.W + o.x] && !shutAll[o.y * lv.W + o.x];
    let tiles = 0, prize = 0;
    for (let k = 0; k < shutAll.length; k++) if (one[k] && !shutAll[k]) tiles++;
    for (const o of lv.items || []) if (typeof o.x === "number" && gained(o)) prize++;
    must(lv, i, tiles >= GATE_TILES, "door at " + d.x + "," + d.y + " opens only " + tiles + " tile(s)");
    must(lv, i, prize > 0, "door at " + d.x + "," + d.y + " gates no prize");
    /* a spawner or the exit behind a lock is never allowed, whatever the door gates */
    for (const o of lv.gens || []) {
      must(lv, i, !(typeof o.x === "number" && gained(o)),
        "spawner at " + o.x + "," + o.y + " sits behind the door at " + d.x + "," + d.y);
    }
  }
  const keys = (lv.items || []).filter((o) => o.kind === "key");
  keysSeen += keys.length;
  must(lv, i, keys.length >= doors.length,
    doors.length + " door(s) but only " + keys.length + " key(s)");
  for (const k of keys) {
    must(lv, i, shutAll[k.y * lv.W + k.x],
      "key at " + k.x + "," + k.y + " sits behind the door it opens");
  }
}

/* Print the derived counts, not just the verdict: "doors kept 0" on a level set that should
   hold designed doors is the bug signature, and a pass/fail exit code hides it. */
console.log("\n" + (fail ? "FAIL - " + fail + " problem(s)" : "PASS - " + LEN + " levels, all reachable") +
  " | doors kept " + doorsKept + ", keys " + keysSeen);
process.exit(fail ? 1 : 0);

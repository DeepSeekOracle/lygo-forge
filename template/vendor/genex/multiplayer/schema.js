import {
  schema,
  t
} from "./chunk-ANQZE3ZO.js";

// node_modules/@genex-ai/multiplayer/dist/schema.js
var PlayerState = schema(
  {
    // Display name: the verified identity's name, else the `name` join option, ≤64 chars.
    name: t.string().default(""),
    // The player's own JSON object, replaced wholesale by `state` / `__state:snap` (≤16 KiB). Free
    // form — the game decides what to sync. Carries `__t`, the sender's clock stamp in ms that
    // remote interpolation runs on (PROTOCOL.md §10); SDKs strip it before a game sees the state.
    data: t.string().default("{}"),
    // Deliberate-discontinuity counter: `__state:snap` increments it in the same patch as the new
    // data, so receivers drop interpolation history instead of easing across a teleport/respawn.
    epoch: t.number().default(0),
    // Transport liveness. False while the seat is held only by reconnection grace.
    connected: t.boolean().default(true),
    // Verified VRM avatar URL from the embed token (never a join option), ≤512 chars. '' = none.
    avatarUrl: t.string().default(""),
    // Stable per-game player id, stamped by the relay from the verified identity (PROTOCOL.md §3.3).
    // The same person gets the same uid in this game across reloads, devices and rooms, and a
    // different one in every other game. Opaque, ≤64 chars — key scores, colors and saves by it,
    // never by the session id (which changes on every reload).
    uid: t.string().default(""),
    // Team index assigned by the relay: the open preset's `teams: N` (assigned at join, never
    // reshuffled, remembered by uid) or the team preset's current round. -1 = no team.
    team: t.number().default(-1),
    // ---- Optional typed pose (PROTOCOL.md §6.6), appended in protocol 3. Written only from the
    // seat's own `__pose` / `__pose:snap` messages. A game that never sends a pose leaves all of
    // these at their defaults and keeps its whole state in `data`, exactly as before. Positions are
    // plain float32 (never quantized: world sizes vary by orders of magnitude); the relay rounds
    // with Math.fround before writing, so an unchanged float32 value never re-sends.
    // Receivers interpolate x..vz (yaw along the shortest arc) and SNAP anim (§10.1).
    x: t.float32().default(0),
    y: t.float32().default(0),
    z: t.float32().default(0),
    // Heading in radians, any finite value; receivers wrap it (never lerp across ±π the long way).
    yaw: t.float32().default(0),
    // Velocity in world units per second: the sender's own, used for extrapolation past the newest
    // sample. Not derived by the relay.
    vx: t.float32().default(0),
    vy: t.float32().default(0),
    vz: t.float32().default(0),
    // Current animation/state name (≤64 chars). Discrete: never interpolated. '' = none.
    anim: t.string().default(""),
    // The sender's clock stamp (ms, same clock as `__t`) of the pose above, written in the same
    // patch as the pose. 0 = no pose published yet.
    poseT: t.float64().default(0),
    // True from this seat's first accepted pose until the seat is gone (a reconnect keeps it).
    // While true, x..anim are this player's pose and `data` is snapped, not blended (§10.1).
    posed: t.boolean().default(false)
  },
  "PlayerState"
);
var ObjectState = schema(
  {
    // Owner session id, or '' when unowned (released, or its owner left an empty room).
    owner: t.string().default(""),
    // Ownership sequence: +1 on EVERY owner change (claim, release, orphan reassignment, host
    // failover). Never changes on a state publish. Control results report it as `sequence`.
    seq: t.number().default(0),
    // Deliberate-discontinuity counter, incremented by `__object:snap` (a reset/teleport).
    epoch: t.number().default(0),
    // The CURRENT owner's send-clock stamp (ms) for `d`, preserved from the owner's message. The
    // relay resets it to 0 on every owner change, so a nonzero `t` is always on the current owner's
    // clock and 0 means "this `d` was not stamped by the current owner" (a handoff bridge pose).
    t: t.float64().default(0),
    // The object's JSON state object (≤64 KiB), as last published. '' until the first publish.
    // Survives owner changes untouched. A plain field on purpose — never .patchOnly(), or a late
    // joiner's full state would not carry it.
    d: t.string().default("")
  },
  "ObjectState"
);
var RoomState = schema(
  {
    // Seated players by session id.
    players: t.map(PlayerState),
    // Game-writable room key -> JSON text (≤256 keys of ≤256 chars, values ≤64 KiB). Only game keys
    // live here; the `__` key prefix is refused, and nothing the relay owns is mirrored into it.
    shared: t.map("string"),
    // Shared objects by id (≤128 per room).
    objects: t.map(ObjectState),
    // Session id of the elected host, or '' while the room has none.
    host: t.string().default(""),
    // Match rooms only: the match state as one JSON text (phase, players, teams, scores, cfg, …;
    // PROTOCOL.md §9). '' in a plain play room. A single string until native decoders are shown to
    // handle the nested team rosters a typed MatchState would need.
    match: t.string().default(""),
    // Voice roster: session id -> true for each participant (≤6). Membership is key presence;
    // the value carries nothing. A map rather than a set — see the header.
    voice: t.map("boolean"),
    // The relay's wall clock (epoch ms) at room-clock zero: `clock.currentTime − clock.elapsedTime`,
    // written once in onCreate and never again. Maps relay epoch stamps (match `startsAt`/`endsBy`,
    // chat `at`) onto the room clock that TIMED frames carry: `serverClockMs = epochMs − clockOrigin`
    // (PROTOCOL.md §16). 0 = the relay does not publish its clock.
    clockOrigin: t.float64().default(0)
  },
  "RoomState"
);
var HeartbeatInput = schema(
  {
    n: t.number().default(0)
  },
  "HeartbeatInput"
);
export {
  HeartbeatInput,
  ObjectState,
  PlayerState,
  RoomState
};

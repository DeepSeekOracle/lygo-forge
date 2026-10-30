import {
  CloseCode,
  HandshakeSection,
  InputFlags,
  InputHandleImpl,
  NULL_CLOCK,
  PROTOCOL_CODE_MASK,
  Protocol,
  ProtocolModifier,
  ResponseStatus,
  RoomClockImpl,
  now,
  publishDebug
} from "./chunk-QQ7LNOQN.js";
import {
  $changes,
  $numFields,
  $values,
  Decoder,
  Encoder,
  Reflection,
  __commonJS,
  __toESM,
  decode,
  encode,
  getDecoderStateCallbacks,
  getEncodeDescriptor
} from "./chunk-ANQZE3ZO.js";

// node_modules/ws/browser.js
var require_browser = __commonJS({
  "node_modules/ws/browser.js"(exports, module) {
    "use strict";
    module.exports = function() {
      throw new Error(
        "ws does not work in the browser. Browser clients must use the native WebSocket object"
      );
    };
  }
});

// node_modules/@genex-ai/multiplayer/dist/chunk-C52XFIB6.js
var PROTOCOL_VERSION = 3;
var RoomType = {
  /** The plain relay room: joinOrCreate, fullest-first placement. */
  PLAY: "play",
  /** The matchmaking search pool. No game session — it only hands out seat reservations. */
  QUEUE: "queue",
  /** A capped match arena: seat reservation (matchmade), create (private lobby) or joinById (invite). */
  MATCH: "match"
};
var JoinError = {
  /** A server-owned option was sent. */
  BAD_OPTION: 400,
  /** No token, an invalid/expired token, or a revoked session. */
  AUTH_REQUIRED: 401,
  /** Token for another game ('wrong game'), or the room's guest cap is full. */
  FORBIDDEN: 403,
  /** `protocol` missing or outside [MIN_PROTOCOL_VERSION, PROTOCOL_VERSION]. Update the client. */
  PROTOCOL_UNSUPPORTED: 426
};
var ClientMessage = {
  STATE: "state",
  STATE_SNAP: "__state:snap",
  SHARED: "shared",
  CLAIM: "claim",
  RELEASE: "release",
  DESTROY: "destroy",
  OBJECT: "obj",
  OBJECT_SNAP: "__object:snap",
  INPUT: "__input",
  ROOM_OPEN: "__room:open",
  CHAT: "__chat",
  CHAT_HISTORY_REQUEST: "__chat:history:request",
  VOICE_ICE_REQUEST: "__voice:ice:request",
  VOICE_JOIN: "__voice:join",
  VOICE_LEAVE: "__voice:leave",
  VOICE_SIGNAL: "__voice:signal",
  // match rooms only — self-reports, accepted only from an active seat
  MATCH_ELIMINATED: "match:eliminated",
  MATCH_SCORE: "match:score",
  MATCH_FINISH: "match:finish",
  // optional typed pose (§6.6) — appended in protocol 3
  POSE: "__pose",
  POSE_SNAP: "__pose:snap"
};
var ServerMessage = {
  OBJECT_RESULT: "__object:result",
  INPUT: "__input",
  ROOM_OPEN: "__room:open",
  CHAT: "__chat",
  CHAT_HISTORY: "__chat:history",
  VOICE_ICE: "__voice:ice",
  VOICE_SIGNAL: "__voice:signal",
  VOICE_REJECTED: "__voice:rejected",
  RATE_DROP: "rate:drop",
  SERVER_RESTART: "server:restart",
  // match rooms only
  MATCH_START: "match:start",
  MATCH_ENDED: "match:ended",
  MATCH_REQUEUE: "match:requeue",
  // queue room only
  QUEUE: "queue",
  SEAT: "seat"
};
var RESERVED_EVENT_PREFIXES = ["__", "match:", "server:", "rate:"];
var RESERVED_EVENT_TYPES = ["state", "shared", "claim", "release", "destroy", "obj", "queue", "seat"];
function isReservedEventType(type) {
  return RESERVED_EVENT_TYPES.includes(type) || RESERVED_EVENT_PREFIXES.some((prefix) => type.startsWith(prefix));
}
var RESERVED_SHARED_PREFIX = "__";
var SEND_TIME_KEY = "__t";
var MESSAGE_LANE = {
  [ClientMessage.STATE]: "state",
  [ClientMessage.STATE_SNAP]: "state",
  [ClientMessage.SHARED]: "bulk",
  [ClientMessage.CLAIM]: "control",
  [ClientMessage.RELEASE]: "control",
  [ClientMessage.DESTROY]: "control",
  [ClientMessage.OBJECT]: "bulk",
  [ClientMessage.OBJECT_SNAP]: "bulk",
  [ClientMessage.INPUT]: "input",
  [ClientMessage.ROOM_OPEN]: "control",
  [ClientMessage.CHAT]: "chat",
  [ClientMessage.CHAT_HISTORY_REQUEST]: "control",
  [ClientMessage.VOICE_ICE_REQUEST]: "voice",
  [ClientMessage.VOICE_JOIN]: "voice",
  [ClientMessage.VOICE_LEAVE]: "voice",
  [ClientMessage.VOICE_SIGNAL]: "voice",
  [ClientMessage.MATCH_ELIMINATED]: "bulk",
  [ClientMessage.MATCH_SCORE]: "bulk",
  [ClientMessage.MATCH_FINISH]: "bulk",
  [ClientMessage.POSE]: "pose",
  [ClientMessage.POSE_SNAP]: "pose"
};
var CloseCode2 = {
  // reconnectable (the seat is held for the grace window)
  GOING_AWAY: 1001,
  NO_STATUS: 1005,
  ABNORMAL: 1006,
  /** Colyseus: the server is going down, come back. The one ≥4000 code that is not terminal. */
  MAY_TRY_RECONNECT: 4010,
  // terminal
  NORMAL: 1e3,
  /** A deliberate leave (Colyseus CONSENTED) — and the code a match room boots a requeued player
   *  with when it ignored `match:requeue` (Genex MATCH_BOOT). Same number, same meaning: seat gone. */
  CONSENTED: 4e3,
  MATCH_BOOT: 4e3,
  SERVER_SHUTDOWN: 4001,
  /** Colyseus: protocol error, or the socket exceeded MAX_MESSAGES_PER_SECOND. */
  WITH_ERROR: 4002,
  /** Colyseus SDK: every reconnection attempt failed (the grace expired). */
  FAILED_TO_RECONNECT: 4003,
  /** The player's session was revoked (signed out from the dashboard). Do not rejoin with it. */
  REVOKED: 4401,
  /** A newer session of the same player took the seat (second tab, or the page reloaded). */
  SUPERSEDED: 4409
};
var Limits = {
  ROOM_MAX_CLIENTS: 64,
  MAX_NAME_CHARS: 64,
  MAX_AVATAR_URL_CHARS: 512,
  MAX_UID_CHARS: 64,
  /** `state` / `__state:snap` payload (the JSON text). */
  MAX_STATE_BYTES: 16 * 1024,
  MAX_SHARED_KEY_CHARS: 256,
  MAX_SHARED_VALUE_BYTES: 64 * 1024,
  /** Distinct game keys a room's `shared` map may ever hold (keys are never deleted). */
  MAX_SHARED_KEYS: 256,
  MAX_OBJECT_ID_CHARS: 128,
  /** An object's `d` as stored (JSON text). */
  MAX_OBJECT_STATE_BYTES: 64 * 1024,
  /** Live objects per room (an id counts from its first accepted claim until `destroy`). */
  MAX_OBJECTS: 128,
  MAX_REQUEST_ID_CHARS: 96,
  /** Game events and `__input`: the payload's JSON encoding. */
  MAX_EVENT_BYTES: 16 * 1024,
  MAX_EVENT_TYPE_CHARS: 128,
  /** JSON payload shape bounds: nesting depth and total node count. */
  MAX_JSON_DEPTH: 32,
  MAX_JSON_NODES: 4096,
  /** Code points per chat line after normalization. */
  MAX_CHAT_CHARS: 500,
  CHAT_HISTORY_MAX: 50,
  CHAT_HISTORY_MAX_BYTES: 8 * 1024,
  MAX_VOICE_PARTICIPANTS: 6,
  MAX_VOICE_SIGNAL_BYTES: 8 * 1024,
  /** `match:score` delta is clamped to ±this. */
  MAX_SCORE_DELTA: 1e3,
  /** Results kept per session for request-id replay, and how long. */
  CONTROL_RESULTS_PER_SESSION: 128,
  CONTROL_RESULT_TTL_MS: 6e4,
  /** Open preset `teams` knob range (0 = no teams). */
  MAX_TEAMS: 8,
  /** `__pose` `anim` string (§6.6). */
  MAX_ANIM_CHARS: 64,
  /** Every `__pose` number must be finite with |v| ≤ this (float32 holds it without overflowing to
   *  Infinity; past ~1e7 a float32 position is coarser than a metre anyway). */
  MAX_POSE_ABS: 1e9
};
var RelayTiming = {
  /** State patch cadence: every accumulated change goes out on this tick. */
  PATCH_INTERVAL_MS: 1e3 / 30,
  /** Seat grace after an abnormal drop (1006 etc.). */
  RECONNECT_GRACE_S: 30,
  /** Seat grace after a 1001 close (reload/navigate) — long enough to rejoin and supersede. */
  GOING_AWAY_GRACE_S: 5,
  /** A dropped host keeps host for this long before the relay fails over. */
  HOST_FAILOVER_GRACE_MS: 1500,
  /** A freshly changed owner cannot be displaced by an ordinary claim for this long. */
  MIN_OWNERSHIP_HOLD_MS: 300,
  /** After `server:restart`, clients are dropped this much later. */
  SHUTDOWN_DRAIN_MS: 3e3,
  /** A requeued match player that has not left is booted (MATCH_BOOT) after this. */
  REQUEUE_GRACE_MS: 5e3,
  /** A seat reservation must be consumed within this. */
  SEAT_RESERVATION_S: 15,
  /** The queue room's matchmaking pass. */
  QUEUE_TICK_MS: 1e3,
  /** Embed tokens are re-checked for revocation on this cadence (REVOKED close on hit). */
  REVOCATION_SWEEP_MS: 3e4
};
var ClientReconnection = {
  enabled: true,
  minUptime: 0,
  delay: 125,
  minDelay: 100,
  maxDelay: 4e3,
  maxRetries: 9,
  maxEnqueuedMessages: 0,
  /** After the SDK reports reconnected, wait at most this for the first state decode (§8). */
  firstStateTimeoutMs: 2e3
};
var POSE_KEYS = ["x", "y", "z", "yaw", "vx", "vy", "vz", "anim"];
var Interpolation = {
  /** Render delay target = RATIO × median publish interval of that sender… */
  RATIO: 1.5,
  /** …but at least JITTER_SAFETY × (p90 − min) of that sender's (arrival − sendTime)… */
  JITTER_SAFETY: 1.25,
  /** …clamped to [MIN_MS, MAX_MS], and DEFAULT_MS before anything is measured. */
  MIN_MS: 90,
  MAX_MS: 300,
  DEFAULT_MS: 100,
  /** Per-sample fraction the delay moves toward its target (no pops). */
  EASE: 0.1,
  /**
   * The min-filtered clock-offset window, kept PER SENDER: it holds at least the last CLOCK_WINDOW
   * samples AND at least CLOCK_WINDOW_MS of them, whichever reaches further back, so a sender that
   * owns many streams never shrinks the time the window covers. The jitter term reads each stream's
   * own last CLOCK_WINDOW samples.
   */
  CLOCK_WINDOW: 80,
  CLOCK_WINDOW_MS: 5e3,
  /** Hard cap on one sender's window (memory bound for a sender publishing very many streams). */
  CLOCK_WINDOW_MAX: 4096,
  /** Publish-gap history for the median; gaps outside (MIN_GAP_MS, MAX_GAP_MS) are ignored. */
  INTERVAL_WINDOW: 30,
  MIN_GAP_MS: 5,
  MAX_GAP_MS: 2e3,
  /** Snapshot history kept per stream (never fewer than 2). */
  HISTORY_MS: 1500,
  /** Past the newest snapshot: dead-reckon position at most this far, rotation this far. */
  MAX_EXTRAP_MS: 250,
  ROT_EXTRAP_MS: 150,
  /** Output smoothing time constants (alpha = 1 − e^(−dt/τ), dt clamped to 250 ms). */
  SMOOTH_TAU_POS_MS: 30,
  SMOOTH_TAU_ROT_MS: 70,
  /** A head snapshot this far in the future of the newest is a foreign-clock poison: drop it. */
  POISON_GUARD_MS: 2e3,
  /** A reconnect gap longer than this discards every stream's history (one deliberate rebase). */
  REBASE_AFTER_GAP_MS: 1e3,
  /** Host tick dt is clamped to this (a backgrounded tab must not tunnel the simulation). */
  MAX_HOST_TICK_DT_MS: 250
};
var ClockSync = {
  /** The heartbeat rate a client SHOULD send at, from a wall-clock timer (never the render loop). */
  HEARTBEAT_HZ: 10,
  /** A client that sends heartbeats MUST stay within [MIN_HEARTBEAT_HZ, MAX_HEARTBEAT_HZ] while its
   *  page is foregrounded. Below MIN the offset and RTT refresh too slowly; above MAX buys nothing,
   *  and the relay's small buffer (RELAY_BUFFER) folds the excess away. */
  MIN_HEARTBEAT_HZ: 5,
  MAX_HEARTBEAT_HZ: 20,
  /** Each interval is the nominal one × (1 ± up to this), clamped to the band above. A fixed interval
   *  that divides the patch interval phase-locks to the patch tick (every RTT sample then carries the
   *  same hold); the dither walks the phase so near-zero holds keep turning up. */
  HEARTBEAT_DITHER: 0.15,
  /** Relay `defineInput({ bufferMaxSize })`. Overflow counts as consumed, so a burst still acks. */
  RELAY_BUFFER: 4,
  /** Acked heartbeats (RTT-valid samples) before a client treats `serverNow` as synced and uses it
   *  for deadlines (≈3 s at 10 Hz). The room clock seeds its offset from the first TIMED frame, which
   *  is biased by the one-way latency, and then moves by an EMA (α = 0.1) per RTT sample, so after k
   *  samples 0.9^k of that bias remains: ≈35% at 10, ≈4% at 30 (≈6 ms at 150 ms one way). 30 is also
   *  where the room clock's RTT gate stops being bypassed (its warmup). */
  WARMUP_ACKS: 30
};

// node_modules/@colyseus/sdk/build/legacy.mjs
if (!ArrayBuffer.isView) {
  ArrayBuffer.isView = (a) => {
    return a !== null && typeof a === "object" && a.buffer instanceof ArrayBuffer;
  };
}
if (typeof globalThis === "undefined" && typeof window !== "undefined") {
  window["globalThis"] = window;
}
if (typeof FormData === "undefined") {
  globalThis["FormData"] = class {
  };
}

// node_modules/@colyseus/sdk/build/errors/Errors.mjs
var ServerError = class extends Error {
  code;
  headers;
  status;
  response;
  data;
  constructor(code, message, opts) {
    super(message);
    this.name = "ServerError";
    this.code = code;
    if (opts) {
      this.headers = opts.headers;
      this.status = opts.status;
      this.response = opts.response;
      this.data = opts.data;
    }
  }
};
var MatchMakeError = class _MatchMakeError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.code = code;
    this.name = "MatchMakeError";
    Object.setPrototypeOf(this, _MatchMakeError.prototype);
  }
};

// node_modules/@colyseus/schema/build/input/index.mjs
var DEFAULT_SLOT_SIZE = 256;
var LENGTH_PREFIX_WORST_CASE = 5;
var InputEncoder = class _InputEncoder {
  instance;
  mode;
  historySize;
  _desc;
  _numFields;
  // Unreliable-mode ring: `_slots`/`_slotLens` hold each snapshot; `_outBuffer` holds the concatenated packet.
  _slots;
  _slotLens;
  _slotHead = 0;
  _slotCount = 0;
  _outBuffer;
  // Monotonic per-tick input seq (unreliable only): ++ per pushed slot. The
  // packet carries the OLDEST slot's seq once; the decoder derives each slot's
  // seq by position (slots are consecutive — every tick pushes). This is the
  // framework-owned seq that drives server-side dedupe of the redundancy ring
  // WITHOUT the user adding a seq field. Monotonic across reset() so a
  // reconnect that reuses the server buffer doesn't replay already-seen seqs.
  _seq = 0;
  // Delta delegate; setters populate its ChangeTree, `encode()` drains dirty fields.
  _encoder;
  constructor(instance, options = {}) {
    this.instance = instance;
    this.mode = options.mode ?? "reliable";
    this.historySize = this.mode === "unreliable" ? Math.max(1, options.historySize ?? 3) : 1;
    this._desc = getEncodeDescriptor(instance);
    const numFields = this._desc.metadata?.[$numFields];
    if (numFields === void 0) {
      throw new Error(`InputEncoder: '${instance.constructor.name}' has no fields`);
    }
    this._numFields = numFields;
    for (let i = 0; i <= numFields; i++) {
      if (this._desc.names[i] !== void 0 && this._desc.encoders[i] === void 0) {
        throw new Error(`InputEncoder: non-primitive field '${this._desc.names[i]}' on '${instance.constructor.name}' is not supported. Use Encoder for state containing refs/collections.`);
      }
    }
    if (this.mode === "unreliable") {
      this._slots = new Array(this.historySize);
      this._slotLens = new Array(this.historySize).fill(0);
      for (let i = 0; i < this.historySize; i++) {
        this._slots[i] = new Uint8Array(DEFAULT_SLOT_SIZE);
      }
      this._outBuffer = new Uint8Array((DEFAULT_SLOT_SIZE + LENGTH_PREFIX_WORST_CASE) * this.historySize);
    }
    this._encoder = new Encoder(instance);
  }
  /**
   * The framework input seq of the most recently encoded tick (unreliable
   * mode): monotonic, ++ per `encode()`, kept across {@link reset}. `0` in
   * reliable mode (which sequences inputs implicitly by message count). The
   * client keys its reconciliation replay ring by this so the server's
   * seq-value ack lines up across packet loss.
   */
  get seq() {
    return this._seq;
  }
  /**
   * Encode the bound instance's delta. Returns a subarray of an internal
   * buffer — copy if retaining across calls.
   *
   * Output shape by mode:
   * - `reliable`: only changed fields, or empty when nothing changed.
   * - `unreliable`: ring of the last `historySize` deltas, length-framed
   *   per slot. A no-change tick pushes an empty (carry-forward) slot but
   *   still re-emits the ring. Empty only until the first slot is pushed.
   *
   * Buffers auto-grow on overflow; a one-time `console.warn` is
   * emitted the first time it happens.
   */
  encode() {
    const blob = this._produceDelta();
    return this.mode === "reliable" ? blob : this._pushAndEmitRing(blob);
  }
  /**
   * Reset the encoder's internal state:
   * - Drops the unreliable ring buffer.
   * - Re-marks every currently populated field as dirty, so the next
   *   `encode()` emits a fresh full snapshot.
   *
   * Useful on disconnect / reconnect / scene transitions.
   */
  reset() {
    this._slotHead = 0;
    this._slotCount = 0;
    this._encoder.discardChanges();
    const tree = this.instance[$changes];
    const values = this.instance[$values];
    for (let i = 0; i <= this._numFields; i++) {
      if (values[i] === void 0 || values[i] === null)
        continue;
      tree.markDirty(i);
    }
  }
  /**
   * Copy the bound instance's field values into `target` (a same-type instance)
   * in place — no allocation, no `Object.keys` (cf. `Schema#assign`) and no
   * `clone()`. For buffering a snapshot of the just-sent input into a reused
   * slot (e.g. a client reconciliation/replay ring) without the transport
   * having to reach into schema internals. The codec owns this because it owns
   * the field representation. The in-place / alloc-free cousin of `clone()`,
   * and the inverse direction of `Schema#assign(source)`.
   */
  copyInto(target2) {
    const src2 = this.instance[$values];
    const dst = target2[$values];
    for (let i = 0; i <= this._numFields; i++)
      dst[i] = src2[i];
  }
  // ────────────────────────────────────────────────────────────────────
  // Delta producer — one diff of the instance; caller routes by mode.
  // ────────────────────────────────────────────────────────────────────
  /** Delegate to the wrapped Encoder, then clear its dirty set. */
  _produceDelta() {
    const bytes = this._encoder.encode();
    this._encoder.discardChanges();
    return bytes;
  }
  // ────────────────────────────────────────────────────────────────────
  // Ring — push blob to current slot, concat oldest→newest, return framed packet.
  // ────────────────────────────────────────────────────────────────────
  _pushAndEmitRing(blob) {
    this._seq++;
    let slot = this._slots[this._slotHead];
    if (blob.length > slot.byteLength) {
      slot = this._slots[this._slotHead] = _InputEncoder._grow(slot, blob.length, "unreliable ring slot");
    }
    slot.set(blob);
    this._slotLens[this._slotHead] = blob.length;
    this._slotHead = (this._slotHead + 1) % this.historySize;
    if (this._slotCount < this.historySize)
      this._slotCount++;
    return this._emitRing();
  }
  _emitRing() {
    const baseSeq = this._seq - this._slotCount + 1;
    let needed = LENGTH_PREFIX_WORST_CASE;
    for (let i = 0; i < this._slotCount; i++) {
      needed += this._slotLens[i] + LENGTH_PREFIX_WORST_CASE;
    }
    let out = this._outBuffer;
    if (needed > out.byteLength) {
      out = this._outBuffer = _InputEncoder._grow(out, needed, "unreliable output packet");
    }
    const outIt = { offset: 0 };
    encode.number(out, baseSeq, outIt);
    const oldest = (this._slotHead - this._slotCount + this.historySize) % this.historySize;
    for (let i = 0; i < this._slotCount; i++) {
      const idx = (oldest + i) % this.historySize;
      const len = this._slotLens[idx];
      encode.number(out, len, outIt);
      out.set(this._slots[idx].subarray(0, len), outIt.offset);
      outIt.offset += len;
    }
    return out.subarray(0, outIt.offset);
  }
  // ────────────────────────────────────────────────────────────────────
  // Buffer growth. Writes past `byteLength` silently drop but `it.offset` still advances, so callers detect overflow via `offset > byteLength` and re-encode into the grown buffer.
  // ────────────────────────────────────────────────────────────────────
  static _warned = false;
  static _grow(buf, needed, where) {
    const newSize = Math.max(needed, buf.byteLength * 2);
    if (!_InputEncoder._warned) {
      _InputEncoder._warned = true;
      console.warn(`@colyseus/schema/input: InputEncoder buffer overflow in ${where}. Growing to ${newSize} bytes.`);
    }
    return new Uint8Array(newSize);
  }
};

// node_modules/@colyseus/sdk/build/input/RoomInput.mjs
var RoomInput = class {
  #room;
  // Impl type (not the public interface) so the TIMED decode can feed it the
  // server ack via the internal `ackInput()`.
  #handle;
  // First-call context, kept only to diagnose later room.input(options) calls
  // whose options are ignored (the handle is created once — first call wins).
  #options;
  #encoder;
  #warnedIgnoredOptions = false;
  /**
   * Schema constructor recovered via Reflection from the server's handshake
   * (the `INPUT_REFLECTION` tagged section). Falls back to `undefined` when
   * the server room didn't call `defineInput()`.
   *
   * Typed as `new () => any` (not `Schema`) on purpose — pinning to this
   * SDK's Schema type would clash with user instances coming from a
   * different copy of `@colyseus/schema` under multi-version installs.
   */
  #ctorFromReflection;
  /** `true` when the handshake advertised the SNAPSHOT-timeline stamp
   *  (`INPUT_OPTIONS`, `InputFlags.RENDER_TIME`). */
  #stampRender = false;
  /** `true` when the handshake advertised the RECKON-timeline stamp
   *  (`INPUT_OPTIONS`, `InputFlags.RECKON_TIME`). Set together with
   *  {@link #stampRender} ⇒ the 6-byte `[reckonTime][renderDelta]` prefix. */
  #stampReckon = false;
  /** Server-advertised fixed simulation/input step rate (Hz) from
   *  `defineInput({ tickRate })`. */
  #tickRate;
  /** Server-advertised state-patch interval (ms) = the reconcile cadence. */
  #patchRate;
  /** Server-advertised physics sub-steps per input tick
   *  (`setFixedTimestep(..., { subSteps })`). */
  #subSteps;
  constructor(room) {
    this.#room = room;
  }
  /** Snapshot cadence (ms), so {@link Room} can feed `clock.setPatchInterval`. */
  get patchRate() {
    return this.#patchRate;
  }
  /**
   * Decode the `INPUT_REFLECTION` handshake section: install schema-builder
   * field descriptors on the reconstructed class so {@link InputEncoder} can
   * read its `$values` and emit non-empty packets, then cache the ctor.
   *
   * INPUT_REFLECTION is also the signal that the server called `defineInput()`
   * and will emit TIMED-prefixed state messages — so swap the default stub
   * clock for a real {@link RoomClockImpl} unless the user already replaced
   * `room.clock` with their own. Advances `it`.
   */
  applyReflection(buffer, it, sectionEnd) {
    const inputDecoder = Reflection.decode(buffer.subarray(0, sectionEnd), it);
    Reflection.makeEncodable(inputDecoder.state.constructor);
    this.#ctorFromReflection = inputDecoder.state.constructor;
    if (this.#room.clock === NULL_CLOCK)
      this.#room.clock = new RoomClockImpl();
  }
  /**
   * Decode the `INPUT_OPTIONS` handshake section.
   * `[flags uint8][tickRate varint?][patchRate varint?][subSteps varint?]`,
   * varints in bit order. Advances `it`.
   */
  applyOptions(buffer, it) {
    const flags = buffer[it.offset++];
    this.#stampRender = (flags & InputFlags.RENDER_TIME) !== 0;
    this.#stampReckon = (flags & InputFlags.RECKON_TIME) !== 0;
    if (flags & InputFlags.FIXED_TIMESTEP)
      this.#tickRate = decode.number(buffer, it);
    if (flags & InputFlags.PATCH_RATE)
      this.#patchRate = decode.number(buffer, it);
    if (flags & InputFlags.SUB_STEPS)
      this.#subSteps = decode.number(buffer, it);
  }
  /** Feed the server's last-processed input seq to the handle; returns the RTT
   *  sample (or `-1` before the handle exists / when the seq aged out). */
  ackInput(inputSeq) {
    return this.#handle ? this.#handle.ackInput(inputSeq) : -1;
  }
  /** Reset the input round-trip on reconnect (see {@link Room} reconnection). */
  reset() {
    this.#handle?.reset();
  }
  /**
   * Lazily create and cache the per-room {@link InputHandle}; subsequent calls
   * return the same handle (options on later calls are ignored — a warning
   * fires once if they differ from the constructed handle's). Backs
   * `room.input(...)` — see that method for the full discovery/usage docs.
   */
  handle(options) {
    if (this.#handle) {
      if (options !== void 0)
        this.#warnIfIgnored(options);
      return this.#handle;
    }
    const Ctor = options?.type ?? this.#ctorFromReflection;
    if (!Ctor) {
      throw new Error("room.input(): no input schema available. The server room must call `defineInput(YourInput)`, or you can pass `{ type: YourInput }` explicitly.");
    }
    const instance = new Ctor();
    const encoder = new InputEncoder(instance, options);
    this.#handle = new InputHandleImpl(this.#room, instance, encoder, {
      stampRender: this.#stampRender,
      stampReckon: this.#stampReckon,
      renderDelay: options?.renderDelay,
      allowRewind: options?.allowRewind,
      // app gate: skip the stamp on inputs the server won't rewind
      tickRate: this.#tickRate,
      patchRate: this.#patchRate,
      subSteps: this.#subSteps
    });
    this.#options = options;
    this.#encoder = encoder;
    return this.#handle;
  }
  /** Warn (once) when a later `room.input(options)` call would have produced a
   *  different handle — those options are silently ignored (first call wins),
   *  which is invisible without this. Value fields compare against the RESOLVED
   *  config (ctor/mode/historySize), not the first call's raw options, so a
   *  textually identical second call stays silent. */
  #warnIfIgnored(later) {
    if (this.#warnedIgnoredOptions)
      return;
    const handle = this.#handle;
    const diffs = [];
    if (later.type !== void 0 && later.type !== handle.data?.constructor)
      diffs.push("type");
    if (later.mode !== void 0 && later.mode !== handle.mode)
      diffs.push("mode");
    if (later.historySize !== void 0 && handle.mode === "unreliable" && later.historySize !== this.#encoder.historySize)
      diffs.push("historySize");
    if (later.renderDelay !== void 0 && later.renderDelay !== this.#options?.renderDelay)
      diffs.push("renderDelay");
    if (later.allowRewind !== void 0 !== (this.#options?.allowRewind !== void 0))
      diffs.push("allowRewind");
    if (diffs.length === 0)
      return;
    this.#warnedIgnoredOptions = true;
    console.warn(`@colyseus/sdk: room.input() options ignored \u2014 the input handle was already created by an earlier call (first call wins). Differing: ${diffs.join(", ")}.`);
  }
};

// node_modules/msgpackr/unpack.js
var decoder;
try {
  decoder = new TextDecoder();
} catch (error) {
}
var src;
var srcEnd;
var position = 0;
var EMPTY_ARRAY = [];
var strings = EMPTY_ARRAY;
var stringPosition = 0;
var currentUnpackr = {};
var currentStructures;
var srcString;
var srcStringStart = 0;
var srcStringEnd = 0;
var bundledStrings;
var referenceMap;
var currentExtensions = [];
var dataView;
var defaultOptions = {
  useRecords: false,
  mapsAsObjects: true
};
var C1Type = class {
};
var C1 = new C1Type();
C1.name = "MessagePack 0xC1";
var sequentialMode = false;
var inlineObjectReadThreshold = 2;
var Unpackr = class _Unpackr {
  constructor(options) {
    if (options) {
      if (options.useRecords === false && options.mapsAsObjects === void 0)
        options.mapsAsObjects = true;
      if (options.sequential && options.trusted !== false) {
        options.trusted = true;
        if (!options.structures && options.useRecords != false) {
          options.structures = [];
          if (!options.maxSharedStructures)
            options.maxSharedStructures = 0;
        }
      }
      if (options.structures)
        options.structures.sharedLength = options.structures.length;
      else if (options.getStructures) {
        (options.structures = []).uninitialized = true;
        options.structures.sharedLength = 0;
      }
      if (options.int64AsNumber) {
        options.int64AsType = "number";
      }
    }
    Object.assign(this, options);
  }
  unpack(source, options) {
    if (src) {
      return saveState(() => {
        clearSource();
        return this ? this.unpack(source, options) : _Unpackr.prototype.unpack.call(defaultOptions, source, options);
      });
    }
    if (!source.buffer && source.constructor === ArrayBuffer)
      source = typeof Buffer !== "undefined" ? Buffer.from(source) : new Uint8Array(source);
    if (typeof options === "object") {
      srcEnd = options.end || source.length;
      position = options.start || 0;
    } else {
      position = 0;
      srcEnd = options > -1 ? options : source.length;
    }
    stringPosition = 0;
    srcStringEnd = 0;
    srcString = null;
    strings = EMPTY_ARRAY;
    bundledStrings = null;
    src = source;
    try {
      dataView = source.dataView || (source.dataView = new DataView(source.buffer, source.byteOffset, source.byteLength));
    } catch (error) {
      src = null;
      if (source instanceof Uint8Array)
        throw error;
      throw new Error("Source must be a Uint8Array or Buffer but was a " + (source && typeof source == "object" ? source.constructor.name : typeof source));
    }
    if (this instanceof _Unpackr) {
      currentUnpackr = this;
      if (this.structures) {
        currentStructures = this.structures;
        return checkedRead(options);
      } else if (!currentStructures || currentStructures.length > 0) {
        currentStructures = [];
      }
    } else {
      currentUnpackr = defaultOptions;
      if (!currentStructures || currentStructures.length > 0)
        currentStructures = [];
    }
    return checkedRead(options);
  }
  unpackMultiple(source, forEach) {
    let values, lastPosition = 0;
    try {
      sequentialMode = true;
      let size = source.length;
      let value = this ? this.unpack(source, size) : defaultUnpackr.unpack(source, size);
      if (forEach) {
        if (forEach(value, lastPosition, position) === false) return;
        while (position < size) {
          lastPosition = position;
          if (forEach(checkedRead(), lastPosition, position) === false) {
            return;
          }
        }
      } else {
        values = [value];
        while (position < size) {
          lastPosition = position;
          values.push(checkedRead());
        }
        return values;
      }
    } catch (error) {
      error.lastPosition = lastPosition;
      error.values = values;
      throw error;
    } finally {
      sequentialMode = false;
      clearSource();
    }
  }
  _mergeStructures(loadedStructures, existingStructures) {
    if (this._onLoadedStructures)
      loadedStructures = this._onLoadedStructures(loadedStructures);
    loadedStructures = loadedStructures || [];
    if (Object.isFrozen(loadedStructures))
      loadedStructures = loadedStructures.map((structure) => structure.slice(0));
    for (let i = 0, l = loadedStructures.length; i < l; i++) {
      let structure = loadedStructures[i];
      if (structure) {
        structure.isShared = true;
        if (i >= 32)
          structure.highByte = i - 32 >> 5;
      }
    }
    loadedStructures.sharedLength = loadedStructures.length;
    for (let id in existingStructures || []) {
      if (id >= 0) {
        let structure = loadedStructures[id];
        let existing = existingStructures[id];
        if (existing) {
          if (structure)
            (loadedStructures.restoreStructures || (loadedStructures.restoreStructures = []))[id] = structure;
          loadedStructures[id] = existing;
        }
      }
    }
    return this.structures = loadedStructures;
  }
  decode(source, options) {
    return this.unpack(source, options);
  }
};
function checkedRead(options) {
  try {
    if (!currentUnpackr.trusted && !sequentialMode) {
      let sharedLength = currentStructures.sharedLength || 0;
      if (sharedLength < currentStructures.length)
        currentStructures.length = sharedLength;
    }
    let result;
    if (currentUnpackr._readStruct && src[position] < 64 && src[position] >= 32) {
      result = currentUnpackr._readStruct(src, position, srcEnd);
      src = null;
      if (!(options && options.lazy) && result)
        result = result.toJSON();
      position = srcEnd;
    } else
      result = read();
    if (bundledStrings) {
      position = bundledStrings.postBundlePosition;
      bundledStrings = null;
    }
    if (sequentialMode)
      currentStructures.restoreStructures = null;
    if (position == srcEnd) {
      if (currentStructures && currentStructures.restoreStructures)
        restoreStructures();
      currentStructures = null;
      src = null;
      if (referenceMap)
        referenceMap = null;
    } else if (position > srcEnd) {
      throw new Error("Unexpected end of MessagePack data");
    } else if (!sequentialMode) {
      let jsonView;
      try {
        jsonView = JSON.stringify(result, (_, value) => typeof value === "bigint" ? `${value}n` : value).slice(0, 100);
      } catch (error) {
        jsonView = "(JSON view not available " + error + ")";
      }
      throw new Error("Data read, but end of buffer not reached " + jsonView);
    }
    return result;
  } catch (error) {
    if (currentStructures && currentStructures.restoreStructures)
      restoreStructures();
    clearSource();
    if (error instanceof RangeError || error.message.startsWith("Unexpected end of buffer") || position > srcEnd) {
      error.incomplete = true;
    }
    throw error;
  }
}
function restoreStructures() {
  for (let id in currentStructures.restoreStructures) {
    currentStructures[id] = currentStructures.restoreStructures[id];
  }
  currentStructures.restoreStructures = null;
}
function read() {
  let token = src[position++];
  if (token < 160) {
    if (token < 128) {
      if (token < 64)
        return token;
      else {
        let structure = currentStructures[token & 63] || currentUnpackr.getStructures && loadStructures()[token & 63];
        if (structure) {
          if (!structure.read) {
            structure.read = createStructureReader(structure, token & 63);
          }
          return structure.read();
        } else
          return token;
      }
    } else if (token < 144) {
      token -= 128;
      if (currentUnpackr.mapsAsObjects) {
        let object = {};
        for (let i = 0; i < token; i++) {
          let key = readKey();
          if (key === "__proto__")
            key = "__proto_";
          object[key] = read();
        }
        return object;
      } else {
        let map = /* @__PURE__ */ new Map();
        for (let i = 0; i < token; i++) {
          map.set(read(), read());
        }
        return map;
      }
    } else {
      token -= 144;
      let array = new Array(token);
      for (let i = 0; i < token; i++) {
        array[i] = read();
      }
      if (currentUnpackr.freezeData)
        return Object.freeze(array);
      return array;
    }
  } else if (token < 192) {
    let length = token - 160;
    if (srcStringEnd >= position) {
      return srcString.slice(position - srcStringStart, (position += length) - srcStringStart);
    }
    if (srcStringEnd == 0 && srcEnd < 140) {
      let string = length < 16 ? shortStringInJS(length) : longStringInJS(length);
      if (string != null)
        return string;
    }
    return readFixedString(length);
  } else {
    let value;
    switch (token) {
      case 192:
        return null;
      case 193:
        if (bundledStrings) {
          value = read();
          if (value > 0)
            return bundledStrings[1].slice(bundledStrings.position1, bundledStrings.position1 += value);
          else
            return bundledStrings[0].slice(bundledStrings.position0, bundledStrings.position0 -= value);
        }
        return C1;
      // "never-used", return special object to denote that
      case 194:
        return false;
      case 195:
        return true;
      case 196:
        value = src[position++];
        if (value === void 0)
          throw new Error("Unexpected end of buffer");
        return readBin(value);
      case 197:
        value = dataView.getUint16(position);
        position += 2;
        return readBin(value);
      case 198:
        value = dataView.getUint32(position);
        position += 4;
        return readBin(value);
      case 199:
        return readExt(src[position++]);
      case 200:
        value = dataView.getUint16(position);
        position += 2;
        return readExt(value);
      case 201:
        value = dataView.getUint32(position);
        position += 4;
        return readExt(value);
      case 202:
        value = dataView.getFloat32(position);
        if (currentUnpackr.useFloat32 > 2) {
          let multiplier = mult10[(src[position] & 127) << 1 | src[position + 1] >> 7];
          position += 4;
          return (multiplier * value + (value > 0 ? 0.5 : -0.5) >> 0) / multiplier;
        }
        position += 4;
        return value;
      case 203:
        value = dataView.getFloat64(position);
        position += 8;
        return value;
      // uint handlers
      case 204:
        return src[position++];
      case 205:
        value = dataView.getUint16(position);
        position += 2;
        return value;
      case 206:
        value = dataView.getUint32(position);
        position += 4;
        return value;
      case 207:
        if (currentUnpackr.int64AsType === "number") {
          value = dataView.getUint32(position) * 4294967296;
          value += dataView.getUint32(position + 4);
        } else if (currentUnpackr.int64AsType === "string") {
          value = dataView.getBigUint64(position).toString();
        } else if (currentUnpackr.int64AsType === "auto") {
          value = dataView.getBigUint64(position);
          if (value <= BigInt(2) << BigInt(52)) value = Number(value);
        } else
          value = dataView.getBigUint64(position);
        position += 8;
        return value;
      // int handlers
      case 208:
        return dataView.getInt8(position++);
      case 209:
        value = dataView.getInt16(position);
        position += 2;
        return value;
      case 210:
        value = dataView.getInt32(position);
        position += 4;
        return value;
      case 211:
        if (currentUnpackr.int64AsType === "number") {
          value = dataView.getInt32(position) * 4294967296;
          value += dataView.getUint32(position + 4);
        } else if (currentUnpackr.int64AsType === "string") {
          value = dataView.getBigInt64(position).toString();
        } else if (currentUnpackr.int64AsType === "auto") {
          value = dataView.getBigInt64(position);
          if (value >= BigInt(-2) << BigInt(52) && value <= BigInt(2) << BigInt(52)) value = Number(value);
        } else
          value = dataView.getBigInt64(position);
        position += 8;
        return value;
      case 212:
        value = src[position++];
        if (value == 114) {
          return recordDefinition(src[position++] & 63);
        } else {
          let extension = currentExtensions[value];
          if (extension) {
            if (extension.read) {
              position++;
              return extension.read(read());
            } else if (extension.noBuffer) {
              position++;
              return extension();
            } else
              return extension(src.subarray(position, ++position));
          } else
            throw new Error("Unknown extension " + value);
        }
      case 213:
        value = src[position];
        if (value == 114) {
          position++;
          return recordDefinition(src[position++] & 63, src[position++]);
        } else
          return readExt(2);
      case 214:
        return readExt(4);
      case 215:
        return readExt(8);
      case 216:
        return readExt(16);
      case 217:
        value = src[position++];
        if (srcStringEnd >= position) {
          return srcString.slice(position - srcStringStart, (position += value) - srcStringStart);
        }
        return readString8(value);
      case 218:
        value = dataView.getUint16(position);
        position += 2;
        if (srcStringEnd >= position) {
          return srcString.slice(position - srcStringStart, (position += value) - srcStringStart);
        }
        return readString16(value);
      case 219:
        value = dataView.getUint32(position);
        position += 4;
        if (srcStringEnd >= position) {
          return srcString.slice(position - srcStringStart, (position += value) - srcStringStart);
        }
        return readString32(value);
      case 220:
        value = dataView.getUint16(position);
        position += 2;
        return readArray(value);
      case 221:
        value = dataView.getUint32(position);
        position += 4;
        return readArray(value);
      case 222:
        value = dataView.getUint16(position);
        position += 2;
        return readMap(value);
      case 223:
        value = dataView.getUint32(position);
        position += 4;
        return readMap(value);
      default:
        if (token >= 224)
          return token - 256;
        if (token === void 0) throw endOfMessagePackError();
        throw new Error("Unknown MessagePack token " + token);
    }
  }
}
var validName = /^[a-zA-Z_$][a-zA-Z\d_$]*$/;
function createStructureReader(structure, firstId) {
  function readObject() {
    if (readObject.count++ > inlineObjectReadThreshold) {
      let optimizedReadObject;
      try {
        optimizedReadObject = structure.read = new Function("r", "return function(){return " + (currentUnpackr.freezeData ? "Object.freeze" : "") + "({" + structure.map((key) => key === "__proto__" ? "__proto_:r()" : validName.test(key) ? key + ":r()" : "[" + JSON.stringify(key) + "]:r()").join(",") + "})}")(read);
      } catch (error) {
        inlineObjectReadThreshold = Infinity;
        return readObject();
      }
      structure.read0 = optimizedReadObject;
      if (structure.highByte === 0)
        structure.read = createSecondByteReader(firstId, structure.read);
      return optimizedReadObject();
    }
    let object = {};
    for (let i = 0, l = structure.length; i < l; i++) {
      let key = structure[i];
      if (key === "__proto__")
        key = "__proto_";
      object[key] = read();
    }
    if (currentUnpackr.freezeData)
      return Object.freeze(object);
    return object;
  }
  readObject.count = 0;
  structure.read0 = readObject;
  if (structure.highByte === 0) {
    return createSecondByteReader(firstId, readObject);
  }
  return readObject;
}
var createSecondByteReader = (firstId, read0) => {
  return function() {
    let highByte = src[position++];
    if (highByte === 0)
      return read0();
    let id = firstId < 32 ? -(firstId + (highByte << 5)) : firstId + (highByte << 5);
    let structure = currentStructures[id] || loadStructures()[id];
    if (!structure) {
      throw new Error("Record id is not defined for " + id);
    }
    if (!structure.read)
      structure.read = createStructureReader(structure, firstId);
    return structure.read();
  };
};
function loadStructures() {
  let loadedStructures = saveState(() => {
    src = null;
    return currentUnpackr.getStructures();
  });
  return currentStructures = currentUnpackr._mergeStructures(loadedStructures, currentStructures);
}
var readFixedString = readStringJS;
var readString8 = readStringJS;
var readString16 = readStringJS;
var readString32 = readStringJS;
function readStringJS(length) {
  let result;
  if (length < 16) {
    if (result = shortStringInJS(length))
      return result;
  }
  if (length > 64 && decoder)
    return decoder.decode(src.subarray(position, position += length));
  const end = position + length;
  const units = [];
  result = "";
  while (position < end) {
    const byte1 = src[position++];
    if ((byte1 & 128) === 0) {
      units.push(byte1);
    } else if ((byte1 & 224) === 192) {
      if (byte1 < 194 || position >= end || (src[position] & 192) !== 128) {
        units.push(65533);
      } else {
        const byte2 = src[position++] & 63;
        units.push((byte1 & 31) << 6 | byte2);
      }
    } else if ((byte1 & 240) === 224) {
      const byte2 = position < end ? src[position] : 0;
      if (position >= end || (byte2 & 192) !== 128 || byte1 === 224 && byte2 < 160 || byte1 === 237 && byte2 >= 160) {
        units.push(65533);
      } else {
        position++;
        if (position >= end || (src[position] & 192) !== 128) {
          units.push(65533);
        } else {
          const byte3 = src[position++] & 63;
          units.push((byte1 & 31) << 12 | (byte2 & 63) << 6 | byte3);
        }
      }
    } else if ((byte1 & 248) === 240) {
      const byte2 = position < end ? src[position] : 0;
      if (byte1 > 244 || position >= end || (byte2 & 192) !== 128 || byte1 === 240 && byte2 < 144 || byte1 === 244 && byte2 >= 144) {
        units.push(65533);
      } else {
        position++;
        if (position >= end || (src[position] & 192) !== 128) {
          units.push(65533);
        } else {
          const byte3 = src[position++] & 63;
          if (position >= end || (src[position] & 192) !== 128) {
            units.push(65533);
          } else {
            const byte4 = src[position++] & 63;
            let unit = (byte1 & 7) << 18 | (byte2 & 63) << 12 | byte3 << 6 | byte4;
            unit -= 65536;
            units.push(unit >>> 10 & 1023 | 55296);
            units.push(56320 | unit & 1023);
          }
        }
      }
    } else {
      units.push(65533);
    }
    if (units.length >= 4096) {
      result += fromCharCode.apply(String, units);
      units.length = 0;
    }
  }
  if (units.length > 0) {
    result += fromCharCode.apply(String, units);
  }
  return result;
}
function endOfMessagePackError() {
  let error = new Error("Unexpected end of MessagePack data");
  error.incomplete = true;
  return error;
}
function readArray(length) {
  if (length > srcEnd - position) throw endOfMessagePackError();
  let array = new Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = read();
  }
  if (currentUnpackr.freezeData)
    return Object.freeze(array);
  return array;
}
function readMap(length) {
  if (length > (srcEnd - position) / 2) throw endOfMessagePackError();
  if (currentUnpackr.mapsAsObjects) {
    let object = {};
    for (let i = 0; i < length; i++) {
      let key = readKey();
      if (key === "__proto__")
        key = "__proto_";
      object[key] = read();
    }
    return object;
  } else {
    let map = /* @__PURE__ */ new Map();
    for (let i = 0; i < length; i++) {
      map.set(read(), read());
    }
    return map;
  }
}
var fromCharCode = String.fromCharCode;
function longStringInJS(length) {
  let start = position;
  let bytes = new Array(length);
  for (let i = 0; i < length; i++) {
    const byte = src[position++];
    if ((byte & 128) > 0) {
      position = start;
      return;
    }
    bytes[i] = byte;
  }
  return fromCharCode.apply(String, bytes);
}
function shortStringInJS(length) {
  if (length < 4) {
    if (length < 2) {
      if (length === 0)
        return "";
      else {
        let a = src[position++];
        if ((a & 128) > 1) {
          position -= 1;
          return;
        }
        return fromCharCode(a);
      }
    } else {
      let a = src[position++];
      let b = src[position++];
      if ((a & 128) > 0 || (b & 128) > 0) {
        position -= 2;
        return;
      }
      if (length < 3)
        return fromCharCode(a, b);
      let c = src[position++];
      if ((c & 128) > 0) {
        position -= 3;
        return;
      }
      return fromCharCode(a, b, c);
    }
  } else {
    let a = src[position++];
    let b = src[position++];
    let c = src[position++];
    let d = src[position++];
    if ((a & 128) > 0 || (b & 128) > 0 || (c & 128) > 0 || (d & 128) > 0) {
      position -= 4;
      return;
    }
    if (length < 6) {
      if (length === 4)
        return fromCharCode(a, b, c, d);
      else {
        let e = src[position++];
        if ((e & 128) > 0) {
          position -= 5;
          return;
        }
        return fromCharCode(a, b, c, d, e);
      }
    } else if (length < 8) {
      let e = src[position++];
      let f = src[position++];
      if ((e & 128) > 0 || (f & 128) > 0) {
        position -= 6;
        return;
      }
      if (length < 7)
        return fromCharCode(a, b, c, d, e, f);
      let g = src[position++];
      if ((g & 128) > 0) {
        position -= 7;
        return;
      }
      return fromCharCode(a, b, c, d, e, f, g);
    } else {
      let e = src[position++];
      let f = src[position++];
      let g = src[position++];
      let h = src[position++];
      if ((e & 128) > 0 || (f & 128) > 0 || (g & 128) > 0 || (h & 128) > 0) {
        position -= 8;
        return;
      }
      if (length < 10) {
        if (length === 8)
          return fromCharCode(a, b, c, d, e, f, g, h);
        else {
          let i = src[position++];
          if ((i & 128) > 0) {
            position -= 9;
            return;
          }
          return fromCharCode(a, b, c, d, e, f, g, h, i);
        }
      } else if (length < 12) {
        let i = src[position++];
        let j = src[position++];
        if ((i & 128) > 0 || (j & 128) > 0) {
          position -= 10;
          return;
        }
        if (length < 11)
          return fromCharCode(a, b, c, d, e, f, g, h, i, j);
        let k = src[position++];
        if ((k & 128) > 0) {
          position -= 11;
          return;
        }
        return fromCharCode(a, b, c, d, e, f, g, h, i, j, k);
      } else {
        let i = src[position++];
        let j = src[position++];
        let k = src[position++];
        let l = src[position++];
        if ((i & 128) > 0 || (j & 128) > 0 || (k & 128) > 0 || (l & 128) > 0) {
          position -= 12;
          return;
        }
        if (length < 14) {
          if (length === 12)
            return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l);
          else {
            let m = src[position++];
            if ((m & 128) > 0) {
              position -= 13;
              return;
            }
            return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m);
          }
        } else {
          let m = src[position++];
          let n = src[position++];
          if ((m & 128) > 0 || (n & 128) > 0) {
            position -= 14;
            return;
          }
          if (length < 15)
            return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n);
          let o = src[position++];
          if ((o & 128) > 0) {
            position -= 15;
            return;
          }
          return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
        }
      }
    }
  }
}
function readOnlyJSString() {
  let token = src[position++];
  let length;
  if (token < 192) {
    length = token - 160;
  } else {
    switch (token) {
      case 217:
        length = src[position++];
        break;
      case 218:
        length = dataView.getUint16(position);
        position += 2;
        break;
      case 219:
        length = dataView.getUint32(position);
        position += 4;
        break;
      default:
        throw new Error("Expected string");
    }
  }
  return readStringJS(length);
}
function readBin(length) {
  return currentUnpackr.copyBuffers ? (
    // specifically use the copying slice (not the node one)
    Uint8Array.prototype.slice.call(src, position, position += length)
  ) : src.subarray(position, position += length);
}
function readExt(length) {
  let type = src[position++];
  if (currentExtensions[type]) {
    let end;
    return currentExtensions[type](src.subarray(position, end = position += length), (readPosition) => {
      position = readPosition;
      try {
        return read();
      } finally {
        position = end;
      }
    });
  } else
    throw new Error("Unknown extension type " + type);
}
var keyCache = new Array(4096);
function readKey() {
  let length = src[position++];
  if (length >= 160 && length < 192) {
    length = length - 160;
    if (srcStringEnd >= position)
      return srcString.slice(position - srcStringStart, (position += length) - srcStringStart);
    else if (!(srcStringEnd == 0 && srcEnd < 180))
      return readFixedString(length);
  } else {
    position--;
    return asSafeString(read());
  }
  let key = (length << 5 ^ (length > 1 ? dataView.getUint16(position) : length > 0 ? src[position] : 0)) & 4095;
  let entry = keyCache[key];
  let checkPosition = position;
  let end = position + length - 3;
  let chunk;
  let i = 0;
  if (entry && entry.bytes == length) {
    while (checkPosition < end) {
      chunk = dataView.getUint32(checkPosition);
      if (chunk != entry[i++]) {
        checkPosition = 1879048192;
        break;
      }
      checkPosition += 4;
    }
    end += 3;
    while (checkPosition < end) {
      chunk = src[checkPosition++];
      if (chunk != entry[i++]) {
        checkPosition = 1879048192;
        break;
      }
    }
    if (checkPosition === end) {
      position = checkPosition;
      return entry.string;
    }
    end -= 3;
    checkPosition = position;
  }
  entry = [];
  keyCache[key] = entry;
  entry.bytes = length;
  while (checkPosition < end) {
    chunk = dataView.getUint32(checkPosition);
    entry.push(chunk);
    checkPosition += 4;
  }
  end += 3;
  while (checkPosition < end) {
    chunk = src[checkPosition++];
    entry.push(chunk);
  }
  let string = length < 16 ? shortStringInJS(length) : longStringInJS(length);
  if (string != null)
    return entry.string = string;
  return entry.string = readFixedString(length);
}
function asSafeString(property) {
  if (typeof property === "string") return property;
  if (typeof property === "number" || typeof property === "boolean" || typeof property === "bigint") return property.toString();
  if (property == null) return property + "";
  if (currentUnpackr.allowArraysInMapKeys && Array.isArray(property) && property.flat().every((item) => ["string", "number", "boolean", "bigint"].includes(typeof item))) {
    return property.flat().toString();
  }
  throw new Error(`Invalid property type for record: ${typeof property}`);
}
var recordDefinition = (id, highByte) => {
  let structure = read().map(asSafeString);
  let firstByte = id;
  if (highByte !== void 0) {
    id = id < 32 ? -((highByte << 5) + id) : (highByte << 5) + id;
    structure.highByte = highByte;
  }
  let existingStructure = currentStructures[id];
  if (existingStructure && (existingStructure.isShared || sequentialMode)) {
    (currentStructures.restoreStructures || (currentStructures.restoreStructures = []))[id] = existingStructure;
  }
  currentStructures[id] = structure;
  structure.read = createStructureReader(structure, firstByte);
  return (structure.read0 || structure.read)();
};
currentExtensions[0] = () => {
};
currentExtensions[0].noBuffer = true;
currentExtensions[66] = (data) => {
  let headLength = data.byteLength % 8 || 8;
  let head = BigInt(data[0] & 128 ? data[0] - 256 : data[0]);
  for (let i = 1; i < headLength; i++) {
    head <<= BigInt(8);
    head += BigInt(data[i]);
  }
  if (data.byteLength !== headLength) {
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let decode3 = (start, end) => {
      let length = end - start;
      if (length <= 40) {
        let out = view.getBigUint64(start);
        for (let i = start + 8; i < end; i += 8) {
          out <<= BigInt(64);
          out |= view.getBigUint64(i);
        }
        return out;
      }
      let middle = start + (length >> 4 << 3);
      let left = decode3(start, middle);
      let right = decode3(middle, end);
      return left << BigInt((end - middle) * 8) | right;
    };
    head = head << BigInt((view.byteLength - headLength) * 8) | decode3(headLength, view.byteLength);
  }
  return head;
};
var errors = {
  Error,
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,
  AggregateError: typeof AggregateError === "function" ? AggregateError : null
};
currentExtensions[101] = () => {
  let data = read();
  if (!errors[data[0]]) {
    let error = Error(data[1], { cause: data[2] });
    error.name = data[0];
    return error;
  }
  return errors[data[0]](data[1], { cause: data[2] });
};
currentExtensions[105] = (data) => {
  if (currentUnpackr.structuredClone === false) throw new Error("Structured clone extension is disabled");
  let id = dataView.getUint32(position - 4);
  if (!referenceMap)
    referenceMap = /* @__PURE__ */ new Map();
  let token = src[position];
  let target2;
  if (token >= 144 && token < 160 || token == 220 || token == 221)
    target2 = [];
  else if (token >= 128 && token < 144 || token == 222 || token == 223)
    target2 = /* @__PURE__ */ new Map();
  else if ((token >= 199 && token <= 201 || token >= 212 && token <= 216) && src[position + 1] === 115)
    target2 = /* @__PURE__ */ new Set();
  else
    target2 = {};
  let refEntry = { target: target2 };
  referenceMap.set(id, refEntry);
  let targetProperties = read();
  if (!refEntry.used) {
    return refEntry.target = targetProperties;
  } else {
    Object.assign(target2, targetProperties);
  }
  if (target2 instanceof Map)
    for (let [k, v] of targetProperties.entries()) target2.set(k, v);
  if (target2 instanceof Set)
    for (let i of Array.from(targetProperties)) target2.add(i);
  return target2;
};
currentExtensions[112] = (data) => {
  if (currentUnpackr.structuredClone === false) throw new Error("Structured clone extension is disabled");
  let id = dataView.getUint32(position - 4);
  let refEntry = referenceMap.get(id);
  refEntry.used = true;
  return refEntry.target;
};
currentExtensions[115] = () => new Set(read());
var typedArrays = ["Int8", "Uint8", "Uint8Clamped", "Int16", "Uint16", "Int32", "Uint32", "Float32", "Float64", "BigInt64", "BigUint64"].map((type) => type + "Array");
var glbl = typeof globalThis === "object" ? globalThis : window;
currentExtensions[116] = (data) => {
  let typeCode = data[0];
  let buffer = Uint8Array.prototype.slice.call(data, 1).buffer;
  let typedArrayName = typedArrays[typeCode];
  if (!typedArrayName) {
    if (typeCode === 16) return buffer;
    if (typeCode === 17) return new DataView(buffer);
    throw new Error("Could not find typed array for code " + typeCode);
  }
  return new glbl[typedArrayName](buffer);
};
currentExtensions[120] = () => {
  let data = read();
  return new RegExp(data[0], data[1]);
};
var TEMP_BUNDLE = [];
currentExtensions[98] = (data) => {
  let dataSize = (data[0] << 24) + (data[1] << 16) + (data[2] << 8) + data[3];
  let dataPosition = position;
  position += dataSize - data.length;
  bundledStrings = TEMP_BUNDLE;
  bundledStrings = [readOnlyJSString(), readOnlyJSString()];
  bundledStrings.position0 = 0;
  bundledStrings.position1 = 0;
  bundledStrings.postBundlePosition = position;
  position = dataPosition;
  return read();
};
currentExtensions[255] = (data) => {
  if (data.length == 4)
    return new Date((data[0] * 16777216 + (data[1] << 16) + (data[2] << 8) + data[3]) * 1e3);
  else if (data.length == 8)
    return new Date(
      ((data[0] << 22) + (data[1] << 14) + (data[2] << 6) + (data[3] >> 2)) / 1e6 + ((data[3] & 3) * 4294967296 + data[4] * 16777216 + (data[5] << 16) + (data[6] << 8) + data[7]) * 1e3
    );
  else if (data.length == 12)
    return new Date(
      ((data[0] << 24) + (data[1] << 16) + (data[2] << 8) + data[3]) / 1e6 + ((data[4] & 128 ? -281474976710656 : 0) + data[6] * 1099511627776 + data[7] * 4294967296 + data[8] * 16777216 + (data[9] << 16) + (data[10] << 8) + data[11]) * 1e3
    );
  else
    return /* @__PURE__ */ new Date("invalid");
};
function saveState(callback) {
  if (currentUnpackr && currentUnpackr._onSaveState)
    currentUnpackr._onSaveState();
  let savedSrcEnd = srcEnd;
  let savedPosition = position;
  let savedStringPosition = stringPosition;
  let savedSrcStringStart = srcStringStart;
  let savedSrcStringEnd = srcStringEnd;
  let savedSrcString = srcString;
  let savedStrings = strings;
  let savedReferenceMap = referenceMap;
  let savedBundledStrings = bundledStrings;
  let savedSrc = new Uint8Array(src.slice(0, srcEnd));
  let savedStructures = currentStructures;
  let savedStructuresContents = currentStructures.slice(0, currentStructures.length);
  let savedPackr = currentUnpackr;
  let savedSequentialMode = sequentialMode;
  let value = callback();
  srcEnd = savedSrcEnd;
  position = savedPosition;
  stringPosition = savedStringPosition;
  srcStringStart = savedSrcStringStart;
  srcStringEnd = savedSrcStringEnd;
  srcString = savedSrcString;
  strings = savedStrings;
  referenceMap = savedReferenceMap;
  bundledStrings = savedBundledStrings;
  src = savedSrc;
  sequentialMode = savedSequentialMode;
  currentStructures = savedStructures;
  currentStructures.splice(0, currentStructures.length, ...savedStructuresContents);
  currentUnpackr = savedPackr;
  dataView = new DataView(src.buffer, src.byteOffset, src.byteLength);
  return value;
}
function clearSource() {
  src = null;
  referenceMap = null;
  currentStructures = null;
}
var mult10 = new Array(147);
for (let i = 0; i < 256; i++) {
  mult10[i] = +("1e" + Math.floor(45.15 - i * 0.30103));
}
var defaultUnpackr = new Unpackr({ useRecords: false });
var unpack = defaultUnpackr.unpack;
var unpackMultiple = defaultUnpackr.unpackMultiple;
var decode2 = defaultUnpackr.unpack;
var FLOAT32_OPTIONS = {
  NEVER: 0,
  ALWAYS: 1,
  DECIMAL_ROUND: 3,
  DECIMAL_FIT: 4
};
var f32Array = new Float32Array(1);
var u8Array = new Uint8Array(f32Array.buffer, 0, 4);
Unpackr.SUPPORTS_STRUCT_HOOKS = true;

// node_modules/msgpackr/pack.js
var textEncoder;
try {
  textEncoder = new TextEncoder();
} catch (error) {
}
var extensions;
var extensionClasses;
var hasNodeBuffer = typeof Buffer !== "undefined";
var ByteArrayAllocate = hasNodeBuffer ? function(length) {
  return Buffer.allocUnsafeSlow(length);
} : Uint8Array;
var ByteArray = hasNodeBuffer ? Buffer : Uint8Array;
var MAX_BUFFER_SIZE = hasNodeBuffer ? 4294967296 : 2144337920;
var target;
var keysTarget;
var targetView;
var position2 = 0;
var safeEnd;
var bundledStrings2 = null;
var MAX_BUNDLE_SIZE = 21760;
var hasNonLatin = /[\u0080-\uFFFF]/;
var RECORD_SYMBOL = /* @__PURE__ */ Symbol("record-id");
var Packr = class extends Unpackr {
  constructor(options) {
    super(options);
    this.offset = 0;
    let typeBuffer;
    let start;
    let hasSharedUpdate;
    let structures;
    let referenceMap2;
    let encodeUtf8 = ByteArray.prototype.utf8Write ? function(string, position3) {
      return target.utf8Write(string, position3, target.byteLength - position3);
    } : textEncoder && textEncoder.encodeInto ? function(string, position3) {
      return textEncoder.encodeInto(string, target.subarray(position3)).written;
    } : false;
    let packr = this;
    if (!options)
      options = {};
    let isSequential = options && options.sequential;
    let hasSharedStructures = options.structures || options.saveStructures;
    let maxSharedStructures = options.maxSharedStructures;
    if (maxSharedStructures == null)
      maxSharedStructures = hasSharedStructures ? 32 : 0;
    if (maxSharedStructures > 8160)
      throw new Error("Maximum maxSharedStructure is 8160");
    if (options.structuredClone && options.moreTypes == void 0) {
      this.moreTypes = true;
    }
    let maxOwnStructures = options.maxOwnStructures;
    if (maxOwnStructures == null)
      maxOwnStructures = hasSharedStructures ? 32 : 64;
    if (!this.structures && options.useRecords != false)
      this.structures = [];
    let useTwoByteRecords = maxSharedStructures > 32 || maxOwnStructures + maxSharedStructures > 64;
    let sharedLimitId = maxSharedStructures + 64;
    let maxStructureId = maxSharedStructures + maxOwnStructures + 64;
    if (maxStructureId > 8256) {
      throw new Error("Maximum maxSharedStructure + maxOwnStructure is 8192");
    }
    let recordIdsToRemove = [];
    let transitionsCount = 0;
    let serializationsSinceTransitionRebuild = 0;
    this.pack = this.encode = function(value, encodeOptions) {
      if (!target) {
        target = new ByteArrayAllocate(8192);
        targetView = target.dataView || (target.dataView = new DataView(target.buffer, 0, 8192));
        position2 = 0;
      }
      safeEnd = target.length - 10;
      if (safeEnd - position2 < 2048) {
        target = new ByteArrayAllocate(target.length);
        targetView = target.dataView || (target.dataView = new DataView(target.buffer, 0, target.length));
        safeEnd = target.length - 10;
        position2 = 0;
      } else
        position2 = position2 + 7 & 2147483640;
      start = position2;
      if (encodeOptions & RESERVE_START_SPACE) position2 += encodeOptions & 255;
      referenceMap2 = packr.structuredClone ? /* @__PURE__ */ new Map() : null;
      if (packr.bundleStrings && typeof value !== "string") {
        bundledStrings2 = [];
        bundledStrings2.size = Infinity;
      } else
        bundledStrings2 = null;
      structures = packr.structures;
      if (structures) {
        if (structures.uninitialized)
          structures = packr._mergeStructures(packr.getStructures());
        let sharedLength = structures.sharedLength || 0;
        if (sharedLength > maxSharedStructures) {
          throw new Error("Shared structures is larger than maximum shared structures, try increasing maxSharedStructures to " + structures.sharedLength);
        }
        if (!structures.transitions) {
          structures.transitions = /* @__PURE__ */ Object.create(null);
          for (let i = 0; i < sharedLength; i++) {
            let keys = structures[i];
            if (!keys)
              continue;
            let nextTransition, transition = structures.transitions;
            for (let j = 0, l = keys.length; j < l; j++) {
              let key = keys[j];
              nextTransition = transition[key];
              if (!nextTransition) {
                nextTransition = transition[key] = /* @__PURE__ */ Object.create(null);
              }
              transition = nextTransition;
            }
            transition[RECORD_SYMBOL] = i + 64;
          }
          this.lastNamedStructuresLength = sharedLength;
        }
        if (!isSequential) {
          structures.nextId = sharedLength + 64;
        }
      }
      if (hasSharedUpdate)
        hasSharedUpdate = false;
      let encodingError;
      try {
        if (packr._writeStruct && value && typeof value === "object") {
          if (value.constructor === Object) writeStruct(value);
          else if (value.constructor !== Map && !Array.isArray(value) && !extensionClasses.some((extClass) => value instanceof extClass)) {
            writeStruct(packr.useToJSON !== false && value.toJSON ? value.toJSON() : value);
          } else pack2(value);
        } else
          pack2(value);
        let lastBundle = bundledStrings2;
        if (bundledStrings2)
          writeBundles(start, pack2, 0);
        if (referenceMap2 && referenceMap2.idsToInsert) {
          let idsToInsert = referenceMap2.idsToInsert.sort((a, b) => a.offset > b.offset ? 1 : -1);
          let i = idsToInsert.length;
          let incrementPosition = -1;
          while (lastBundle && i > 0) {
            let insertionPoint = idsToInsert[--i].offset + start;
            if (insertionPoint < lastBundle.stringsPosition + start && incrementPosition === -1)
              incrementPosition = 0;
            if (insertionPoint > lastBundle.position + start) {
              if (incrementPosition >= 0)
                incrementPosition += 6;
            } else {
              if (incrementPosition >= 0) {
                targetView.setUint32(
                  lastBundle.position + start,
                  targetView.getUint32(lastBundle.position + start) + incrementPosition
                );
                incrementPosition = -1;
              }
              lastBundle = lastBundle.previous;
              i++;
            }
          }
          if (incrementPosition >= 0 && lastBundle) {
            targetView.setUint32(
              lastBundle.position + start,
              targetView.getUint32(lastBundle.position + start) + incrementPosition
            );
          }
          position2 += idsToInsert.length * 6;
          if (position2 > safeEnd)
            makeRoom(position2);
          packr.offset = position2;
          let serialized = insertIds(target.subarray(start, position2), idsToInsert);
          referenceMap2 = null;
          return serialized;
        }
        packr.offset = position2;
        if (encodeOptions & REUSE_BUFFER_MODE) {
          target.start = start;
          target.end = position2;
          return target;
        }
        return target.subarray(start, position2);
      } catch (error) {
        encodingError = error;
        throw error;
      } finally {
        if (structures) {
          resetStructures();
          if (hasSharedUpdate && packr.saveStructures) {
            let sharedLength = structures.sharedLength || 0;
            let returnBuffer = target.subarray(start, position2);
            let newSharedData = (packr._prepareStructures || prepareStructures)(structures, packr);
            if (!encodingError) {
              if (packr.saveStructures(newSharedData, newSharedData.isCompatible) === false) {
                structures.uninitialized = true;
                return packr.pack(value, encodeOptions);
              }
              packr.lastNamedStructuresLength = sharedLength;
              if (target.length > 1073741824) target = null;
              return returnBuffer;
            }
          }
        }
        if (target.length > 1073741824) target = null;
        if (encodeOptions & RESET_BUFFER_MODE)
          position2 = start;
      }
    };
    const resetStructures = () => {
      if (serializationsSinceTransitionRebuild < 10)
        serializationsSinceTransitionRebuild++;
      let sharedLength = structures.sharedLength || 0;
      if (structures.length > sharedLength && !isSequential)
        structures.length = sharedLength;
      if (transitionsCount > 1e4) {
        structures.transitions = null;
        serializationsSinceTransitionRebuild = 0;
        transitionsCount = 0;
        if (recordIdsToRemove.length > 0)
          recordIdsToRemove = [];
      } else if (recordIdsToRemove.length > 0 && !isSequential) {
        for (let i = 0, l = recordIdsToRemove.length; i < l; i++) {
          recordIdsToRemove[i][RECORD_SYMBOL] = 0;
        }
        recordIdsToRemove = [];
      }
    };
    const packArray = (value) => {
      var length = value.length;
      if (length < 16) {
        target[position2++] = 144 | length;
      } else if (length < 65536) {
        target[position2++] = 220;
        target[position2++] = length >> 8;
        target[position2++] = length & 255;
      } else {
        target[position2++] = 221;
        targetView.setUint32(position2, length);
        position2 += 4;
      }
      for (let i = 0; i < length; i++) {
        pack2(value[i]);
      }
    };
    const pack2 = (value) => {
      if (position2 > safeEnd)
        target = makeRoom(position2);
      var type = typeof value;
      var length;
      if (type === "string") {
        let strLength = value.length;
        if (bundledStrings2 && strLength >= 4 && strLength < 4096) {
          if ((bundledStrings2.size += strLength) > MAX_BUNDLE_SIZE) {
            let extStart;
            let maxBytes2 = (bundledStrings2[0] ? bundledStrings2[0].length * 3 + bundledStrings2[1].length : 0) + 10;
            if (position2 + maxBytes2 > safeEnd)
              target = makeRoom(position2 + maxBytes2);
            let lastBundle;
            if (bundledStrings2.position) {
              lastBundle = bundledStrings2;
              target[position2] = 200;
              position2 += 3;
              target[position2++] = 98;
              extStart = position2 - start;
              position2 += 4;
              writeBundles(start, pack2, 0);
              targetView.setUint16(extStart + start - 3, position2 - start - extStart);
            } else {
              target[position2++] = 214;
              target[position2++] = 98;
              extStart = position2 - start;
              position2 += 4;
            }
            bundledStrings2 = ["", ""];
            bundledStrings2.previous = lastBundle;
            bundledStrings2.size = 0;
            bundledStrings2.position = extStart;
          }
          let twoByte = hasNonLatin.test(value);
          bundledStrings2[twoByte ? 0 : 1] += value;
          target[position2++] = 193;
          pack2(twoByte ? -strLength : strLength);
          return;
        }
        let headerSize;
        if (strLength < 32) {
          headerSize = 1;
        } else if (strLength < 256) {
          headerSize = 2;
        } else if (strLength < 65536) {
          headerSize = 3;
        } else {
          headerSize = 5;
        }
        let maxBytes = strLength * 3;
        if (position2 + maxBytes > safeEnd)
          target = makeRoom(position2 + maxBytes);
        if (strLength < 64 || !encodeUtf8) {
          let i, c1, c2, strPosition = position2 + headerSize;
          for (i = 0; i < strLength; i++) {
            c1 = value.charCodeAt(i);
            if (c1 < 128) {
              target[strPosition++] = c1;
            } else if (c1 < 2048) {
              target[strPosition++] = c1 >> 6 | 192;
              target[strPosition++] = c1 & 63 | 128;
            } else if ((c1 & 64512) === 55296 && ((c2 = value.charCodeAt(i + 1)) & 64512) === 56320) {
              c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
              i++;
              target[strPosition++] = c1 >> 18 | 240;
              target[strPosition++] = c1 >> 12 & 63 | 128;
              target[strPosition++] = c1 >> 6 & 63 | 128;
              target[strPosition++] = c1 & 63 | 128;
            } else {
              target[strPosition++] = c1 >> 12 | 224;
              target[strPosition++] = c1 >> 6 & 63 | 128;
              target[strPosition++] = c1 & 63 | 128;
            }
          }
          length = strPosition - position2 - headerSize;
        } else {
          length = encodeUtf8(value, position2 + headerSize);
        }
        if (length < 32) {
          target[position2++] = 160 | length;
        } else if (length < 256) {
          if (headerSize < 2) {
            target.copyWithin(position2 + 2, position2 + 1, position2 + 1 + length);
          }
          target[position2++] = 217;
          target[position2++] = length;
        } else if (length < 65536) {
          if (headerSize < 3) {
            target.copyWithin(position2 + 3, position2 + 2, position2 + 2 + length);
          }
          target[position2++] = 218;
          target[position2++] = length >> 8;
          target[position2++] = length & 255;
        } else {
          if (headerSize < 5) {
            target.copyWithin(position2 + 5, position2 + 3, position2 + 3 + length);
          }
          target[position2++] = 219;
          targetView.setUint32(position2, length);
          position2 += 4;
        }
        position2 += length;
      } else if (type === "number") {
        if (value >>> 0 === value) {
          if (value < 32 || value < 128 && this.useRecords === false || value < 64 && !this._writeStruct) {
            target[position2++] = value;
          } else if (value < 256) {
            target[position2++] = 204;
            target[position2++] = value;
          } else if (value < 65536) {
            target[position2++] = 205;
            target[position2++] = value >> 8;
            target[position2++] = value & 255;
          } else {
            target[position2++] = 206;
            targetView.setUint32(position2, value);
            position2 += 4;
          }
        } else if (value >> 0 === value) {
          if (value >= -32) {
            target[position2++] = 256 + value;
          } else if (value >= -128) {
            target[position2++] = 208;
            target[position2++] = value + 256;
          } else if (value >= -32768) {
            target[position2++] = 209;
            targetView.setInt16(position2, value);
            position2 += 2;
          } else {
            target[position2++] = 210;
            targetView.setInt32(position2, value);
            position2 += 4;
          }
        } else {
          let useFloat32;
          if ((useFloat32 = this.useFloat32) > 0 && value < 4294967296 && value >= -2147483648) {
            target[position2++] = 202;
            targetView.setFloat32(position2, value);
            let xShifted;
            if (useFloat32 < 4 || // this checks for rounding of numbers that were encoded in 32-bit float to nearest significant decimal digit that could be preserved
            (xShifted = value * mult10[(target[position2] & 127) << 1 | target[position2 + 1] >> 7]) >> 0 === xShifted) {
              position2 += 4;
              return;
            } else
              position2--;
          }
          target[position2++] = 203;
          targetView.setFloat64(position2, value);
          position2 += 8;
        }
      } else if (type === "object" || type === "function") {
        if (!value)
          target[position2++] = 192;
        else {
          if (referenceMap2) {
            let referee = referenceMap2.get(value);
            if (referee) {
              if (!referee.id) {
                let idsToInsert = referenceMap2.idsToInsert || (referenceMap2.idsToInsert = []);
                referee.id = idsToInsert.push(referee);
              }
              target[position2++] = 214;
              target[position2++] = 112;
              targetView.setUint32(position2, referee.id);
              position2 += 4;
              return;
            } else
              referenceMap2.set(value, { offset: position2 - start });
          }
          let constructor = value.constructor;
          if (constructor === Object) {
            writeObject(value);
          } else if (constructor === Array) {
            packArray(value);
          } else if (constructor === Map) {
            if (this.mapAsEmptyObject) target[position2++] = 128;
            else {
              length = value.size;
              if (length < 16) {
                target[position2++] = 128 | length;
              } else if (length < 65536) {
                target[position2++] = 222;
                target[position2++] = length >> 8;
                target[position2++] = length & 255;
              } else {
                target[position2++] = 223;
                targetView.setUint32(position2, length);
                position2 += 4;
              }
              for (let [key, entryValue] of value) {
                pack2(key);
                pack2(entryValue);
              }
            }
          } else {
            for (let i = 0, l = extensions.length; i < l; i++) {
              let extensionClass = extensionClasses[i];
              if (value instanceof extensionClass) {
                let extension = extensions[i];
                if (extension.write) {
                  if (extension.type) {
                    target[position2++] = 212;
                    target[position2++] = extension.type;
                    target[position2++] = 0;
                  }
                  let writeResult = extension.write.call(this, value);
                  if (writeResult === value) {
                    if (Array.isArray(value)) {
                      packArray(value);
                    } else {
                      writeObject(value);
                    }
                  } else {
                    pack2(writeResult);
                  }
                  return;
                }
                let currentTarget = target;
                let currentTargetView = targetView;
                let currentPosition = position2;
                target = null;
                let result;
                try {
                  result = extension.pack.call(this, value, (size) => {
                    target = currentTarget;
                    currentTarget = null;
                    position2 += size;
                    if (position2 > safeEnd)
                      makeRoom(position2);
                    return {
                      target,
                      targetView,
                      position: position2 - size
                    };
                  }, pack2);
                } finally {
                  if (currentTarget) {
                    target = currentTarget;
                    targetView = currentTargetView;
                    position2 = currentPosition;
                    safeEnd = target.length - 10;
                  }
                }
                if (result) {
                  if (result.length + position2 > safeEnd)
                    makeRoom(result.length + position2);
                  position2 = writeExtensionData(result, target, position2, extension.type);
                }
                return;
              }
            }
            if (Array.isArray(value)) {
              packArray(value);
            } else {
              if (packr.useToJSON !== false && value.toJSON) {
                const json = value.toJSON();
                if (json !== value)
                  return pack2(json);
              }
              if (type === "function")
                return pack2(this.writeFunction && this.writeFunction(value));
              writeObject(value);
            }
          }
        }
      } else if (type === "boolean") {
        target[position2++] = value ? 195 : 194;
      } else if (type === "bigint") {
        if (value < 9223372036854776e3 && value >= -9223372036854776e3) {
          target[position2++] = 211;
          targetView.setBigInt64(position2, value);
        } else if (value < 18446744073709552e3 && value > 0) {
          target[position2++] = 207;
          targetView.setBigUint64(position2, value);
        } else {
          if (this.largeBigIntToFloat) {
            target[position2++] = 203;
            targetView.setFloat64(position2, Number(value));
          } else if (this.largeBigIntToString) {
            return pack2(value.toString());
          } else if (this.useBigIntExtension || this.moreTypes) {
            let empty = value < 0 ? BigInt(-1) : BigInt(0);
            let array;
            if (value >> BigInt(65536) === empty) {
              let mask = BigInt(18446744073709552e3) - BigInt(1);
              let chunks = [];
              while (true) {
                chunks.push(value & mask);
                if (value >> BigInt(63) === empty) break;
                value >>= BigInt(64);
              }
              array = new Uint8Array(new BigUint64Array(chunks).buffer);
              array.reverse();
            } else {
              let invert = value < 0;
              let string = (invert ? ~value : value).toString(16);
              if (string.length % 2) {
                string = "0" + string;
              } else if (parseInt(string.charAt(0), 16) >= 8) {
                string = "00" + string;
              }
              if (hasNodeBuffer) {
                array = Buffer.from(string, "hex");
              } else {
                array = new Uint8Array(string.length / 2);
                for (let i = 0; i < array.length; i++) {
                  array[i] = parseInt(string.slice(i * 2, i * 2 + 2), 16);
                }
              }
              if (invert) {
                for (let i = 0; i < array.length; i++) array[i] = ~array[i];
              }
            }
            if (array.length + position2 > safeEnd)
              makeRoom(array.length + position2);
            position2 = writeExtensionData(array, target, position2, 66);
            return;
          } else {
            throw new RangeError(value + " was too large to fit in MessagePack 64-bit integer format, use useBigIntExtension, or set largeBigIntToFloat to convert to float-64, or set largeBigIntToString to convert to string");
          }
        }
        position2 += 8;
      } else if (type === "undefined") {
        if (this.encodeUndefinedAsNil)
          target[position2++] = 192;
        else {
          target[position2++] = 212;
          target[position2++] = 0;
          target[position2++] = 0;
        }
      } else {
        throw new Error("Unknown type: " + type);
      }
    };
    const writePlainObject = this.variableMapSize || this.coercibleKeyAsNumber || this.skipValues ? (object) => {
      let keys;
      if (this.skipValues) {
        keys = [];
        for (let key2 in object) {
          if ((typeof object.hasOwnProperty !== "function" || object.hasOwnProperty(key2)) && !this.skipValues.includes(object[key2]))
            keys.push(key2);
        }
      } else {
        keys = Object.keys(object);
      }
      let length = keys.length;
      if (length < 16) {
        target[position2++] = 128 | length;
      } else if (length < 65536) {
        target[position2++] = 222;
        target[position2++] = length >> 8;
        target[position2++] = length & 255;
      } else {
        target[position2++] = 223;
        targetView.setUint32(position2, length);
        position2 += 4;
      }
      let key;
      if (this.coercibleKeyAsNumber) {
        for (let i = 0; i < length; i++) {
          key = keys[i];
          let num2 = Number(key);
          pack2(isNaN(num2) ? key : num2);
          pack2(object[key]);
        }
      } else {
        for (let i = 0; i < length; i++) {
          pack2(key = keys[i]);
          pack2(object[key]);
        }
      }
    } : (object) => {
      target[position2++] = 222;
      let objectOffset = position2 - start;
      position2 += 2;
      let size = 0;
      for (let key in object) {
        if (typeof object.hasOwnProperty !== "function" || object.hasOwnProperty(key)) {
          pack2(key);
          pack2(object[key]);
          size++;
        }
      }
      if (size > 65535) {
        throw new Error('Object is too large to serialize with fast 16-bit map size, use the "variableMapSize" option to serialize this object');
      }
      target[objectOffset++ + start] = size >> 8;
      target[objectOffset + start] = size & 255;
    };
    const writeRecord = this.useRecords === false ? writePlainObject : options.progressiveRecords && !useTwoByteRecords ? (
      // this is about 2% faster for highly stable structures, since it only requires one for-in loop (but much more expensive when new structure needs to be written)
      (object) => {
        let nextTransition, transition = structures.transitions || (structures.transitions = /* @__PURE__ */ Object.create(null));
        let objectOffset = position2++ - start;
        let wroteKeys;
        for (let key in object) {
          if (typeof object.hasOwnProperty !== "function" || object.hasOwnProperty(key)) {
            nextTransition = transition[key];
            if (nextTransition)
              transition = nextTransition;
            else {
              let keys = Object.keys(object);
              let lastTransition = transition;
              transition = structures.transitions;
              let newTransitions = 0;
              for (let i = 0, l = keys.length; i < l; i++) {
                let key2 = keys[i];
                nextTransition = transition[key2];
                if (!nextTransition) {
                  nextTransition = transition[key2] = /* @__PURE__ */ Object.create(null);
                  newTransitions++;
                }
                transition = nextTransition;
              }
              if (objectOffset + start + 1 == position2) {
                position2--;
                newRecord(transition, keys, newTransitions);
              } else
                insertNewRecord(transition, keys, objectOffset, newTransitions);
              wroteKeys = true;
              transition = lastTransition[key];
            }
            pack2(object[key]);
          }
        }
        if (!wroteKeys) {
          let recordId = transition[RECORD_SYMBOL];
          if (recordId)
            target[objectOffset + start] = recordId;
          else
            insertNewRecord(transition, Object.keys(object), objectOffset, 0);
        }
      }
    ) : (object) => {
      let nextTransition, transition = structures.transitions || (structures.transitions = /* @__PURE__ */ Object.create(null));
      let newTransitions = 0;
      for (let key in object) if (typeof object.hasOwnProperty !== "function" || object.hasOwnProperty(key)) {
        nextTransition = transition[key];
        if (!nextTransition) {
          nextTransition = transition[key] = /* @__PURE__ */ Object.create(null);
          newTransitions++;
        }
        transition = nextTransition;
      }
      let recordId = transition[RECORD_SYMBOL];
      if (recordId) {
        if (recordId >= 96 && useTwoByteRecords) {
          target[position2++] = ((recordId -= 96) & 31) + 96;
          target[position2++] = recordId >> 5;
        } else
          target[position2++] = recordId;
      } else {
        newRecord(transition, transition.__keys__ || Object.keys(object), newTransitions);
      }
      for (let key in object)
        if (typeof object.hasOwnProperty !== "function" || object.hasOwnProperty(key)) {
          pack2(object[key]);
        }
    };
    const checkUseRecords = typeof this.useRecords == "function" && this.useRecords;
    const writeObject = checkUseRecords ? (object) => {
      checkUseRecords(object) ? writeRecord(object) : writePlainObject(object);
    } : writeRecord;
    const writeStruct = (object) => {
      let newPosition = packr._writeStruct(object, target, start, position2, structures, makeRoom, (value, newPosition2, notifySharedUpdate) => {
        if (notifySharedUpdate)
          return hasSharedUpdate = true;
        position2 = newPosition2;
        let startTarget = target;
        pack2(value);
        resetStructures();
        if (startTarget !== target) {
          return { position: position2, targetView, target };
        }
        return position2;
      });
      if (newPosition === 0)
        return writeObject(object);
      position2 = newPosition;
    };
    const makeRoom = (end) => {
      let newSize;
      if (end > 16777216) {
        if (end - start > MAX_BUFFER_SIZE)
          throw new Error("Packed buffer would be larger than maximum buffer size");
        newSize = Math.min(
          MAX_BUFFER_SIZE,
          Math.round(Math.max((end - start) * (end > 67108864 ? 1.25 : 2), 4194304) / 4096) * 4096
        );
      } else
        newSize = (Math.max(end - start << 2, target.length - 1) >> 12) + 1 << 12;
      let newBuffer = new ByteArrayAllocate(newSize);
      targetView = newBuffer.dataView || (newBuffer.dataView = new DataView(newBuffer.buffer, 0, newSize));
      end = Math.min(end, target.length);
      if (target.copy)
        target.copy(newBuffer, 0, start, end);
      else
        newBuffer.set(target.slice(start, end));
      position2 -= start;
      start = 0;
      safeEnd = newBuffer.length - 10;
      return target = newBuffer;
    };
    const newRecord = (transition, keys, newTransitions) => {
      let recordId = structures.nextId;
      if (!recordId)
        recordId = 64;
      if (recordId < sharedLimitId && this.shouldShareStructure && !this.shouldShareStructure(keys)) {
        recordId = structures.nextOwnId;
        if (!(recordId < maxStructureId))
          recordId = sharedLimitId;
        structures.nextOwnId = recordId + 1;
      } else {
        if (recordId >= maxStructureId)
          recordId = sharedLimitId;
        structures.nextId = recordId + 1;
      }
      let highByte = keys.highByte = recordId >= 96 && useTwoByteRecords ? recordId - 96 >> 5 : -1;
      transition[RECORD_SYMBOL] = recordId;
      transition.__keys__ = keys;
      structures[recordId - 64] = keys;
      if (recordId < sharedLimitId) {
        keys.isShared = true;
        structures.sharedLength = recordId - 63;
        hasSharedUpdate = true;
        if (highByte >= 0) {
          target[position2++] = (recordId & 31) + 96;
          target[position2++] = highByte;
        } else {
          target[position2++] = recordId;
        }
      } else {
        if (highByte >= 0) {
          target[position2++] = 213;
          target[position2++] = 114;
          target[position2++] = (recordId & 31) + 96;
          target[position2++] = highByte;
        } else {
          target[position2++] = 212;
          target[position2++] = 114;
          target[position2++] = recordId;
        }
        if (newTransitions)
          transitionsCount += serializationsSinceTransitionRebuild * newTransitions;
        if (recordIdsToRemove.length >= maxOwnStructures)
          recordIdsToRemove.shift()[RECORD_SYMBOL] = 0;
        recordIdsToRemove.push(transition);
        pack2(keys);
      }
    };
    const insertNewRecord = (transition, keys, insertionOffset, newTransitions) => {
      let mainTarget = target;
      let mainPosition = position2;
      let mainSafeEnd = safeEnd;
      let mainStart = start;
      target = keysTarget;
      position2 = 0;
      start = 0;
      if (!target)
        keysTarget = target = new ByteArrayAllocate(8192);
      safeEnd = target.length - 10;
      newRecord(transition, keys, newTransitions);
      keysTarget = target;
      let keysPosition = position2;
      target = mainTarget;
      position2 = mainPosition;
      safeEnd = mainSafeEnd;
      start = mainStart;
      if (keysPosition > 1) {
        let newEnd = position2 + keysPosition - 1;
        if (newEnd > safeEnd)
          makeRoom(newEnd);
        let insertionPosition = insertionOffset + start;
        target.copyWithin(insertionPosition + keysPosition, insertionPosition + 1, position2);
        target.set(keysTarget.slice(0, keysPosition), insertionPosition);
        position2 = newEnd;
      } else {
        target[insertionOffset + start] = keysTarget[0];
      }
    };
  }
  useBuffer(buffer) {
    target = buffer;
    target.dataView || (target.dataView = new DataView(target.buffer, target.byteOffset, target.byteLength));
    targetView = target.dataView;
    position2 = 0;
  }
  set position(value) {
    position2 = value;
  }
  get position() {
    return position2;
  }
  clearSharedData() {
    if (this.structures)
      this.structures = [];
    if (this.typedStructs)
      this.typedStructs = [];
  }
};
extensionClasses = [Date, Set, Error, RegExp, ArrayBuffer, Object.getPrototypeOf(Uint8Array.prototype).constructor, DataView, C1Type];
extensions = [{
  pack(date, allocateForWrite, pack2) {
    let seconds = date.getTime() / 1e3;
    if ((this.useTimestamp32 || date.getMilliseconds() === 0) && seconds >= 0 && seconds < 4294967296) {
      let { target: target2, targetView: targetView2, position: position3 } = allocateForWrite(6);
      target2[position3++] = 214;
      target2[position3++] = 255;
      targetView2.setUint32(position3, seconds);
    } else if (seconds > 0 && seconds < 4294967296) {
      let { target: target2, targetView: targetView2, position: position3 } = allocateForWrite(10);
      target2[position3++] = 215;
      target2[position3++] = 255;
      targetView2.setUint32(position3, date.getMilliseconds() * 4e6 + (seconds / 1e3 / 4294967296 >> 0));
      targetView2.setUint32(position3 + 4, seconds);
    } else if (isNaN(seconds)) {
      if (this.onInvalidDate) {
        allocateForWrite(0);
        return pack2(this.onInvalidDate());
      }
      let { target: target2, targetView: targetView2, position: position3 } = allocateForWrite(3);
      target2[position3++] = 212;
      target2[position3++] = 255;
      target2[position3++] = 255;
    } else {
      let { target: target2, targetView: targetView2, position: position3 } = allocateForWrite(15);
      target2[position3++] = 199;
      target2[position3++] = 12;
      target2[position3++] = 255;
      targetView2.setUint32(position3, date.getMilliseconds() * 1e6);
      targetView2.setBigInt64(position3 + 4, BigInt(Math.floor(seconds)));
    }
  }
}, {
  pack(set, allocateForWrite, pack2) {
    if (this.setAsEmptyObject) {
      allocateForWrite(0);
      return pack2({});
    }
    let array = Array.from(set);
    let { target: target2, position: position3 } = allocateForWrite(this.moreTypes ? 3 : 0);
    if (this.moreTypes) {
      target2[position3++] = 212;
      target2[position3++] = 115;
      target2[position3++] = 0;
    }
    pack2(array);
  }
}, {
  pack(error, allocateForWrite, pack2) {
    let { target: target2, position: position3 } = allocateForWrite(this.moreTypes ? 3 : 0);
    if (this.moreTypes) {
      target2[position3++] = 212;
      target2[position3++] = 101;
      target2[position3++] = 0;
    }
    pack2([error.name, error.message, error.cause]);
  }
}, {
  pack(regex, allocateForWrite, pack2) {
    let { target: target2, position: position3 } = allocateForWrite(this.moreTypes ? 3 : 0);
    if (this.moreTypes) {
      target2[position3++] = 212;
      target2[position3++] = 120;
      target2[position3++] = 0;
    }
    pack2([regex.source, regex.flags]);
  }
}, {
  pack(arrayBuffer, allocateForWrite) {
    if (this.moreTypes)
      writeExtBuffer(arrayBuffer, 16, allocateForWrite);
    else
      writeBuffer(hasNodeBuffer ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer), allocateForWrite);
  }
}, {
  pack(typedArray, allocateForWrite) {
    let constructor = typedArray.constructor;
    if (constructor !== ByteArray && this.moreTypes)
      writeExtBuffer(typedArray, typedArrays.indexOf(constructor.name), allocateForWrite);
    else
      writeBuffer(typedArray, allocateForWrite);
  }
}, {
  pack(arrayBuffer, allocateForWrite) {
    if (this.moreTypes)
      writeExtBuffer(arrayBuffer, 17, allocateForWrite);
    else
      writeBuffer(hasNodeBuffer ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer), allocateForWrite);
  }
}, {
  pack(c1, allocateForWrite) {
    let { target: target2, position: position3 } = allocateForWrite(1);
    target2[position3] = 193;
  }
}];
function writeExtBuffer(typedArray, type, allocateForWrite, encode3) {
  let length = typedArray.byteLength;
  if (length + 1 < 256) {
    var { target: target2, position: position3 } = allocateForWrite(4 + length);
    target2[position3++] = 199;
    target2[position3++] = length + 1;
  } else if (length + 1 < 65536) {
    var { target: target2, position: position3 } = allocateForWrite(5 + length);
    target2[position3++] = 200;
    target2[position3++] = length + 1 >> 8;
    target2[position3++] = length + 1 & 255;
  } else {
    var { target: target2, position: position3, targetView: targetView2 } = allocateForWrite(7 + length);
    target2[position3++] = 201;
    targetView2.setUint32(position3, length + 1);
    position3 += 4;
  }
  target2[position3++] = 116;
  target2[position3++] = type;
  if (!typedArray.buffer) typedArray = new Uint8Array(typedArray);
  target2.set(new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength), position3);
}
function writeBuffer(buffer, allocateForWrite) {
  let length = buffer.byteLength;
  var target2, position3;
  if (length < 256) {
    var { target: target2, position: position3 } = allocateForWrite(length + 2);
    target2[position3++] = 196;
    target2[position3++] = length;
  } else if (length < 65536) {
    var { target: target2, position: position3 } = allocateForWrite(length + 3);
    target2[position3++] = 197;
    target2[position3++] = length >> 8;
    target2[position3++] = length & 255;
  } else {
    var { target: target2, position: position3, targetView: targetView2 } = allocateForWrite(length + 5);
    target2[position3++] = 198;
    targetView2.setUint32(position3, length);
    position3 += 4;
  }
  target2.set(buffer, position3);
}
function writeExtensionData(result, target2, position3, type) {
  let length = result.length;
  switch (length) {
    case 1:
      target2[position3++] = 212;
      break;
    case 2:
      target2[position3++] = 213;
      break;
    case 4:
      target2[position3++] = 214;
      break;
    case 8:
      target2[position3++] = 215;
      break;
    case 16:
      target2[position3++] = 216;
      break;
    default:
      if (length < 256) {
        target2[position3++] = 199;
        target2[position3++] = length;
      } else if (length < 65536) {
        target2[position3++] = 200;
        target2[position3++] = length >> 8;
        target2[position3++] = length & 255;
      } else {
        target2[position3++] = 201;
        target2[position3++] = length >> 24;
        target2[position3++] = length >> 16 & 255;
        target2[position3++] = length >> 8 & 255;
        target2[position3++] = length & 255;
      }
  }
  target2[position3++] = type;
  target2.set(result, position3);
  position3 += length;
  return position3;
}
function insertIds(serialized, idsToInsert) {
  let nextId;
  let distanceToMove = idsToInsert.length * 6;
  let lastEnd = serialized.length - distanceToMove;
  while (nextId = idsToInsert.pop()) {
    let offset = nextId.offset;
    let id = nextId.id;
    serialized.copyWithin(offset + distanceToMove, offset, lastEnd);
    distanceToMove -= 6;
    let position3 = offset + distanceToMove;
    serialized[position3++] = 214;
    serialized[position3++] = 105;
    serialized[position3++] = id >> 24;
    serialized[position3++] = id >> 16 & 255;
    serialized[position3++] = id >> 8 & 255;
    serialized[position3++] = id & 255;
    lastEnd = offset;
  }
  return serialized;
}
function writeBundles(start, pack2, incrementPosition) {
  if (bundledStrings2.length > 0) {
    targetView.setUint32(bundledStrings2.position + start, position2 + incrementPosition - bundledStrings2.position - start);
    bundledStrings2.stringsPosition = position2 - start;
    let writeStrings = bundledStrings2;
    bundledStrings2 = null;
    pack2(writeStrings[0]);
    pack2(writeStrings[1]);
  }
}
function prepareStructures(structures, packr) {
  structures.isCompatible = (existingStructures) => {
    let compatible = !existingStructures || (packr.lastNamedStructuresLength || 0) === existingStructures.length;
    if (!compatible)
      packr._mergeStructures(existingStructures);
    return compatible;
  };
  return structures;
}
Packr.SUPPORTS_STRUCT_HOOKS = true;
var defaultPackr = new Packr({ useRecords: false });
var pack = defaultPackr.pack;
var encode2 = defaultPackr.pack;
var { NEVER, ALWAYS, DECIMAL_ROUND, DECIMAL_FIT } = FLOAT32_OPTIONS;
var REUSE_BUFFER_MODE = 512;
var RESET_BUFFER_MODE = 1024;
var RESERVE_START_SPACE = 2048;

// node_modules/@colyseus/sdk/build/transport/H3Transport.mjs
var MAX_LENGTH_PREFIX_BYTES = 9;
var FrameReassembler = class {
  pending = new Uint8Array(0);
  push(chunk) {
    if (!chunk || chunk.byteLength === 0) {
      return [];
    }
    const bytes = this.pending.byteLength === 0 ? chunk : concatBytes(this.pending, chunk);
    const frames = [];
    let offset = 0;
    while (offset < bytes.byteLength) {
      const it = { offset };
      let length;
      try {
        length = decode.number(bytes, it);
      } catch (e) {
        if (bytes.byteLength - offset <= MAX_LENGTH_PREFIX_BYTES) {
          break;
        }
        throw e;
      }
      const frameEnd = it.offset + length;
      if (frameEnd > bytes.byteLength) {
        break;
      }
      frames.push(bytes.subarray(it.offset, frameEnd));
      offset = frameEnd;
    }
    this.pending = offset < bytes.byteLength ? bytes.slice(offset) : new Uint8Array(0);
    return frames;
  }
};
function concatBytes(a, b) {
  const out = new Uint8Array(a.byteLength + b.byteLength);
  out.set(a, 0);
  out.set(b, a.byteLength);
  return out;
}
var H3TransportTransport = class {
  wt;
  /** Connect URL — exposed so tooling (e.g. the debug panel) can show the
   *  endpoint, mirroring `WebSocketTransport.ws.url`. */
  url;
  isOpen = false;
  events;
  reader;
  writer;
  unreliableReader;
  unreliableWriter;
  lengthPrefixBuffer = new Uint8Array(9);
  // 9 bytes is the maximum length of a length prefix
  reliableReassembler = new FrameReassembler();
  unreliableReassembler = new FrameReassembler();
  constructor(events) {
    this.events = events;
  }
  connect(url, options = {}) {
    this.url = url;
    const wtOpts = options.fingerprint && {
      // requireUnreliable: true,
      // congestionControl: "default", // "low-latency" || "throughput"
      serverCertificateHashes: [{
        algorithm: "sha-256",
        // Pass the Uint8Array VIEW, not `.buffer`: the @fails-components Node client
        // (1.6) rejects a raw ArrayBuffer here, silently failing the cert-hash match
        // → "Opening handshake failed". Browsers accept either; Node wants the view.
        value: new Uint8Array(options.fingerprint)
      }]
    } || void 0;
    this.wt = new WebTransport(url, wtOpts);
    this.wt.ready.then((e) => {
      console.log("WebTransport ready!", e);
      this.isOpen = true;
      this.unreliableReader = this.wt.datagrams.readable.getReader();
      const datagrams = this.wt.datagrams;
      this.unreliableWriter = (datagrams.createWritable ? datagrams.createWritable() : datagrams.writable).getWriter();
      const incomingBidi = this.wt.incomingBidirectionalStreams.getReader();
      incomingBidi.read().then((stream) => {
        this.reader = stream.value.readable.getReader();
        this.writer = stream.value.writable.getWriter();
        this.sendSeatReservation(options.roomId, options.sessionId, options.reconnectionToken, options.skipHandshake);
        this.readIncomingData();
        this.readIncomingUnreliableData();
      }).catch((e2) => {
        console.error("failed to read incoming stream", e2);
        console.error("TODO: close the connection");
      });
    }).catch((e) => {
      console.log("WebTransport not ready!", e);
      this._close();
    });
    this.wt.closed.then((e) => {
      console.log("WebTransport closed w/ success", e);
      this.events.onclose({ code: e.closeCode, reason: e.reason });
    }).catch((e) => {
      console.log("WebTransport closed w/ error", e);
      this.events.onerror(e);
      this.events.onclose({ code: e.closeCode, reason: e.reason });
    }).finally(() => {
      this._close();
    });
  }
  send(data) {
    this.writer.write(this.frame(data));
  }
  sendUnreliable(data) {
    this.unreliableWriter.write(this.frame(data));
  }
  /**
   * Length-prefix a payload for the wire. Normalizes the input to a typed array
   * first: unlike `ws.send()` (which accepts an ArrayBuffer directly), we frame
   * manually — reading `.length` and copying via `.set()` — so a bare ArrayBuffer
   * (e.g. the debug panel's latency-sim clone) must be wrapped, or `.length` is
   * `undefined` and the allocation/copy goes out of bounds.
   */
  frame(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    const prefixLength = encode.number(this.lengthPrefixBuffer, bytes.length, { offset: 0 });
    const out = new Uint8Array(prefixLength + bytes.length);
    out.set(this.lengthPrefixBuffer.subarray(0, prefixLength), 0);
    out.set(bytes, prefixLength);
    return out;
  }
  close(code, reason) {
    this.isOpen = false;
    try {
      const ret = this.wt?.close({ closeCode: code, reason });
      if (ret && typeof ret.catch === "function") {
        ret.catch(() => {
        });
      }
    } catch (e) {
    }
  }
  readIncomingData() {
    return this.readLoop(this.reader, this.reliableReassembler, "reliable");
  }
  readIncomingUnreliableData() {
    return this.readLoop(this.unreliableReader, this.unreliableReassembler, "unreliable");
  }
  async readLoop(reader, reassembler, channel) {
    while (this.isOpen) {
      let result;
      try {
        result = await reader.read();
      } catch (e) {
        await this.onChannelFailure(channel, e);
        return;
      }
      if (result.done || !result.value) {
        return;
      }
      for (const frame of reassembler.push(result.value)) {
        this.events.onmessage({ data: frame });
      }
    }
  }
  /**
   * Drops the connection after a read loop failed.
   *
   * A rejected `read()` is the end of that channel, never a hiccup: an errored
   * ReadableStream stays errored, so retrying re-raises the same rejection (a
   * busy loop) and a fresh reader taken off the same stream is born errored.
   * With nothing to recover, the only alternative to closing is a transport
   * that reports itself open but can never deliver another frame.
   */
  async onChannelFailure(channel, e) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (!this.isOpen) {
      return;
    }
    console.error(`H3Transport: stopped reading the ${channel} channel while the session was open`, e);
    this.close(CloseCode.ABNORMAL_CLOSURE, `h3 ${channel} channel failed`);
  }
  sendSeatReservation(roomId, sessionId, reconnectionToken, skipHandshake) {
    const it = { offset: 0 };
    const bytes = [];
    encode.string(bytes, roomId, it);
    encode.string(bytes, sessionId, it);
    if (reconnectionToken) {
      encode.string(bytes, reconnectionToken, it);
    }
    if (skipHandshake) {
      encode.boolean(bytes, 1, it);
    }
    this.writer.write(new Uint8Array(bytes).buffer);
  }
  _close() {
    this.isOpen = false;
  }
};

// node_modules/@colyseus/sdk/build/transport/WebSocketTransport.mjs
var import_ws = __toESM(require_browser(), 1);
var WebSocket = globalThis.WebSocket || import_ws.default;
var warnedNoUnreliableChannel = false;
var WebSocketTransport = class {
  ws;
  protocols;
  events;
  constructor(events) {
    this.events = events;
  }
  send(data) {
    this.ws.send(data);
  }
  /**
   * WebSocket has no unreliable channel, so this falls back to the reliable
   * one — which is what every caller is written against (see `sendRequest`,
   * and the input handle's redundancy ring). Dropping instead loses every
   * `mode:"unreliable"` input and request silently: the server never sees
   * them, and the client's pending set grows without bound because nothing
   * is ever acked.
   *
   * The cost of falling back is bandwidth, not correctness — an input ring
   * carries `historySize` redundant slots the ordered channel doesn't need,
   * and the server dedupes them by wire seq exactly as it would over
   * datagrams. Use `@colyseus/h3-transport` for real unreliable delivery.
   */
  sendUnreliable(data) {
    if (!warnedNoUnreliableChannel) {
      warnedNoUnreliableChannel = true;
      console.warn('@colyseus/sdk: the WebSocket transport has no unreliable channel \u2014 sending `mode:"unreliable"` traffic reliably instead. Use @colyseus/h3-transport (WebTransport) for datagram delivery.');
    }
    this.send(data);
  }
  /**
   * @param url URL to connect to
   * @param headers custom headers to send with the connection (only supported in Node.js. Web Browsers do not allow setting custom headers)
   */
  connect(url, headers) {
    try {
      this.ws = new WebSocket(url, { headers, protocols: this.protocols });
    } catch (e) {
      this.ws = new WebSocket(url, this.protocols);
    }
    this.ws.binaryType = "arraybuffer";
    this.ws.onopen = (event) => this.events.onopen?.(event);
    this.ws.onmessage = (event) => this.events.onmessage?.(event);
    this.ws.onclose = (event) => this.events.onclose?.(event);
    this.ws.onerror = (event) => this.events.onerror?.(event);
  }
  close(code, reason) {
    if (code === CloseCode.MAY_TRY_RECONNECT && this.events.onclose) {
      this.ws.onclose = null;
      this.events.onclose({ code, reason });
    }
    this.ws.close(code, reason);
  }
  get isOpen() {
    return this.ws.readyState === WebSocket.OPEN;
  }
};

// node_modules/@colyseus/sdk/build/Connection.mjs
var onOfflineListeners = [];
var hasGlobalEventListeners = typeof addEventListener === "function" && typeof removeEventListener === "function";
if (hasGlobalEventListeners) {
  addEventListener("offline", () => {
    console.warn(`@colyseus/sdk: \u{1F6D1} Network offline. Closing ${onOfflineListeners.length} connection(s)`);
    onOfflineListeners.forEach((listener) => listener());
  }, false);
}
var Connection = class {
  transport;
  events = {};
  url;
  options;
  #_offlineListener = hasGlobalEventListeners ? () => this.close(CloseCode.MAY_TRY_RECONNECT) : null;
  constructor(protocol) {
    switch (protocol) {
      case "h3":
        this.transport = new H3TransportTransport(this.events);
        break;
      default:
        this.transport = new WebSocketTransport(this.events);
        break;
    }
  }
  connect(url, options) {
    if (hasGlobalEventListeners) {
      const onOpen = this.events.onopen;
      this.events.onopen = (ev) => {
        onOfflineListeners.push(this.#_offlineListener);
        onOpen?.(ev);
      };
      const onClose = this.events.onclose;
      this.events.onclose = (ev) => {
        onOfflineListeners.splice(onOfflineListeners.indexOf(this.#_offlineListener), 1);
        onClose?.(ev);
      };
    }
    this.url = url;
    this.options = options;
    this.transport.connect(url, options);
  }
  send(data) {
    this.transport.send(data);
  }
  sendUnreliable(data) {
    this.transport.sendUnreliable(data);
  }
  reconnect(queryParams) {
    if (this.transport instanceof H3TransportTransport) {
      this.transport.connect(this.url, { ...this.options, ...queryParams });
      return;
    }
    const url = new URL(this.url);
    for (const key in queryParams) {
      url.searchParams.set(key, queryParams[key]);
    }
    this.transport.connect(url.toString(), this.options);
  }
  close(code, reason) {
    this.transport.close(code, reason);
  }
  get isOpen() {
    return this.transport.isOpen;
  }
};

// node_modules/@colyseus/sdk/build/serializer/Serializer.mjs
var serializers = {};
function registerSerializer(id, serializer) {
  serializers[id] = serializer;
}
function getSerializer(id) {
  const serializer = serializers[id];
  if (!serializer) {
    throw new Error("missing serializer: " + id);
  }
  return serializer;
}

// node_modules/@colyseus/sdk/build/core/nanoevents.mjs
var createNanoEvents = () => ({
  emit(event, ...args) {
    let callbacks = this.events[event] || [];
    for (let i = 0, length = callbacks.length; i < length; i++) {
      callbacks[i](...args);
    }
  },
  events: {},
  on(event, cb) {
    this.events[event]?.push(cb) || (this.events[event] = [cb]);
    return () => {
      this.events[event] = this.events[event]?.filter((i) => cb !== i);
    };
  }
});

// node_modules/@colyseus/sdk/build/core/signal.mjs
var onceTargets = /* @__PURE__ */ new WeakMap();
var EventEmitter = class {
  handlers = [];
  register(cb, once = false) {
    this.handlers.push(cb);
    return this;
  }
  invoke(...args) {
    const handlers = this.handlers;
    for (let i = 0, l = handlers.length; i < l; i++) {
      handlers[i].apply(this, args);
    }
  }
  invokeAsync(...args) {
    return Promise.all(this.handlers.map((handler) => handler.apply(this, args)));
  }
  remove(cb) {
    let index = this.handlers.indexOf(cb);
    if (index === -1) {
      index = this.handlers.findIndex((h) => onceTargets.get(h) === cb);
    }
    if (index !== -1) {
      this.handlers = this.handlers.filter((_, i) => i !== index);
    }
  }
  clear() {
    this.handlers = [];
  }
};
function createSignal() {
  const emitter = new EventEmitter();
  function register(cb) {
    return emitter.register(cb, this === null);
  }
  ;
  register.once = (cb) => {
    const callback = function(...args) {
      emitter.remove(callback);
      cb.apply(this, args);
    };
    onceTargets.set(callback, cb);
    emitter.register(callback);
  };
  register.remove = (cb) => emitter.remove(cb);
  register.invoke = (...args) => emitter.invoke(...args);
  register.invokeAsync = (...args) => emitter.invokeAsync(...args);
  register.clear = () => emitter.clear();
  return register;
}

// node_modules/@colyseus/sdk/build/serializer/SchemaSerializer.mjs
function getStateCallbacks(room) {
  try {
    return getDecoderStateCallbacks(room["serializer"].decoder);
  } catch (e) {
    return void 0;
  }
}
var SchemaSerializer = class {
  state;
  decoder;
  setState(encodedState, it) {
    if (this.decoder.root.refs.size > 1 && typeof this.decoder.decodeResync === "function") {
      this.decoder.decodeResync(encodedState, it);
    } else {
      this.decoder.decode(encodedState, it);
    }
  }
  getState() {
    return this.state;
  }
  patch(patches, it) {
    return this.decoder.decode(patches, it);
  }
  teardown() {
    this.decoder.root.clearRefs();
  }
  handshake(bytes, it) {
    if (this.state) {
      Reflection.decode(bytes, it);
      this.decoder = new Decoder(this.state);
    } else {
      this.decoder = Reflection.decode(bytes, it);
      this.state = this.decoder.state;
    }
  }
};

// node_modules/@colyseus/sdk/build/Reconnection.mjs
function createReconnection() {
  return {
    enabled: true,
    retryCount: 0,
    maxRetries: 15,
    delay: 100,
    minDelay: 100,
    maxDelay: 5e3,
    minUptime: 5e3,
    backoff: exponentialBackoff,
    maxEnqueuedMessages: 10,
    enqueuedMessages: [],
    isReconnecting: false
  };
}
var exponentialBackoff = (attempt, delay) => {
  return Math.floor(Math.pow(2, attempt) * delay);
};
function enqueueMessage(room, message) {
  room.reconnection.enqueuedMessages.push({ data: message });
  if (room.reconnection.enqueuedMessages.length > room.reconnection.maxEnqueuedMessages) {
    room.reconnection.enqueuedMessages.shift();
  }
}

// node_modules/@colyseus/sdk/build/RoomRequest.mjs
function toRequestError(payload, faulted) {
  if (!faulted) {
    const error2 = new Error("request rejected");
    error2.name = "rejected";
    error2.reason = payload;
    return error2;
  }
  const error = new Error(payload?.message ?? "request failed");
  if (payload?.name) {
    error.name = payload.name;
  }
  if (payload?.code !== void 0) {
    error.code = payload.code;
  }
  return error;
}

// node_modules/@colyseus/sdk/build/Room.mjs
var Room = class _Room {
  roomId;
  sessionId;
  reconnectionToken;
  name;
  connection;
  // Public signals
  onStateChange = createSignal();
  onError = createSignal();
  onLeave = createSignal();
  onReconnect = createSignal();
  onDrop = createSignal();
  onJoin = createSignal();
  serializerId;
  serializer;
  // reconnection logic
  reconnection = createReconnection();
  joinedAtTime = 0;
  /**
   * Server-time + RTT estimator, driven by the {@link ProtocolModifier.TIMED}
   * prefix that servers emit when `defineInput()` was called.
   *
   * PRESENCE CONTRACT: `clock` is never `undefined` and always satisfies
   * {@link RoomClock} — every member, including `renderNow()`, is callable
   * with no optional chaining and no fallback.
   *
   * - Defaults to a shared frozen {@link NULL_CLOCK} so `room.clock.serverNow()`
   *   always works. The shim returns the client's own `performance.now()` and
   *   reports `0` for RTT. Rooms that never call `defineInput()` keep this
   *   stub for the whole session — zero allocation cost for chat / lobby /
   *   turn-based rooms.
   * - After handshake on an input room, a default {@link RoomClockImpl} is
   *   instantiated. Users can swap their own implementation in via
   *   `room.clock = new MyClock()` between `await joinOrCreate(...)` and
   *   the first state message (any state-message arrival is on a future
   *   microtask, so a synchronous swap is race-free). A custom clock with no
   *   slew state of its own satisfies the `renderNow` guarantee by aliasing:
   *   `renderNow() { return this.serverNow(); }`.
   */
  clock = NULL_CLOCK;
  onMessageHandlers = createNanoEvents();
  packr;
  sharedBuffer;
  #lastPingTime = 0;
  #pingCallback = void 0;
  /**
   * Default time (ms) a `room.request()` / `room.send(..., callback)` waits
   * for a reply before rejecting. Class-level default — tune globally via
   * `Room.defaultRequestTimeout = ms`; override per-call with the `timeout` option.
   */
  static defaultRequestTimeout = 1e4;
  /** Monotonic id correlating a {@link Protocol.ROOM_REQUEST} with its reply. @internal */
  #nextRequestId = 0;
  /**
   * In-flight round-trips awaiting a {@link Protocol.ROOM_RESPONSE}, keyed by the
   * monotonic request id. `onReply` receives the decoded outcome `(ok, payload,
   * faulted)`; `onClose` (optional) rejects on disconnect — its absence drops the
   * registration silently. @internal
   */
  #pending = /* @__PURE__ */ new Map();
  /**
   * Per-room input state — schema ctor, server-advertised stamp/rate flags,
   * and the cached {@link InputHandle} — all grouped in {@link RoomInput}.
   * Lazily created only when the room declares input (an `INPUT_*` handshake
   * section arrives) or `input()` is called; stays `undefined` for chat /
   * lobby / turn-based rooms — zero allocation.
   * @internal
   */
  #input;
  /**
   * Seq of the newest {@link ProtocolModifier.UNRELIABLE} patch applied, so a
   * reordered datagram can be dropped rather than write a stale value. Wraps
   * at 65536; `0` is the post-`ROOM_STATE` baseline. Stays `0` forever on
   * rooms whose state declares no `@unreliable` field.
   * @internal
   */
  #lastUnreliableSeq = 0;
  constructor(name, rootSchema) {
    this.name = name;
    this.packr = new Packr();
    this.sharedBuffer = new Uint8Array(8192);
    if (rootSchema) {
      const serializer = new (getSerializer("schema"))();
      this.serializer = serializer;
      const state = new rootSchema();
      serializer.state = state;
      serializer.decoder = new Decoder(state);
    }
    this.onLeave(() => {
      this.removeAllListeners();
      this.destroy();
    });
  }
  connect(endpoint, options, headers) {
    this.connection = new Connection(options.protocol);
    this.connection.events.onmessage = this.onMessageCallback.bind(this);
    this.connection.events.onclose = (e) => {
      this.#rejectAllPending("connection closed before a response was received.");
      if (this.joinedAtTime === 0) {
        console.warn?.(`Room connection was closed unexpectedly (${e.code}): ${e.reason}`);
        this.onError.invoke(e.code, e.reason);
        return;
      }
      if (e.code === CloseCode.NO_STATUS_RECEIVED || e.code === CloseCode.ABNORMAL_CLOSURE || e.code === CloseCode.GOING_AWAY || e.code === CloseCode.MAY_TRY_RECONNECT) {
        this.onDrop.invoke(e.code, e.reason);
        this.handleReconnection(e.code, e.reason);
      } else {
        this.onLeave.invoke(e.code, e.reason);
      }
    };
    this.connection.events.onerror = (e) => {
      this.onError.invoke(e.code, e.reason);
    };
    const skipHandshake = this.serializer?.getState() !== void 0;
    if (options.protocol === "h3") {
      const url = new URL(endpoint);
      this.connection.connect(url.origin, { ...options, skipHandshake });
    } else {
      this.connection.connect(`${endpoint}${skipHandshake ? "&skipHandshake=1" : ""}`, headers);
    }
  }
  leave(consented = true) {
    return new Promise((resolve) => {
      this.onLeave((code) => resolve(code));
      if (this.connection) {
        if (consented) {
          this.sharedBuffer[0] = Protocol.LEAVE_ROOM;
          this.connection.send(this.sharedBuffer.subarray(0, 1));
        } else {
          this.connection.close();
        }
      } else {
        this.onLeave.invoke(CloseCode.CONSENTED);
      }
    });
  }
  onMessage(type, callback) {
    return this.onMessageHandlers.on(this.getMessageHandlerKey(type), callback);
  }
  ping(callback) {
    if (!this.connection?.isOpen) {
      return;
    }
    this.#lastPingTime = now();
    this.#pingCallback = callback;
    this.sharedBuffer[0] = Protocol.PING;
    this.connection.send(this.sharedBuffer.subarray(0, 1));
  }
  send(messageType, payload, callback) {
    if (callback !== void 0) {
      this.request(messageType, payload).then((response) => callback(response, void 0), (error) => callback(void 0, error));
      return;
    }
    const it = { offset: 1 };
    this.sharedBuffer[0] = Protocol.ROOM_DATA;
    if (typeof messageType === "string") {
      encode.string(this.sharedBuffer, messageType, it);
    } else {
      encode.number(this.sharedBuffer, messageType, it);
    }
    const headerLength = it.offset;
    let data;
    if (payload !== void 0) {
      data = this.packr.pack(payload, RESERVE_START_SPACE | headerLength);
      data.set(this.sharedBuffer.subarray(0, headerLength), 0);
    } else {
      data = this.sharedBuffer.subarray(0, headerLength);
    }
    if (!this.connection.isOpen) {
      enqueueMessage(this, new Uint8Array(data));
    } else {
      this.connection.send(data);
    }
  }
  request(messageType, payload, options) {
    if (!this.connection.isOpen) {
      return Promise.reject(new Error(`cannot send request "${messageType}": connection is not open.`));
    }
    const timeoutMs = options?.timeout ?? _Room.defaultRequestTimeout;
    return new Promise((resolve, reject) => {
      let timer;
      const id = this.sendRequest(messageType, payload, { mode: options?.mode }, (ok, replyPayload, faulted) => {
        clearTimeout(timer);
        if (ok) {
          resolve(replyPayload);
        } else {
          reject(toRequestError(replyPayload, faulted));
        }
      }, (reason) => {
        clearTimeout(timer);
        reject(new Error(reason));
      });
      timer = setTimeout(() => {
        this.cancelRequest(id);
        reject(new Error(`request "${messageType}" timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
    });
  }
  /** Next correlation id (uint32) for a round-trip. @internal */
  #mintRequestId() {
    const id = this.#nextRequestId;
    this.#nextRequestId = this.#nextRequestId + 1 >>> 0;
    return id;
  }
  /** Encode a {@link Protocol.ROOM_REQUEST} frame (shared by `request` + `sendRequest`).
   *  The returned buffer aliases `sharedBuffer` for the payload-less case, so
   *  it must be transmitted (or copied) before the next encode. @internal */
  #encodeRequestFrame(requestId, messageType, payload) {
    const it = { offset: 1 };
    this.sharedBuffer[0] = Protocol.ROOM_REQUEST;
    encode.number(this.sharedBuffer, requestId, it);
    if (typeof messageType === "string") {
      encode.string(this.sharedBuffer, messageType, it);
    } else {
      encode.number(this.sharedBuffer, messageType, it);
    }
    const headerLength = it.offset;
    if (payload !== void 0) {
      const data = this.packr.pack(payload, RESERVE_START_SPACE | headerLength);
      data.set(this.sharedBuffer.subarray(0, headerLength), 0);
      return data;
    }
    return this.sharedBuffer.subarray(0, headerLength);
  }
  /**
   * Low-level round-trip primitive: register `onReply` (called once with the
   * decoded outcome when the server replies) and transmit a
   * {@link Protocol.ROOM_REQUEST} (`mode` picks the channel). {@link request}
   * wraps it with a promise + timeout. `onClose` (optional) is invoked on
   * disconnect — omit it to drop the registration silently. Returns the request
   * id, or `-1` if an unreliable send couldn't be transmitted (offline). @internal
   */
  sendRequest(messageType, payload, opts, onReply, onClose) {
    const requestId = this.#mintRequestId();
    const data = this.#encodeRequestFrame(requestId, messageType, payload);
    if (opts.mode === "unreliable") {
      if (!this.connection.isOpen) {
        return -1;
      }
      this.connection.sendUnreliable(data);
    } else if (this.connection.isOpen) {
      this.connection.send(data);
    } else {
      enqueueMessage(this, new Uint8Array(data));
    }
    this.#pending.set(requestId, { onReply, onClose });
    return requestId;
  }
  /** Drop a pending round-trip (request timeout, or the predict layer's TTL/cancel
   *  path). Idempotent. @internal */
  cancelRequest(id) {
    this.#pending.delete(id);
  }
  #rejectAllPending(reason) {
    if (this.#pending.size === 0) {
      return;
    }
    for (const entry of this.#pending.values()) {
      entry.onClose?.(reason);
    }
    this.#pending.clear();
  }
  sendUnreliable(type, message) {
    if (!this.connection.isOpen) {
      return;
    }
    const it = { offset: 1 };
    this.sharedBuffer[0] = Protocol.ROOM_DATA;
    if (typeof type === "string") {
      encode.string(this.sharedBuffer, type, it);
    } else {
      encode.number(this.sharedBuffer, type, it);
    }
    const headerLength = it.offset;
    let data;
    if (message !== void 0) {
      data = this.packr.pack(message, RESERVE_START_SPACE | headerLength);
      data.set(this.sharedBuffer.subarray(0, headerLength), 0);
    } else {
      data = this.sharedBuffer.subarray(0, headerLength);
    }
    this.connection.sendUnreliable(data);
  }
  sendBytes(type, bytes) {
    const it = { offset: 1 };
    this.sharedBuffer[0] = Protocol.ROOM_DATA_BYTES;
    if (typeof type === "string") {
      encode.string(this.sharedBuffer, type, it);
    } else {
      encode.number(this.sharedBuffer, type, it);
    }
    const headerLength = it.offset;
    if (headerLength + bytes.byteLength > this.sharedBuffer.byteLength) {
      const newBuffer = new Uint8Array(headerLength + bytes.byteLength);
      newBuffer.set(this.sharedBuffer.subarray(0, headerLength));
      this.sharedBuffer = newBuffer;
    }
    this.sharedBuffer.set(bytes, headerLength);
    if (!this.connection.isOpen) {
      enqueueMessage(this, this.sharedBuffer.subarray(0, headerLength + bytes.byteLength));
    } else {
      this.connection.send(this.sharedBuffer.subarray(0, headerLength + bytes.byteLength));
    }
  }
  /**
   * Get the per-room input handle. Lazily created on first call and cached;
   * subsequent calls return the same handle (options on later calls are
   * ignored — a warning fires once if they differ from the handle's config).
   *
   * Schema discovery, in order:
   * 1. `options.type` — explicit constructor (overrides everything).
   * 2. Server-sent reflection from the JOIN handshake — populated when the
   *    server room called `defineInput()`. The synthesized class has the
   *    same fields as the server's input schema; `instanceof YourInput`
   *    won't pass on it.
   *
   * Throws if neither source has produced a constructor.
   *
   * Inputs are always delta-encoded; every `send()` transmits one input
   * (a body-less frame when nothing changed). For rollback netcode, prefer
   * `{ mode: "unreliable", historySize: 4 }`: tiny per-tick payloads,
   * redundancy across drops, idempotent under reordering.
   *
   * @example
   * ```typescript
   * const room = await client.joinOrCreate<typeof FpsRoom>("fps");
   * const input = room.input({ mode: "unreliable" });   // type from server
   * // each simulation tick:
   * input.data.seq++;
   * input.data.vx = vx;
   * input.data.vy = vy;
   * input.send();
   * ```
   */
  input(options) {
    return (this.#input ??= new RoomInput(this)).handle(options);
  }
  get state() {
    return this.serializer.getState();
  }
  removeAllListeners() {
    this.onJoin.clear();
    this.onStateChange.clear();
    this.onError.clear();
    this.onLeave.clear();
    this.onReconnect.clear();
    this.onDrop.clear();
    this.onMessageHandlers.events = {};
    if (this.serializer instanceof SchemaSerializer) {
      this.serializer.decoder.root.callbacks = {};
    }
  }
  onMessageCallback(event) {
    this.#dispatchFrame(new Uint8Array(event.data));
  }
  /** Decode + dispatch a single protocol frame. */
  #dispatchFrame(buffer) {
    const it = { offset: 1 };
    const rawByte = buffer[0];
    const code = rawByte & PROTOCOL_CODE_MASK;
    if (rawByte & ProtocolModifier.TIMED) {
      const sNow = decode.uint32(buffer, it);
      const inputSeq = decode.uint32(buffer, it);
      const rttSample = this.#input ? this.#input.ackInput(inputSeq) : -1;
      this.clock.sample(sNow, rttSample);
    }
    if (code === Protocol.JOIN_ROOM) {
      const reconnectionToken = decode.utf8Read(buffer, it, buffer[it.offset++]);
      this.serializerId = decode.utf8Read(buffer, it, buffer[it.offset++]);
      if (!this.serializer) {
        const serializer = getSerializer(this.serializerId);
        this.serializer = new serializer();
      }
      const stateReflectionLen = decode.number(buffer, it);
      if (stateReflectionLen > 0 && this.serializer.handshake) {
        const stateReflectionEnd = it.offset + stateReflectionLen;
        this.serializer.handshake(buffer.subarray(0, stateReflectionEnd), it);
        it.offset = stateReflectionEnd;
      }
      while (it.offset < buffer.byteLength) {
        const tag = buffer[it.offset++];
        const sectionLen = decode.number(buffer, it);
        const sectionEnd = it.offset + sectionLen;
        if (tag === HandshakeSection.INPUT_REFLECTION) {
          (this.#input ??= new RoomInput(this)).applyReflection(buffer, it, sectionEnd);
        } else if (tag === HandshakeSection.INPUT_OPTIONS) {
          (this.#input ??= new RoomInput(this)).applyOptions(buffer, it);
        }
        it.offset = sectionEnd;
      }
      const patchRate = this.#input?.patchRate;
      if (patchRate !== void 0) {
        this.clock.setPatchInterval?.(patchRate);
      }
      if (this.joinedAtTime === 0) {
        this.joinedAtTime = Date.now();
        this.onJoin.invoke();
      } else {
        console.info(`[Colyseus reconnection]: ${String.fromCodePoint(9989)} reconnection successful!`);
        this.reconnection.isReconnecting = false;
        this.onReconnect.invoke();
      }
      this.reconnectionToken = `${this.roomId}:${reconnectionToken}`;
      this.sharedBuffer[0] = Protocol.JOIN_ROOM;
      this.connection.send(this.sharedBuffer.subarray(0, 1));
      if (this.reconnection.enqueuedMessages.length > 0) {
        for (const message of this.reconnection.enqueuedMessages) {
          this.connection.send(message.data);
        }
        this.reconnection.enqueuedMessages = [];
      }
    } else if (code === Protocol.ERROR) {
      const code2 = decode.number(buffer, it);
      const message = decode.string(buffer, it);
      this.onError.invoke(code2, message);
    } else if (code === Protocol.LEAVE_ROOM) {
      this.leave();
    } else if (code === Protocol.ROOM_STATE) {
      this.#lastUnreliableSeq = 0;
      this.serializer.setState(buffer, it);
      this.onStateChange.invoke(this.serializer.getState());
    } else if (code === Protocol.ROOM_STATE_PATCH) {
      if (rawByte & ProtocolModifier.UNRELIABLE) {
        const seq = decode.uint16(buffer, it);
        if (seq - this.#lastUnreliableSeq << 16 >> 16 <= 0) {
          return;
        }
        this.#lastUnreliableSeq = seq;
      }
      this.serializer.patch(buffer, it);
      this.onStateChange.invoke(this.serializer.getState());
    } else if (code === Protocol.ROOM_DATA) {
      const type = decode.stringCheck(buffer, it) ? decode.string(buffer, it) : decode.number(buffer, it);
      const message = buffer.byteLength > it.offset ? unpack(buffer, { start: it.offset }) : void 0;
      this.dispatchMessage(type, message);
    } else if (code === Protocol.ROOM_DATA_BYTES) {
      const type = decode.stringCheck(buffer, it) ? decode.string(buffer, it) : decode.number(buffer, it);
      this.dispatchMessage(type, buffer.subarray(it.offset));
    } else if (code === Protocol.ROOM_RESPONSE) {
      const requestId = decode.number(buffer, it);
      const status = buffer[it.offset++];
      const payload = buffer.byteLength > it.offset ? unpack(buffer, { start: it.offset }) : void 0;
      const entry = this.#pending.get(requestId);
      if (entry !== void 0) {
        this.#pending.delete(requestId);
        entry.onReply(status === ResponseStatus.OK, payload, status === ResponseStatus.ERROR);
      }
    } else if (code === Protocol.PING) {
      this.#pingCallback?.(Math.round(now() - this.#lastPingTime));
      this.#pingCallback = void 0;
    }
  }
  dispatchMessage(type, message) {
    const messageType = this.getMessageHandlerKey(type);
    if (this.onMessageHandlers.events[messageType]) {
      this.onMessageHandlers.emit(messageType, message);
    } else if (this.onMessageHandlers.events["*"]) {
      this.onMessageHandlers.emit("*", type, message);
    } else if (!messageType.startsWith("__")) {
      console.warn?.(`@colyseus/sdk: onMessage() not registered for type '${type}'.`);
    }
  }
  destroy() {
    if (this.serializer) {
      this.serializer.teardown();
    }
  }
  getMessageHandlerKey(type) {
    switch (typeof type) {
      // string
      case "string":
        return type;
      // number
      case "number":
        return `i${type}`;
      default:
        throw new Error("invalid message type.");
    }
  }
  handleReconnection(code, reason) {
    if (!this.reconnection.enabled) {
      this.onLeave.invoke(code, reason);
      return;
    }
    if (Date.now() - this.joinedAtTime < this.reconnection.minUptime) {
      console.info(`[Colyseus reconnection]: ${String.fromCodePoint(10060)} Room has not been up for long enough for automatic reconnection. (min uptime: ${this.reconnection.minUptime}ms)`);
      this.onLeave.invoke(CloseCode.ABNORMAL_CLOSURE, "Room uptime too short for reconnection.");
      return;
    }
    if (!this.reconnection.isReconnecting) {
      this.reconnection.retryCount = 0;
      this.reconnection.isReconnecting = true;
      this.#input?.reset();
    }
    this.retryReconnection();
  }
  retryReconnection() {
    if (this.reconnection.retryCount >= this.reconnection.maxRetries) {
      console.info(`[Colyseus reconnection]: ${String.fromCodePoint(10060)} \u274C Reconnection failed after ${this.reconnection.maxRetries} attempts.`);
      this.reconnection.isReconnecting = false;
      this.onLeave.invoke(CloseCode.FAILED_TO_RECONNECT, "No more retries. Reconnection failed.");
      return;
    }
    this.reconnection.retryCount++;
    const delay = Math.min(this.reconnection.maxDelay, Math.max(this.reconnection.minDelay, this.reconnection.backoff(this.reconnection.retryCount, this.reconnection.delay)));
    console.info(`[Colyseus reconnection]: ${String.fromCodePoint(9203)} will retry in ${(delay / 1e3).toFixed(1)} seconds...`);
    setTimeout(() => {
      try {
        console.info(`[Colyseus reconnection]: ${String.fromCodePoint(128260)} Re-establishing sessionId '${this.sessionId}' with roomId '${this.roomId}'... (attempt ${this.reconnection.retryCount} of ${this.reconnection.maxRetries})`);
        this.connection.reconnect({
          reconnectionToken: this.reconnectionToken.split(":")[1],
          skipHandshake: true
          // we already applied the handshake on first join
        });
      } catch (e) {
        this.retryReconnection();
      }
    }, delay);
  }
};

// node_modules/@colyseus/sdk/build/fetchXHR.mjs
function xhrFetch(url, init) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = init?.method || "GET";
    xhr.open(method, url.toString());
    xhr.withCredentials = init?.credentials === "include";
    if (init?.headers) {
      const headers = init.headers instanceof Headers ? init.headers : new Headers(init.headers);
      headers.forEach((value, key) => {
        xhr.setRequestHeader(key, value);
      });
    }
    xhr.onload = () => {
      const headers = new Headers();
      const rawHeaders = xhr.getAllResponseHeaders().trim();
      if (rawHeaders) {
        for (const line of rawHeaders.split(/[\r\n]+/)) {
          const idx = line.indexOf(": ");
          if (idx > 0) {
            headers.append(line.substring(0, idx), line.substring(idx + 2));
          }
        }
      }
      const responseBody = xhr.response ?? xhr.responseText;
      resolve(new XHRResponse(responseBody, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers
      }));
    };
    xhr.onerror = () => reject(new TypeError("Network request failed"));
    xhr.ontimeout = () => reject(new TypeError("Network request timed out"));
    xhr.send(init?.body ?? null);
  });
}
var XHRResponse = class {
  status;
  statusText;
  headers;
  ok;
  body;
  constructor(body, init) {
    this.body = body;
    this.status = init.status;
    this.statusText = init.statusText;
    this.headers = init.headers;
    this.ok = init.status >= 200 && init.status < 300;
  }
  async json() {
    return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
  }
  async text() {
    return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
  }
  async blob() {
    return new Blob([this.body]);
  }
};

// node_modules/@colyseus/sdk/build/HTTP.mjs
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
function getURLWithQueryParams(url, option) {
  const { params, query } = option || {};
  const [urlPath, urlQuery] = url.split("?");
  let path = urlPath;
  if (params) {
    if (Array.isArray(params)) {
      const paramPaths = path.split("/").filter((p) => p.startsWith(":"));
      for (const [index, key] of paramPaths.entries()) {
        const value = params[index];
        path = path.replace(key, value);
      }
    } else {
      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, String(value));
      }
    }
  }
  const queryParams = new URLSearchParams(urlQuery);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null)
        continue;
      queryParams.set(key, String(value));
    }
  }
  let queryParamString = queryParams.toString();
  queryParamString = queryParamString.length > 0 ? `?${queryParamString}`.replace(/\+/g, "%20") : "";
  return `${path}${queryParamString}`;
}
var HTTP = class {
  authToken;
  options;
  sdk;
  _fetchFn;
  // alias "del()" to "delete()"
  del = this.delete;
  constructor(sdk, baseOptions, fetchFn) {
    this.sdk = sdk;
    this.options = baseOptions;
    this._fetchFn = fetchFn;
  }
  /**
   * Lazily resolve the fetch implementation.
   * Falls back to XMLHttpRequest when fetch is unavailable (e.g. Cocos Creator Native).
   */
  get fetchFn() {
    if (!this._fetchFn) {
      this._fetchFn = typeof globalThis.fetch !== "undefined" ? globalThis.fetch.bind(globalThis) : xhrFetch;
    }
    return this._fetchFn;
  }
  async request(method, path, options) {
    return this.executeRequest(method, path, options);
  }
  get(path, options) {
    return this.request("GET", path, options);
  }
  post(path, options) {
    return this.request("POST", path, options);
  }
  delete(path, options) {
    return this.request("DELETE", path, options);
  }
  patch(path, options) {
    return this.request("PATCH", path, options);
  }
  put(path, options) {
    return this.request("PUT", path, options);
  }
  async executeRequest(method, path, requestOptions) {
    let body = this.options.body ? { ...this.options.body, ...requestOptions?.body || {} } : requestOptions?.body;
    const query = this.options.query ? { ...this.options.query, ...requestOptions?.query || {} } : requestOptions?.query;
    const params = this.options.params ? { ...this.options.params, ...requestOptions?.params || {} } : requestOptions?.params;
    const headers = new Headers(this.options.headers ? { ...this.options.headers, ...requestOptions?.headers || {} } : requestOptions?.headers);
    if (this.authToken && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${this.authToken}`);
    }
    if (isJSONSerializable(body) && typeof body === "object" && body !== null) {
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
      for (const [key, value] of Object.entries(body)) {
        if (value instanceof Date) {
          body[key] = value.toISOString();
        }
      }
      body = JSON.stringify(body);
    }
    const mergedOptions = {
      credentials: requestOptions?.credentials || "include",
      ...this.options,
      ...requestOptions,
      query,
      params,
      headers,
      body,
      method
    };
    const url = getURLWithQueryParams(this.sdk["getHttpEndpoint"](path.toString()), mergedOptions);
    let raw;
    try {
      raw = await this.fetchFn(url, mergedOptions);
    } catch (err) {
      if (err.name === "AbortError") {
        throw err;
      }
      const networkError = new ServerError(err.cause?.code || err.code, err.message);
      networkError.response = raw;
      networkError.cause = err.cause;
      throw networkError;
    }
    const contentType = raw.headers.get("content-type");
    let data;
    if (contentType?.includes("json")) {
      data = await raw.json();
    } else if (contentType?.includes("text")) {
      data = await raw.text();
    } else {
      data = await raw.blob();
    }
    if (!raw.ok) {
      throw new ServerError(raw.status, data.message ?? data.error ?? raw.statusText, {
        headers: raw.headers,
        status: raw.status,
        response: raw,
        data
      });
    }
    return {
      raw,
      data,
      headers: raw.headers,
      status: raw.status,
      statusText: raw.statusText
    };
  }
};

// node_modules/@colyseus/sdk/build/Storage.mjs
var storage;
function getStorage() {
  if (!storage) {
    try {
      storage = typeof cc !== "undefined" && cc.sys && cc.sys.localStorage ? cc.sys.localStorage : window.localStorage;
    } catch (e) {
    }
  }
  if (!storage && typeof globalThis.indexedDB !== "undefined") {
    storage = new IndexedDBStorage();
  }
  if (!storage) {
    storage = {
      cache: {},
      setItem: function(key, value) {
        this.cache[key] = value;
      },
      getItem: function(key) {
        return this.cache[key];
      },
      removeItem: function(key) {
        delete this.cache[key];
      }
    };
  }
  return storage;
}
function setItem(key, value) {
  getStorage().setItem(key, value);
}
function removeItem(key) {
  getStorage().removeItem(key);
}
function getItem(key, callback) {
  const value = getStorage().getItem(key);
  if (typeof Promise === "undefined" || // old browsers
  !(value instanceof Promise)) {
    callback(value);
  } else {
    value.then((id) => callback(id));
  }
}
var IndexedDBStorage = class {
  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open("_colyseus_storage", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("store");
    request.onsuccess = () => resolve(request.result);
  });
  async tx(mode, fn) {
    const db = await this.dbPromise;
    const store = db.transaction("store", mode).objectStore("store");
    return fn(store);
  }
  setItem(key, value) {
    return this.tx("readwrite", (store) => store.put(value, key)).then();
  }
  async getItem(key) {
    const request = await this.tx("readonly", (store) => store.get(key));
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });
  }
  removeItem(key) {
    return this.tx("readwrite", (store) => store.delete(key)).then();
  }
};

// node_modules/@colyseus/sdk/build/Auth.mjs
var Auth = class {
  settings = {
    path: "/auth",
    key: "colyseus-auth-token"
  };
  #_initialized = false;
  #_signInWindow = null;
  #_events = createNanoEvents();
  http;
  constructor(http) {
    this.http = http;
    getItem(this.settings.key, (token) => this.token = token);
  }
  set token(token) {
    this.http.authToken = token;
  }
  get token() {
    return this.http.authToken;
  }
  onChange(callback) {
    const unbindChange = this.#_events.on("change", callback);
    if (!this.#_initialized) {
      this.getUserData().then((userData) => {
        this.emitChange({ ...userData, token: this.token });
      }).catch((e) => {
        this.emitChange({ user: null, token: void 0 });
      });
    }
    this.#_initialized = true;
    return unbindChange;
  }
  async getUserData() {
    if (this.token) {
      return (await this.http.get(`${this.settings.path}/userdata`)).data;
    } else {
      throw new Error("missing auth.token");
    }
  }
  async registerWithEmailAndPassword(email, password, options) {
    const data = (await this.http.post(`${this.settings.path}/register`, {
      body: { email, password, options }
    })).data;
    this.emitChange(data);
    return data;
  }
  async signInWithEmailAndPassword(email, password) {
    const data = (await this.http.post(`${this.settings.path}/login`, {
      body: { email, password }
    })).data;
    this.emitChange(data);
    return data;
  }
  async signInAnonymously(options) {
    const data = (await this.http.post(`${this.settings.path}/anonymous`, {
      body: { options }
    })).data;
    this.emitChange(data);
    return data;
  }
  async sendPasswordResetEmail(email) {
    return (await this.http.post(`${this.settings.path}/forgot-password`, {
      body: { email }
    })).data;
  }
  async signInWithProvider(providerName, settings = {}) {
    return new Promise((resolve, reject) => {
      const w = settings.width || 480;
      const h = settings.height || 768;
      const upgradingToken = this.token ? `?token=${this.token}` : "";
      const title = `Login with ${providerName[0].toUpperCase() + providerName.substring(1)}`;
      const url = this.http["sdk"]["getHttpEndpoint"](`${settings.prefix || `${this.settings.path}/provider`}/${providerName}${upgradingToken}`);
      const left = screen.width / 2 - w / 2;
      const top = screen.height / 2 - h / 2;
      this.#_signInWindow = window.open(url, title, "toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=" + w + ", height=" + h + ", top=" + top + ", left=" + left);
      const onMessage = (event) => {
        if (event.data.user === void 0 && event.data.token === void 0) {
          return;
        }
        clearInterval(rejectionChecker);
        this.#_signInWindow?.close();
        this.#_signInWindow = null;
        window.removeEventListener("message", onMessage);
        if (event.data.error !== void 0) {
          const err = new Error(String(event.data.error));
          err.code = event.data.error;
          if (event.data.reason !== void 0) {
            err.reason = event.data.reason;
          }
          if (event.data.until !== void 0) {
            err.until = event.data.until;
          }
          reject(err);
        } else {
          resolve(event.data);
          this.emitChange(event.data);
        }
      };
      const rejectionChecker = setInterval(() => {
        if (!this.#_signInWindow || this.#_signInWindow.closed) {
          this.#_signInWindow = null;
          reject("cancelled");
          window.removeEventListener("message", onMessage);
        }
      }, 200);
      window.addEventListener("message", onMessage);
    });
  }
  async signOut() {
    this.emitChange({ user: null, token: null });
  }
  emitChange(authData) {
    if (authData.token !== void 0) {
      this.token = authData.token;
      if (authData.token === null) {
        removeItem(this.settings.key);
      } else {
        setItem(this.settings.key, authData.token);
      }
    }
    this.#_events.emit("change", authData);
  }
};

// node_modules/@colyseus/sdk/build/3rd_party/discord.mjs
function discordURLBuilder(url) {
  const localHostname = window?.location?.hostname || "localhost";
  const remoteHostnameSplitted = url.hostname.split(".");
  const subdomain = !url.hostname.includes("trycloudflare.com") && // ignore cloudflared subdomains
  !url.hostname.includes("discordsays.com") && // ignore discordsays.com subdomains
  remoteHostnameSplitted.length > 2 ? `/${remoteHostnameSplitted[0]}` : "";
  return url.pathname.startsWith("/.proxy") ? `${url.protocol}//${localHostname}${subdomain}${url.pathname}${url.search}` : `${url.protocol}//${localHostname}/.proxy/colyseus${subdomain}${url.pathname}${url.search}`;
}

// node_modules/@colyseus/sdk/build/Client.mjs
var DEFAULT_ENDPOINT = typeof window !== "undefined" && typeof window?.location?.hostname !== "undefined" ? `${window.location.protocol.replace("http", "ws")}//${window.location.hostname}${window.location.port && `:${window.location.port}`}` : "ws://127.0.0.1:2567";
var ColyseusSDK = class _ColyseusSDK {
  static VERSION = "0.18";
  /**
   * The HTTP client to make requests to the server.
   */
  http;
  /**
   * The authentication module to authenticate into requests and rooms.
   */
  auth;
  /**
   * The settings used to connect to the server.
   */
  settings;
  urlBuilder;
  constructor(settings = DEFAULT_ENDPOINT, options) {
    if (typeof settings === "string") {
      const url = settings.startsWith("/") ? new URL(settings, DEFAULT_ENDPOINT) : new URL(settings);
      const secure = url.protocol === "https:" || url.protocol === "wss:";
      const port = Number(url.port || (secure ? 443 : 80));
      this.settings = {
        hostname: url.hostname,
        pathname: url.pathname,
        port,
        secure,
        searchParams: url.searchParams.toString() || void 0
      };
    } else {
      if (settings.port === void 0) {
        settings.port = settings.secure ? 443 : 80;
      }
      if (settings.pathname === void 0) {
        settings.pathname = "";
      }
      this.settings = settings;
    }
    if (this.settings.pathname.endsWith("/")) {
      this.settings.pathname = this.settings.pathname.slice(0, -1);
    }
    if (options?.protocol) {
      this.settings.protocol = options.protocol;
    }
    this.http = new HTTP(this, {
      headers: options?.headers || {}
    }, options?.fetchFn);
    this.auth = new Auth(this.http);
    this.urlBuilder = options?.urlBuilder;
    if (!this.urlBuilder && typeof window !== "undefined" && window?.location?.hostname?.includes("discordsays.com")) {
      this.urlBuilder = discordURLBuilder;
      console.log("Colyseus SDK: Discord Embedded SDK detected. Using custom URL builder.");
    }
  }
  /**
   * Select the endpoint with the lowest latency.
   * @param endpoints Array of endpoints to select from.
   * @param options Client options.
   * @param latencyOptions Latency measurement options (protocol, pingCount, timeout) — forwarded to each {@link getLatency} call.
   * @returns The client with the lowest latency.
   */
  static async selectByLatency(endpoints, options, latencyOptions = {}) {
    const clients = endpoints.map((endpoint) => new _ColyseusSDK(endpoint, options));
    const latencies = (await Promise.allSettled(clients.map((client, index) => client.getLatency(latencyOptions).then((latency) => {
      const settings = clients[index].settings;
      console.log(`\u{1F6DC} Endpoint Latency: ${latency}ms - ${settings.hostname}:${settings.port}${settings.pathname}`);
      return [index, latency];
    })))).filter((result) => result.status === "fulfilled").map((result) => result.value);
    if (latencies.length === 0) {
      throw new Error("All endpoints failed to respond");
    }
    return clients[latencies.sort((a, b) => a[1] - b[1])[0][0]];
  }
  // Implementation
  async joinOrCreate(roomName, options = {}, rootSchema) {
    return await this.createMatchMakeRequest("joinOrCreate", roomName, options, rootSchema);
  }
  // Implementation
  async create(roomName, options = {}, rootSchema) {
    return await this.createMatchMakeRequest("create", roomName, options, rootSchema);
  }
  // Implementation
  async join(roomName, options = {}, rootSchema) {
    return await this.createMatchMakeRequest("join", roomName, options, rootSchema);
  }
  // Implementation
  async joinById(roomId, options = {}, rootSchema) {
    return await this.createMatchMakeRequest("joinById", roomId, options, rootSchema);
  }
  // Implementation
  async reconnect(reconnectionToken, rootSchema) {
    if (typeof reconnectionToken === "string" && typeof rootSchema === "string") {
      throw new Error("DEPRECATED: .reconnect() now only accepts 'reconnectionToken' as argument.\nYou can get this token from previously connected `room.reconnectionToken`");
    }
    const [roomId, token] = reconnectionToken.split(":");
    if (!roomId || !token) {
      throw new Error("Invalid reconnection token format.\nThe format should be roomId:reconnectionToken");
    }
    return await this.createMatchMakeRequest("reconnect", roomId, { reconnectionToken: token }, rootSchema);
  }
  async consumeSeatReservation(response, rootSchema) {
    const room = this.createRoom(response.name, rootSchema);
    room.roomId = response.roomId;
    room.sessionId = response.sessionId;
    const options = { sessionId: room.sessionId };
    if (response.reconnectionToken) {
      options.reconnectionToken = response.reconnectionToken;
    }
    room.connect(
      this.buildEndpoint(response, options),
      // `protocol` lives on client settings, not the matchmake response — inject it so
      // Room.connect picks the right transport. Without this it silently falls back to ws.
      { ...response, protocol: this.settings.protocol },
      this.http.options.headers
    );
    return new Promise((resolve, reject) => {
      const onError = (code, message) => reject(new ServerError(code, message));
      room.onError.once(onError);
      room["onJoin"].once(() => {
        room.onError.remove(onError);
        publishDebug("room", room);
        resolve(room);
      });
    });
  }
  /**
   * Create a new connection with the server, and measure the latency.
   *
   * Always settles: resolves with the (average) round-trip time, or rejects on
   * connection error, server-side close before all pongs arrive, or timeout.
   *
   * @param options Latency measurement options (protocol, pingCount, timeout).
   */
  getLatency(options = {}) {
    const protocol = options.protocol ?? "ws";
    const pingCount = options.pingCount ?? 1;
    const timeout = options.timeout ?? 1500;
    return new Promise((resolve, reject) => {
      const conn = new Connection(protocol);
      const latencies = [];
      let pingStart = 0;
      let settled = false;
      let timeoutId;
      const settle = (run) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        try {
          conn.close();
        } catch (e) {
        }
        run();
      };
      const fail = (message) => settle(() => reject(new ServerError(CloseCode.ABNORMAL_CLOSURE, `Failed to get latency: ${message}`)));
      timeoutId = setTimeout(() => fail(`timed out after ${timeout}ms`), timeout);
      conn.events.onopen = () => {
        pingStart = Date.now();
        conn.send(new Uint8Array([Protocol.PING]));
      };
      conn.events.onmessage = (_) => {
        latencies.push(Date.now() - pingStart);
        if (latencies.length < pingCount) {
          pingStart = Date.now();
          conn.send(new Uint8Array([Protocol.PING]));
        } else {
          const average = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
          settle(() => resolve(average));
        }
      };
      conn.events.onclose = (event) => fail(`connection closed${event?.code ? ` (${event.code})` : ""}${event?.reason ? `: ${event.reason}` : ""}`);
      conn.events.onerror = (event) => fail(event.message);
      try {
        conn.connect(this.getHttpEndpoint());
      } catch (e) {
        fail(e?.message ?? "failed to connect");
      }
    });
  }
  async createMatchMakeRequest(method, roomName, options = {}, rootSchema) {
    try {
      if (!roomName) {
        throw new Error("Must provide a room name");
      }
      const httpResponse = await this.http.post(`/matchmake/${method}/${roomName}`, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: options
      });
      const response = httpResponse.data;
      if (method === "reconnect") {
        response.reconnectionToken = options.reconnectionToken;
      }
      return await this.consumeSeatReservation(response, rootSchema);
    } catch (error) {
      if (error instanceof ServerError) {
        throw new MatchMakeError(error.message, error.code);
      }
      throw error;
    }
  }
  createRoom(roomName, rootSchema) {
    return new Room(roomName, rootSchema);
  }
  buildEndpoint(seatReservation, options = {}) {
    let protocol = this.settings.protocol || "ws";
    let searchParams = this.settings.searchParams || "";
    if (this.http.authToken) {
      options["_authToken"] = this.http.authToken;
    }
    for (const name in options) {
      if (!options.hasOwnProperty(name)) {
        continue;
      }
      searchParams += (searchParams ? "&" : "") + `${name}=${options[name]}`;
    }
    if (protocol === "h3") {
      protocol = "http";
    }
    let endpoint = this.settings.secure ? `${protocol}s://` : `${protocol}://`;
    if (seatReservation.publicAddress) {
      endpoint += `${seatReservation.publicAddress}`;
    } else {
      endpoint += `${this.settings.hostname}${this.getEndpointPort()}${this.settings.pathname}`;
    }
    const endpointURL = `${endpoint}/${seatReservation.processId}/${seatReservation.roomId}?${searchParams}`;
    return this.urlBuilder ? this.urlBuilder(new URL(endpointURL)) : endpointURL;
  }
  getHttpEndpoint(segments = "") {
    const path = segments.startsWith("/") ? segments : `/${segments}`;
    let endpointURL = `${this.settings.secure ? "https" : "http"}://${this.settings.hostname}${this.getEndpointPort()}${this.settings.pathname}${path}`;
    if (this.settings.searchParams) {
      endpointURL += `?${this.settings.searchParams}`;
    }
    return this.urlBuilder ? this.urlBuilder(new URL(endpointURL)) : endpointURL;
  }
  getEndpointPort() {
    return this.settings.port !== 80 && this.settings.port !== 443 ? `:${this.settings.port}` : "";
  }
};
var Client = ColyseusSDK;

// node_modules/@colyseus/sdk/build/serializer/NoneSerializer.mjs
var NoneSerializer = class {
  setState(rawState) {
  }
  getState() {
    return null;
  }
  patch(patches) {
  }
  teardown() {
  }
  handshake(bytes) {
  }
};

// node_modules/@colyseus/sdk/build/index.mjs
registerSerializer("schema", SchemaSerializer);
registerSerializer("none", NoneSerializer);

// node_modules/@genex-ai/multiplayer/dist/chunk-3ZUPU3GT.js
var RELAY_SELECT_DEFAULTS = {
  SAMPLES: 3,
  // Well past Colyseus's 1.5 s, which a loading web export's main thread was measured exceeding.
  TIMEOUT_MS: 4e3,
  // A far relay's sample lands within a few hundred ms of a near one's; a dead relay must not hold
  // a working join for the full timeout.
  GRACE_MS: 1e3
};
async function selectRelayUrl(urls, options = {}) {
  const first = urls[0];
  if (first === void 0) throw new Error("genex multiplayer: `urls` must contain at least one relay URL");
  if (urls.length === 1) return first;
  const probe = options.probe ?? defaultProbe;
  const samples = Math.max(1, options.samples ?? RELAY_SELECT_DEFAULTS.SAMPLES);
  const timeoutMs = options.timeoutMs ?? RELAY_SELECT_DEFAULTS.TIMEOUT_MS;
  const graceMs = options.graceMs ?? RELAY_SELECT_DEFAULTS.GRACE_MS;
  const best = urls.map(() => void 0);
  await new Promise((resolve) => {
    let pending = urls.length * samples;
    let grace;
    const ceiling = setTimeout(done, timeoutMs);
    function done() {
      clearTimeout(ceiling);
      clearTimeout(grace);
      resolve();
    }
    const settle = () => {
      if (--pending === 0) done();
    };
    urls.forEach((url, i) => {
      for (let n = 0; n < samples; n++) {
        let sample;
        try {
          sample = probe(url, timeoutMs);
        } catch (err) {
          sample = Promise.reject(err);
        }
        sample.then(
          (ms) => {
            if (Number.isFinite(ms) && ms >= 0) {
              best[i] = Math.min(best[i] ?? Infinity, ms);
              grace ??= setTimeout(done, graceMs);
            }
            settle();
          },
          settle
        );
      }
    });
  });
  let pick = -1;
  best.forEach((ms, i) => {
    if (ms !== void 0 && (pick < 0 || ms < best[pick])) pick = i;
  });
  if (pick < 0) {
    console.warn(`genex multiplayer: no relay answered the latency probe \u2014 connecting to ${first}`);
    return first;
  }
  return urls[pick];
}
var defaultProbe = (url, timeoutMs) => new Client(url).getLatency({ pingCount: 1, timeout: timeoutMs });
function createIceRequester(send, timeoutMs) {
  let inFlight = null;
  let settle = null;
  return {
    request() {
      if (inFlight) return inFlight;
      inFlight = new Promise((resolve) => {
        let timer;
        const done = (cfg) => {
          if (!settle) return;
          settle = null;
          inFlight = null;
          if (timer) clearTimeout(timer);
          resolve(cfg);
        };
        settle = done;
        timer = setTimeout(() => done(null), timeoutMs);
        send();
      });
      return inFlight;
    },
    deliver(cfg) {
      settle?.(cfg);
    },
    get pending() {
      return inFlight !== null;
    }
  };
}
var NUMERIC_POSE_KEYS = ["x", "y", "z", "yaw", "vx", "vy", "vz"];
var AXES = [
  ["x", "vx"],
  ["y", "vy"],
  ["z", "vz"]
];
var TWO_PI = Math.PI * 2;
var isPoseKey = (k) => POSE_KEYS.includes(k);
function wrapAngle(a) {
  if (!Number.isFinite(a)) return 0;
  let r = a % TWO_PI;
  if (r <= -Math.PI) r += TWO_PI;
  else if (r > Math.PI) r -= TWO_PI;
  return r;
}
var validPoseNumber = (v) => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= Limits.MAX_POSE_ABS;
function splitPose(state) {
  const pose = {};
  const data = {};
  const invalid = [];
  for (const k of Object.keys(state)) {
    const v = state[k];
    if (!isPoseKey(k)) {
      data[k] = v;
      continue;
    }
    if (v === void 0) continue;
    if (k === "anim") {
      if (typeof v === "string" && v.length <= Limits.MAX_ANIM_CHARS) pose.anim = v;
      else invalid.push(k);
    } else if (validPoseNumber(v)) {
      pose[k] = v;
    } else {
      invalid.push(k);
    }
  }
  return { pose, data, invalid };
}
function hasPose(p) {
  for (const k in p) if (p[k] !== void 0) return true;
  return false;
}
function deriveVelocity(pose, t, prev) {
  const out = { ...pose };
  const memory = { t };
  const dt = prev ? t - prev.t : 0;
  const usable = prev !== void 0 && dt > Interpolation.MIN_GAP_MS && dt < Interpolation.MAX_GAP_MS;
  for (const [axis, vel] of AXES) {
    const p = pose[axis];
    if (p === void 0) continue;
    memory[axis] = p;
    if (pose[vel] !== void 0) continue;
    const before = prev?.[axis];
    const v = usable && before !== void 0 ? (p - before) / dt * 1e3 : 0;
    out[vel] = validPoseNumber(v) ? v : 0;
  }
  return { pose: out, memory };
}
function readPose(p) {
  const n = (v) => typeof v === "number" && Number.isFinite(v) ? v : 0;
  return {
    x: n(p.x),
    y: n(p.y),
    z: n(p.z),
    yaw: n(p.yaw),
    vx: n(p.vx),
    vy: n(p.vy),
    vz: n(p.vz),
    anim: typeof p.anim === "string" ? p.anim : ""
  };
}
var num = (o, k) => {
  const v = o[k];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
};
function samplePose(buf, r) {
  const n = buf.length;
  if (n === 0) return void 0;
  let j = 0;
  while (j < n && buf[j].t <= r) j++;
  if (j === 0) return buf[0].state;
  if (j >= n) {
    const b2 = buf[n - 1];
    const out2 = { ...b2.state };
    const ahead = Math.min(Math.max(0, r - b2.t), Interpolation.MAX_EXTRAP_MS) / 1e3;
    for (const [axis, vel] of AXES) out2[axis] = num(b2.state, axis) + num(b2.state, vel) * ahead;
    if (n >= 2) {
      const a2 = buf[n - 2];
      const span2 = b2.t - a2.t;
      if (span2 > 0) {
        const k2 = Math.min(Math.max(0, r - b2.t), Interpolation.ROT_EXTRAP_MS) / span2;
        const yb = num(b2.state, "yaw");
        out2.yaw = yb + wrapAngle(yb - num(a2.state, "yaw")) * k2;
      }
    }
    return out2;
  }
  const a = buf[j - 1];
  const b = buf[j];
  const span = b.t - a.t;
  const k = span > 0 ? (r - a.t) / span : 1;
  const out = { ...a.state };
  for (const key of NUMERIC_POSE_KEYS) {
    const va = num(a.state, key);
    const vb = num(b.state, key);
    out[key] = key === "yaw" ? va + wrapAngle(vb - va) * k : va + (vb - va) * k;
  }
  return out;
}
function easePose(prev, target2, aPos, aRot) {
  const out = { ...target2 };
  for (const key of NUMERIC_POSE_KEYS) {
    const pv = prev[key];
    const tv = target2[key];
    if (typeof pv !== "number" || typeof tv !== "number" || !Number.isFinite(pv) || !Number.isFinite(tv)) continue;
    out[key] = key === "yaw" ? pv + wrapAngle(tv - pv) * aRot : pv + (tv - pv) * aPos;
  }
  return out;
}
var SnappedData = class _SnappedData {
  pending = [];
  current;
  /** More than this many queued changes means the render clock stalled: apply the oldest at once. */
  static MAX_PENDING = 64;
  push(t, state) {
    this.pending.push({ t, state });
    while (this.pending.length > _SnappedData.MAX_PENDING) this.current = this.pending.shift()?.state;
  }
  /** The data to show at render time `r` (`undefined` = no render clock yet: apply everything). */
  at(r) {
    while (this.pending.length > 0) {
      const head = this.pending[0];
      if (this.current !== void 0 && r !== void 0 && head.t !== void 0 && head.t > r) break;
      this.current = head.state;
      this.pending.shift();
    }
    return this.current;
  }
  flush() {
    this.at(void 0);
  }
};
function heartbeatHandleOf(room) {
  try {
    const handle = room.input();
    return handle && typeof handle.send === "function" ? handle : null;
  } catch {
    return null;
  }
}
function startHeartbeat(handle, live, hz = ClockSync.HEARTBEAT_HZ, random = Math.random) {
  const rate = Math.min(ClockSync.MAX_HEARTBEAT_HZ, Math.max(ClockSync.MIN_HEARTBEAT_HZ, hz));
  const base = 1e3 / rate;
  const minMs = 1e3 / ClockSync.MAX_HEARTBEAT_HZ;
  const maxMs = 1e3 / ClockSync.MIN_HEARTBEAT_HZ;
  let synced = false;
  let stopped = false;
  let timer;
  const beat = () => {
    if (stopped) return;
    if (live()) {
      try {
        handle.send();
      } catch {
      }
      if (!synced && handle.lastProcessed >= ClockSync.WARMUP_ACKS) synced = true;
    }
    const next = base * (1 + (random() * 2 - 1) * ClockSync.HEARTBEAT_DITHER);
    timer = setTimeout(beat, Math.min(maxMs, Math.max(minMs, next)));
  };
  beat();
  return {
    get synced() {
      if (!synced && handle.lastProcessed >= ClockSync.WARMUP_ACKS) synced = true;
      return synced;
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    }
  };
}
function msUntil(epochMs, clock) {
  if (clock.synced && clock.clockOrigin > 0 && clock.serverNow !== void 0 && Number.isFinite(clock.serverNow)) {
    return epochMs - clock.clockOrigin - clock.serverNow;
  }
  return epochMs - clock.wallNow;
}
function useSdkReconnection(room) {
  const r = room.reconnection;
  r.enabled = ClientReconnection.enabled;
  r.minUptime = ClientReconnection.minUptime;
  r.delay = ClientReconnection.delay;
  r.minDelay = ClientReconnection.minDelay;
  r.maxDelay = ClientReconnection.maxDelay;
  r.maxRetries = ClientReconnection.maxRetries;
  r.maxEnqueuedMessages = ClientReconnection.maxEnqueuedMessages;
  r.enqueuedMessages.length = 0;
  return room;
}
function withoutReconnection(room) {
  room.reconnection.enabled = false;
  return room;
}
function waitForFirstState(room, timeoutMs) {
  return new Promise((resolve) => {
    const onState = () => {
      clearTimeout(timer);
      resolve(true);
    };
    const timer = setTimeout(() => {
      room.onStateChange.remove(onState);
      resolve(false);
    }, timeoutMs);
    room.onStateChange.once(onState);
  });
}
function seedsInterpolation(id, selfId, sendTime) {
  return id !== selfId && sendTime != null;
}
var NOT_DELEGATED = "The microphone was refused by the page that frames this game, not by the player: the frame was not given it, so the browser never asked. On its Genex page a build is given the microphone only when it declares it. An up-to-date genex CLI declares it at `genex preview` and `genex publish` when the game's own source calls voice.join(); to declare it by hand, add \"microphone\" to genex.capabilities in the game's package.json. Then preview or publish again.";
var VoiceNotDelegatedError = class extends Error {
  constructor(cause) {
    super(NOT_DELEGATED, { cause });
    this.name = "VoiceNotDelegatedError";
  }
};
var DEFAULT_ICE = [{ urls: "stun:stun.l.google.com:19302" }];
var SPEAKING_POLL_MS = 120;
var DEFAULT_SPEAKING_THRESHOLD = 0.02;
var SPEAKING_RELEASE_RATIO = 0.6;
var VoiceMesh = class {
  transport;
  peers = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  roster = [];
  local = null;
  audio = null;
  localAnalyser = null;
  levelTimer = null;
  iceServers = DEFAULT_ICE;
  spatial = false;
  threshold = DEFAULT_SPEAKING_THRESHOLD;
  micOn = true;
  selfSpeaking = false;
  running = false;
  // Peering is HELD between acquiring the mic and announcing the join, because both things
  // that happen in that window must land first: the relay's TURN credentials (a peer built
  // without them is stuck on STUN for its whole life), and our own `__voice:join` (the relay
  // drops a signal from a session that is not yet in the roster, and a dropped offer is never
  // retried). Without the hold, another player joining voice in that window patches the roster
  // and builds us a peer that can neither relay nor negotiate.
  peeringHeld = false;
  constructor(transport) {
    this.transport = transport;
  }
  get active() {
    return this.running;
  }
  get micEnabled() {
    return this.micOn;
  }
  get speaking() {
    return this.selfSpeaking;
  }
  get participants() {
    return [...this.peers.values()].map((p) => ({
      id: p.id,
      name: this.transport.nameOf(p.id),
      stream: p.stream,
      speaking: p.speaking,
      muted: p.muted,
      volume: p.volume,
      connection: p.connection
    }));
  }
  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  /** Acquire the microphone. Throws if the user denies it or no device exists — the caller
   *  surfaces that; it is a normal outcome, not a bug. The one refusal that IS a bug throws a
   *  VoiceNotDelegatedError instead: the page framing the game withheld the microphone, because
   *  the build never declared it. Must be called from a user gesture: browsers gate both the
   *  permission prompt and audio playback on one. */
  async start(options = {}, holdPeering = false) {
    if (this.running) return;
    this.peeringHeld = holdPeering;
    this.iceServers = options.iceServers?.length ? options.iceServers : DEFAULT_ICE;
    this.spatial = options.spatial === true;
    this.threshold = options.speakingThreshold ?? DEFAULT_SPEAKING_THRESHOLD;
    this.micOn = options.startMuted !== true;
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
    } catch (err) {
      throw micRefusal(err);
    }
    for (const t of this.local.getAudioTracks()) t.enabled = this.micOn;
    this.audio = new AudioContext();
    this.localAnalyser = this.makeAnalyser(this.local);
    this.running = true;
    this.levelTimer = setInterval(() => this.pollLevels(), SPEAKING_POLL_MS);
  }
  /** Tear everything down. Safe to call when not running. */
  stop() {
    this.running = false;
    this.peeringHeld = false;
    if (this.levelTimer) {
      clearInterval(this.levelTimer);
      this.levelTimer = null;
    }
    for (const id of [...this.peers.keys()]) this.destroyPeer(id);
    for (const t of this.local?.getTracks() ?? []) t.stop();
    this.local = null;
    this.localAnalyser = null;
    void this.audio?.close().catch(() => {
    });
    this.audio = null;
    this.roster = [];
    this.selfSpeaking = false;
    this.emit();
  }
  /**
   * Swap in ICE servers obtained after `start()` — in practice the relay's short-lived TURN
   * credentials, which are fetched between acquiring the mic and announcing the join so the
   * network round trip never spends the user gesture `getUserMedia` needs.
   *
   * Peers built from here on use them. Live ones are updated too, but `setConfiguration`
   * governs FUTURE gathering only: an allocation already relaying media keeps the credential
   * it was created with. That is why the credential's TTL is sized to outlast a session
   * rather than to reach the next refresh.
   */
  setIceServers(servers) {
    if (!servers.length) return;
    this.iceServers = servers;
    for (const peer of this.peers.values()) {
      try {
        peer.pc.setConfiguration({ iceServers: servers });
      } catch {
      }
    }
  }
  /**
   * Release the hold taken by `start(…, true)` and reconcile whatever roster arrived while it
   * was up. The caller MUST reach this on every path, including the one where no credentials
   * came back: a mesh that never peers is worse than one peering without TURN.
   */
  releasePeering() {
    if (!this.peeringHeld) return;
    this.peeringHeld = false;
    this.setRoster(this.roster);
  }
  /** The relay's authoritative roster changed: open connections to newcomers, drop leavers. */
  setRoster(ids) {
    this.roster = ids;
    if (!this.running) return;
    if (this.peeringHeld) return;
    const self = this.transport.selfId();
    const wanted = new Set(ids.filter((id) => id !== self));
    for (const id of wanted) if (!this.peers.has(id)) this.createPeer(id);
    for (const id of [...this.peers.keys()]) if (!wanted.has(id)) this.destroyPeer(id);
    this.emit();
  }
  /** Push-to-talk. Gates the track rather than renegotiating — instant, and it keeps the
   *  peer connections warm so the first syllable after a key press is not clipped. */
  setMicEnabled(on) {
    this.micOn = on;
    for (const t of this.local?.getAudioTracks() ?? []) t.enabled = on;
    if (!on && this.selfSpeaking) {
      this.selfSpeaking = false;
      this.emit();
    }
  }
  mute(id) {
    this.setMuted(id, true);
  }
  unmute(id) {
    this.setMuted(id, false);
  }
  setVolume(id, volume) {
    const p = this.peers.get(id);
    if (!p) return;
    p.volume = Math.max(0, Math.min(1, volume));
    if (p.el) p.el.volume = p.volume;
    this.emit();
  }
  /** A signal arrived from `from` (the relay stamped it — it cannot be spoofed). */
  async handleSignal(from, raw) {
    if (!this.running) return;
    const signal = raw;
    if (!signal || typeof signal !== "object" || typeof signal.t !== "string") return;
    const peer = this.peers.get(from) ?? (this.roster.includes(from) ? this.createPeer(from) : void 0);
    if (!peer) return;
    try {
      if (signal.t === "offer") {
        await peer.pc.setRemoteDescription(signal.sdp);
        await this.flushIce(peer);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        this.transport.sendSignal(from, { t: "answer", sdp: answer });
      } else if (signal.t === "answer") {
        if (peer.pc.signalingState !== "have-local-offer") return;
        await peer.pc.setRemoteDescription(signal.sdp);
        await this.flushIce(peer);
      } else if (signal.t === "ice") {
        if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(signal.c);
        else peer.pendingIce.push(signal.c);
      }
    } catch (err) {
      console.warn(`[multiplayer] voice signaling failed with ${from}`, err);
    }
  }
  // ---- internals ----
  setMuted(id, muted) {
    const p = this.peers.get(id);
    if (!p || p.muted === muted) return;
    p.muted = muted;
    if (p.el) p.el.muted = muted || this.spatial;
    if (muted && p.speaking) p.speaking = false;
    this.emit();
  }
  createPeer(id) {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer = {
      id,
      pc,
      el: null,
      stream: null,
      analyser: null,
      pendingIce: [],
      speaking: false,
      muted: false,
      volume: 1,
      connection: "connecting"
    };
    this.peers.set(id, peer);
    for (const track of this.local?.getAudioTracks() ?? []) {
      if (this.local) pc.addTrack(track, this.local);
    }
    pc.onicecandidate = (e) => {
      if (e.candidate) this.transport.sendSignal(id, { t: "ice", c: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      peer.stream = stream;
      peer.el = this.attachSink(stream, peer);
      peer.analyser = this.makeAnalyser(stream);
      this.emit();
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      const next = s === "connected" ? "connected" : s === "failed" || s === "closed" ? "failed" : "connecting";
      if (next !== peer.connection) {
        peer.connection = next;
        if (next === "failed") {
          const relayed = this.iceServers.some((s2) => hasTurnUrl(s2));
          console.warn(
            `[multiplayer] voice connection to ${id} failed` + (relayed ? "" : " \u2014 no TURN in the ICE list (relay offered none?)")
          );
        }
        this.emit();
      }
    };
    if (this.transport.selfId() < id) void this.offer(peer);
    return peer;
  }
  async offer(peer) {
    try {
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      this.transport.sendSignal(peer.id, { t: "offer", sdp: offer });
    } catch (err) {
      console.warn(`[multiplayer] voice offer to ${peer.id} failed`, err);
    }
  }
  async flushIce(peer) {
    const queued = peer.pendingIce.splice(0);
    for (const c of queued) {
      try {
        await peer.pc.addIceCandidate(c);
      } catch {
      }
    }
  }
  destroyPeer(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.peers.delete(id);
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    try {
      peer.pc.close();
    } catch {
    }
    if (peer.el) {
      peer.el.srcObject = null;
      peer.el.remove();
    }
  }
  /** Attach the stream to an element. Required even in spatial mode (see VoiceJoinOptions). */
  attachSink(stream, peer) {
    const el = document.createElement("audio");
    el.autoplay = true;
    el.srcObject = stream;
    el.muted = this.spatial || peer.muted;
    el.volume = peer.volume;
    el.style.display = "none";
    document.body.appendChild(el);
    void el.play().catch((err) => {
      console.warn("[multiplayer] voice playback was blocked \u2014 join voice from a click/tap", err);
    });
    return el;
  }
  makeAnalyser(stream) {
    if (!this.audio) return null;
    try {
      const src2 = this.audio.createMediaStreamSource(stream);
      const analyser = this.audio.createAnalyser();
      analyser.fftSize = 512;
      src2.connect(analyser);
      return analyser;
    } catch {
      return null;
    }
  }
  pollLevels() {
    let changed = false;
    const localLevel = this.micOn ? rms(this.localAnalyser) : 0;
    const nextSelf = this.crossed(localLevel, this.selfSpeaking);
    if (nextSelf !== this.selfSpeaking) {
      this.selfSpeaking = nextSelf;
      changed = true;
    }
    for (const peer of this.peers.values()) {
      const next = peer.muted ? false : this.crossed(rms(peer.analyser), peer.speaking);
      if (next !== peer.speaking) {
        peer.speaking = next;
        changed = true;
      }
    }
    if (changed) this.emit();
  }
  /** Threshold with hysteresis so a name tag does not strobe between syllables. */
  crossed(level, was) {
    return level >= (was ? this.threshold * SPEAKING_RELEASE_RATIO : this.threshold);
  }
  emit() {
    for (const cb of [...this.listeners]) {
      try {
        cb();
      } catch (err) {
        console.error("[multiplayer] a voice listener threw", err);
      }
    }
  }
};
function isFramed() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
function micRefusal(err) {
  if (err?.name !== "NotAllowedError") return err;
  try {
    if (!isFramed()) return err;
    const policy = document.featurePolicy;
    if (policy?.allowsFeature?.("microphone") !== false) return err;
  } catch {
    return err;
  }
  return new VoiceNotDelegatedError(err);
}
function hasTurnUrl(server) {
  const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
  return urls.some((u) => typeof u === "string" && u.startsWith("turn"));
}
function rms(analyser) {
  if (!analyser) return 0;
  const buf = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = ((buf[i] ?? 128) - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}
var ROOM_REF = /* @__PURE__ */ Symbol("genex.roomRef");
var roomOf = (s) => s[ROOM_REF]();
var INTERP_RATIO = Interpolation.RATIO;
var INTERP_MIN_MS = Interpolation.MIN_MS;
var INTERP_MAX_MS = Interpolation.MAX_MS;
var INTERP_DEFAULT_MS = Interpolation.DEFAULT_MS;
var JITTER_SAFETY = Interpolation.JITTER_SAFETY;
var POISON_GUARD_MS = Interpolation.POISON_GUARD_MS;
var INTERP_EASE = Interpolation.EASE;
var MAX_EXTRAP_MS = Interpolation.MAX_EXTRAP_MS;
var ROT_EXTRAP_MS = Interpolation.ROT_EXTRAP_MS;
var CLOCK_WIN = Interpolation.CLOCK_WINDOW;
var CLOCK_WIN_MS = Interpolation.CLOCK_WINDOW_MS;
var CLOCK_WIN_MAX = Interpolation.CLOCK_WINDOW_MAX;
var INTERVAL_WIN = Interpolation.INTERVAL_WINDOW;
var MIN_GAP_MS = Interpolation.MIN_GAP_MS;
var MAX_GAP_MS = Interpolation.MAX_GAP_MS;
var HISTORY_MS = Interpolation.HISTORY_MS;
var SMOOTH_TAU_POS = Interpolation.SMOOTH_TAU_POS_MS;
var SMOOTH_TAU_ROT = Interpolation.SMOOTH_TAU_ROT_MS;
var MAX_DT_MS = Interpolation.MAX_HOST_TICK_DT_MS;
var REBASE_AFTER_GAP_MS = Interpolation.REBASE_AFTER_GAP_MS;
var OBJ_STREAM = "obj:";
var ICE_REQUEST_TIMEOUT_MS = 3e3;
var CONTROL_TIMEOUT_MS = 5e3;
var CONTROL_TIMEOUT_MAX_MS = 6e4;
var POSE_DATA_KEEPALIVE_MS = 2e3;
async function relayClient(opts) {
  if (opts.url) return new Client(opts.url);
  return new Client(await selectRelayUrl(opts.urls));
}
var resolveAuth = (auth) => typeof auth === "function" ? auth() : auth;
function predictSmoothing(opt) {
  if (opt === "predict") return { mode: "lerp" };
  if (opt && typeof opt === "object" && opt.engine === "predict") {
    return { mode: opt.mode === "damped" ? "damped" : "lerp", delay: opt.delay, smoothMs: opt.smoothMs };
  }
  return void 0;
}
var loadPredict = async (opt) => predictSmoothing(opt) ? import("./chunk-X6BSCGHL.js") : void 0;
function parseData(s) {
  if (!s) return { state: {} };
  try {
    const v = JSON.parse(s);
    if (!v || typeof v !== "object") return { state: {} };
    const o = v;
    const t = o[SEND_TIME_KEY];
    if (typeof t === "number" && Number.isFinite(t)) {
      const state = { ...o };
      delete state[SEND_TIME_KEY];
      return { state, sendTime: t };
    }
    return { state: o };
  } catch {
    return { state: {} };
  }
}
function parseValue(s) {
  if (s == null) return void 0;
  try {
    return JSON.parse(s);
  } catch {
    return void 0;
  }
}
var finiteReplacer = (_k, v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
  return v;
};
function sanitizeFinite(obj) {
  return JSON.parse(JSON.stringify(obj, finiteReplacer));
}
var nowMs = () => typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
function slerp(a, b, t) {
  let [bx, by, bz, bw] = b;
  const [ax, ay, az, aw] = a;
  let dot = ax * bx + ay * by + az * bz + aw * bw;
  if (dot < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    dot = -dot;
  }
  if (dot > 0.9995) {
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t, w = aw + (bw - aw) * t;
    const l = Math.hypot(x, y, z, w) || 1;
    return [x / l, y / l, z / l, w / l];
  }
  const theta0 = Math.acos(dot);
  const sin0 = Math.sin(theta0);
  const s0 = Math.sin(theta0 - theta0 * t) / sin0;
  const s1 = Math.sin(theta0 * t) / sin0;
  return [ax * s0 + bx * s1, ay * s0 + by * s1, az * s0 + bz * s1, aw * s0 + bw * s1];
}
function isQuat(v) {
  return Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === "number" && Number.isFinite(n));
}
function blend(a, b, tNum, tQuat) {
  const out = {};
  const interpolating = tNum < 1;
  for (const k in b) {
    const av = a[k];
    const bv = b[k];
    if (typeof av === "number" && typeof bv === "number" && Number.isFinite(av) && Number.isFinite(bv)) {
      out[k] = av + (bv - av) * tNum;
    } else if (isQuat(av) && isQuat(bv)) {
      out[k] = slerp(av, bv, tQuat);
    } else {
      out[k] = interpolating && k in a ? av : bv;
    }
  }
  return out;
}
function easeState(prev, target2, aNum, aQuat) {
  const out = {};
  for (const k in target2) {
    const tv = target2[k];
    const pv = prev[k];
    if (typeof pv === "number" && typeof tv === "number" && Number.isFinite(pv) && Number.isFinite(tv)) {
      out[k] = pv + (tv - pv) * aNum;
    } else if (isQuat(pv) && isQuat(tv)) {
      out[k] = slerp(pv, tv, aQuat);
    } else {
      out[k] = tv;
    }
  }
  return out;
}
function sampleBuffer(buf, renderTime) {
  const n = buf.length;
  if (n === 0) return void 0;
  if (n === 1) return buf[0].state;
  let j = 0;
  while (j < n && buf[j].t <= renderTime) j++;
  if (j === 0) return buf[0].state;
  if (j >= n) {
    const a2 = buf[n - 2];
    const b2 = buf[n - 1];
    const span2 = b2.t - a2.t;
    if (span2 <= 0) return b2.state;
    const tPos = (Math.min(renderTime, b2.t + MAX_EXTRAP_MS) - a2.t) / span2;
    const tRot = (Math.min(renderTime, b2.t + ROT_EXTRAP_MS) - a2.t) / span2;
    return blend(a2.state, b2.state, tPos, tRot);
  }
  const a = buf[j - 1];
  const b = buf[j];
  const span = b.t - a.t;
  const t = span > 0 ? (renderTime - a.t) / span : 1;
  return blend(a.state, b.state, t, t);
}
function median(xs) {
  if (xs.length === 0) return 66;
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1];
}
function quantile(xs, q) {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))));
  return s[i];
}
async function connect(opts) {
  const client = await relayClient(opts);
  const predict = await loadPredict(opts.smoothing);
  const room = useSdkReconnection(
    await client.joinOrCreate(RoomType.PLAY, {
      ...joinOptions(opts.room, opts.name, opts.auth),
      ...opts.options,
      // Last, so no extra option can misreport it (PROTOCOL.md §2: missing or wrong = 426).
      protocol: PROTOCOL_VERSION
    }).catch(explainJoinRefusal)
  );
  return attachSession(room, { pose: opts.pose, smoothing: opts.smoothing, predict });
}
function joinOptions(gameId, name, auth) {
  return {
    gameId,
    name,
    embedToken: resolveAuth(auth)?.embedToken,
    protocol: PROTOCOL_VERSION
  };
}
var isProtocolRefusal = (err) => !!err && typeof err === "object" && err.code === JoinError.PROTOCOL_UNSUPPORTED;
var warnProtocolRefusal = () => console.error(
  `[multiplayer] the relay refused protocol ${PROTOCOL_VERSION} (code 426) \u2014 this game was built with a @genex-ai/multiplayer that this relay no longer serves. Update the package and republish.`
);
var explainJoinRefusal = (err) => {
  if (isProtocolRefusal(err)) warnProtocolRefusal();
  throw err;
};
var isSendableEventType = (type) => typeof type === "string" && type.length > 0 && type.length <= Limits.MAX_EVENT_TYPE_CHARS && !isReservedEventType(type);
var LOCAL_EVENTS = /* @__PURE__ */ new Set([
  "join",
  "leave",
  "change",
  "shared",
  "object",
  "host",
  "reconnecting",
  "reconnected",
  "disconnect",
  "room:open",
  "voice",
  "voice:rejected"
]);
var SDK_CHANNELS = /* @__PURE__ */ new Set([
  ServerMessage.OBJECT_RESULT,
  ServerMessage.INPUT,
  ServerMessage.ROOM_OPEN,
  ServerMessage.CHAT,
  ServerMessage.CHAT_HISTORY,
  ServerMessage.VOICE_ICE,
  ServerMessage.VOICE_SIGNAL,
  ServerMessage.VOICE_REJECTED,
  ServerMessage.RATE_DROP,
  ...Object.values(ClientMessage)
]);
var QUEUE_RESEARCH_DELAYS_MS = [500, 1e3, 2e3, 4e3, 8e3];
function attachSession(room, options = {}) {
  const buffers = /* @__PURE__ */ new Map();
  const lastStamp = /* @__PURE__ */ new Map();
  const clockOffsets = /* @__PURE__ */ new Map();
  const senderClocks = /* @__PURE__ */ new Map();
  const jitterWin = /* @__PURE__ */ new Map();
  const streamSender = /* @__PURE__ */ new Map();
  const posedStreams = /* @__PURE__ */ new Set();
  const smoothed = /* @__PURE__ */ new Map();
  const smoothedAt = /* @__PURE__ */ new Map();
  const intervalsById = /* @__PURE__ */ new Map();
  const autoDelayById = /* @__PURE__ */ new Map();
  let localState;
  const objOwners = /* @__PURE__ */ new Map();
  const objConfirmedOwners = /* @__PURE__ */ new Map();
  const objEpochs = /* @__PURE__ */ new Map();
  const objSeqs = /* @__PURE__ */ new Map();
  const objStamps = /* @__PURE__ */ new Map();
  const objText = /* @__PURE__ */ new Map();
  const objRaw = /* @__PURE__ */ new Map();
  const localObjState = /* @__PURE__ */ new Map();
  const warnedUnownedWrites = /* @__PURE__ */ new Set();
  const pendingBridge = /* @__PURE__ */ new Map();
  let hostId;
  let requestCounter = 0;
  const pendingControls = /* @__PURE__ */ new Map();
  const hasPendingControl = (id) => {
    for (const pending of pendingControls.values()) if (pending.id === id) return true;
    return false;
  };
  const testSkew = typeof globalThis !== "undefined" && globalThis.__GENEX_MP_TEST_SKEW__ || 0;
  const now2 = testSkew ? () => nowMs() + testSkew : nowMs;
  const rejectUnownedWrite = (operation, id) => {
    if (objOwners.get(id) === room.sessionId) return false;
    const warningKey = `${operation}:${id}`;
    if (!warnedUnownedWrites.has(warningKey)) {
      warnedUnownedWrites.add(warningKey);
      console.warn(
        `[multiplayer] objects.${operation}('${id}') ignored because this session does not own the object \u2014 await objects.claimConfirmed('${id}') and check accepted before publishing`
      );
    }
    return true;
  };
  const pushSnap = (id, state, sendTime, sender) => {
    const arrival = now2();
    const t = sendTime;
    const sample = arrival - sendTime;
    let sc = senderClocks.get(sender);
    if (!sc) senderClocks.set(sender, sc = { samples: [], mins: [], n: 0 });
    const n = ++sc.n;
    sc.samples.push({ at: arrival, n });
    while (sc.mins.length > 0 && sc.mins[sc.mins.length - 1].v >= sample) sc.mins.pop();
    sc.mins.push({ v: sample, n });
    while (sc.samples.length > CLOCK_WIN_MAX || sc.samples.length > CLOCK_WIN && sc.samples[0].at < arrival - CLOCK_WIN_MS) {
      sc.samples.shift();
    }
    const firstKept = sc.samples[0].n;
    while (sc.mins[0].n < firstKept) sc.mins.shift();
    clockOffsets.set(sender, sc.mins[0].v);
    let jw = jitterWin.get(id);
    if (!jw) jitterWin.set(id, jw = []);
    jw.push(sample);
    if (jw.length > CLOCK_WIN) jw.shift();
    streamSender.set(id, sender);
    const prev = lastStamp.get(id);
    lastStamp.set(id, t);
    if (prev != null) {
      const gap = t - prev;
      if (gap > MIN_GAP_MS && gap < MAX_GAP_MS) {
        let iv = intervalsById.get(id);
        if (!iv) intervalsById.set(id, iv = []);
        iv.push(gap);
        if (iv.length > INTERVAL_WIN) iv.shift();
        const jitter = jw.length >= 8 ? Math.max(0, quantile(jw, 0.9) - sc.mins[0].v) : 0;
        const target2 = Math.min(
          INTERP_MAX_MS,
          Math.max(INTERP_MIN_MS, INTERP_RATIO * median(iv), JITTER_SAFETY * jitter)
        );
        const cur = autoDelayById.get(id) ?? INTERP_DEFAULT_MS;
        autoDelayById.set(id, cur + (target2 - cur) * INTERP_EASE);
      }
    }
    let buf = buffers.get(id);
    if (!buf) buffers.set(id, buf = []);
    const bridge = pendingBridge.get(id);
    if (bridge && buf.length === 0) {
      const delay = autoDelayById.get(id) ?? INTERP_DEFAULT_MS;
      buf.push({ t: t - Math.max(1, delay), state: bridge });
    }
    pendingBridge.delete(id);
    buf.push({ t, state });
    const cutoff = t - HISTORY_MS;
    while (buf.length > 2 && buf[0].t < cutoff) buf.shift();
    while (buf.length > 1 && buf[0].t > buf[buf.length - 1].t + POISON_GUARD_MS) buf.shift();
  };
  const renderTimeOf = (streamKey, localNow) => {
    const sender = streamSender.get(streamKey);
    const offset = sender === void 0 ? void 0 : clockOffsets.get(sender);
    if (offset === void 0) return void 0;
    return localNow - offset - (autoDelayById.get(streamKey) ?? INTERP_DEFAULT_MS);
  };
  const sampleSmoothed = (streamKey, localNow) => {
    const buf = buffers.get(streamKey);
    const renderTime = renderTimeOf(streamKey, localNow) ?? localNow - INTERP_DEFAULT_MS;
    const posed = posedStreams.has(streamKey);
    const sampled = buf && (posed ? samplePose(buf, renderTime) : sampleBuffer(buf, renderTime));
    if (!sampled) return smoothed.get(streamKey);
    const prev = smoothed.get(streamKey);
    let out;
    if (prev) {
      const dt = Math.min(MAX_DT_MS, Math.max(0, localNow - (smoothedAt.get(streamKey) ?? localNow)));
      const aPos = 1 - Math.exp(-dt / SMOOTH_TAU_POS);
      const aRot = 1 - Math.exp(-dt / SMOOTH_TAU_ROT);
      out = posed ? easePose(prev, sampled, aPos, aRot) : easeState(prev, sampled, aPos, aRot);
    } else {
      out = sampled;
    }
    smoothed.set(streamKey, out);
    smoothedAt.set(streamKey, localNow);
    return out;
  };
  const clearStream = (streamKey) => {
    buffers.delete(streamKey);
    lastStamp.delete(streamKey);
    streamSender.delete(streamKey);
    smoothed.delete(streamKey);
    smoothedAt.delete(streamKey);
    intervalsById.delete(streamKey);
    autoDelayById.delete(streamKey);
    jitterWin.delete(streamKey);
    pendingBridge.delete(streamKey);
  };
  const clearStreamClock = (streamKey) => {
    buffers.delete(streamKey);
    lastStamp.delete(streamKey);
    streamSender.delete(streamKey);
    intervalsById.delete(streamKey);
    autoDelayById.delete(streamKey);
    jitterWin.delete(streamKey);
  };
  const clearSenderClock = (sender) => {
    clockOffsets.delete(sender);
    senderClocks.delete(sender);
  };
  const emitters = /* @__PURE__ */ new Map();
  const bridged = /* @__PURE__ */ new Set();
  const emit = (event, ...args) => emitters.get(event)?.forEach((cb) => {
    try {
      cb(...args);
    } catch (err) {
      console.error(`[multiplayer] a '${event}' listener threw:`, err);
    }
  });
  const lastShared = /* @__PURE__ */ new Map();
  const handleShared = (value, key) => {
    if (lastShared.get(key) === value) return;
    lastShared.set(key, value);
    emit("shared", key, parseValue(value));
  };
  const applyHost = (wire) => {
    const next = wire || void 0;
    if (next === hostId) return;
    hostId = next;
    emit("host", hostId);
  };
  let lastRoster = "";
  const applyVoiceRoster = () => {
    const ids = room.state?.voice ? [...room.state.voice.keys()].sort() : [];
    const key = ids.join("\n");
    if (key === lastRoster) return;
    lastRoster = key;
    voice.setRoster(ids);
    emit("voice", voice.participants);
  };
  const applyObject = (id, o) => {
    const key = OBJ_STREAM + id;
    const me = room.sessionId;
    const known = objSeqs.has(id);
    const owner = o.owner || void 0;
    const seq = Number.isFinite(o.seq) ? o.seq : 0;
    const epoch = Number.isFinite(o.epoch) ? o.epoch : 0;
    const t = Number.isFinite(o.t) ? o.t : 0;
    const text = typeof o.d === "string" ? o.d : "";
    const ownerChanged = owner !== objConfirmedOwners.get(id);
    const handoff = ownerChanged || known && seq !== objSeqs.get(id);
    const epochChanged = objEpochs.has(id) && epoch !== objEpochs.get(id);
    const stampChanged = t !== objStamps.get(id);
    objSeqs.set(id, seq);
    objEpochs.set(id, epoch);
    objStamps.set(id, t);
    if (text !== objText.get(id)) {
      objText.set(id, text);
      const parsed = text ? parseValue(text) : void 0;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) objRaw.set(id, parsed);
    }
    if (owner) objConfirmedOwners.set(id, owner);
    else objConfirmedOwners.delete(id);
    if (handoff || objOwners.get(id) !== owner && !hasPendingControl(id)) {
      if (owner) objOwners.set(id, owner);
      else objOwners.delete(id);
    }
    if (epochChanged) clearStream(key);
    if (handoff && owner !== me) {
      localObjState.delete(id);
      if (!epochChanged) clearStreamClock(key);
    }
    const d = objRaw.get(id);
    if (d && owner !== me) {
      const sample = t !== 0 && stampChanged && owner !== void 0;
      if (epochChanged) {
        smoothed.set(key, d);
        smoothedAt.set(key, now2());
        if (sample) pushSnap(key, d, t, owner);
      } else {
        if (handoff) {
          pendingBridge.set(key, smoothed.get(key) ?? d);
        }
        if (sample) pushSnap(key, d, t, owner);
      }
    }
    if (!known || handoff) emit("object", id);
  };
  const dropObject = (id) => {
    const known = objSeqs.has(id) || objOwners.has(id) || objRaw.has(id) || localObjState.has(id);
    clearStream(OBJ_STREAM + id);
    objRaw.delete(id);
    objOwners.delete(id);
    objConfirmedOwners.delete(id);
    objEpochs.delete(id);
    objSeqs.delete(id);
    objStamps.delete(id);
    objText.delete(id);
    localObjState.delete(id);
    if (known) emit("object", id);
  };
  const parseCache = /* @__PURE__ */ new Map();
  const playerEpochs = /* @__PURE__ */ new Map();
  const playerData = /* @__PURE__ */ new Map();
  const cachedParse = (id, raw) => {
    if (!raw) return {};
    const hit = parseCache.get(id);
    if (hit && hit.raw === raw) return hit.state;
    const { state } = parseData(raw);
    parseCache.set(id, { raw, state });
    return state;
  };
  const posedData = /* @__PURE__ */ new Map();
  const playerPoseT = /* @__PURE__ */ new Map();
  const predictCfg = options.predict ? predictSmoothing(options.smoothing) : void 0;
  let predict;
  const predictAttached = /* @__PURE__ */ new Map();
  const attachPredict = (id, player) => {
    if (!predictCfg || !options.predict) return;
    predict ??= options.predict.Predict.get(room);
    const lin = { mode: predictCfg.mode, delay: predictCfg.delay, smoothMs: predictCfg.smoothMs };
    predict.attach(player, { x: lin, y: lin, z: lin, vx: lin, vy: lin, vz: lin });
    predict.attach(player, { yaw: { ...lin, angle: true } });
    predictAttached.set(id, player);
  };
  const detachPredict = (id) => {
    const player = predictAttached.get(id);
    if (player && predict) predict.detach(player);
    predictAttached.delete(id);
  };
  const predictedPose = (player) => {
    const p = predict;
    return {
      x: p.value(player, "x"),
      y: p.value(player, "y"),
      z: p.value(player, "z"),
      yaw: p.value(player, "yaw"),
      vx: p.value(player, "vx"),
      vy: p.value(player, "vy"),
      vz: p.value(player, "vz"),
      anim: player.anim ?? ""
      // Predict smooths numbers only: anim is the latest, not held (§15 A/B)
    };
  };
  let intentionalLeave = false;
  let dead = false;
  let connected = true;
  let reconnecting = false;
  let reconnectAttempt = 0;
  let reconnectStartedAt = 0;
  let dropGeneration = 0;
  const hostTickSyncs = /* @__PURE__ */ new Set();
  const syncHostTicks = () => hostTickSyncs.forEach((sync) => sync());
  const settleControl = (pending, result) => {
    pendingControls.delete(pending.requestId);
    if (pending.timeout) clearTimeout(pending.timeout);
    pending.abort?.();
    if (pending.operation === "claim" && pending.optimistic && !result.accepted) {
      const owner = result.owner ?? objConfirmedOwners.get(pending.id);
      if (owner) objOwners.set(pending.id, owner);
      else objOwners.delete(pending.id);
      if (owner !== room.sessionId) localObjState.delete(pending.id);
    }
    if (pending.operation === "claim" && result.accepted) {
      objOwners.set(pending.id, room.sessionId);
      clearStreamClock(OBJ_STREAM + pending.id);
    }
    if (pending.operation === "release" && result.accepted) {
      localObjState.delete(pending.id);
      if (objOwners.get(pending.id) === room.sessionId) objOwners.delete(pending.id);
      clearStreamClock(OBJ_STREAM + pending.id);
    }
    if (pending.operation === "remove" && result.accepted) {
      localObjState.delete(pending.id);
      objRaw.delete(pending.id);
      objOwners.delete(pending.id);
      clearStream(OBJ_STREAM + pending.id);
    }
    pending.resolve(result);
  };
  const localResult = (pending, reason) => {
    const o = room.state?.objects?.get(pending.id);
    return {
      requestId: pending.requestId,
      operation: pending.operation,
      id: pending.id,
      accepted: false,
      owner: o?.owner || void 0,
      sequence: o && Number.isFinite(o.seq) ? o.seq : 0,
      reason
    };
  };
  const settleAllControls = (reason) => {
    for (const pending of [...pendingControls.values()]) settleControl(pending, localResult(pending, reason));
  };
  const sendPendingControl = (pending, force = false) => {
    if (!force && !connected) return;
    const type = pending.operation === "claim" ? ClientMessage.CLAIM : pending.operation === "release" ? ClientMessage.RELEASE : ClientMessage.DESTROY;
    send0(type, pending.payload);
  };
  const confirmedControl = (operation, id, options2 = {}) => {
    const key = String(id);
    const requestId = `${room.sessionId.slice(0, 12)}:${Date.now().toString(36)}:${(++requestCounter).toString(36)}`;
    const timeoutMs = Math.max(250, Math.min(options2.timeoutMs ?? CONTROL_TIMEOUT_MS, CONTROL_TIMEOUT_MAX_MS));
    return new Promise((resolve) => {
      const pending = {
        operation,
        id: key,
        requestId,
        payload: {
          id: key,
          requestId,
          ...options2.authority === "host" ? { authority: "host" } : {}
        },
        optimistic: operation === "claim" && options2.optimistic === true,
        resolve,
        timeout: null,
        abort: void 0
      };
      if (intentionalLeave || dead) {
        resolve(localResult(pending, intentionalLeave ? "aborted" : "disconnected"));
        return;
      }
      if (pending.optimistic) objOwners.set(key, room.sessionId);
      pending.timeout = setTimeout(() => settleControl(pending, localResult(pending, "timeout")), timeoutMs);
      if (options2.signal) {
        const onAbort = () => settleControl(pending, localResult(pending, "aborted"));
        options2.signal.addEventListener("abort", onAbort, { once: true });
        pending.abort = () => options2.signal?.removeEventListener("abort", onAbort);
      }
      pendingControls.set(requestId, pending);
      if (options2.signal?.aborted) {
        settleControl(pending, localResult(pending, "aborted"));
        return;
      }
      sendPendingControl(pending);
    });
  };
  let droppedWhileOffline = 0;
  const send0 = (type, payload, countIfDropped = false) => {
    if (room.connection?.isOpen) {
      try {
        room.send(type, payload);
        return true;
      } catch {
      }
    }
    if (countIfDropped) droppedWhileOffline++;
    return false;
  };
  let lastDataText;
  let lastDataSentAt = 0;
  let velocity;
  const warnedPoseKeys = /* @__PURE__ */ new Set();
  const publishPosed = (clean, snap) => {
    const { pose, data, invalid } = splitPose(clean);
    for (const k of invalid) {
      if (warnedPoseKeys.has(k)) continue;
      warnedPoseKeys.add(k);
      console.warn(
        `[multiplayer] me.set: '${k}' is a typed pose key (pose: true) and its value is not a ` + (k === "anim" ? `string of \u2264${Limits.MAX_ANIM_CHARS} chars` : "finite number") + " \u2014 it is not sent."
      );
    }
    if (!hasPose(pose)) return false;
    const t = now2();
    const derived = deriveVelocity(pose, t, snap ? void 0 : velocity);
    velocity = derived.memory;
    const text = JSON.stringify(data);
    const dataDue = snap || text !== lastDataText || t - lastDataSentAt >= POSE_DATA_KEEPALIVE_MS;
    if (dataDue && send0(ClientMessage.STATE, JSON.stringify({ ...data, [SEND_TIME_KEY]: t }))) {
      lastDataText = text;
      lastDataSentAt = t;
    } else if (dataDue) {
      lastDataText = void 0;
    }
    if (!send0(snap ? ClientMessage.POSE_SNAP : ClientMessage.POSE, { ...derived.pose, t })) lastDataText = void 0;
    return true;
  };
  const voice = new VoiceMesh({
    selfId: () => room.sessionId,
    nameOf: (id) => room.state?.players?.get(id)?.name ?? "",
    sendSignal: (to, data) => send0(ClientMessage.VOICE_SIGNAL, { to, data }, true)
  });
  voice.onChange(() => emit("voice", voice.participants));
  let iceRefreshTimer = null;
  const ice = createIceRequester(() => send0(ClientMessage.VOICE_ICE_REQUEST, {}, true), ICE_REQUEST_TIMEOUT_MS);
  const clearIceRefresh = () => {
    if (iceRefreshTimer) clearTimeout(iceRefreshTimer);
    iceRefreshTimer = null;
  };
  const scheduleIceRefresh = (ttl) => {
    clearIceRefresh();
    if (typeof ttl !== "number" || !Number.isFinite(ttl) || ttl <= 0) return;
    iceRefreshTimer = setTimeout(() => {
      if (!voice.active) return;
      void ice.request().then((cfg) => {
        if (!voice.active || !cfg?.iceServers?.length) return;
        voice.setIceServers(cfg.iceServers);
        scheduleIceRefresh(cfg.ttl);
      });
    }, Math.max(6e4, Math.floor(ttl * 800)));
  };
  const chatHistory = [];
  const chatSeen = /* @__PURE__ */ new Set();
  const chatListeners = /* @__PURE__ */ new Set();
  const chatMuted = /* @__PURE__ */ new Set();
  const isChatMessage = (m) => !!m && typeof m === "object" && typeof m.id === "number" && typeof m.from === "string" && typeof m.name === "string" && typeof m.text === "string";
  const acceptChat = (message) => {
    if (!isChatMessage(message)) return;
    if (chatSeen.has(message.id)) return;
    if (chatMuted.has(message.from)) return;
    chatSeen.add(message.id);
    const last = chatHistory[chatHistory.length - 1];
    if (!last || message.id > last.id) chatHistory.push(message);
    else {
      let i = chatHistory.length;
      while (i > 0 && (chatHistory[i - 1]?.id ?? 0) > message.id) i--;
      chatHistory.splice(i, 0, message);
    }
    for (const cb of [...chatListeners]) {
      try {
        cb(message);
      } catch (err) {
        console.error("[multiplayer] a chat listener threw", err);
      }
    }
  };
  const $ = getStateCallbacks(room);
  if (!$) throw new Error("genex multiplayer: the relay room has no schema state");
  const applyPlayer = (id, player, joining) => {
    const self = id === room.sessionId;
    const { state: data, sendTime } = parseData(player.data);
    const epoch = Number.isFinite(player.epoch) ? player.epoch : 0;
    const epochChanged = playerEpochs.has(id) && epoch !== playerEpochs.get(id);
    playerEpochs.set(id, epoch);
    const dataChanged = joining || player.data !== playerData.get(id);
    playerData.set(id, player.data);
    const poseT = Number.isFinite(player.poseT) ? player.poseT : 0;
    const poseChanged = poseT !== (playerPoseT.get(id) ?? 0);
    playerPoseT.set(id, poseT);
    const posed = player.posed === true;
    if (!self && posed && !posedStreams.has(id)) {
      clearStream(id);
      posedStreams.add(id);
      posedData.set(id, new SnappedData());
    }
    if (!self && epochChanged) {
      clearStream(id);
      if (predictAttached.has(id)) detachPredict(id);
    }
    emit(joining ? "join" : "change", id, posed ? { ...data, ...readPose(player) } : data);
    if (self) return;
    if (posed) {
      const snapped = posedData.get(id);
      if (dataChanged || epochChanged) {
        snapped.push(sendTime, data);
        if (epochChanged || predictCfg) snapped.flush();
      }
      if (predictCfg) {
        if (!predictAttached.has(id)) attachPredict(id, player);
      } else if (poseT !== 0 && (poseChanged || epochChanged)) {
        pushSnap(id, readPose(player), poseT, id);
      }
      return;
    }
    if ((dataChanged || epochChanged) && seedsInterpolation(id, room.sessionId, sendTime)) {
      pushSnap(id, data, sendTime, id);
    }
  };
  $(room.state).players.onAdd((player, id) => {
    applyPlayer(id, player, true);
    $(player).onChange(() => applyPlayer(id, player, false));
  });
  const dropPlayer = (id) => {
    emit("leave", id);
    clearStream(id);
    clearSenderClock(id);
    detachPredict(id);
    parseCache.delete(id);
    playerEpochs.delete(id);
    playerData.delete(id);
    playerPoseT.delete(id);
    posedStreams.delete(id);
    posedData.delete(id);
  };
  $(room.state).players.onRemove((_player, id) => dropPlayer(id));
  $(room.state).shared.onAdd(handleShared);
  $(room.state).shared.onChange(handleShared);
  $(room.state).objects.onAdd((obj, id) => {
    applyObject(id, obj);
    $(obj).onChange(() => applyObject(id, obj));
  });
  $(room.state).objects.onRemove((_obj, id) => dropObject(id));
  $(room.state).listen("host", (value) => applyHost(value));
  $(room.state).voice.onAdd(applyVoiceRoster);
  $(room.state).voice.onRemove(applyVoiceRoster);
  const reconcileWithState = () => {
    const state = room.state;
    if (!state) return;
    for (const id of /* @__PURE__ */ new Set([...objOwners.keys(), ...objRaw.keys(), ...objSeqs.keys()])) {
      if (!state.objects?.has(id)) dropObject(id);
    }
    for (const id of [...playerEpochs.keys()]) {
      if (!state.players?.has(id)) dropPlayer(id);
    }
    applyHost(state.host);
    applyVoiceRoster();
  };
  room.onMessage(ServerMessage.VOICE_SIGNAL, (msg) => {
    if (msg && typeof msg.from === "string") void voice.handleSignal(msg.from, msg.data);
  });
  room.onMessage(ServerMessage.VOICE_REJECTED, (msg) => {
    clearIceRefresh();
    voice.stop();
    emit("voice:rejected", msg ?? { reason: "full" });
  });
  room.onMessage(ServerMessage.VOICE_ICE, (msg) => {
    ice.deliver(msg ?? null);
  });
  room.onMessage(ServerMessage.CHAT, (msg) => acceptChat(msg));
  room.onMessage(ServerMessage.CHAT_HISTORY, (msg) => {
    if (!Array.isArray(msg?.messages)) return;
    for (const m of msg.messages) acceptChat(m);
  });
  room.onMessage(ServerMessage.OBJECT_RESULT, (msg) => {
    if (!msg || typeof msg.requestId !== "string") return;
    const pending = pendingControls.get(msg.requestId);
    if (!pending || msg.operation !== pending.operation || msg.id !== pending.id) return;
    settleControl(pending, msg);
  });
  room.onMessage(ServerMessage.INPUT, (msg) => {
    if (msg && typeof msg.from === "string") emit(ServerMessage.INPUT, msg.from, msg.d);
  });
  room.onMessage(ServerMessage.ROOM_OPEN, (msg) => {
    if (typeof msg?.open === "boolean") emit("room:open", { open: msg.open });
  });
  room.onMessage(ServerMessage.RATE_DROP, (msg) => {
    console.warn(
      `[multiplayer] the relay dropped ${msg?.dropped ?? "some"} of your messages in the last second \u2014 you are publishing over budget. Publish idle/unchanged objects at \u22642Hz keepalive, not every tick (see the multiplayer skill's "message budget" section).`
    );
  });
  room.onMessage(ServerMessage.SERVER_RESTART, () => {
  });
  send0(ClientMessage.CHAT_HISTORY_REQUEST, {});
  const heartbeatHandle = heartbeatHandleOf(room);
  const heartbeat = heartbeatHandle ? startHeartbeat(heartbeatHandle, () => !dead && !intentionalLeave) : void 0;
  const serverNow = () => heartbeat ? room.clock.serverNow() : void 0;
  const timeUntil = (epochMs) => msUntil(epochMs, {
    synced: heartbeat?.synced === true,
    clockOrigin: Number.isFinite(room.state?.clockOrigin) ? room.state?.clockOrigin : 0,
    serverNow: serverNow(),
    wallNow: Date.now()
  });
  const stopTimers = () => {
    heartbeat?.stop();
    predict?.dispose();
    predict = void 0;
    predictAttached.clear();
  };
  room.onDrop((code) => {
    if (intentionalLeave || dead) return;
    dropGeneration++;
    if (!reconnecting) {
      reconnecting = true;
      reconnectAttempt = 0;
      reconnectStartedAt = nowMs();
    }
    connected = false;
    syncHostTicks();
    const { isReconnecting, retryCount, maxRetries } = room.reconnection;
    if (isReconnecting && retryCount >= maxRetries) return;
    emit("reconnecting", { attempt: ++reconnectAttempt, code });
  });
  room.onReconnect(() => {
    if (dead) return;
    if (intentionalLeave) {
      void room.leave().catch(() => {
      });
      return;
    }
    const generation = dropGeneration;
    const gap = reconnectStartedAt ? nowMs() - reconnectStartedAt : 0;
    if (gap > REBASE_AFTER_GAP_MS) {
      for (const streamKey of [...buffers.keys()]) clearStream(streamKey);
      for (const sender of [...senderClocks.keys()]) clearSenderClock(sender);
    }
    void (async () => {
      await waitForFirstState(room, ClientReconnection.firstStateTimeoutMs);
      if (generation !== dropGeneration || dead || intentionalLeave) return;
      reconcileWithState();
      for (const pending of [...pendingControls.values()]) sendPendingControl(pending, true);
      send0(ClientMessage.CHAT_HISTORY_REQUEST, {});
      reconnecting = false;
      reconnectStartedAt = 0;
      connected = true;
      syncHostTicks();
      emit("reconnected");
      if (droppedWhileOffline > 0) {
        console.warn(
          `[multiplayer] ${droppedWhileOffline} fire-and-forget event(s)/input(s) were dropped while reconnecting \u2014 they are not buffered; player/object state re-synced automatically.`
        );
        droppedWhileOffline = 0;
      }
    })();
  });
  room.onLeave((code) => {
    if (dead) return;
    dead = true;
    connected = false;
    reconnecting = false;
    stopTimers();
    syncHostTicks();
    if (intentionalLeave) return;
    settleAllControls("disconnected");
    emit("disconnect", code ?? 1006);
  });
  room.onError(() => {
  });
  const on = ((event, cb) => {
    let set = emitters.get(event);
    if (!set) emitters.set(event, set = /* @__PURE__ */ new Set());
    set.add(cb);
    if (!LOCAL_EVENTS.has(event) && !SDK_CHANNELS.has(event) && !bridged.has(event)) {
      bridged.add(event);
      room.onMessage(event, (msg) => emit(event, msg));
    }
    return () => {
      set?.delete(cb);
    };
  });
  const session = {
    id: room.sessionId,
    get players() {
      const out = /* @__PURE__ */ new Map();
      const localNow = now2();
      if (predict && predictAttached.size > 0) predict.tick(nowMs());
      room.state?.players?.forEach((p, id) => {
        const latest = cachedParse(id, p.data);
        let state = latest;
        let raw = latest;
        const snapped = posedData.get(id);
        if (id !== room.sessionId && snapped) {
          const rawPose = readPose(p);
          raw = { ...latest, ...rawPose };
          if (predictAttached.has(id)) {
            state = { ...snapped.at(void 0) ?? latest, ...predictedPose(p) };
          } else {
            const pose = sampleSmoothed(id, localNow) ?? rawPose;
            state = { ...snapped.at(renderTimeOf(id, localNow)) ?? latest, ...pose };
          }
        } else if (id === room.sessionId) {
          if (localState) {
            state = localState;
            raw = localState;
          }
        } else {
          state = sampleSmoothed(id, localNow) ?? latest;
        }
        out.set(id, {
          id,
          name: p.name ?? "",
          avatarUrl: p.avatarUrl ?? "",
          connected: p.connected !== false,
          uid: p.uid ?? "",
          team: Number.isFinite(p.team) ? p.team : -1,
          state,
          stateRaw: raw
        });
      });
      return out;
    },
    get activePlayers() {
      return new Map([...session.players].filter(([, player]) => player.connected));
    },
    me: {
      set(state) {
        if (SEND_TIME_KEY in state) {
          console.warn(`[multiplayer] '${SEND_TIME_KEY}' is a reserved field name and will be overwritten by the send timestamp \u2014 rename it.`);
        }
        const clean = sanitizeFinite(state);
        localState = clean;
        if (options.pose && publishPosed(clean, false)) return;
        send0(ClientMessage.STATE, JSON.stringify({ ...clean, [SEND_TIME_KEY]: now2() }));
      },
      snap(state) {
        if (SEND_TIME_KEY in state) {
          console.warn(`[multiplayer] '${SEND_TIME_KEY}' is a reserved field name and will be overwritten by the send timestamp \u2014 rename it.`);
        }
        const clean = sanitizeFinite(state);
        localState = clean;
        if (options.pose && publishPosed(clean, true)) return;
        send0(ClientMessage.STATE_SNAP, JSON.stringify({ ...clean, [SEND_TIME_KEY]: now2() }));
      }
    },
    shared: {
      get(key) {
        return parseValue(room.state?.shared?.get(key));
      },
      set(key, value) {
        if (key.startsWith(RESERVED_SHARED_PREFIX)) return;
        send0(ClientMessage.SHARED, { key, value: JSON.stringify(sanitizeFinite(value)) });
      },
      keys() {
        return room.state?.shared ? Array.from(room.state.shared.keys()) : [];
      }
    },
    objects: {
      claim(id) {
        void confirmedControl("claim", id, { optimistic: true });
      },
      claimConfirmed(id, options2) {
        return confirmedControl("claim", id, options2);
      },
      release(id) {
        const key = String(id);
        localObjState.delete(key);
        if (objOwners.get(key) === room.sessionId) objOwners.delete(key);
        clearStreamClock(OBJ_STREAM + key);
        void confirmedControl("release", key);
      },
      releaseConfirmed(id, options2) {
        return confirmedControl("release", id, options2);
      },
      remove(id) {
        const key = String(id);
        if (objOwners.get(key) === room.sessionId) {
          localObjState.delete(key);
          objRaw.delete(key);
          objOwners.delete(key);
          clearStream(OBJ_STREAM + key);
        }
        void confirmedControl("remove", key);
      },
      removeConfirmed(id, options2) {
        return confirmedControl("remove", id, options2);
      },
      set(id, state) {
        const key = String(id);
        if (rejectUnownedWrite("set", key)) return;
        const clean = sanitizeFinite(state);
        if (objOwners.get(key) === room.sessionId) localObjState.set(key, clean);
        send0(ClientMessage.OBJECT, { id: key, d: clean, t: now2() });
      },
      snap(id, state) {
        const key = String(id);
        if (rejectUnownedWrite("snap", key)) return;
        const clean = sanitizeFinite(state);
        if (objOwners.get(key) === room.sessionId) localObjState.set(key, clean);
        send0(ClientMessage.OBJECT_SNAP, { id: key, d: clean, t: now2() });
      },
      get(id) {
        const key = String(id);
        const owner = objOwners.get(key);
        const mine = localObjState.get(key);
        if (owner === void 0 && !objRaw.has(key) && !mine) return void 0;
        const isMine = owner !== void 0 && owner === room.sessionId;
        let state;
        let raw;
        if (isMine && mine) {
          state = mine;
          raw = mine;
          smoothed.set(OBJ_STREAM + key, mine);
          smoothedAt.set(OBJ_STREAM + key, now2());
        } else {
          raw = objRaw.get(key) ?? {};
          state = sampleSmoothed(OBJ_STREAM + key, now2()) ?? raw;
        }
        return {
          id: key,
          epoch: objEpochs.get(key) ?? 0,
          owner,
          isMine,
          state,
          stateRaw: raw
        };
      },
      ids() {
        return [.../* @__PURE__ */ new Set([...objOwners.keys(), ...objRaw.keys(), ...localObjState.keys()])];
      }
    },
    // Gated like onHostTick (PROTOCOL.md §6.3): between a reconnect's socket opening and its first
    // snapshot, `hostId` still holds the pre-drop value, so a failed-over ex-host would otherwise
    // read true for a round trip and write stale host facts into `shared`.
    get isHost() {
      return connected && !intentionalLeave && !dead && hostId !== void 0 && hostId === room.sessionId;
    },
    get host() {
      return hostId;
    },
    inputs: {
      send(payload) {
        send0(ClientMessage.INPUT, sanitizeFinite(payload), true);
      },
      on(cb) {
        let set = emitters.get(ServerMessage.INPUT);
        if (!set) emitters.set(ServerMessage.INPUT, set = /* @__PURE__ */ new Set());
        const listener = (from, payload) => cb(from, payload);
        set.add(listener);
        return () => void set?.delete(listener);
      }
    },
    onHostTick(hz, cb) {
      let timer = null;
      let last = 0;
      const safeHz = Number.isFinite(hz) && hz > 0 ? Math.min(hz, 100) : 20;
      const intervalMs = Math.max(10, Math.round(1e3 / safeHz));
      const sync = () => {
        const shouldRun = connected && !intentionalLeave && !dead && hostId !== void 0 && hostId === room.sessionId;
        if (shouldRun && !timer) {
          last = nowMs();
          timer = setInterval(() => {
            const t = nowMs();
            cb(Math.min(t - last, MAX_DT_MS));
            last = t;
          }, intervalMs);
        } else if (!shouldRun && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
      const off = on("host", sync);
      hostTickSyncs.add(sync);
      sync();
      return () => {
        off();
        hostTickSyncs.delete(sync);
        if (timer) clearInterval(timer);
        timer = null;
      };
    },
    on,
    send(type, payload) {
      if (!isSendableEventType(type)) {
        console.warn(`[multiplayer] send('${type}') collides with a relay-internal channel \u2014 use a different event name`);
        return;
      }
      send0(type, payload, true);
    },
    chat: {
      send(text) {
        if (typeof text !== "string") return;
        if (!text.trim()) return;
        send0(ClientMessage.CHAT, { text }, true);
      },
      on(cb) {
        chatListeners.add(cb);
        return () => chatListeners.delete(cb);
      },
      get history() {
        return [...chatHistory];
      },
      mute(playerId) {
        if (typeof playerId === "string" && playerId) chatMuted.add(playerId);
      },
      unmute(playerId) {
        chatMuted.delete(playerId);
      },
      get muted() {
        return [...chatMuted];
      }
    },
    voice: {
      async join(options2) {
        await voice.start(options2, true);
        if (!options2?.iceServers?.length) {
          const cfg = await ice.request();
          if (voice.active && cfg?.iceServers?.length) {
            voice.setIceServers(cfg.iceServers);
            scheduleIceRefresh(cfg.ttl);
          }
        }
        if (!voice.active) return;
        send0(ClientMessage.VOICE_JOIN, {}, true);
        voice.releasePeering();
      },
      leave() {
        clearIceRefresh();
        send0(ClientMessage.VOICE_LEAVE, {}, true);
        voice.stop();
      },
      get active() {
        return voice.active;
      },
      get participants() {
        return voice.participants;
      },
      setMicEnabled(on2) {
        voice.setMicEnabled(on2 === true);
      },
      get micEnabled() {
        return voice.micEnabled;
      },
      get speaking() {
        return voice.speaking;
      },
      mute(playerId) {
        voice.mute(playerId);
      },
      unmute(playerId) {
        voice.unmute(playerId);
      },
      setVolume(playerId, volume) {
        voice.setVolume(playerId, volume);
      },
      get muted() {
        return voice.participants.filter((p) => p.muted).map((p) => p.id);
      }
    },
    setRoomOpen(open) {
      send0(ClientMessage.ROOM_OPEN, { open: open === true });
    },
    leave() {
      intentionalLeave = true;
      stopTimers();
      voice.stop();
      clearIceRefresh();
      connected = false;
      syncHostTicks();
      settleAllControls("aborted");
      room.reconnection.enabled = false;
      void room.leave().catch(() => {
      });
    },
    serverNow,
    get rtt() {
      if (!heartbeat) return void 0;
      const rtt = room.clock.smoothedRtt();
      return rtt > 0 ? rtt : void 0;
    },
    get clockSynced() {
      return heartbeat?.synced === true;
    },
    timeUntil
  };
  Object.defineProperty(session, ROOM_REF, { value: () => room, enumerable: false });
  Object.defineProperty(session, /* @__PURE__ */ Symbol.for("genex.multiplayer.internals"), {
    enumerable: false,
    value: {
      senderOf: (streamKey) => streamSender.get(streamKey),
      offsetOf: (streamKey) => {
        const sender = streamSender.get(streamKey);
        return sender === void 0 ? void 0 : clockOffsets.get(sender);
      },
      offsetSamples: (sender) => senderClocks.get(sender)?.samples.length ?? 0,
      bufferLength: (streamKey) => buffers.get(streamKey)?.length ?? 0
    }
  });
  return session;
}
var SEARCH_BACKOFF_MS = [1e3, 2e3, 4e3];
var matchJoinOptions = (opts) => joinOptions(opts.room, opts.name, opts.auth);
function buildView(matchRoom, queueInfo, timeUntil = (epochMs) => epochMs - Date.now()) {
  const raw = matchRoom?.state?.match;
  const parsed = raw ? parseValue(raw) : null;
  const m = parsed && typeof parsed === "object" ? parsed : null;
  if (!m) {
    return {
      status: matchRoom ? "waiting" : "searching",
      role: "player",
      queue: queueInfo,
      players: [],
      connectedPlayers: [],
      opponents: [],
      teams: {},
      myTeam: null,
      scores: {},
      config: {},
      winCondition: "lastStanding",
      championId: null,
      challengerId: null,
      roundId: 0,
      winnerId: null,
      message: matchRoom ? "Waiting for players\u2026" : "Finding a match\u2026",
      startsAt: null,
      endsBy: null,
      startsInMs: null,
      endsInMs: null
    };
  }
  const myId = matchRoom?.sessionId;
  const championId = m.championId ?? null;
  const challengerId = m.challengerId ?? null;
  const teams = m.teams ?? {};
  const players = Array.isArray(m.players) ? m.players : [];
  const connectedPlayers = m.connectedPlayers ?? players;
  const isPlayer = myId != null && players.includes(myId);
  const status = isPlayer ? m.phase : "spectating";
  const opponents = players.filter((id) => id !== myId);
  const myTeam = myId ? Object.keys(teams).find((t) => teams[t]?.includes(myId)) ?? null : null;
  const { winCondition: wc, ...numericCfg } = m.cfg ?? {};
  const deadline = (v) => typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
  const startsAt = deadline(m.startsAt);
  const endsBy = deadline(m.endsBy);
  const remaining = (at) => at === null ? null : Math.max(0, timeUntil(at));
  return {
    status,
    role: isPlayer ? "player" : "spectator",
    queue: { position: 0, size: 0 },
    players,
    connectedPlayers,
    opponents,
    teams,
    myTeam,
    scores: m.scores ?? {},
    config: numericCfg,
    winCondition: wc?.type ?? "lastStanding",
    championId,
    challengerId,
    roundId: m.roundId ?? 0,
    winnerId: m.winnerId ?? null,
    message: m.message ?? "",
    startsAt,
    endsBy,
    startsInMs: remaining(startsAt),
    endsInMs: remaining(endsBy)
  };
}
function matchSend(room, type, payload) {
  if (!room?.connection?.isOpen) return;
  try {
    room.send(type, payload);
  } catch {
  }
}
async function matchmake(opts) {
  const client = await relayClient(opts);
  const predict = await loadPredict(opts.smoothing);
  const emitters = /* @__PURE__ */ new Map();
  const emit = (event, ...args) => emitters.get(event)?.forEach((cb) => cb(...args));
  const on = ((event, cb) => {
    let set = emitters.get(event);
    if (!set) emitters.set(event, set = /* @__PURE__ */ new Set());
    set.add(cb);
    return () => void set?.delete(cb);
  });
  let session = null;
  let matchRoom = null;
  let queueRoom = null;
  let queueInfo = { position: 0, size: 0 };
  let cancelled = false;
  let searching = false;
  let lifecycleEpoch = 0;
  let seating = false;
  let requeueing = false;
  const search = async () => {
    if (cancelled || searching) return;
    searching = true;
    const epoch = ++lifecycleEpoch;
    try {
      session = null;
      matchRoom = null;
      for (let attempt = 0; ; attempt++) {
        if (queueRoom) {
          void queueRoom.leave();
          queueRoom = null;
        }
        queueInfo = { position: 0, size: 0 };
        let q;
        try {
          q = withoutReconnection(await client.joinOrCreate(RoomType.QUEUE, matchJoinOptions(opts)));
        } catch (err) {
          if (cancelled) return;
          const refused = isProtocolRefusal(err);
          if (refused) warnProtocolRefusal();
          const delay = refused ? void 0 : SEARCH_BACKOFF_MS[attempt];
          if (delay == null) {
            if (attempt === 0) await new Promise((r) => setTimeout(r, 0));
            if (cancelled) return;
            emit("error", err);
            return;
          }
          await new Promise((r) => setTimeout(r, delay));
          if (cancelled) return;
          continue;
        }
        if (cancelled || epoch !== lifecycleEpoch) {
          void q.leave();
          return;
        }
        queueRoom = q;
        q.onMessage(ServerMessage.QUEUE, (msg) => {
          queueInfo = { position: msg.position, size: msg.size };
          emit("queue", msg);
        });
        q.onMessage(ServerMessage.SEAT, (msg) => {
          if (cancelled || epoch !== lifecycleEpoch || queueRoom !== q || seating) return;
          seating = true;
          queueRoom = null;
          void q.leave();
          void consumeSeat(msg.reservation, msg.role, epoch);
        });
        q.onLeave(() => {
          if (cancelled || queueRoom !== q) return;
          queueRoom = null;
          void (async () => {
            for (const delayMs of QUEUE_RESEARCH_DELAYS_MS) {
              await new Promise((r) => setTimeout(r, delayMs));
              if (cancelled || queueRoom || session) return;
              await search();
              if (queueRoom || session) return;
            }
          })();
        });
        emit("searching");
        return;
      }
    } finally {
      searching = false;
    }
  };
  const consumeSeat = async (reservation, role, epoch) => {
    try {
      const mr = useSdkReconnection(await client.consumeSeatReservation(reservation));
      if (cancelled || epoch !== lifecycleEpoch) {
        void mr.leave();
        return;
      }
      matchRoom = mr;
      const s = attachSession(mr, { pose: opts.pose, smoothing: opts.smoothing, predict });
      session = s;
      s.on(ServerMessage.MATCH_START, (m) => emit("matchStart", m));
      s.on(ServerMessage.MATCH_ENDED, (m) => emit("matchEnded", m));
      s.on(ServerMessage.MATCH_REQUEUE, () => {
        if (session === s) void requeue();
      });
      s.on("disconnect", (code) => {
        if (cancelled || session !== s) return;
        if (code === CloseCode2.SUPERSEDED || code === CloseCode2.REVOKED) {
          lifecycleEpoch++;
          seating = false;
          matchRoom = null;
          session = null;
          emit("disconnect", code);
          return;
        }
        void requeue();
      });
      if (queueRoom) {
        void queueRoom.leave();
        queueRoom = null;
      }
      emit("matched");
      if (role === "spectator") emit("spectate");
    } catch {
      if (!cancelled && epoch === lifecycleEpoch) {
        seating = false;
        void search();
      }
    } finally {
      if (epoch === lifecycleEpoch) seating = false;
    }
  };
  const requeue = async () => {
    if (cancelled || requeueing) return;
    requeueing = true;
    try {
      lifecycleEpoch++;
      seating = false;
      session?.leave();
      matchRoom = null;
      session = null;
      await search();
    } finally {
      requeueing = false;
    }
  };
  void search();
  const liveRoom = () => session ? roomOf(session) : null;
  let viewSession = null;
  let lastHydratedView = null;
  const stableView = () => {
    if (session !== viewSession) {
      viewSession = session;
      lastHydratedView = null;
    }
    const live = liveRoom();
    const hydrated = !!live?.state?.match;
    if (!hydrated && session && lastHydratedView) return lastHydratedView;
    const next = buildView(live, queueInfo, session ? session.timeUntil : void 0);
    if (hydrated) lastHydratedView = next;
    return next;
  };
  return {
    get session() {
      return session;
    },
    get matchmaking() {
      return stableView();
    },
    on,
    eliminated() {
      matchSend(liveRoom(), ClientMessage.MATCH_ELIMINATED, {});
    },
    score(delta = 1) {
      matchSend(liveRoom(), ClientMessage.MATCH_SCORE, { delta });
    },
    finish() {
      matchSend(liveRoom(), ClientMessage.MATCH_FINISH, {});
    },
    retry() {
      if (cancelled || searching || queueRoom || matchRoom) return;
      void search();
    },
    cancel() {
      cancelled = true;
      lifecycleEpoch++;
      seating = false;
      session?.leave();
      if (!session && matchRoom) void matchRoom.leave();
      if (queueRoom) void queueRoom.leave();
      matchRoom = null;
      queueRoom = null;
      session = null;
    }
  };
}
function wirePrivate(room, options) {
  const emitters = /* @__PURE__ */ new Map();
  const emit = (event, ...args) => emitters.get(event)?.forEach((cb) => cb(...args));
  const on = ((event, cb) => {
    let set = emitters.get(event);
    if (!set) emitters.set(event, set = /* @__PURE__ */ new Set());
    set.add(cb);
    return () => void set?.delete(cb);
  });
  let live = true;
  const session = attachSession(room, options);
  session.on(ServerMessage.MATCH_START, (m) => emit("matchStart", m));
  session.on(ServerMessage.MATCH_ENDED, (m) => emit("matchEnded", m));
  session.on(ServerMessage.MATCH_REQUEUE, () => void (live = false));
  session.on("disconnect", () => void (live = false));
  const liveRoom = () => live ? roomOf(session) : null;
  return {
    get session() {
      return live ? session : null;
    },
    get matchmaking() {
      return buildView(liveRoom(), { position: 0, size: 0 }, session.timeUntil);
    },
    on,
    eliminated() {
      matchSend(liveRoom(), ClientMessage.MATCH_ELIMINATED, {});
    },
    score(delta = 1) {
      matchSend(liveRoom(), ClientMessage.MATCH_SCORE, { delta });
    },
    finish() {
      matchSend(liveRoom(), ClientMessage.MATCH_FINISH, {});
    },
    retry() {
    },
    cancel() {
      session.leave();
      live = false;
    }
  };
}
async function createPrivate(opts) {
  const client = await relayClient(opts);
  const predict = await loadPredict(opts.smoothing);
  const room = useSdkReconnection(await client.create(RoomType.MATCH, matchJoinOptions(opts)));
  const handle = wirePrivate(room, { pose: opts.pose, smoothing: opts.smoothing, predict });
  Object.defineProperty(handle, "code", { value: room.roomId, enumerable: true });
  return handle;
}
async function joinPrivate(code, opts) {
  const client = await relayClient(opts);
  const predict = await loadPredict(opts.smoothing);
  const room = useSdkReconnection(await client.joinById(code, matchJoinOptions(opts)));
  return wirePrivate(room, { pose: opts.pose, smoothing: opts.smoothing, predict });
}
export {
  connect,
  createPrivate,
  joinPrivate,
  matchmake
};

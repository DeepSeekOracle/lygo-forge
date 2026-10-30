import {
  $refId,
  $values,
  Callbacks,
  encode
} from "./chunk-ANQZE3ZO.js";

// node_modules/@colyseus/sdk/build/predict/drift.mjs
var DRIFT_EMA_ALPHA = 0.1;
var DRIFT_PEAK_DECAY = 0.9;
function newDrift() {
  return { ema: 0, peak: 0 };
}
function updateDrift(d, mag) {
  d.ema += (mag - d.ema) * DRIFT_EMA_ALPHA;
  d.peak = Math.max(mag, d.peak * DRIFT_PEAK_DECAY);
}
function resetDrift(d) {
  d.ema = 0;
  d.peak = 0;
}
var FLOAT_NOISE = 1e-3;
function classifyDrift(d, tolerance) {
  const floor = tolerance !== void 0 && tolerance > FLOAT_NOISE ? tolerance : FLOAT_NOISE;
  if (d.ema >= floor) {
    return "diverging";
  }
  if (d.peak >= floor) {
    return "jitter";
  }
  return "matched";
}

// node_modules/@colyseus/sdk/build/predict/predictedEvents.mjs
var DEFAULT_TTL_POLICY = (rtt) => Math.max(rtt * 2, 600);
var PredictedEvents = class _PredictedEvents {
  /**
   * Room-aware factory. Auto-binds `now()` to `room.clock.serverNow()` and
   * wires the optional dynamic-TTL policy with the room's `smoothedRtt()`.
   * Equivalent to `new PredictedEvents() + configure({...})` but one line.
   *
   * Defaults to {@link DEFAULT_TTL_POLICY} (`max(2 × rtt, 600ms)`) when
   * `opts.ttlMs` is omitted — suitable for most optimistic predictions.
   *
   * Use this when you can instantiate after the room is available. For
   * module-load-time declarations (when the room doesn't exist yet),
   * prefer `new PredictedEvents() + configure(...)` instead.
   */
  static get(room, opts = {}) {
    const pe = new _PredictedEvents();
    pe.configure(buildClockConfig(room.clock ?? null, opts.ttlMs ?? DEFAULT_TTL_POLICY));
    if (opts.onReject) {
      pe.configure({ onReject: opts.onReject });
    }
    return pe;
  }
  entries = /* @__PURE__ */ new Map();
  /** Keys marked server-confirmed via a handle's `accept()` — exempt from TTL
   *  eviction while the authoritative schema change is still in flight. */
  accepted = /* @__PURE__ */ new Set();
  cfg = {};
  /** Bind/override default providers for `predict()` and `prune()`. Call
   *  once after the room (and clock) is available; subsequent calls merge.
   *  Per-call args still take precedence over the configured providers. */
  configure(cfg) {
    this.cfg = { ...this.cfg, ...cfg };
  }
  /** Record an optimistic prediction. `at` defaults to the configured
   *  `now()` provider, falling back to `performance.now()`. Returns a handle to
   *  roll it back ({@link PredictedEventHandle.cancel}) or protect it
   *  ({@link PredictedEventHandle.accept}). */
  predict(key, at) {
    this.entries.set(key, at ?? this.cfg.now?.() ?? performance.now());
    return {
      key,
      cancel: () => {
        this.entries.delete(key);
        this.accepted.delete(key);
      },
      accept: () => {
        if (this.entries.has(key)) {
          this.accepted.add(key);
        }
      }
    };
  }
  /** Is there an unconfirmed prediction for this key? */
  has(key) {
    return this.entries.has(key);
  }
  /** The server confirmed the prediction (or the caller wants to drop it). */
  confirm(key) {
    this.entries.delete(key);
    this.accepted.delete(key);
  }
  /** The server overruled this prediction — drop it now and fire `onReject`
   *  (immediate mispredict, vs `confirm`'s silent correct-prediction drop). */
  reject(key) {
    if (this.entries.delete(key)) {
      this.accepted.delete(key);
      this.cfg.onReject?.(key);
    }
  }
  /** Drop entries older than `ttlMs` — they're mispredictions the server
   *  didn't agree with. `now` defaults to the configured `now()` provider;
   *  `ttlMs` defaults to the configured policy (number or function). */
  prune(now2, ttlMs) {
    const t = now2 ?? this.cfg.now?.() ?? performance.now();
    const policy = this.cfg.ttlMs;
    const ttl = ttlMs ?? (typeof policy === "function" ? policy() : policy) ?? Infinity;
    for (const [k, at] of this.entries) {
      if (this.accepted.has(k)) {
        continue;
      }
      if (t - at > ttl) {
        this.entries.delete(k);
        this.cfg.onReject?.(k);
      }
    }
  }
  /** Drop everything. */
  clear() {
    this.entries.clear();
    this.accepted.clear();
  }
  get size() {
    return this.entries.size;
  }
  /** Set when {@link dispose} is called — a driver auto-pruning this store
   *  (the channel/spawn surface wrapping it) drops a `dead` child on its
   *  next tick. */
  dead = false;
  /** Stop being auto-pruned by the owning Predict and drop all entries. */
  dispose() {
    this.dead = true;
    this.entries.clear();
    this.accepted.clear();
  }
};
function buildClockConfig(clock, ttlMs) {
  return {
    now: () => clock?.serverNow() ?? performance.now(),
    ttlMs: typeof ttlMs === "function" ? () => ttlMs(clock?.smoothedRtt() ?? 0) : ttlMs
  };
}

// node_modules/@colyseus/sdk/build/core/utils.mjs
function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// node_modules/@colyseus/sdk/build/debug-channel.mjs
var makeRef = typeof WeakRef !== "undefined" ? (h) => new WeakRef(h) : (h) => ({ deref: () => h });
var MAX_BUFFERED = 64;
function publishDebug(channel, handle) {
  const g = globalThis;
  let reg = g.__colyseusDebug;
  if (!reg) {
    const buffer = [];
    reg = g.__colyseusDebug = {
      __buffer: buffer,
      publish(ch, h) {
        buffer.push([ch, makeRef(h)]);
        if (buffer.length > MAX_BUFFERED) {
          buffer.shift();
        }
      }
    };
  }
  reg.publish(channel, handle);
}
function debugOverlayActive() {
  if (typeof globalThis === "undefined") {
    return false;
  }
  const reg = globalThis.__colyseusDebug;
  return reg != null && reg.__buffer === void 0;
}

// node_modules/@colyseus/sdk/build/predict/divergence.mjs
function diagnosticsActive() {
  return debugOverlayActive();
}
var _lastWarnAt = -Infinity;
var WARN_THROTTLE_MS = 1e3;
function warnReadBeforePump() {
  console.warn(`@colyseus/sdk predict: a predicted value was read BEFORE this frame's input.send() calls. Reads between predict.tick() and the frame's sends are one fixed step stale and stutter on late frames. Send the frame's due inputs right after predict.tick(now) \u2014 tick and pump in your earliest per-frame callback, before anything reads value()/pose(). For game logic (zone checks, hit-reg) read .state/.world instead. See PREDICTION.md \xA74 (frame order).`);
}
function warnMemoCollision(tick, key) {
  console.warn(key === "" ? `@colyseus/sdk predict: two key-less ctx.memo calls ran in one step (input seq ${tick}) \u2014 the key-less form is ONE shared slot per step, so replay returns one frozen value for both (silent re-simulation corruption). Pass distinct keys: ctx.memo("a", \u2026) / ctx.memo("b", \u2026).` : `@colyseus/sdk predict: ctx.memo("${key}") ran twice in one step (input seq ${tick}) \u2014 both calls share one slot on replay. Give each call site its own key (include the loop index for a per-iteration memo).`);
}
function warnDivergence(acked, lastCorrection, ema, tolerance) {
  const t = now();
  if (t - _lastWarnAt < WARN_THROTTLE_MS) {
    return;
  }
  _lastWarnAt = t;
  let worst = "";
  let worstAbs = -1;
  for (const f in lastCorrection) {
    const v = lastCorrection[f];
    const a = v < 0 ? -v : v;
    if (a > worstAbs) {
      worstAbs = a;
      worst = f;
    }
  }
  const delta = worst ? lastCorrection[worst] : ema;
  console.warn(`@colyseus/sdk predict: prediction is diverging at input seq ${acked} \u2014 rolling drift ${ema.toFixed(3)} \u2265 tolerance ${tolerance}; "${worst}" currently off by ${delta.toFixed(3)}. Most likely the client and server simulations disagree: a different fixed dt, mismatched constants, a step function that isn't shared, or an input the server skipped. See PREDICTION.md \xA75 (Determinism).`);
}

// node_modules/@colyseus/sdk/build/predict/rollback.mjs
var MemoStore = class {
  /** seq → (key → memoized value). */
  byTick = /* @__PURE__ */ new Map();
  // Collision diagnostic (live path, diagnostics-gated): keys seen this tick.
  // Tracked separately from byTick — undefined computes are never stored there.
  diagTick = -1;
  diagKeys = /* @__PURE__ */ new Set();
  warnedKeys = /* @__PURE__ */ new Set();
  /**
   * LIVE (`isReplay=false`): run `compute`, memoize a non-`undefined` result
   * under `(tick, key)`, return it. REPLAY (`isReplay=true`): return the memo
   * (or `undefined` if the live step memoized none) WITHOUT running `compute`.
   */
  run(tick, isReplay, key, compute) {
    if (isReplay)
      return this.byTick.get(tick)?.get(key);
    if (diagnosticsActive()) {
      if (tick !== this.diagTick) {
        this.diagTick = tick;
        this.diagKeys.clear();
      } else if (this.diagKeys.has(key) && !this.warnedKeys.has(key)) {
        this.warnedKeys.add(key);
        warnMemoCollision(tick, key);
      }
      this.diagKeys.add(key);
    }
    const v = compute();
    if (v !== void 0) {
      let m = this.byTick.get(tick);
      if (m === void 0) {
        m = /* @__PURE__ */ new Map();
        this.byTick.set(tick, m);
      }
      m.set(key, v);
    }
    return v;
  }
  /** Drop memos for seqs the server has acked (they'll never replay again). */
  prune(acked) {
    for (const tick of this.byTick.keys())
      if (tick <= acked)
        this.byTick.delete(tick);
  }
  clear() {
    this.byTick.clear();
    this.diagTick = -1;
    this.diagKeys.clear();
  }
};
var replayDepth = 0;
function isReplaying() {
  return replayDepth > 0;
}
var RollbackController = class {
  // --- Debug telemetry (no effect on prediction) ---------------------------
  /** Per-numeric-field correction injected by the most recent reconcile — the
   *  raw pop (rendered-before − corrected), nonzero even in snap mode. Reused
   *  object, overwritten each reconcile; read it right after, don't retain. */
  lastCorrection = {};
  /** Max |{@link lastCorrection}| across fields (world/pose units). ~0 ⇒ the
   *  prediction matched the server at the acked input. */
  lastCorrectionMag = 0;
  /** Increments once per reconcile — lets a consumer detect a fresh one
   *  (compare against a stored value) without a callback. */
  reconcileSeq = 0;
  /** Rolling reconcile drift (world/pose units). `ema` = persistent component
   *  (steady nonzero ⇒ divergence / rubber-banding); `peak` = recent decaying
   *  max (a spike over a low `ema` ⇒ network jitter, not divergence). Both ~0 ⇒
   *  the prediction matched the server. Updated once per reconcile. @see Drift */
  drift = newDrift();
  /** Per-field visual offset decaying toward 0 (numeric/pose fields only). */
  error = {};
  /** Previous step's SMOOTHED value (`current + error`) — render interpolates
   *  from this by {@link alpha} so motion is smooth above the step rate. */
  prev = {};
  /** Reused scratch for reconcile's pre-snap rendered values — no per-reconcile alloc. */
  renderedBefore = {};
  lastTick = -1;
  lastAcked = 0;
  /** Cached `input.epoch` — {@link tick} self-resets when the handle's epoch
   *  moves (reconnect / `input.reset()`), so the app never wires it manually. */
  lastEpoch;
  /** Seq floor for replay: inputs sent at/before this aren't replayed (they
   *  applied to a prior life — set to the sent count on {@link reset}). The
   *  unacked INPUTS themselves live on the input handle, not here. */
  replayFrom = 0;
  /** Highest input seq the LIVE prediction has stepped. Advanced by {@link catchUp}
   *  as the app sends (via the `onSend` hook); reconcile brings it back to
   *  `input.sentCount` after replay. */
  predictedSeq = 0;
  /** Re-entrancy guard: a user `step` that reads back a predicted value must not
   *  recurse into {@link catchUp}. */
  catching = false;
  /** Unsubscribe from the input handle's `onSend` (set in the constructor). */
  unsubscribeSend = () => {
  };
  /** Render interpolation accumulator: real time (ms) past the latest APPLIED
   *  step. `renderAlpha() = clamp(renderAcc / stepMs, 0, 1)`. Advanced by frame
   *  time in {@link tick}, consumed one `stepMs` per applied step in
   *  {@link catchUp}. While stepping keeps up it equals the exact fixed-timestep
   *  leftover (smooth) and stays in `[0, stepMs)`. The consume rule (see
   *  {@link catchUp}) is what makes it robust across all four render regimes —
   *  steady play, LOAD offset, PAUSE, and a tab-in HITCH — with no cap or special
   *  case: it grows freely (alpha just clamps at 1, so a pause HOLDS at the latest
   *  step), and every applied step snaps it back into `[0, stepMs)` so play,
   *  resume, and hitch all render smooth. */
  renderAcc = 0;
  /** Frame counter (one bump per {@link tick}) — pairs with
   *  {@link clampedReadTick} to catch render reads that precede the frame's
   *  sends (see {@link noteRenderRead}). */
  tickSeq = 0;
  /** `tickSeq` of the last render read taken while a full step was due but
   *  unapplied (alpha clamped at 1) — armed by {@link noteRenderRead},
   *  checked against the current frame by {@link catchUp}. */
  clampedReadTick = -1;
  /** One-shot: the read-before-pump warning already fired for this controller. */
  warnedStaleRead = false;
  stepCtx;
  /** Ack watermark handed to event sinks with each `ctx.predict` (one shared
   *  closure — no per-emit alloc). @see PredictSink._predictFromSim */
  ackWatermark = () => this.input_.lastProcessed;
  /** Per-seq memo backing `ctx.memo` — computed live, replayed verbatim, pruned on ack. */
  memos = new MemoStore();
  smoothMs;
  /** Teleport pop threshold — see {@link RollbackOptions.snap}. 0 = off. */
  snapThreshold;
  /** The fixed simulation step (ms) this controller predicts at — read by the
   *  owning `Predict` to pace `predict.tick(now)`. */
  stepMs;
  input_;
  onReconcile;
  /** Divergence-warning tolerance; `undefined` ⇒ off. @see warnOnDivergence */
  warnTolerance;
  /** Resolves ctx.reckonTime's unstamped fallback. @see RollbackOptions.clock */
  clock;
  constructor(opts) {
    this.input_ = opts.input;
    this.clock = opts.clock;
    this.smoothMs = opts.smoothMs ?? (this.input_.patchRate ? this.input_.patchRate : 50);
    this.snapThreshold = opts.snap ?? 0;
    const stepMs = opts.stepMs ?? this.input_.stepMs ?? (opts.stepSeconds !== void 0 ? opts.stepSeconds * 1e3 : void 0);
    if (stepMs === void 0) {
      throw new Error("@colyseus/sdk reconciler: fixed simulation step is unknown. The server room must call setFixedTimestep() (or setTimestep()) so the input handle advertises a tick rate, or pass stepMs/stepSeconds explicitly \u2014 a wrong dt silently diverges rollback-replay.");
    }
    this.stepMs = stepMs;
    const dt = opts.stepSeconds ?? this.input_.stepSeconds ?? stepMs / 1e3;
    const subSteps = opts.subSteps ?? this.input_.subSteps ?? 1;
    this.stepCtx = {
      dt,
      dtMs: stepMs,
      tick: 0,
      isReplay: false,
      reckonTime: 0,
      lagCompActive: false,
      subSteps,
      subDt: dt / subSteps,
      subDtMs: stepMs / subSteps,
      // key-less form shares one slot per seq ("" — see StepContext.memo)
      memo: (keyOrCompute, compute) => typeof keyOrCompute === "string" ? this.memos.run(this.stepCtx.tick, this.stepCtx.isReplay, keyOrCompute, compute) : this.memos.run(this.stepCtx.tick, this.stepCtx.isReplay, "", keyOrCompute),
      // live-only by construction: replayed steps re-run the physics, never the event
      predict: (sink, payload) => {
        if (!this.stepCtx.isReplay)
          sink._predictFromSim(this.stepCtx.tick, payload, this.ackWatermark);
      }
    };
    this.onReconcile = opts.onReconcile;
    this.warnTolerance = opts.warnOnDivergence;
    this.lastAcked = this.input_.lastProcessed;
    this.lastEpoch = this.input_.epoch;
    this.predictedSeq = this.input_.sentCount;
    this.unsubscribeSend = this.input_.onSend(() => this.catchUp());
  }
  // --- Shared observe/reconcile loop -----------------------------------------
  /**
   * Advance one render frame (called by the owning `Predict.tick`): stamp the
   * render clock, reconcile if the server acked new input, then decay the
   * smooth-correction error. Live inputs are already stepped (eagerly, via the
   * `onSend` hook), so tick does NOT step them. The interpolation fraction is
   * derived from elapsed render time vs the fixed step (see {@link renderAlpha}),
   * so it holds steady at the latest step when stepping pauses.
   */
  tick(now2) {
    this.tickSeq++;
    const dt = this.lastTick < 0 ? 0 : now2 - this.lastTick;
    this.lastTick = now2;
    if (dt > 0 && this.stepMs > 0)
      this.renderAcc += dt;
    const epoch = this.input_.epoch;
    if (epoch !== this.lastEpoch) {
      this.lastEpoch = epoch;
      this.reset();
    }
    const acked = this.input_.lastProcessed;
    if (acked > this.lastAcked) {
      this.lastAcked = acked;
      this.reconcile(acked);
    }
    this.markDirty();
    if (dt <= 0)
      return;
    const k = this.smoothMs <= 0 ? 1 : 1 - Math.exp(-dt / this.smoothMs);
    for (const f of this.smoothedFields())
      this.error[f] -= this.error[f] * k;
  }
  /**
   * Render interpolation fraction ∈ [0, 1]: how far into the current step interval
   * we are — the {@link renderAcc} leftover over `stepMs`. Eases 0→1 across one
   * step, then CLAMPS at 1 — so when stepping pauses (input gated off on death, a
   * menu, a freeze) the render HOLDS at the latest step instead of sawtoothing
   * back to the previous one. Read by the subclasses' `value`/`pose`.
   */
  renderAlpha() {
    if (this.stepMs <= 0)
      return 1;
    const a = this.renderAcc / this.stepMs;
    return a < 0 ? 0 : a > 1 ? 1 : a;
  }
  /**
   * Record a render read (`value`/`pose` — the subclasses call this at the top
   * of theirs). A read taken while a full fixed step is DUE but not yet applied
   * (`renderAcc ≥ stepMs`, alpha clamped at 1) returns a one-step-stale pose; if
   * this frame's `input.send()` calls then arrive AFTER it, the app rendered
   * stale motion — the read-before-pump wiring bug ({@link catchUp} warns once).
   * The correct frame order is: `predict.tick(now)` → send the due inputs →
   * read `value()`/`pose()`. Raw `state`/`world` reads (game logic, hit-reg)
   * don't come through here and are order-independent. Reads made from inside
   * controller-driven user code (a `step` or effect during catch-up/replay) are
   * skipped — they aren't the app's render pass.
   */
  noteRenderRead() {
    if (this.catching || this.stepMs <= 0 || this.renderAcc < this.stepMs)
      return;
    this.clampedReadTick = this.tickSeq;
  }
  /**
   * Step every input sent since the last catch-up (predict each, zero-latency).
   * Driven by the input handle's `onSend` hook (subscribed in the constructor),
   * so it runs synchronously at the end of each `input.send()` — normally
   * stepping exactly the one just-sent input. The loop (rather than a single
   * step) makes it robust to a missed notification. Idempotent once caught up.
   */
  catchUp() {
    const sent = this.input_.sentCount;
    if (this.predictedSeq >= sent || this.catching)
      return;
    if (this.clampedReadTick === this.tickSeq && !this.warnedStaleRead) {
      this.warnedStaleRead = true;
      warnReadBeforePump();
    }
    this.catching = true;
    this.stepCtx.isReplay = false;
    for (let seq = this.predictedSeq + 1; seq <= sent; seq++) {
      const inp = this.input_.at(seq);
      if (inp !== void 0) {
        this.snapshotPrev();
        this.runStep(seq, inp);
        this.refreshRender();
        this.renderAcc -= this.stepMs;
        if (this.renderAcc < 0)
          this.renderAcc = 0;
        else if (this.renderAcc >= this.stepMs)
          this.renderAcc %= this.stepMs;
      }
      this.predictedSeq = seq;
    }
    this.catching = false;
  }
  /**
   * Set the shared step context for `seq` (tick + reckon instant), then let the
   * subclass run the user step. Used by both the live input path and the
   * reconcile replay loop, so the exact same step invocation drives forward and
   * rollback. `isReplay` is set by the caller before this.
   */
  runStep(seq, input) {
    this.stepCtx.tick = seq;
    const raw = this.input_.reckonTimeAt(seq);
    this.stepCtx.lagCompActive = raw > 0;
    this.stepCtx.reckonTime = raw > 0 ? raw : this.clock !== void 0 ? this.clock.serverNow() : 0;
    this.applyStep(input);
  }
  /**
   * Adopt the authoritative state and replay unacked inputs. Captures the
   * rendered pose first, adopts truth, replays the still-unacked inputs, then
   * re-bases the error so the rendered pose is UNCHANGED at this instant — the
   * correction then decays out via {@link tick}, hiding the pop.
   *
   * WIRE-PRECISION SHORT-CIRCUIT: when {@link truthMatchesAt} reports the
   * prediction at `acked` is wire-indistinguishable from the decoded truth,
   * adopt+replay are SKIPPED and the client keeps its own (full-precision)
   * state. This is what makes lossy wire types (float32 / auto `number`)
   * safe for reconciled fields: adopting a rounded truth over a correct
   * prediction injects rounding noise into the restore point, and at a
   * knife-edge sim branch (a grounded check, a step-up test) that epsilon
   * flips the branch — a real mispredict born from the wire, not the sim.
   * Skipping is also the fast path: a clean reconcile costs one per-field
   * compare instead of adopt + replay × pending. Ack bookkeeping still runs
   * (memo prune, `onReconcile`, zero-correction telemetry).
   */
  reconcile(acked) {
    const diag = this.warnTolerance !== void 0 || diagnosticsActive();
    if (this.truthMatchesAt(acked)) {
      if (diag) {
        for (const f of this.smoothedFields())
          this.lastCorrection[f] = 0;
        this.lastCorrectionMag = 0;
        updateDrift(this.drift, 0);
      }
      this.reconcileSeq++;
      this.memos.prune(acked);
      this.onReconcile?.(acked);
      return;
    }
    const renderedBefore = this.renderedBefore;
    for (const f of this.smoothedFields())
      renderedBefore[f] = this.readCurrent(f) + this.error[f];
    this.adoptTruth();
    const from = Math.max(acked, this.replayFrom);
    this.stepCtx.isReplay = true;
    this.catching = true;
    replayDepth++;
    try {
      for (let seq = from + 1; seq <= this.input_.sentCount; seq++) {
        const inp = this.input_.at(seq);
        if (inp !== void 0)
          this.runStep(seq, inp);
      }
    } finally {
      replayDepth--;
    }
    this.catching = false;
    this.refreshRender();
    this.predictedSeq = this.input_.sentCount;
    const hard = this.smoothMs <= 0;
    const wantMag = diag || this.snapThreshold > 0;
    let mag = 0;
    for (const f of this.smoothedFields()) {
      const correction = renderedBefore[f] - this.readCurrent(f);
      this.error[f] = hard ? 0 : correction;
      if (wantMag) {
        const a = correction < 0 ? -correction : correction;
        if (a > mag)
          mag = a;
      }
      if (diag)
        this.lastCorrection[f] = correction;
    }
    const popped = this.snapThreshold > 0 && mag > this.snapThreshold;
    if (popped) {
      for (const f of this.smoothedFields()) {
        this.error[f] = 0;
        this.prev[f] = this.readCurrent(f);
      }
    }
    this.reconcileSeq++;
    if (diag) {
      this.lastCorrectionMag = mag;
      if (!popped) {
        updateDrift(this.drift, mag);
        if (this.warnTolerance !== void 0 && classifyDrift(this.drift, this.warnTolerance) === "diverging") {
          warnDivergence(acked, this.lastCorrection, this.drift.ema, this.warnTolerance);
        }
      }
    }
    this.memos.prune(acked);
    this.onReconcile?.(acked);
  }
  /** Number of unacknowledged inputs currently buffered. */
  get pendingCount() {
    return this.input_.pendingCount;
  }
  /**
   * Re-seed local state from the authoritative instance(s): clears the error
   * offsets, memos, and the in-flight window (prior-life sends won't replay).
   *
   * Mostly the library's job: the controller self-resets when the input handle
   * resets (reconnect / `input.reset()` — it polls `input.epoch`), and a
   * {@link RollbackOptions.snap} threshold pops big positional jumps
   * (teleport / respawn) with no reset at all. Call this yourself only for
   * discontinuities the library can't see: a schema field changed meaning with
   * no positional jump and no input flow (a round flip in a backgrounded tab),
   * app-side context went stale (a map swap), or in-flight inputs the app
   * knows are void (death).
   */
  reset() {
    this.reseedState();
    resetDrift(this.drift);
    this.replayFrom = this.input_.sentCount;
    this.predictedSeq = this.input_.sentCount;
    this.lastAcked = this.input_.lastProcessed;
    this.renderAcc = 0;
    this.memos.clear();
    this.markDirty();
  }
  /** Set when {@link dispose} is called — the owning Predict drops a `dead`
   *  child from its drive list on the next tick. */
  dead = false;
  /** Teardown hooks run synchronously by {@link dispose} (after `dead` is
   *  set) — the owning Predict restores its `value()` overlay here, so bound
   *  reads fall back the instant the controller dies, not a tick later. */
  disposedHooks = [];
  /** Register a teardown hook for {@link dispose}. Idempotent-safe: hooks run
   *  once (the list is drained). */
  onDisposed(hook) {
    this.disposedHooks.push(hook);
  }
  /** Stop being driven by the owning Predict and unsubscribe from the input
   *  handle's sends. Runs {@link onDisposed} hooks synchronously. */
  dispose() {
    this.dead = true;
    this.unsubscribeSend();
    for (const hook of this.disposedHooks.splice(0))
      hook();
  }
  /**
   * Is the prediction AT the acked seq wire-indistinguishable from the decoded
   * authoritative truth? `true` short-circuits {@link reconcile} (no adopt, no
   * replay — the client's own full-precision state stands). Requires per-seq
   * predicted-state history plus knowledge of each field's wire precision, so
   * only the flat `Reconciler` implements it (its truth is a declared `fields`
   * list on one schema instance); `SimReconciler` can't see through its
   * `adopt`/`pose` closures and inherits this default.
   */
  truthMatchesAt(_acked) {
    return false;
  }
  /** Refresh any derived render state after a step (SimReconciler re-samples its
   *  pose). Called after each live catch-up step and once after reconcile replay.
   *  Default no-op (the flat Reconciler mutates its state in place). */
  refreshRender() {
  }
  /** Invalidate any cached render pose after state/alpha changes. Default no-op
   *  (the flat Reconciler recomputes `value()` on read). */
  markDirty() {
  }
};

// node_modules/@colyseus/sdk/build/predict/predictedEventChannel.mjs
var SINGLETON_KEY = 0;
var DEFAULT_GRACE_TICKS = 10;
var PredictedEventChannel = class {
  opts;
  /** Settlement engine: TTL clock + accepted-exemption live here. */
  store;
  /** Pending payloads by entry key (payload echoed to the settle callbacks).
   *  `acked` is the emitting controller's watermark (sim-born entries only). */
  entries = /* @__PURE__ */ new Map();
  now;
  cooldownUntil = -Infinity;
  warnedReplayPredict = false;
  constructor(opts, clock) {
    this.opts = opts;
    this.now = () => clock?.serverNow() ?? performance.now();
    this.store = PredictedEvents.get({ clock }, {
      ttlMs: opts.ttlMs ?? DEFAULT_TTL_POLICY,
      // one internal rejection path — TTL prune and explicit reject() both land here
      onReject: (key) => {
        const e = this.entries.get(key);
        this.entries.delete(key);
        if (e)
          this.opts.onReject?.(e.payload);
      }
    });
  }
  /** Sim-born prediction — reached via `ctx.predict(channel, payload)`, which
   *  only forwards LIVE steps (replays are filtered before this is called). */
  _predictFromSim(seq, payload, acked) {
    this.add(seq, payload, acked);
  }
  /**
   * Predict from OUTSIDE the sim (a UI-optimistic action with no rollback
   * timeline). Inside a reconciler `step`, use `ctx.predict(channel, payload)`
   * instead — this form is backstopped (a call that lands inside a rollback
   * replay no-ops and warns once) but the ctx form is live-only by
   * construction.
   */
  predict(payload) {
    if (isReplaying()) {
      if (!this.warnedReplayPredict) {
        this.warnedReplayPredict = true;
        console.warn(`@colyseus/sdk: PredictedEventChannel${this.opts.label ? ` "${this.opts.label}"` : ""}.predict() was called during a rollback replay and ignored. Inside a reconciler step, use ctx.predict(channel, payload).`);
      }
      return;
    }
    this.add(-1, payload);
  }
  add(seq, payload, acked) {
    const key = this.opts.uniqueBy !== void 0 ? this.opts.uniqueBy(payload) : typeof payload === "string" || typeof payload === "number" ? payload : SINGLETON_KEY;
    if (this.entries.has(key))
      return;
    const t = this.now();
    if (this.opts.cooldownMs !== void 0) {
      if (t < this.cooldownUntil)
        return;
      this.cooldownUntil = t + this.opts.cooldownMs;
    }
    const handle = this.store.predict(key, t);
    if (acked !== void 0)
      handle.accept();
    this.entries.set(key, { payload, seq, acked });
    this.opts.onPredict?.(payload);
  }
  /** Is a prediction pending? With `key`, that entry; without, any. */
  has(key) {
    return key === void 0 ? this.entries.size > 0 : this.entries.has(key);
  }
  /** Number of pending (unsettled) predictions. */
  get pendingCount() {
    return this.entries.size;
  }
  /**
   * The server agreed: settle the entry for `key` — or EVERY pending entry
   * when omitted (the single-pending shape). Fires `onConfirm` per settled
   * entry; never `onReject`. Returns how many entries were settled — `0`
   * means the event arrived unpredicted (the caller usually plays the
   * feedback it skipped optimistically); {@link
   * PredictedEventChannelOptions.onUnpredicted} is the push form of that.
   *
   * ORDERING GUARANTEES:
   *   - the entry is removed BEFORE its `onConfirm` fires — `has(key)`
   *     inside `onConfirm` is already `false`. Branch on the callbacks
   *     (`onConfirm` = we predicted it, `onUnpredicted` = we didn't), never
   *     on a `has()` pre-read racing the confirm.
   *   - when nothing settles, `onUnpredicted` fires with the key.
   */
  confirm(key) {
    let n = 0;
    for (const k of this.settleKeys(key)) {
      const e = this.entries.get(k);
      if (e === void 0)
        continue;
      this.entries.delete(k);
      this.store.confirm(k);
      this.opts.onConfirm?.(e.payload);
      n++;
    }
    if (n === 0)
      this.opts.onUnpredicted?.(key);
    return n;
  }
  /** The server overruled: reject the entry for `key` — or every pending
   *  entry when omitted. Fires `onReject` per entry. Returns the count. */
  reject(key) {
    let n = 0;
    for (const k of this.settleKeys(key)) {
      if (!this.entries.has(k))
        continue;
      this.store.reject(k);
      n++;
    }
    return n;
  }
  settleKeys(key) {
    return key !== void 0 ? [key] : [...this.entries.keys()];
  }
  /** Drop every pending entry SILENTLY (no callbacks) — respawns, scene
   *  teardown, "this life's predictions no longer apply". */
  clear() {
    this.entries.clear();
    this.store.clear();
  }
  /** Per-frame drive (the owning Predict calls this from `tick()`):
   *  sim-born grace-tick auto-rejects first, then wall-clock TTL eviction. */
  prune() {
    if (this.entries.size > 0) {
      const grace = this.opts.graceTicks ?? DEFAULT_GRACE_TICKS;
      for (const [key, e] of [...this.entries]) {
        if (e.acked !== void 0 && e.acked() >= e.seq + grace)
          this.store.reject(key);
      }
    }
    this.store.prune();
  }
  /** Set by {@link dispose} — the owning Predict drops a dead channel from
   *  its drive list on the next tick. */
  dead = false;
  /** Teardowns drained by {@link dispose} — populated by the owning
   *  Predict's `defineEvent` (`confirmOn` bindings). @internal */
  teardowns = [];
  /** @internal */
  _addTeardown(fn) {
    this.teardowns.push(fn);
  }
  /** Stop being driven and drop all entries (silently). */
  dispose() {
    for (const fn of this.teardowns.splice(0))
      fn();
    this.dead = true;
    this.clear();
    this.store.dispose();
  }
};

// node_modules/@colyseus/sdk/build/predict/predictedSpawns.mjs
var PredictedSpawns = class {
  opts;
  clock;
  correlate;
  ttl;
  /** Master index: every live entry (pending + confirmed + foreign), in
   *  insertion order — FIFO correlation walks this picking the oldest
   *  still-`pending` entry. */
  byId = /* @__PURE__ */ new Map();
  /** Secondary index: authoritative instance → entry, for `onRemove`. */
  byServer = /* @__PURE__ */ new Map();
  nextId = 1;
  lastTickAt;
  detach;
  /** Set by {@link dispose}; the owning Predict drops a `dead` child on its
   *  next tick. */
  dead = false;
  constructor(opts = {}, clock = null) {
    this.opts = opts;
    this.clock = clock;
    this.correlate = opts.correlate ?? "fifo";
    this.ttl = opts.ttl ?? DEFAULT_TTL_POLICY;
  }
  /**
   * Wire the store to a collection's add/remove stream. `subscribe` receives
   * the store's handlers and returns a detacher. Called once by
   * `predict.spawns(...)`; call it yourself for standalone use, e.g.
   *
   * ```ts
   * const cb = Callbacks.get(room);
   * spawns.attach((onAdd, onRemove) => {
   *   const a = cb.onAdd("bullets", onAdd);
   *   const r = cb.onRemove("bullets", onRemove);
   *   return () => { a?.(); r?.(); };
   * });
   * ```
   */
  attach(subscribe) {
    this.detach?.();
    this.detach = subscribe(this.handleAdd, this.handleRemove);
  }
  /** Record an optimistic local spawn. Returns a handle for cancellation. */
  spawn(local) {
    const id = this.nextId++;
    const data = this.makeData();
    const entry = { id, server: void 0, local, state: "pending", at: this.now(), leadMs: 0, accepted: false, data };
    this.byId.set(id, entry);
    return {
      id,
      local,
      data,
      // Pending-safe: a confirmed entry is owned by the authoritative entity,
      // so a late rollback must not delete it.
      cancel: () => {
        const e = this.byId.get(id);
        if (e && e.state === "pending") {
          this.byId.delete(id);
        }
      },
      accept: () => {
        const e = this.byId.get(id);
        if (e) {
          e.accepted = true;
        }
      }
    };
  }
  handleAdd = (server, _key) => {
    if (this.byServer.has(server)) {
      return;
    }
    const matched = this.isOwned(server) ? this.takeMatch(server) : void 0;
    if (matched) {
      this.confirmEntry(matched, server);
    } else {
      const entry = { id: this.nextId++, server, local: void 0, state: "confirmed", at: void 0, leadMs: 0, accepted: false, data: this.makeData() };
      this.byId.set(entry.id, entry);
      this.byServer.set(server, entry);
    }
  };
  /** Transition a matched pending entry to confirmed in place (the live object
   *  is reused across handoff — same `id`). */
  confirmEntry(entry, server) {
    entry.server = server;
    entry.state = "confirmed";
    const spawnTime = this.opts.spawnTime;
    if (spawnTime !== void 0 && entry.at !== void 0) {
      entry.leadMs = spawnTime(server) - entry.at;
    }
    this.byServer.set(server, entry);
  }
  handleRemove = (server, _key) => {
    const entry = this.byServer.get(server);
    if (entry) {
      this.byServer.delete(server);
      this.byId.delete(entry.id);
    }
  };
  /** Find a pending local to pair with `server`, per the correlation
   *  strategy. The matched entry transitions in place (not removed). */
  takeMatch(server) {
    const corr = this.correlate;
    if (typeof corr !== "function") {
      for (const entry of this.byId.values()) {
        if (entry.state === "pending") {
          return entry;
        }
      }
      return void 0;
    }
    for (const entry of this.byId.values()) {
      if (entry.state === "pending" && corr(entry.local, server)) {
        return entry;
      }
    }
    return void 0;
  }
  isOwned(server) {
    return this.opts.owned ? this.opts.owned(server) : true;
  }
  makeData() {
    return this.opts.data ? this.opts.data() : void 0;
  }
  /**
   * Advance pending locals via {@link PredictedSpawnsOptions.step}.
   * Confirmed/foreign entries are left to the authoritative state.
   *
   * With a clock, `dt` is derived on the clock's `serverNow()` axis — the
   * SAME axis `at` (and thus the measured input lead) live on — so a pending
   * local's flight and the confirmed entity's lead-reckon are the same
   * expression by construction: the handoff cannot jump, no matter how
   * biased or drifty the client's server-clock estimate is. Without a
   * clock, `now` (typically `performance.now()`) paces the step.
   */
  tick(now2 = performance.now()) {
    const step = this.opts.step;
    const t = this.clock !== null ? this.clock.serverNow() : now2;
    if (step !== void 0 && this.lastTickAt !== void 0) {
      const dt = Math.max(0, (t - this.lastTickAt) / 1e3);
      if (dt > 0) {
        for (const entry of this.byId.values()) {
          if (entry.state === "pending") {
            step(entry.local, dt);
          }
        }
      }
    }
    this.lastTickAt = t;
  }
  /** Drop pending locals older than the TTL policy — mispredicts the server
   *  never confirmed. Uses `serverNow()` and the RTT-aware TTL. */
  prune() {
    if (this.byId.size === 0) {
      return;
    }
    const now2 = this.now();
    const ttl = this.ttl(this.clock?.smoothedRtt() ?? 0);
    for (const entry of this.byId.values()) {
      if (entry.state === "pending" && !entry.accepted && entry.at !== void 0 && now2 - entry.at > ttl) {
        this.byId.delete(entry.id);
        this.opts.onReject?.(entry.local, entry.id);
      }
    }
  }
  /** Iterate the merged view — exactly one entry per logical entity. */
  entries() {
    return this.byId.values();
  }
  /** The entry an authoritative instance collapsed onto (or was surfaced as,
   *  for foreign entities) — e.g. to reach `leadMs`/`data` from a collection
   *  callback that only has the server instance. */
  entryFor(server) {
    return this.byServer.get(server);
  }
  /**
   * Unified field read across the predicted → authoritative handoff:
   * pending entries read the stepped local; confirmed entries read the
   * authoritative instance through the bound reader — `predict.value()`
   * (reckoned, lead-aware) when created via `predict.spawns(...)` with
   * `fields`, a raw field read otherwise. Render from this and the handoff
   * is invisible: same `id`, same timeline, one code path.
   */
  value(entry, field) {
    if (entry.server !== void 0) {
      return this.readServer(entry.server, field);
    }
    return entry.local[field];
  }
  /** Route confirmed-entry `value()` reads (wired by `predict.spawns` to its
   *  reckon slots; standalone stores keep the raw default). */
  bindReader(read) {
    this.readServer = read;
  }
  readServer = (server, field) => server[field];
  /** Is `id` still live this frame? Useful for despawning stale sprites. */
  alive(id) {
    return this.byId.has(id);
  }
  /** Total live entries (pending + confirmed + foreign). */
  get size() {
    return this.byId.size;
  }
  /** Drop all predictions and tracked entries (keeps the subscription). */
  clear() {
    this.byId.clear();
    this.byServer.clear();
  }
  /** Detach from the collection, drop everything, and mark dead so the owning
   *  Predict stops driving it. */
  dispose() {
    this.dead = true;
    this.detach?.();
    this.detach = void 0;
    this.clear();
  }
  now() {
    return this.clock?.serverNow() ?? performance.now();
  }
};

// node_modules/@colyseus/sdk/build/core/schema-reflect.mjs
var $METADATA = Symbol.metadata ?? /* @__PURE__ */ Symbol.for("Symbol.metadata");
var $VALUES = $values;
function refIdOf(instance) {
  return instance[$refId];
}
function metadataOf(instance) {
  return instance.constructor[$METADATA];
}
function fieldIndexOf(instance, field) {
  const idx = metadataOf(instance)?.[field];
  return typeof idx === "number" ? idx : -1;
}
function scalarFieldNamesOf(instance) {
  const meta = metadataOf(instance);
  if (!meta)
    return [];
  const names = [];
  for (let i = 0; ; i++) {
    const f = meta[i];
    if (!f || typeof f.name !== "string")
      break;
    if (typeof f.type === "string")
      names.push(f.name);
  }
  return names;
}
var NON_NUMERIC_SCALAR = {
  string: true,
  boolean: true,
  bigint64: true,
  biguint64: true
};
function scalarFieldsOf(instance) {
  const meta = metadataOf(instance);
  const fields = [];
  const numeric = [];
  if (meta) {
    for (let i = 0; ; i++) {
      const f = meta[i];
      if (!f || typeof f.name !== "string")
        break;
      if (typeof f.type !== "string")
        continue;
      fields.push(f.name);
      if (NON_NUMERIC_SCALAR[f.type] === void 0)
        numeric.push(f.name);
    }
  }
  return { fields, numeric };
}
var identityQuantizer = (v) => v;
function quantizeAutoNumber(v) {
  if (Number.isNaN(v))
    return 0;
  if (!Number.isFinite(v))
    return v > 0 ? Number.MAX_SAFE_INTEGER : -Number.MAX_SAFE_INTEGER;
  if (v !== (v | 0)) {
    if (Math.abs(v) <= 34028235e31) {
      const f = Math.fround(v);
      if (Math.abs(Math.abs(f) - Math.abs(v)) < 1e-4)
        return f;
    }
  }
  return v;
}
function wireQuantizerOf(instance, field) {
  const meta = metadataOf(instance);
  const idx = meta?.[field];
  const decl = typeof idx === "number" ? meta[idx] : void 0;
  switch (decl?.type) {
    case "float32":
      return Math.fround;
    case "number":
      return quantizeAutoNumber;
    default:
      return identityQuantizer;
  }
}
var SNAPSHOT_UNROLL_WIDTH = 16;
function makeUnrolledSnapshot(fieldNames) {
  if (fieldNames.length > SNAPSHOT_UNROLL_WIDTH) {
    const names = fieldNames;
    return (e) => {
      const o = {};
      for (let i = 0; i < names.length; i++)
        o[names[i]] = e[names[i]];
      return o;
    };
  }
  const n0 = fieldNames[0], n1 = fieldNames[1], n2 = fieldNames[2], n3 = fieldNames[3], n4 = fieldNames[4], n5 = fieldNames[5], n6 = fieldNames[6], n7 = fieldNames[7], n8 = fieldNames[8], n9 = fieldNames[9], n10 = fieldNames[10], n11 = fieldNames[11], n12 = fieldNames[12], n13 = fieldNames[13], n14 = fieldNames[14], n15 = fieldNames[15];
  return (e) => {
    const o = {};
    if (n0 !== void 0)
      o[n0] = e[n0];
    if (n1 !== void 0)
      o[n1] = e[n1];
    if (n2 !== void 0)
      o[n2] = e[n2];
    if (n3 !== void 0)
      o[n3] = e[n3];
    if (n4 !== void 0)
      o[n4] = e[n4];
    if (n5 !== void 0)
      o[n5] = e[n5];
    if (n6 !== void 0)
      o[n6] = e[n6];
    if (n7 !== void 0)
      o[n7] = e[n7];
    if (n8 !== void 0)
      o[n8] = e[n8];
    if (n9 !== void 0)
      o[n9] = e[n9];
    if (n10 !== void 0)
      o[n10] = e[n10];
    if (n11 !== void 0)
      o[n11] = e[n11];
    if (n12 !== void 0)
      o[n12] = e[n12];
    if (n13 !== void 0)
      o[n13] = e[n13];
    if (n14 !== void 0)
      o[n14] = e[n14];
    if (n15 !== void 0)
      o[n15] = e[n15];
    return o;
  };
}

// node_modules/@colyseus/sdk/build/predict/reconciler.mjs
var asScalar = (v) => typeof v === "number" ? v : typeof v === "boolean" ? v ? 1 : 0 : NaN;
var Reconciler = class extends RollbackController {
  /** The current predicted step state (the "true" state, advanced one fixed
   *  step per input). Read raw for logic; rendered via interpolation. */
  local = {};
  fields;
  numericFields = [];
  step;
  instance;
  // --- Wire-precision-aware reconcile (see RollbackController.truthMatchesAt) --
  /** Per-field wire quantizer, parallel to `fields`: maps a predicted float64
   *  to the exact value the wire would deliver (fround for `float32`, the
   *  codec's dynamic rule for auto `number`, identity for exact types). */
  wireRound = [];
  /** Per-seq predicted-state ring (values via {@link asScalar}): slot
   *  `seq % size` holds the post-step field values for that seq; `historySeq`
   *  validates the slot (-1 = empty). Written on every applied step — live AND
   *  replay, so after a rollback the ring tracks the post-rollback trajectory.
   *  Sized to the input handle's replay ring: same seq window, ages out together. */
  history;
  historySeq;
  historySize;
  /** False when a declared field isn't a number/boolean at construction (the
   *  ring can't represent it) — the short-circuit is then disabled and every
   *  reconcile adopts, exactly the pre-history behavior. */
  historyOn;
  /** Schema scalars absent from an EXPLICIT `fields` list — the dev
   *  diagnostic's watch set. null ⇒ diagnostic off (derived list, complete
   *  list, or no metadata): applyStep's check is then one null compare. */
  undeclared = null;
  /** Cached dev proxy over `local` handed to `step` while the debug overlay
   *  is active (see {@link stepView}). */
  devView = null;
  constructor(instance, opts) {
    super(opts);
    this.instance = instance;
    const explicit = opts.fields;
    const fields = explicit ?? scalarFieldsOf(instance).fields;
    if (explicit === void 0 && fields.length === 0) {
      throw new Error("predict.reconciler(): no `fields` given and none derivable \u2014 the instance has no schema metadata (a plain object, or a schema with no scalar fields). Pass the decoded instance from room.state, or list `fields` explicitly.");
    }
    this.fields = fields;
    this.step = opts.step;
    let scalarOnly = this.fields.length > 0;
    for (const f of this.fields) {
      const v = instance[f];
      this.local[f] = v;
      if (typeof v === "number") {
        this.numericFields.push(f);
        this.prev[f] = v;
        this.error[f] = 0;
      } else if (typeof v !== "boolean")
        scalarOnly = false;
      this.wireRound.push(wireQuantizerOf(instance, f));
    }
    this.historyOn = scalarOnly;
    this.historySize = this.input_.replayBufferSize ?? 64;
    this.history = new Float64Array(this.historyOn ? this.historySize * this.fields.length : 0);
    this.historySeq = new Float64Array(this.historyOn ? this.historySize : 0).fill(-1);
    if (explicit !== void 0) {
      const declared = new Set(this.fields);
      const rest = scalarFieldsOf(instance).fields.filter((f) => !declared.has(f));
      if (rest.length > 0)
        this.undeclared = new Set(rest);
    }
  }
  /**
   * The TRUE predicted state — read it for game logic, and mutate it directly
   * to apply a per-step side-effect (e.g. a collision bounce). It carries no
   * interpolation / smooth-correction offset (that's what {@link value} adds
   * for rendering). To survive a reconcile, a mutation must be reproducible by
   * `step` during replay — record it per-seq and re-apply it inside `step`.
   *
   * Always current — inputs are stepped eagerly as you `send()` them (the
   * reconciler observes the handle). Plain object access — no string-keyed
   * get/set, no mutator closure. The reconciler tracks ONE entity, so its state
   * is naturally a single struct; this ports to `state.vy = …` in C# / Lua and
   * `state->vy = …` in C.
   */
  get state() {
    return this.local;
  }
  /** @internal Bound registrations for the owning Predict's `value()` overlay:
   *  this reconciler's numeric fields on its one instance, pose key = field
   *  name ({@link value} already reads by field). Empty source refId (plain
   *  test fixtures) is skipped by the overlay installer. */
  get boundRegistrations() {
    return [{ source: this.instance, fields: this.numericFields, poseKeys: this.numericFields }];
  }
  /**
   * Rendered value: the predicted state interpolated between the previous and
   * current fixed step by {@link renderAlpha}, plus the decaying correction
   * offset. Smooth above the step rate (at ~one step of render latency). Numeric
   * fields only; non-numeric fields return the current value verbatim.
   */
  value(field) {
    this.noteRenderRead();
    const c = this.local[field];
    if (typeof c !== "number")
      return c;
    const smoothed = c + (this.error[field] ?? 0);
    const p = this.prev[field] ?? smoothed;
    return p + (smoothed - p) * this.renderAlpha();
  }
  // --- RollbackController hooks ----------------------------------------------
  smoothedFields() {
    return this.numericFields;
  }
  readCurrent(field) {
    return this.local[field];
  }
  applyStep(input) {
    const state = this.undeclared !== null && diagnosticsActive() ? this.stepView() : this.local;
    this.step(this.stepCtx, state, input);
    if (this.historyOn) {
      const seq = this.stepCtx.tick;
      const slot = seq % this.historySize;
      const base = slot * this.fields.length;
      for (let i = 0; i < this.fields.length; i++) {
        this.history[base + i] = asScalar(this.local[this.fields[i]]);
      }
      this.historySeq[slot] = seq;
    }
  }
  /** Dev-only view of `local` for `step`: warns ONCE per schema scalar missing
   *  from the explicit `fields` list on first read/write — the "step touched a
   *  field the reconciler doesn't mirror" hazard (prediction integrates on a
   *  stale value; rubber-bands only under latency). String keys only: symbols
   *  (runtime probes) and non-schema scratch keys forward untouched. Built
   *  lazily on the first overlay-active step, then cached — identity is stable
   *  across live and replay steps. Non-semantic by construction (forwards
   *  everything unchanged) — ports substitute a native check or skip it, see
   *  PORTING.md. */
  stepView() {
    if (this.devView !== null)
      return this.devView;
    const undeclared = this.undeclared;
    const warned = /* @__PURE__ */ new Set();
    const check = (verb, prop) => {
      if (typeof prop !== "string" || !undeclared.has(prop) || warned.has(prop))
        return;
      warned.add(prop);
      console.warn(`@colyseus/sdk predict: step ${verb} "${prop}" \u2014 a schema field NOT in this reconciler's \`fields\` list, so it is never mirrored or replayed: prediction integrates on top of a stale value and rubber-bands under latency. Add "${prop}" to \`fields\`, or omit \`fields\` to mirror every scalar field. Read adopt-only fields off the raw instance instead of the predicted state.`);
    };
    this.devView = new Proxy(this.local, {
      get(t, prop, recv) {
        check("read", prop);
        return Reflect.get(t, prop, recv);
      },
      set(t, prop, v, recv) {
        check("wrote", prop);
        return Reflect.set(t, prop, v, recv);
      }
    });
    return this.devView;
  }
  /**
   * Wire-precision compare: the prediction at `acked` (from the history ring)
   * against the decoded truth on the instance, each predicted value passed
   * through its field's wire quantizer. All fields indistinguishable ⇒ the
   * wire could not have told the server anything different ⇒ skip adopt+replay
   * (see {@link RollbackController.reconcile}). Any miss — ring slot aged out
   * or pre-reset, NaN, a genuine mismatch — falls back to a full adopt.
   */
  truthMatchesAt(acked) {
    if (!this.historyOn)
      return false;
    const slot = acked % this.historySize;
    if (this.historySeq[slot] !== acked)
      return false;
    const base = slot * this.fields.length;
    const inst = this.instance;
    for (let i = 0; i < this.fields.length; i++) {
      if (this.wireRound[i](this.history[base + i]) !== asScalar(inst[this.fields[i]]))
        return false;
    }
    return true;
  }
  snapshotPrev() {
    for (const f of this.numericFields)
      this.prev[f] = this.local[f] + this.error[f];
  }
  adoptTruth() {
    const inst = this.instance;
    for (const f of this.fields)
      this.local[f] = inst[f];
  }
  reseedState() {
    const inst = this.instance;
    for (const f of this.fields)
      this.local[f] = inst[f];
    for (const f of this.numericFields) {
      this.prev[f] = this.local[f];
      this.error[f] = 0;
    }
    this.historySeq.fill(-1);
  }
};

// node_modules/@colyseus/sdk/build/predict/simReconciler.mjs
var SimReconciler = class extends RollbackController {
  /** Your world handle — set once at construction (bound entries already
   *  materialized into mirrors), passed to every callback, never swapped. */
  worldHandle;
  /** Auto-bound entries (decoded schema instances found in `world`),
   *  resolved once at construction. Empty for fully-opaque worlds. */
  bindings = [];
  /** Current step's RAW pose, refreshed after every step: bound
   *  `"<part>.<field>"` fields read off the mirrors + the custom `pose`
   *  callback's fields (written after — custom wins on key collision). */
  curPose = {};
  /** Pose field names (bound keys ∪ custom keys), captured on the first
   *  {@link refreshPose}. */
  poseFields = [];
  /** The custom `pose` callback's own field names (first-call snapshot). */
  customFields = [];
  fieldsReady = false;
  /** Reused scratch for {@link pose}: smoothed prev/cur endpoints + memo. */
  poseA = {};
  poseB = {};
  renderPose = {};
  /** Set whenever the pose endpoints/alpha change; {@link pose} recomputes once. */
  poseDirty = true;
  step;
  adopt;
  /** The `pose` option callback, stored under a distinct name so it doesn't
   *  shadow the public {@link pose} method. */
  readPose;
  interpolate;
  constructor(opts) {
    super(opts);
    const world = opts.world;
    for (const part of Object.keys(world)) {
      const src = world[part];
      if (src === null || typeof src !== "object")
        continue;
      if (refIdOf(src) === void 0) {
        if (metadataOf(src) !== void 0) {
          throw new Error(`predict.sim(): world.${part} is a schema instance that hasn't been decoded (no refId). Pass the decoded instance from room.state (e.g. inside onAdd), or a plain object for opaque scratch.`);
        }
        continue;
      }
      const { fields, numeric } = scalarFieldsOf(src);
      if (fields.length === 0) {
        throw new Error(`predict.sim(): world.${part} is a decoded ref with no scalar fields to bind. Binding a whole COLLECTION isn't supported (yet) \u2014 spread its children into world parts (one entry per entity, fixed at construction). Nest a scalar-less instance below a plain wrapper if you meant it as an opaque handle.`);
      }
      const mirror = {};
      for (const f of fields)
        mirror[f] = src[f];
      world[part] = mirror;
      const poseKeys = numeric.map((f) => `${part}.${f}`);
      this.bindings.push({ source: src, mirror, fields, numeric, poseKeys });
    }
    if (this.bindings.length === 0 && opts.adopt === void 0) {
      throw new Error("predict.sim(): no restore point \u2014 world has no schema-bound entries and no adopt() was provided. Put decoded schema instances in world (auto-bound), or provide adopt().");
    }
    this.worldHandle = opts.world;
    this.step = opts.step;
    this.adopt = opts.adopt;
    this.readPose = opts.pose;
    this.interpolate = opts.interpolate;
    this.refreshPose();
    for (const f of this.poseFields) {
      this.prev[f] = this.curPose[f];
      this.error[f] = 0;
    }
  }
  /** Read the world pose into {@link curPose}: bound fields off the mirrors,
   *  then the custom `pose` callback's fields (custom wins on collision).
   *  Captures the pose field set once, on the first call. */
  refreshPose() {
    const cur = this.curPose;
    for (const b of this.bindings) {
      const { mirror, numeric, poseKeys } = b;
      for (let i = 0; i < numeric.length; i++)
        cur[poseKeys[i]] = mirror[numeric[i]];
    }
    if (this.readPose !== void 0) {
      const pose = this.readPose(this.worldHandle);
      if (!this.fieldsReady)
        this.customFields = Object.keys(pose);
      for (const f of this.customFields)
        cur[f] = pose[f];
    }
    if (!this.fieldsReady) {
      const keys = [];
      for (const b of this.bindings)
        for (const k of b.poseKeys)
          keys.push(k);
      for (const f of this.customFields)
        if (!keys.includes(f))
          keys.push(f);
      this.poseFields = keys;
      this.fieldsReady = true;
    }
    this.poseDirty = true;
  }
  /** Your world handle (passed to every callback). Bound entries read as their
   *  plain mirrors — capture parts from HERE (post-construction), not from the
   *  literal you passed in. Always current — inputs are stepped eagerly as you
   *  `send()` them (the reconciler observes the handle). */
  get world() {
    return this.worldHandle;
  }
  /** @internal Bound (instance, numeric field, pose key) registrations for the
   *  owning Predict's `value()` overlay — one entry per bound world part. */
  get boundRegistrations() {
    return this.bindings.map((b) => ({ source: b.source, fields: b.numeric, poseKeys: b.poseKeys }));
  }
  /**
   * Rendered value for one pose field — bound fields by their dotted key
   * (`"paddle.x"`), custom pose fields by their own name: the predicted pose
   * interpolated between the previous and current fixed step by
   * {@link renderAlpha}, plus the decaying correction offset. When a custom
   * {@link SimReconcilerOptions.interpolate} is set, reads it off the
   * interpolated {@link pose}. For bound entities prefer the room-wide idiom
   * `predict.value(instance, field)` — same value, no handle threading.
   */
  value(field) {
    this.noteRenderRead();
    if (this.interpolate)
      return this.pose()[field];
    const c = this.curPose[field] + (this.error[field] ?? 0);
    const p = this.prev[field] ?? c;
    return p + (c - p) * this.renderAlpha();
  }
  /**
   * The full interpolated + smooth-corrected render pose (bound `"part.field"`
   * keys included). Use this (not repeated {@link value} calls) when a custom
   * `interpolate` is set — it's computed once per frame and memoized. The
   * returned record is REUSED — read it synchronously.
   */
  pose() {
    this.noteRenderRead();
    if (!this.poseDirty)
      return this.renderPose;
    const t = this.renderAlpha();
    const a = this.poseA, b = this.poseB;
    for (const f of this.poseFields) {
      a[f] = this.prev[f] ?? this.curPose[f];
      b[f] = this.curPose[f] + (this.error[f] ?? 0);
    }
    if (this.interpolate) {
      const out = this.interpolate(a, b, t);
      for (const f of this.poseFields)
        this.renderPose[f] = out[f];
    } else {
      for (const f of this.poseFields)
        this.renderPose[f] = a[f] + (b[f] - a[f]) * t;
    }
    this.poseDirty = false;
    return this.renderPose;
  }
  // --- RollbackController hooks ----------------------------------------------
  smoothedFields() {
    return this.poseFields;
  }
  readCurrent(field) {
    return this.curPose[field];
  }
  applyStep(input) {
    this.step(this.stepCtx, this.worldHandle, input);
  }
  /** Bound triples pull first — every bound field, unconditionally (replay has
   *  mutated the mirrors since the last adopt, so even a server-unchanged field
   *  must be re-seeded or the next replay double-applies inputs on top of a
   *  stale predicted value). The user `adopt` then covers the opaque rest. */
  adoptTruth() {
    for (const b of this.bindings) {
      const { source, mirror, fields } = b;
      for (let i = 0; i < fields.length; i++)
        mirror[fields[i]] = source[fields[i]];
    }
    this.adopt?.(this.worldHandle);
  }
  refreshRender() {
    this.refreshPose();
  }
  markDirty() {
    this.poseDirty = true;
  }
  snapshotPrev() {
    for (const f of this.poseFields)
      this.prev[f] = this.curPose[f] + this.error[f];
  }
  reseedState() {
    this.adoptTruth();
    this.refreshPose();
    for (const f of this.poseFields) {
      this.prev[f] = this.curPose[f];
      this.error[f] = 0;
    }
  }
};

// node_modules/@colyseus/shared-types/build/Protocol.mjs
var Protocol = {
  // Room-related (10~19)
  JOIN_ROOM: 10,
  ERROR: 11,
  LEAVE_ROOM: 12,
  ROOM_DATA: 13,
  ROOM_STATE: 14,
  ROOM_STATE_PATCH: 15,
  ROOM_DATA_SCHEMA: 16,
  // DEPRECATED: schema instances via room.send()
  ROOM_DATA_BYTES: 17,
  PING: 18,
  // Input-related (19~20).
  ROOM_INPUT_RELIABLE: 19,
  // [byte, stamp?, ...InputEncoder.encode() bytes]       single input
  ROOM_INPUT_UNRELIABLE: 20,
  // [byte, len|input, len|input, ...]                    length-framed ring
  // Request/response (21~22)
  ROOM_REQUEST: 21,
  // [byte, requestId varint, type(str|num), msgpack payload]     client→server, expects a reply
  ROOM_RESPONSE: 22
  // [byte, requestId varint, status uint8, msgpack payload?]     server→client, reply to a request
};
var ProtocolModifier = {
  /**
   * Server-time + per-recipient last-input-ack are prepended to the message
   * body.
   *
   * Layout when set (applied to {@link Protocol.ROOM_STATE} and
   * {@link Protocol.ROOM_STATE_PATCH}):
   *
   *     [code | TIMED][uint32 sNow LE][uint32 inputSeq LE][...body]
   *
   * - `sNow` is the server clock as ms since room start
   *   (`room.clock.elapsedTime` — NOT raw `performance.now()`; portable
   *   integer, wraps at u32 ≈ 49.7 days). Shared across all recipients of
   *   this tick.
   * - `inputSeq` is the seq value of the last input CONSUMED into the
   *   authoritative state from *this specific recipient* (`0` if the client
   *   never sent an input). Per-recipient — never another client's ack.
   *
   * Authoritative field semantics: the `TIMED_PREFIX_SIZE` doc in
   * `@colyseus/core` `serializer/SchemaSerializer.ts`.
   *
   * The client SDK uses these to estimate RTT, server time, and clock offset
   * (and to prune its reconciliation replay buffer) without any
   * application-level schema cooperation.
   *
   * Emitted whenever the Room called `defineInput()`. SDK clients that
   * understand the TIMED bit decode the prefix; older clients that don't
   * support it would fail to parse — Colyseus 0.18 introduces the feature
   * alongside the first SDK release that decodes it, so the protocol bump
   * is implicit in the version.
   *
   * Also set on either client→server input opcode
   * ({@link Protocol.ROOM_INPUT_RELIABLE} / {@link Protocol.ROOM_INPUT_UNRELIABLE})
   * when the Room's lag-comp attachments require a per-client stamp. The
   * handshake tells the client which timeline(s) to send via
   * {@link InputFlags.RENDER_TIME} / {@link InputFlags.RECKON_TIME}; the prefix
   * shape follows from which flags are set — and from the channel, because the
   * two have different delivery guarantees.
   *
   * RELIABLE carries ONE stamp for its single input, DELTA-CODED: each frame
   * ships the signed change from the previous stamp via the self-describing
   * number codec (≈ one fixed step per tick → ~1 byte vs a raw 4-byte u32; the
   * first frame / post-reset ships the absolute as a one-off larger delta). The
   * server reconstructs it against a per-client baseline both sides re-zero
   * together on (re)connect:
   *
   *   - RECKON_TIME only: `[varint Δreckon]`
   *   - RENDER_TIME only: `[varint Δrender]`
   *   - BOTH:             `[varint Δreckon][uint16 renderDelta]`
   *
   * UNRELIABLE carries a SELF-CONTAINED block, one stamp per ring slot, because
   * the packet holds `k` inputs sampled at `k` different instants and a running
   * baseline cannot survive loss or reordering:
   *
   *       [varint k][uint32 newest][varint Δ]×(k−1)
   *       [uint16 rdNewest][varint Δrd]×(k−1)        ← BOTH mode only
   *
   * `newest` is absolute, and each Δ walks one slot older
   * (`stamp[i] = stamp[i+1] − Δ`) — so a packet is readable on its own and an
   * input recovered redundantly from a later packet still arrives with its own
   * instant. Stamps pair positionally with the ring's oldest→newest slots.
   *
   * BOTH mode trails the `renderDelta` series in the same shape — one value per
   * slot, not one per packet — so each input keeps the interp buffer plus
   * one-way latency it was actually sampled with. Consecutive values differ by
   * ~0–1 ms, which the number codec encodes in one byte, so per-slot exactness
   * costs `k−1` bytes over a single shared value.
   *
   * The block is all-or-nothing: every slot is stamped, or the bit is not set.
   * A client's `allowRewind` gates the RELIABLE opcode only — here the block
   * ships whole, so excluding a slot would save nothing and would make its
   * neighbour's delta swing the full absolute value. Slots sampled before the
   * client's clock synced ship as `0`, the standard "unstamped, read live"
   * sentinel.
   *
   * reckonTime (ms since room start) = the client's serverNow estimate at
   * input-sample time — what its forward-RECKONED entities display at, stamped
   * directly so the server's rewind read is immune to the client's
   * RTT-estimation error. renderTime = the snapshot-timeline instant on screen
   * (what a LERPING client shows) = `reckonTime − renderDelta`
   * (≈ `renderDelay + rtt/2`). In the BOTH case the gap is shipped as a u16
   * `renderDelta` (bounded ≪ 65 s) rather than a second delta and the server
   * derives renderTime; single-timeline rooms ship the one timeline they use.
   * See {@link HandshakeSection.INPUT_OPTIONS} / {@link InputFlags}.
   */
  TIMED: 128,
  /**
   * The frame rode the transport's UNRELIABLE channel (a WebTransport datagram)
   * and may therefore be lost, duplicated, or reordered.
   *
   * Layout when set (applied to {@link Protocol.ROOM_STATE_PATCH}):
   *
   *     [code | UNRELIABLE][uint16 seq LE][...body]
   *
   * - `seq` is a room-wide counter incremented once per unreliable flush and
   *   shared by every recipient of that flush. It wraps at 65536, so freshness
   *   is a wrap-safe comparison — `(int16)(seq - lastApplied) > 0` — not `>`.
   *   The client drops any frame that isn't newer than the last one it applied;
   *   a reordered datagram would otherwise write a stale value that survives
   *   until the field changes again.
   *
   * Carries only fields marked `@unreliable` in the state schema. Those are
   * restricted to primitives, so every ADD/DELETE of a ref still travels the
   * reliable channel: a dropped frame costs a stale field value and can never
   * desync the ref graph.
   *
   * Never combined with {@link ProtocolModifier.TIMED}. The clock sample and the
   * input ack must arrive in order to be meaningful, so they stay exclusive to
   * the reliable patch — which already emits a per-tick heartbeat in rooms that
   * called `defineInput()`.
   */
  UNRELIABLE: 64
};
var PROTOCOL_CODE_MASK = 31;
var ResponseStatus = {
  OK: 0,
  REJECTED: 1,
  ERROR: 2
};
var HandshakeSection = {
  /**
   * Reflection bytes (`Reflection.encode`) for the Room's input schema —
   * present when the server called `defineInput()`. The SDK reconstructs a
   * constructor and uses it as the default for `conn.input()` calls that
   * don't pass an explicit `type`.
   */
  INPUT_REFLECTION: 1,
  /**
   * Input feature flags + optional values the client mirrors — present when the
   * Room called `defineInput()`. Layout:
   * `[flags uint8][tickRate varint?][patchRate varint?][subSteps varint?]`,
   * bits per {@link InputFlags}; trailing varints appear in flag-bit order
   * when set.
   */
  INPUT_OPTIONS: 2
};
var InputFlags = {
  /** Client auto-stamps reliable inputs with the SNAPSHOT-timeline instant it
   *  was rendering (`renderTime`, ms since room start) for lag-compensated hit
   *  registration of `mode:"snapshot"` rewind targets. Prefix shape depends on
   *  whether {@link RECKON_TIME} is also set — see {@link ProtocolModifier.TIMED}. */
  RENDER_TIME: 1 << 0,
  /** A `[tickRate varint]` (Hz) follows — the server's fixed sim/input step
   *  rate. The client predicts at dt = 1/tickRate. */
  FIXED_TIMESTEP: 1 << 1,
  /** A `[patchRate varint]` (ms) follows — the server's state-patch interval =
   *  the reconcile/correction cadence. The client tunes smoothing to it. */
  PATCH_RATE: 1 << 2,
  /** A `[subSteps varint]` (count ≥ 2) follows — physics sub-steps per input
   *  tick. The simulation integrates `subSteps` engine steps of
   *  `(1/tickRate)/subSteps` per input, identically on both sides, so the
   *  physics rate is `tickRate * subSteps` while the input/network rate stays
   *  `tickRate`. Absent ⇒ 1 (input rate == physics rate). */
  SUB_STEPS: 1 << 3,
  /** Client auto-stamps reliable inputs with the RECKON-timeline instant
   *  (`reckonTime` = its serverNow estimate, ms since room start) for
   *  lag-compensated hit registration of `mode:"reckon"` rewind targets. The
   *  stamp is DELTA-CODED (signed varint vs the previous stamp): together with
   *  {@link RENDER_TIME} the input ships `[varint Δreckon][uint16 renderDelta]`;
   *  alone it ships `[varint Δreckon]`. See {@link ProtocolModifier.TIMED}. */
  RECKON_TIME: 1 << 4
};
var CloseCode = {
  NORMAL_CLOSURE: 1e3,
  GOING_AWAY: 1001,
  NO_STATUS_RECEIVED: 1005,
  ABNORMAL_CLOSURE: 1006,
  CONSENTED: 4e3,
  SERVER_SHUTDOWN: 4001,
  WITH_ERROR: 4002,
  FAILED_TO_RECONNECT: 4003,
  MAY_TRY_RECONNECT: 4010
};

// node_modules/@colyseus/sdk/build/input/InputHandle.mjs
var MAX_VARINT = 9;
var RELIABLE_STAMP_MAX = MAX_VARINT;
var ringStampMax = (historySize, both) => (both ? 2 : 1) * (MAX_VARINT + 4 + MAX_VARINT * historySize);
var InputHandleImpl = class _InputHandleImpl {
  data;
  _host;
  _encoder;
  // Reused frame buffer — safe ONLY because every transport copies synchronously
  // on send (browser ws.send snapshots; H3 frame() copies before write). A
  // transport that queued the view uncopied would see it overwritten next send.
  _scratch = new Uint8Array(2048);
  // Cached framed-packet view into `_scratch`; re-made when the packet size
  // changes (delta bodies vary) or `_scratch` grows — so it mostly pays off on
  // steady no-change frames.
  _framed = null;
  // Input round-trip state (one handle per room).
  _sentCount = 0;
  // reliable inputs transmitted
  _lastProcessed = 0;
  // server-acked (consumedCount)
  _epoch = 0;
  // reset counter — see InputHandle.epoch
  // RTT send-time ring (seq % size → send time); avoids per-send Map churn.
  // Sized WITH the replay ring (one seq window — replay and RTT age out together).
  _sendTimes;
  // Sent-input replay ring, mirroring the server's per-client input buffer: each reliable send snapshots
  // `data` into slot `seq % size` via alloc-free `copyInto` so a reconciler can replay unacked inputs.
  // Size = worst-case in-flight = (RTT + patch interval) × input rate. tickRate/patchRate from the
  // handshake (ack rides the patch, so lags up to one interval); RTT is budgeted generously. Floored
  // at 64; grows for high input rates where 64 would silently overflow (aged-out entries warn once).
  static BUFFER_FLOOR = 64;
  static BUFFER_RTT_BUDGET_MS = 1e3;
  static BUFFER_HEADROOM = 1.5;
  _inputBufferSize;
  _inputBuffer = null;
  // lazily allocated (needs data ctor)
  // Per-seq reckonTime stamp (server-clock ms), parallel to _inputBuffer — the
  // reconciler reads it back as ctx.reckonTime on the live step AND on replay, so
  // both hit-test at the exact instant the server rewinds to. Sized = replay ring.
  // Lazily allocated AND only when reckon stamping is on (`_stampReckon`): a room
  // without reckon lag-comp never rewinds to it, so we don't track it (reckonTimeAt
  // then reads 0 and the controller resolves ctx.reckonTime to serverNow()).
  _reckonTimes = null;
  // Reckon instant of the in-flight send() — computed in send() when stamping,
  // stamped on the wire AND recorded into _reckonTimes by _recordSent (same value
  // both). 0 when not stamping.
  _pendingReckon = 0;
  // Running baseline for the DELTA-CODED reliable stamp: the last timeline u32
  // sent. Each stamped send transmits `stamp − _lastStamp` (signed, ≈ one fixed
  // step per tick → ~1 byte vs a raw 4-byte u32); the server mirrors this baseline
  // and reliable+in-order keeps the two locked. reset() re-zeros it so the first
  // delta after a (re)connect carries the absolute, re-syncing with the server's
  // freshly-allocated baseline.
  _lastStamp = 0;
  // Per-seq timeline stamps for the UNRELIABLE ring, indexed `seq % historySize`
  // — exactly the slots a packet carries, so the index can't collide. Lazily
  // allocated, and only when the room asked for stamps. See _writeRingStamps.
  _stampRing = null;
  // Parallel to _stampRing, BOTH mode only: the renderDelta each slot was
  // sampled with, so the block can carry the exact value per slot.
  _renderDeltaRing = null;
  // Slots the encoder's ring currently carries (≤ historySize). Tracked, not
  // derived from `seq`: `reset()` drops the ring but keeps the seq monotonic.
  _ringSlots = 0;
  static _warnedBufferOverflow = false;
  static _warnedAllowRewindIgnored = false;
  // Dev diagnostic (see _warnUnknownFields): unknown data keys already warned.
  _warnedUnknownKeys = null;
  // Lag-comp stamp (server INPUT_OPTIONS handshake): which timeline(s) each
  // reliable input is prefixed with, DELTA-CODED on the wire (see _lastStamp).
  // Both → [varint Δreckon][u16 renderDelta]; reckon-only → [varint Δreckon];
  // render-only → [varint Δrender]; neither → no prefix.
  _stampRender = false;
  _stampReckon = false;
  // Optional per-send gate (app `allowRewind`): when set, only inputs it returns
  // true for carry the stamp — the rest skip it (and the TIMED bit), trimming the
  // timestamp on frames the server won't rewind (e.g. non-firing inputs). The
  // delta baseline (`_lastStamp`) only advances on stamped sends, so it stays
  // locked with the server across the gaps. Absent ⇒ stamp every reliable input.
  _allowRewind;
  // Send observers (the prediction layer subscribes here to step its simulation
  // on each send — see onSend). null until the first subscribe, so a handle used
  // without prediction pays nothing (no allocation, no per-send dispatch).
  // COPY-ON-WRITE: subscribe/unsubscribe replace the array (cold path), so the
  // dispatch loop's captured ref can't skip or double-fire when a listener
  // mutates the list mid-dispatch.
  _sendListeners = null;
  // The app's interpolation buffer (ms) — how far in the past it renders remote
  // entities (e.g. a `Predict` lerp `delay`). The stamp subtracts this AND the
  // one-way latency (smoothedRtt/2) the SDK already tracks, so callers pass only
  // the interp buffer, never the latency. When the app doesn't set it explicitly,
  // `predict.reconciler`/`sim` bind `_renderDelayProvider` to the Predict lerp
  // `delay` (see bindRenderDelay) so the interp buffer and the server's rewind
  // instant stay ONE value — no two-number "keep these equal" footgun.
  _renderDelay = 0;
  _renderDelayExplicit = false;
  _renderDelayProvider;
  // Server-advertised rates: fixed step (Hz), patch interval (ms = reconcile
  // cadence), and physics sub-steps per input tick.
  _tickRate;
  _patchRate;
  _subSteps = 1;
  constructor(host, data, encoder, opts) {
    this._host = host;
    this.data = data;
    this._encoder = encoder;
    this._stampRender = opts?.stampRender ?? false;
    this._stampReckon = opts?.stampReckon ?? false;
    this._allowRewind = opts?.allowRewind;
    if (this._allowRewind !== void 0 && encoder.mode === "unreliable" && !_InputHandleImpl._warnedAllowRewindIgnored) {
      _InputHandleImpl._warnedAllowRewindIgnored = true;
      console.warn(`@colyseus/sdk: \`allowRewind\` is ignored on \`mode:"unreliable"\` \u2014 a packet stamps its whole redundancy ring or none of it, so excluding one input would cost bandwidth rather than save it. Use \`mode:"reliable"\` to gate the lag-comp stamp per input.`);
    }
    this._renderDelay = opts?.renderDelay ?? 0;
    this._renderDelayExplicit = opts?.renderDelay !== void 0;
    this._tickRate = opts?.tickRate;
    this._patchRate = opts?.patchRate;
    this._subSteps = opts?.subSteps ?? 1;
    const stepMs = this._tickRate ? 1e3 / this._tickRate : 1e3 / 60;
    const window = _InputHandleImpl.BUFFER_RTT_BUDGET_MS + (this._patchRate ?? 0);
    this._inputBufferSize = Math.max(_InputHandleImpl.BUFFER_FLOOR, Math.ceil(window / stepMs * _InputHandleImpl.BUFFER_HEADROOM));
    this._sendTimes = new Float64Array(this._inputBufferSize);
  }
  get mode() {
    return this._encoder.mode;
  }
  get tickRate() {
    return this._tickRate;
  }
  // `1/hz` is correctly-rounded IEEE-754 → bit-identical to the server's stepSeconds.
  get stepSeconds() {
    return this._tickRate ? 1 / this._tickRate : void 0;
  }
  get stepMs() {
    return this._tickRate ? 1e3 / this._tickRate : void 0;
  }
  get patchRate() {
    return this._patchRate;
  }
  get subSteps() {
    return this._subSteps;
  }
  // `(1/hz)/n` — the SAME expression the server's ctx.subDt uses → bit-identical dt.
  get subStepSeconds() {
    return this._tickRate ? 1 / this._tickRate / this._subSteps : void 0;
  }
  get subStepMs() {
    return this._tickRate ? 1e3 / this._tickRate / this._subSteps : void 0;
  }
  get lastProcessed() {
    return this._lastProcessed;
  }
  get sentCount() {
    return this._sentCount;
  }
  get pendingCount() {
    return this._sentCount - this._lastProcessed;
  }
  get replayBufferSize() {
    return this._inputBufferSize;
  }
  get epoch() {
    return this._epoch;
  }
  at(seq) {
    if (this._inputBuffer === null)
      return void 0;
    if (seq <= this._lastProcessed || seq > this._sentCount)
      return void 0;
    if (this._sentCount - seq >= this._inputBufferSize) {
      if (!_InputHandleImpl._warnedBufferOverflow) {
        _InputHandleImpl._warnedBufferOverflow = true;
        console.warn(`@colyseus/sdk: input replay buffer (${this._inputBufferSize}) overflowed \u2014 RTT exceeds its budget at this input rate; reconciliation may drift.`);
      }
      return void 0;
    }
    return this._inputBuffer[seq % this._inputBufferSize];
  }
  reckonTimeAt(seq) {
    if (this._reckonTimes === null)
      return 0;
    if (seq <= this._lastProcessed || seq > this._sentCount)
      return 0;
    if (this._sentCount - seq >= this._inputBufferSize)
      return 0;
    return this._reckonTimes[seq % this._inputBufferSize];
  }
  reset() {
    this._encoder.reset();
    this._sentCount = this._lastProcessed = this._encoder.seq;
    this._framed = null;
    this._lastStamp = 0;
    this._ringSlots = 0;
    this._sendTimes.fill(0);
    this._epoch++;
  }
  /**
   * @internal Bind lag-comp's `renderDelay` to a live provider — the owning
   * Predict's lerp `delay`. Called by `predict.reconciler`/`predict.sim` when
   * they wire this handle, so the remote interp buffer and the server's rewind
   * instant are derived from ONE number and can't drift apart. No-op if the app
   * passed an explicit `renderDelay` to `room.input()` — an explicit value wins.
   */
  bindRenderDelay(provider) {
    if (this._renderDelayExplicit)
      return;
    this._renderDelayProvider = provider;
  }
  /** Effective interp buffer (ms): a bound provider (the Predict lerp `delay`)
   *  when present, else the static value from `room.input()`. */
  _resolveRenderDelay() {
    return this._renderDelayProvider ? this._renderDelayProvider() : this._renderDelay;
  }
  /** Dev diagnostic (debug overlay only). An assignment to an UNDECLARED field
   *  lands as a plain own property — declared fields live behind prototype
   *  setters in the dense `$values` array and never create own keys — so any
   *  own enumerable string key missing from the schema metadata is a write
   *  that will never be encoded. Warn once per key. */
  _warnUnknownFields() {
    const meta = metadataOf(this.data);
    if (!meta)
      return;
    for (const key of Object.keys(this.data)) {
      if (meta[key] !== void 0 || this._warnedUnknownKeys?.has(key))
        continue;
      (this._warnedUnknownKeys ??= /* @__PURE__ */ new Set()).add(key);
      console.warn(`@colyseus/sdk input: "${key}" is not a declared field on ${this.data.constructor.name} \u2014 the write is never encoded or sent. Declare it with @type(...) on the input schema, or remove the write.`);
    }
  }
  send() {
    const conn = this._host.connection;
    if (!conn?.isOpen)
      return 0;
    if (debugOverlayActive())
      this._warnUnknownFields();
    const bytes = this._encoder.encode();
    const reliable = this._encoder.mode === "reliable";
    const stampsEnabled = this._stampReckon || this._stampRender;
    const wantStamp = stampsEnabled && reliable && (this._allowRewind === void 0 || this._allowRewind(this.data));
    const wantRingStamp = stampsEnabled && !reliable;
    const both = this._stampReckon && this._stampRender;
    const stampMax = wantStamp ? RELIABLE_STAMP_MAX + (both ? 2 : 0) : wantRingStamp ? ringStampMax(this._encoder.historySize, both) : 0;
    const totalMax = 1 + stampMax + bytes.length;
    if (totalMax > this._scratch.byteLength) {
      this._scratch = new Uint8Array(Math.max(totalMax, this._scratch.byteLength * 2));
      this._framed = null;
    }
    this._scratch[0] = (reliable ? Protocol.ROOM_INPUT_RELIABLE : Protocol.ROOM_INPUT_UNRELIABLE) | (wantStamp || wantRingStamp ? ProtocolModifier.TIMED : 0);
    const it = { offset: 1 };
    if (wantRingStamp) {
      this._writeRingStamps(it);
    } else if (wantStamp) {
      const { stamp, renderDelta } = this._sampleStamp();
      encode.number(this._scratch, stamp - this._lastStamp, it);
      this._lastStamp = stamp;
      if (both) {
        encode.uint16(this._scratch, renderDelta, it);
      }
    } else {
      this._pendingReckon = 0;
    }
    this._scratch.set(bytes, it.offset);
    const total = it.offset + bytes.length;
    if (this._framed === null || this._framed.byteLength !== total) {
      this._framed = this._scratch.subarray(0, total);
    }
    const framed = this._framed;
    let seq;
    if (reliable) {
      conn.send(framed);
      seq = ++this._sentCount;
    } else {
      conn.sendUnreliable(framed);
      seq = this._sentCount = this._encoder.seq;
    }
    this._recordSent(seq);
    return seq;
  }
  /**
   * @internal Write the unreliable channel's self-contained stamp block, then
   * leave `it` at the start of the ring body.
   *
   *     [varint k][uint32 newest][varint Δ]×(k−1)
   *     [uint16 rdNewest][varint Δrd]×(k−1)        ← BOTH mode only
   *
   * `k` is the slot count of the ring this packet carries (oldest→newest, the
   * order `InputDecoder.decodeAll` yields). `newest` is THIS send's timeline
   * instant, absolute — so a packet is readable on its own and no amount of
   * loss or reordering can desync a baseline. Each Δ walks one slot older
   * (`stamp[i] = stamp[i+1] − Δ`), which is ≈ one fixed step and so ~1 byte
   * through the self-describing number codec.
   *
   * BOTH mode appends the `renderDelta` series in the same shape, so every slot
   * carries the interp buffer + one-way latency it was actually sampled with,
   * rather than the newest slot's value smeared across the ring. Consecutive
   * values differ by ~0–1 ms (`renderDelay` is app-set and constant,
   * `smoothedRtt` is smoothed), which lands in the codec's 1-byte fixnum range —
   * so exactness costs one byte per redundant slot, and a violent RTT swing
   * degrades to at most 3 (the u16 range), never more.
   *
   * All-or-nothing: every slot in the block is stamped, or the room asked for
   * no stamps and there is no block. `allowRewind` does not apply here — the
   * block ships whole, so excluding one slot would save nothing while making
   * its neighbour's delta swing the full absolute value. The one transient
   * exception is the pre-clock-sync window, where the slots genuinely have no
   * known instant and ship as 0 for the server to read live.
   */
  _writeRingStamps(it) {
    const { stamp, renderDelta } = this._sampleStamp();
    const historySize = this._encoder.historySize;
    const seq = this._encoder.seq;
    const k = this._ringSlots = Math.min(this._ringSlots + 1, historySize);
    const ring = this._stampRing ??= new Float64Array(historySize);
    ring[seq % historySize] = stamp;
    encode.number(this._scratch, k, it);
    encode.uint32(this._scratch, stamp, it);
    this._writeSeriesDeltas(ring, seq, k, it);
    if (this._stampReckon && this._stampRender) {
      const rdRing = this._renderDeltaRing ??= new Uint16Array(historySize);
      rdRing[seq % historySize] = renderDelta;
      encode.uint16(this._scratch, renderDelta, it);
      this._writeSeriesDeltas(rdRing, seq, k, it);
    }
  }
  /** Walk `k` ring slots newest→oldest, emitting each step as a signed delta. */
  _writeSeriesDeltas(ring, seq, k, it) {
    const size = ring.length;
    for (let i = 1; i < k; i++) {
      encode.number(this._scratch, ring[(seq - i + 1) % size] - ring[(seq - i) % size], it);
    }
  }
  /**
   * @internal Sample this send's lag-comp instants from the clock, and record
   * the reckon one for {@link reckonTimeAt}.
   *
   * `renderDelta` is the interp buffer (`renderDelay`, app-set) plus the one-way
   * downstream latency (≈ `smoothedRtt/2`, ours). `stamp` is the timeline this
   * room actually rewinds on: reckon rooms ship the estimate directly — the
   * server reads its history at that index, so clock/RTT estimation error
   * cancels (client displayed f(est), server reads f(est)) — while snapshot
   * rooms ship `reckonTime − renderDelta`, the instant lerped remotes were on
   * screen. BOTH ships reckon plus the gap and lets the server subtract.
   *
   * Everything is 0 before the clock syncs, or when `allowRewind` excluded this
   * input: the server then falls back to live positions rather than trusting a
   * bogus instant.
   */
  _sampleStamp() {
    const clock = this._host.clock;
    const synced = (clock?.lastServerTime?.() ?? 0) > 0;
    const rk = synced ? Math.max(0, Math.round(clock.serverNow())) >>> 0 : 0;
    const renderDelta = synced ? Math.min(65535, Math.max(0, Math.round(this._resolveRenderDelay() + (clock.smoothedRtt?.() ?? 0) / 2))) : 0;
    this._pendingReckon = rk;
    return { stamp: this._stampReckon ? rk : rk > renderDelta ? rk - renderDelta : 0, renderDelta };
  }
  /**
   * @internal Snapshot the just-sent input into the replay ring and stamp its
   * send time, keyed by `seq`. Lets a reconciler replay unacked inputs via
   * {@link at} and the TIMED ack sample RTT. The snapshot is alloc-free through
   * the codec's `copyInto` (no `Object.keys`), which stages every field, so
   * each slot is a full snapshot independent of the wire delta encoding.
   */
  _recordSent(seq) {
    if (this._inputBuffer === null) {
      const Ctor = this.data.constructor;
      this._inputBuffer = Array.from({ length: this._inputBufferSize }, () => new Ctor());
    }
    this._encoder.copyInto(this._inputBuffer[seq % this._inputBufferSize]);
    this._sendTimes[seq % this._inputBufferSize] = now();
    if (this._stampReckon) {
      (this._reckonTimes ??= new Float64Array(this._inputBufferSize))[seq % this._inputBufferSize] = this._pendingReckon;
    }
    const ls = this._sendListeners;
    if (ls !== null)
      for (let i = 0; i < ls.length; i++)
        ls[i](seq);
  }
  onSend(listener) {
    const ls = this._sendListeners;
    this._sendListeners = ls !== null ? [...ls, listener] : [listener];
    return () => {
      const cur = this._sendListeners;
      if (cur === null)
        return;
      const i = cur.indexOf(listener);
      if (i < 0)
        return;
      const next = cur.slice();
      next.splice(i, 1);
      this._sendListeners = next.length > 0 ? next : null;
    };
  }
  /**
   * @internal Feed the server's last-PROCESSED input seq (decoded from the
   * TIMED prefix). Advances {@link lastProcessed} (monotonic) and returns the
   * round-trip time sample for that ack (`now − sendTime(seq)`), or `-1` if the
   * send time is unknown. The {@link RoomClockImpl} filters/EMA-smooths the sample.
   */
  ackInput(seq) {
    if (seq <= this._lastProcessed)
      return -1;
    const aged = this._sentCount - seq >= this._inputBufferSize;
    this._lastProcessed = seq;
    if (aged)
      return -1;
    const sentAt = this._sendTimes[seq % this._inputBufferSize];
    return sentAt > 0 ? now() - sentAt : -1;
  }
};

// node_modules/@colyseus/sdk/build/RoomClock.mjs
var NULL_CLOCK = Object.freeze({
  now: () => now(),
  serverNow: () => now(),
  renderNow: () => now(),
  rtt: () => 0,
  smoothedRtt: () => 0,
  jitter: () => 0,
  lastServerTime: () => 0,
  patchInterval: () => 0,
  setPatchInterval: (_ms) => {
  },
  sample: (_sNow, _rttSample) => {
  }
});
var RoomClockImpl = class _RoomClockImpl {
  /** Default exponential-smoothing weight for offset + RTT EMA. */
  static EMA_ALPHA = 0.1;
  /** Default slew time-constant (ms) for {@link renderNow}. ~250 ms: offset
   *  corrections smear over a few frames instead of popping, while the render
   *  timeline still tracks `serverNow()` closely in steady state. */
  static RENDER_TAU = 250;
  /** Gap (ms) past which {@link renderNow} SNAPS to `serverNow()` instead of
   *  slewing. Slewing a large gap (join warmup while the offset EMA is still
   *  converging, a route-change offset jump, a tab-resume stall) would render
   *  a visible standing lag; only wobble-scale gaps get smoothed. */
  static RENDER_SNAP = 250;
  /**
   * RTT samples greater than `outlierFactor × smoothedRtt` are rejected.
   * Catches tab-resume spikes once the smoothed value has converged; the
   * separate `_rttHasSample` seed prevents this from clamping early
   * legitimate samples to a stranded baseline.
   */
  static RTT_OUTLIER_X = 4;
  /** RFC 3550 jitter EMA gain (1/16) — slower than the RTT/offset EMA so the
   *  reported jitter is a steady readout rather than a per-patch flicker. */
  static JITTER_GAIN = 1 / 16;
  /** Arrival gaps beyond `JITTER_STALL_X ×` the cadence (a tab-resume stall), and
   *  sub-cadence bursts (mult 0), are skipped so they don't spike the jitter EMA. */
  static JITTER_STALL_X = 4;
  /**
   * Clock-offset jitter gate. An offset sample is only folded into the EMA when
   * its RTT is within `RTT_GATE_FACTOR ×` the windowed-minimum RTT — i.e. the
   * packet traversed near-empty queues, so its `rtt/2` one-way estimate (and
   * thus the offset) is least corrupted by jitter. Higher-RTT samples carry
   * proportionally more jitter and are dropped (the offset just holds). This is
   * the NTP/QUIC pattern: EMA-smooth the value you report, but filter the input
   * by the low-delay floor — purely a VARIANCE reduction on `serverNow()`, which
   * is what steadies the stamped reckonTime. The held offset's small bias is
   * harmless (it cancels: predict + rewind share the stamped instant).
   */
  static RTT_GATE_FACTOR = 1.2;
  /** Sliding window (ms) over which the RTT floor (gate reference) is tracked.
   *  Long enough to hold a good low-jitter sample; on a route change the stale
   *  floor expires within this horizon and the gate re-opens. */
  static RTT_GATE_WINDOW = 1e4;
  /** Post-reset warmup: the first `RTT_GATE_WARMUP` RTT-valid samples BYPASS the
   *  gate (pure EMA), so the offset converges at baseline speed after a reset /
   *  reconnect. The gate drops samples, which otherwise stretches convergence —
   *  worst at high RTT, where it showed as an inflated offset.std until settled.
   *  ~3× the EMA time-constant (1/α = 10) ⇒ converged before the gate engages for
   *  steady-state variance reduction. `0` disables the warmup (gate from sample 1). */
  static RTT_GATE_WARMUP = 30;
  _clockOffset = 0;
  // serverTime - clientTime at sample time
  _clockHasSample = false;
  _offsetCount = 0;
  // RTT-valid offset samples since reset (gate warmup)
  // Sliding-window-minimum of RTT (monotonic deque: values increasing front→back,
  // front = windowed min). Parallel number arrays → no per-sample object alloc.
  _rttFloorT = [];
  // sample arrival times (tNow), aligned with _rttFloorV
  _rttFloorV = [];
  // RTT values, monotonically increasing
  _rtt = 0;
  // most recent RTT sample (ms)
  _smoothedRtt = 0;
  // EMA over RTT samples
  _rttHasSample = false;
  _jitter = 0;
  // EMA of patch-arrival deviation from the cadence (ms)
  _lastRecvTime = -1;
  // arrival time of the previous patch; -1 until the first
  _lastServerTime = 0;
  // raw sNow of the last patch (snapshot stamp)
  _patchInterval = 0;
  // server patchRate (ms); 0 until advertised
  _renderTau = _RoomClockImpl.RENDER_TAU;
  // slew time-constant (ms); 0 disables
  _renderSn = 0;
  // slew-limited render-clock reading (ms since room start)
  _renderSnAt = 0;
  // local time (now()) the render clock last advanced
  /** Estimated server clock: **milliseconds since room start** (the server's
   *  `clock.elapsedTime`, reconstructed via the wire `sNow` + local offset).
   *  NOT raw `performance.now()` — a portable integer-ms timeline the server's
   *  own time-keyed logic shares, so client-side reckon stays in phase.
   *  Returns the local clock until the first sample lands. */
  serverNow() {
    return now() + this._clockOffset;
  }
  /** Slew-limited render timeline — see {@link RoomClockLike.renderNow}.
   *  Free-runs at 1 ms/ms and servos toward {@link serverNow} with the
   *  time-constant set by {@link setRenderTau} (default {@link RENDER_TAU});
   *  `τ ≤ 0` disables the slew and returns `serverNow()` verbatim. Idempotent
   *  within a frame: it advances only on the first call each frame (guarded on
   *  the local clock), so reading it once per tracked entity doesn't over-step
   *  it. */
  renderNow() {
    const target = this.serverNow();
    if (this._renderTau <= 0) {
      return target;
    }
    const t = now();
    if (this._renderSn === 0) {
      this._renderSn = target;
      this._renderSnAt = t;
      return this._renderSn;
    }
    const dt = Math.min(t - this._renderSnAt, 100);
    if (dt < 0.5) {
      return this._renderSn;
    }
    this._renderSnAt = t;
    this._renderSn += dt;
    if (Math.abs(target - this._renderSn) > _RoomClockImpl.RENDER_SNAP) {
      this._renderSn = target;
      return this._renderSn;
    }
    this._renderSn += (target - this._renderSn) * (1 - Math.exp(-dt / this._renderTau));
    return this._renderSn;
  }
  /** Set the {@link renderNow} slew time-constant (ms). `≤ 0` disables slewing
   *  (renderNow == serverNow). Larger = smoother, but offset corrections lag
   *  longer. */
  setRenderTau(milliseconds) {
    this._renderTau = milliseconds > 0 ? milliseconds : 0;
  }
  /** Local monotonic clock (ms): the client's own reading WITHOUT the server
   *  offset — the base {@link serverNow} adds the offset to. Use it for
   *  self-imposed relative cooldowns (`now() - lastAction >= COOLDOWN_MS`): they
   *  need only a steady rate, not clock sync, so this avoids the offset-EMA
   *  jitter `serverNow()` carries. @see RoomClockLike.now */
  now() {
    return now();
  }
  /** Most recent RTT sample (ms). `0` until the first RTT-valid sample lands. */
  rtt() {
    return this._rtt;
  }
  /** EMA-smoothed RTT (ms). `0` until the first RTT-valid sample lands. Prefer this for forward-prediction. */
  smoothedRtt() {
    return this._smoothedRtt;
  }
  /** Connection jitter (ms): RFC 3550-style interarrival jitter — see
   *  {@link RoomClockLike.jitter}. `0` until the cadence is known and two patches land. */
  jitter() {
    return this._jitter;
  }
  /** Server-encode time (raw `sNow`) of the most recent patch. Pair with
   *  {@link serverNow} for the snapshot age (`serverNow() − lastServerTime()`).
   *  `0` until the first sample. */
  lastServerTime() {
    return this._lastServerTime;
  }
  /** Server snapshot cadence (`patchRate`, ms); `0` until the handshake
   *  advertises it. @see RoomClockLike.patchInterval */
  patchInterval() {
    return this._patchInterval;
  }
  /** Set the server snapshot cadence (ms), from the input handshake's
   *  advertised `patchRate`. Non-positive values clear it back to `0`. */
  setPatchInterval(milliseconds) {
    this._patchInterval = milliseconds > 0 ? milliseconds : 0;
  }
  /**
   * Feed a decoded TIMED sample. The input round-trip lives on the
   * {@link InputHandle} now — the Room hands us a pre-computed RTT sample.
   *
   * @param sNow       Server clock (ms since room start, `clock.elapsedTime`)
   *                   → clock offset.
   * @param rttSample  Round-trip time (ms) for the input ack this packet
   *                   carried, or `< 0` if none (no matching send / no input
   *                   yet). Filtered + EMA-smoothed here.
   */
  sample(sNow, rttSample) {
    const tNow = now();
    const a = _RoomClockImpl.EMA_ALPHA;
    const PI = this._patchInterval;
    if (this._lastRecvTime >= 0 && PI > 0) {
      const gap = tNow - this._lastRecvTime;
      const mult = Math.round(gap / PI);
      if (mult >= 1 && mult <= _RoomClockImpl.JITTER_STALL_X) {
        this._jitter += (Math.abs(gap - mult * PI) - this._jitter) * _RoomClockImpl.JITTER_GAIN;
      }
    }
    this._lastRecvTime = tNow;
    this._lastServerTime = sNow;
    if (rttSample < 0) {
      rttSample = -1;
    } else if (this._smoothedRtt > 0 && rttSample > this._smoothedRtt * _RoomClockImpl.RTT_OUTLIER_X) {
      rttSample = -1;
    }
    const offsetSample = rttSample >= 0 ? sNow + rttSample / 2 - tNow : sNow - tNow;
    if (!this._clockHasSample) {
      this._clockOffset = offsetSample;
      this._clockHasSample = true;
      if (rttSample >= 0) {
        this.pushRttFloor(rttSample, tNow);
        this._offsetCount = 1;
      }
    } else if (rttSample >= 0) {
      const floor = this.pushRttFloor(rttSample, tNow);
      const warming = this._offsetCount < _RoomClockImpl.RTT_GATE_WARMUP;
      this._offsetCount++;
      if (warming || rttSample <= floor * _RoomClockImpl.RTT_GATE_FACTOR) {
        this._clockOffset = this._clockOffset * (1 - a) + offsetSample * a;
      }
    }
    if (rttSample >= 0) {
      this._rtt = rttSample;
      if (!this._rttHasSample) {
        this._smoothedRtt = rttSample;
        this._rttHasSample = true;
      } else {
        this._smoothedRtt = this._smoothedRtt * (1 - a) + rttSample * a;
      }
    }
  }
  /**
   * Push an RTT sample into the sliding-window-minimum deque and return the
   * current windowed-min RTT (the jitter-free floor the offset gate references).
   * Standard monotonic-deque algorithm — O(1) amortized, the deque holds only
   * descending "record-low" candidates (typically 1–few entries).
   */
  pushRttFloor(rttSample, tNow) {
    const T = this._rttFloorT, V = this._rttFloorV;
    while (V.length > 0 && V[V.length - 1] >= rttSample) {
      V.pop();
      T.pop();
    }
    V.push(rttSample);
    T.push(tNow);
    const cutoff = tNow - _RoomClockImpl.RTT_GATE_WINDOW;
    while (T.length > 0 && T[0] < cutoff) {
      T.shift();
      V.shift();
    }
    return V[0];
  }
  /** Reset all state. Useful on reconnect when the room rebuilds context. */
  reset() {
    this._clockOffset = 0;
    this._clockHasSample = false;
    this._offsetCount = 0;
    this._rtt = 0;
    this._smoothedRtt = 0;
    this._rttHasSample = false;
    this._jitter = 0;
    this._lastRecvTime = -1;
    this._lastServerTime = 0;
    this._rttFloorT.length = 0;
    this._rttFloorV.length = 0;
    this._renderSn = 0;
    this._renderSnAt = 0;
  }
};

// node_modules/@colyseus/sdk/build/predict/confirmOn.mjs
function wireConfirmOn(callbacks, channel, on, sessionId) {
  const offs = [];
  if (on.field !== void 0) {
    const listeners = /* @__PURE__ */ new Map();
    offs.push(callbacks.onAdd(on.collection, (child, key) => {
      if (listeners.has(child))
        return;
      listeners.set(child, callbacks.listen(
        child,
        on.field,
        (v) => {
          if (v === on.equals)
            channel.confirm(key);
        },
        // no immediate fire: a child already flipped at bind time is
        // history, not a settle signal (would fire onUnpredicted)
        false
      ));
    }));
    offs.push(callbacks.onRemove(on.collection, (child) => {
      listeners.get(child)?.();
      listeners.delete(child);
    }));
    offs.push(() => {
      for (const off of listeners.values())
        off();
      listeners.clear();
    });
  } else if (on.event === "remove") {
    offs.push(callbacks.onRemove(on.collection, (_child, key) => {
      channel.confirm(key);
    }));
  } else {
    offs.push(callbacks.onAdd(on.collection, (child) => {
      if (on.mine !== void 0 && child[on.mine] !== sessionId?.())
        return;
      channel.confirm();
    }, false));
  }
  return () => {
    for (const off of offs.splice(0))
      off?.();
  };
}

// node_modules/@colyseus/sdk/build/predict/Predictor.mjs
var RING_CAP = 16;
var SLOT_V1 = 0;
var SLOT_AUX_V = 1;
var SLOT_AUX_T = 2;
var SLOT_PROFILE = 3;
var SLOT_REF = 4;
var SLOT_FIELD = 5;
var SLOT_RING_HEAD = 6;
var SLOT_RING_COUNT = 7;
var SLOT_LERP_PREV = 8;
var SLOT_RING_BASE = 9;
var SLOT_STRIDE = SLOT_RING_BASE + RING_CAP * 2;
var GAP_RESUME_MULT = 3;
var GAP_RESUME_PATCH_MULT = 1.5;
var GAP_RESUME_MAX_MS = 250;
var PROFILE_STRIDE = 7;
var P_MODE = 0;
var P_DELAY = 1;
var P_SMOOTH_MS = 2;
var P_MAX_EXTRAPOLATE = 3;
var P_TICK_INTERVAL = 4;
var P_SNAP = 5;
var P_LERP_SMOOTH_MS = 6;
var DEFAULTS_PROFILE = 0;
var MODE_LERP = 0;
var MODE_EXTRAPOLATE = 1;
var MODE_DAMPED = 2;
var MODE_RECKON = 3;
var MODE_RAW = 4;
var MODE_BOUND = 5;
var MODE_CODES = {
  lerp: MODE_LERP,
  extrapolate: MODE_EXTRAPOLATE,
  damped: MODE_DAMPED,
  reckon: MODE_RECKON,
  raw: MODE_RAW
};
var SMOOTHING_DEFAULTS = {
  mode: "lerp",
  delay: 100,
  smoothMs: 50,
  maxExtrapolate: 200,
  tickInterval: 0,
  snap: 0,
  angle: false
};
var RECKON_DEFAULTS = {
  step: void 0,
  smoothMs: 50,
  substep: 16,
  snap: 0
};
function isReckonAttachConfig(cfg) {
  if (cfg === null || typeof cfg !== "object")
    return false;
  return Array.isArray(cfg.fields);
}
var __predictAutoId = 0;
var __warnedNoInputClock = false;
function warnNoInputClock() {
  if (__warnedNoInputClock) {
    return;
  }
  __warnedNoInputClock = true;
  console.warn("@colyseus/sdk Predict: room.clock isn't server-synced because the server room didn't call defineInput(). Server-time interpolation and lag compensation fall back to local time. Add defineInput() on the server room to enable them \u2014 or ignore this if you only need local smoothing.");
}
var Predict = class _Predict {
  /**
   * Factory mirroring `Callbacks.get(room)`. Each call returns a fresh
   * Predict — instantiate multiple for side-by-side comparison overlays.
   * `TState` is inferred from `room.state` so `attachAll(key, config)` can
   * narrow `key` to the root state's collection-valued properties.
   */
  static get(room, opts = {}) {
    return new _Predict(room, opts);
  }
  // Loose-typed callbacks wrapper. Forwards to `Callbacks.get(room)` whose
  // own overloads accept either `(key, cb)` for root state or
  // `(parent, key, cb)` for nested collections.
  callbacks;
  /** The construction input, kept for `sessionId` (a Room has one, a raw
   *  Decoder doesn't) — `confirmOn.mine` resolves against it. */
  sessionSource;
  // SoA storage for smoothing slots. `slotBuf` holds all slots packed at
  // `slotIdx * SLOT_STRIDE`. `slotByRef` maps refId → (field NAME → slot idx).
  // Keying the inner map by field name (not index) means the hot `value()`
  // read resolves a slot with two plain Map.gets and NEVER touches schema
  // metadata — no per-frame name→index resolution (that was a megamorphic
  // keyed load). `slotDetach[idx]` holds the listen()-returned unsubscribe
  // (parallel array, not packed in `slotBuf` since closures aren't numbers).
  // Recycled indices live in `freeSlots`; the buffer doubles when `slotCount`
  // outgrows capacity.
  //
  // Keyed on the schema's integer refId, not JS object identity — the same
  // key the wire protocol and a C / C# port would use. Entries are removed on
  // detach (which fires from onRemove before the decoder can recycle a
  // refId), so a reused refId never collides with a stale entry.
  slotBuf = new Float64Array(64 * SLOT_STRIDE);
  slotCount = 0;
  slotDetach = [];
  // Per-slot angle flag (parallel to slotDetach). Marks slots whose samples are
  // stored unwrapped so the interpolators handle the ±π seam — see `angle` option.
  slotAngle = [];
  freeSlots = [];
  slotByRef = /* @__PURE__ */ new Map();
  simByRef = /* @__PURE__ */ new Map();
  /** MODE_BOUND side table: overlay slot → its {@link BoundSlotEntry}. An
   *  entry here marks the slot as a controller overlay; teardown paths branch
   *  on membership (see untrackSlot / detachByRef / registerBound). */
  boundBySlot = /* @__PURE__ */ new Map();
  /** The one shared MODE_BOUND profile (lazily allocated). Bound slots carry
   *  no tunable params and the panel's per-controller cards come from
   *  {@link snapshotReconcilers}, so per-controller profiles would only
   *  accumulate (profiles are never freed — a respawn loop would leak them). */
  boundProfileIdx = -1;
  renderTime = 0;
  defaultMode;
  reckonDefaults;
  clock;
  /** Draw reckon entities on the clock's render timeline — see the
   *  `renderPresent` option on {@link PredictGetOptions}. */
  useRenderClock = false;
  // --- Room-wide fixed-step accumulator (drives reconciler input pacing) ------
  // The server's tick rate is one value per room, so one accumulator here is the
  // single source of truth: `tick(now)` converts elapsed render time into the
  // whole number of fixed input ticks due (returned to the caller's send loop).
  // `stepMs` is adopted from the first reconciler spawned (its input handle
  // advertises the server rate); until then no fixed step is known and `tick`
  // returns 0. (Render interpolation is NOT derived here — each reconciler eases
  // it off its own last-step time, so it holds correctly when that entity's input
  // pauses; see RollbackController.renderAlpha.)
  fixedStepMs;
  stepAcc = 0;
  lastFrameNow = -1;
  /** Spiral-of-death guard: cap fixed steps emitted per frame (after a hitch,
   *  drop the backlog rather than chase it). */
  static MAX_STEPS_PER_FRAME = 5;
  // Profile table. Profile 0 is the defaults (mutable via setDefaults).
  // Subsequent indices are frozen, value-deduped via `profileKeys`.
  profileBuf = new Float64Array(8 * PROFILE_STRIDE);
  profileCount = 0;
  profileKeys = /* @__PURE__ */ new Map();
  /**
   * Human label per profile, indexed by profile id. Set from the attach
   * group's key (collection name) so the debug panel can render one card per
   * group ("enemies", "players") instead of an anonymous, cross-wired
   * per-Predict mode toggle. The label is also part of the dedup key, so two
   * different groups never share a profile even if their params match —
   * tuning one group's card can't bleed into another's.
   */
  profileLabels = [];
  /**
   * Per-profile read function — resolved once at profile allocation (or
   * when `setDefaults`/`setProfile` flips a profile's mode) and stored
   * here. Slot reads dispatch via `profileComputers[profileIdx](slotIdx)`
   * instead of an `if (mode === ...)` chain at each `value()` call.
   *
   * Every mode reads purely from the slot: the slot's SLOT_REF / SLOT_FIELD
   * let `reckon` find its SimState and `raw` read SLOT_V1, so no instance or
   * field-name is threaded through. This pure `(slotId) -> number` shape is
   * exactly a C function-pointer table / C# delegate array.
   */
  profileComputers = [];
  /**
   * Track-event listeners. The debug bridge subscribes via the published
   * core's `onTrack`; on the cold attach path each `trackWithProfile` notifies
   * them with `(profileIdx, field)` so the bridge can build its profile→fields
   * view WITHOUT the engine holding any panel-shaped state. Empty in prod (no
   * debug registry ⇒ never subscribed), so the per-track notify is a length
   * check on a cold path.
   */
  trackListeners = [];
  /** Public name (shown in the debug panel and useful for logs). */
  name;
  disposeListeners = [];
  /**
   * Child primitives spawned by {@link defineEvent} / {@link spawns} /
   * {@link reconciler} / {@link sim} that this Predict drives from its own
   * {@link tick}. The Predict is the single
   * per-frame driver for the whole prediction stack — one `predict.tick(now)`
   * advances smoothing AND every controller AND prunes every event store, so
   * callers can't forget to tick/prune a child (a forgotten drive is a silent
   * visual bug). Children expose their own `tick`/`prune` for standalone use;
   * a `dead` child is dropped on the next tick.
   */
  driven = [];
  constructor(room, opts) {
    this.callbacks = Callbacks.get(room);
    this.sessionSource = room;
    const { clock, ...rest } = opts;
    this.defaultMode = rest.mode ?? "lerp";
    const isSmoothingDefault = this.defaultMode !== "reckon" && this.defaultMode !== "raw";
    const initial = isSmoothingDefault ? (() => {
      const s = rest;
      return {
        mode: s.mode ?? SMOOTHING_DEFAULTS.mode,
        delay: s.delay ?? SMOOTHING_DEFAULTS.delay,
        smoothMs: s.smoothMs ?? SMOOTHING_DEFAULTS.smoothMs,
        maxExtrapolate: s.maxExtrapolate ?? SMOOTHING_DEFAULTS.maxExtrapolate,
        tickInterval: s.tickInterval ?? SMOOTHING_DEFAULTS.tickInterval,
        snap: s.snap ?? SMOOTHING_DEFAULTS.snap,
        angle: s.angle ?? SMOOTHING_DEFAULTS.angle
      };
    })() : { ...SMOOTHING_DEFAULTS };
    const lerpSmoothMs = isSmoothingDefault ? rest.smoothMs ?? 0 : 0;
    const dIdx = this.allocProfile(this.defaultMode, initial.delay, initial.smoothMs, lerpSmoothMs, initial.maxExtrapolate, initial.tickInterval, initial.snap, false);
    if (dIdx !== DEFAULTS_PROFILE) {
      throw new Error("Predict: defaults profile must be at index 0");
    }
    if (this.defaultMode === "reckon") {
      const r = rest;
      this.reckonDefaults = {
        step: r.step,
        smoothMs: r.smoothMs ?? RECKON_DEFAULTS.smoothMs,
        substep: r.substep ?? RECKON_DEFAULTS.substep,
        snap: r.snap ?? RECKON_DEFAULTS.snap
      };
    } else {
      this.reckonDefaults = { ...RECKON_DEFAULTS };
    }
    this.clock = clock ?? room.clock ?? void 0;
    this.useRenderClock = rest.renderPresent !== false;
    if (this.clock === NULL_CLOCK) {
      warnNoInputClock();
    }
    this.name = rest.name ?? `predict#${++__predictAutoId}`;
    publishDebug("predict", this.makeCoreHandle());
  }
  /**
   * Predictor's current default mode. Reflects mutations via {@link setDefaults}
   * (and therefore the SDK debug panel), so consumers that need to react to
   * mode changes can read this each frame.
   */
  get mode() {
    return this.defaultMode;
  }
  /**
   * The "present" instant provider for reckon horizons + time-sampling (the
   * `forwardMs` snapshot-age and the `elapsedMs` absolute clock). Unless
   * {@link PredictGetOptions.renderPresent} was set `false`, and when the clock
   * implements {@link RoomClockLike.renderNow}, it's the slew-smoothed render
   * timeline; otherwise the raw {@link RoomClockLike.serverNow}. `undefined`
   * with no clock — reckon attaches then require explicit
   * forwardMs/elapsedMs. Resolved once on the cold attach path.
   *
   * The lag-comp read (`valueAt` with an explicit `when`) never goes through
   * here, so hit stamps stay on `serverNow()` even with render-present on.
   */
  presentFn() {
    const clock = this.clock;
    if (!clock) {
      return void 0;
    }
    return this.useRenderClock && clock.renderNow ? clock.renderNow.bind(clock) : clock.serverNow.bind(clock);
  }
  // --- Core introspection handle ---------------------------------------------
  makeCoreHandle() {
    return {
      name: this.name,
      mode: () => this.defaultMode,
      smoothingDefaults: () => this.readSmoothingDefaults(),
      reckonDefaults: () => ({ ...this.reckonDefaults }),
      reconcilers: () => this.snapshotReconcilers(),
      // Every attached instance owns ≥1 smoothing slot, so the slot map's key
      // count IS the attached-instance count — no separate bookkeeping needed.
      attachedCount: () => this.slotByRef.size,
      setDefaults: (opts) => this.setDefaults(opts),
      profiles: () => this.snapshotProfiles(),
      setProfile: (id, opts) => this.setProfile(id, opts),
      onTrack: (cb) => {
        this.trackListeners.push(cb);
        return () => {
          const i = this.trackListeners.indexOf(cb);
          if (i >= 0)
            this.trackListeners.splice(i, 1);
        };
      },
      onDispose: (cb) => {
        this.disposeListeners.push(cb);
        return () => {
          const i = this.disposeListeners.indexOf(cb);
          if (i >= 0)
            this.disposeListeners.splice(i, 1);
        };
      }
    };
  }
  /** Drift telemetry for each driven Reconciler/SimReconciler (duck-typed by
   *  the presence of `drift`), for the debug panel. Event/spawn stores in the
   *  same `driven` list have no `drift` and are skipped. */
  snapshotReconcilers() {
    const out = [];
    let i = 0;
    for (const d of this.driven) {
      const r = d;
      if (!r.drift) {
        continue;
      }
      const tol = r.warnTolerance;
      out.push({
        label: `reconciler #${i++}`,
        status: classifyDrift(r.drift, tol),
        severity: tol !== void 0 && tol > 0 ? r.drift.ema / tol : void 0,
        ema: r.drift.ema,
        peak: r.drift.peak,
        lastCorrectionMag: r.lastCorrectionMag ?? 0,
        reconcileSeq: r.reconcileSeq ?? 0
      });
    }
    return out;
  }
  readSmoothingDefaults() {
    const p = this.profileBuf;
    const b = DEFAULTS_PROFILE * PROFILE_STRIDE;
    const m = p[b + P_MODE] | 0;
    const mode = m === MODE_LERP ? "lerp" : m === MODE_EXTRAPOLATE ? "extrapolate" : m === MODE_DAMPED ? "damped" : m === MODE_RECKON ? "reckon" : "raw";
    return {
      mode,
      delay: p[b + P_DELAY],
      smoothMs: p[b + P_SMOOTH_MS],
      lerpSmoothMs: p[b + P_LERP_SMOOTH_MS],
      maxExtrapolate: p[b + P_MAX_EXTRAPOLATE],
      tickInterval: p[b + P_TICK_INTERVAL],
      snap: p[b + P_SNAP]
    };
  }
  /**
   * Look up or allocate a profile matching the given values. With
   * `dedup=true`, an identical existing profile is reused — so an attachAll
   * over 1000 entities with the same per-field config still allocates one
   * profile, not 1000.
   */
  allocProfile(mode, delay, smoothMs, lerpSmoothMs, maxExtrapolate, tickInterval, snap, dedup, label) {
    const modeCode = typeof mode === "number" ? mode : MODE_CODES[mode];
    let key = "";
    if (dedup) {
      key = `${label ?? ""}|${modeCode}|${delay}|${smoothMs}|${lerpSmoothMs}|${maxExtrapolate}|${tickInterval}|${snap}`;
      const existing = this.profileKeys.get(key);
      if (existing !== void 0)
        return existing;
    }
    const idx = this.profileCount++;
    const needed = (idx + 1) * PROFILE_STRIDE;
    if (needed > this.profileBuf.length) {
      const grown = new Float64Array(this.profileBuf.length * 2);
      grown.set(this.profileBuf);
      this.profileBuf = grown;
    }
    const base = idx * PROFILE_STRIDE;
    this.profileBuf[base + P_MODE] = modeCode;
    this.profileBuf[base + P_DELAY] = delay;
    this.profileBuf[base + P_SMOOTH_MS] = smoothMs;
    this.profileBuf[base + P_LERP_SMOOTH_MS] = lerpSmoothMs;
    this.profileBuf[base + P_MAX_EXTRAPOLATE] = maxExtrapolate;
    this.profileBuf[base + P_TICK_INTERVAL] = tickInterval;
    this.profileBuf[base + P_SNAP] = snap;
    this.profileLabels[idx] = label;
    this.profileComputers[idx] = this.computerForMode(modeCode);
    if (dedup)
      this.profileKeys.set(key, idx);
    return idx;
  }
  computerForMode(modeCode) {
    if (modeCode === MODE_LERP)
      return this.computeLerp;
    if (modeCode === MODE_EXTRAPOLATE)
      return this.computeExtrapolate;
    if (modeCode === MODE_DAMPED)
      return this.computeDamped;
    if (modeCode === MODE_RECKON)
      return this.computeReckon;
    if (modeCode === MODE_BOUND)
      return this.computeBound;
    return this.computeRaw;
  }
  /**
   * Resolve a per-track opts shape to a profile index.
   *   - empty opts (no own keys) → defaults profile (0). The slot follows
   *     setDefaults mutations.
   *   - non-empty opts that, after merging with current defaults, match
   *     defaults exactly → defaults profile (0). Equivalent intent, same
   *     internal state.
   *   - non-empty opts that differ from defaults → frozen profile, value-
   *     deduped via `profileKeys`. The slot does NOT follow later
   *     setDefaults mutations (the override is "frozen").
   */
  profileFromOpts(opts) {
    if (opts.mode === void 0 && opts.delay === void 0 && opts.smoothMs === void 0 && opts.maxExtrapolate === void 0 && opts.tickInterval === void 0 && opts.snap === void 0) {
      return DEFAULTS_PROFILE;
    }
    const d = this.readSmoothingDefaults();
    const mode = opts.mode ?? d.mode;
    const delay = opts.delay ?? d.delay;
    const smoothMs = opts.smoothMs ?? d.smoothMs;
    const lerpSmoothMs = opts.smoothMs ?? d.lerpSmoothMs;
    const maxExtrapolate = opts.maxExtrapolate ?? d.maxExtrapolate;
    const tickInterval = opts.tickInterval ?? d.tickInterval;
    const snap = opts.snap ?? d.snap;
    if (mode === d.mode && delay === d.delay && smoothMs === d.smoothMs && lerpSmoothMs === d.lerpSmoothMs && maxExtrapolate === d.maxExtrapolate && tickInterval === d.tickInterval && snap === d.snap) {
      return DEFAULTS_PROFILE;
    }
    return this.allocProfile(mode, delay, smoothMs, lerpSmoothMs, maxExtrapolate, tickInterval, snap, true);
  }
  /**
   * Allocate (or reuse, within the same `label`) the profile for an attach
   * group. Unlike {@link profileFromOpts}, this NEVER collapses onto the
   * mutable default profile #0 — each labeled group owns its own profile so
   * the debug panel can tune it in isolation (the fix for the "changing the
   * enemies card moved the players" cross-wire). All children of one
   * `attachAll` share the profile (same label + params ⇒ deduped); different
   * groups never do.
   */
  groupProfile(opts, label) {
    const d = this.readSmoothingDefaults();
    const mode = opts.mode ?? this.defaultMode;
    return this.allocProfile(mode, opts.delay ?? d.delay, opts.smoothMs ?? d.smoothMs, opts.smoothMs ?? d.lerpSmoothMs, opts.maxExtrapolate ?? d.maxExtrapolate, opts.tickInterval ?? d.tickInterval, opts.snap ?? d.snap, true, label);
  }
  /**
   * Mutate the Predict's default options. Within the same mode family
   * (smoothing modes are interchangeable; reckon is its own family). Throws
   * on cross-family switches — create a new Predict instead.
   *
   * Mutations take effect on the next frame for every slot that attached
   * with a default-shaped config (e.g. `{ x: {}, y: {} }`); attaches that
   * explicitly overrode a field (e.g. `{ x: { delay: 50 } }`) snapshot
   * their settings at attach time and are unaffected.
   *
   * Mode flips can cross families freely. The defaults profile (id 0)
   * always encodes the current mode (any of the five), and its computer is
   * swapped in lock-step so `value()` dispatches correctly without further
   * branching.
   */
  setDefaults(opts) {
    const newMode = opts.mode;
    if (newMode !== void 0) {
      this.defaultMode = newMode;
      const base2 = DEFAULTS_PROFILE * PROFILE_STRIDE;
      const code = MODE_CODES[newMode];
      this.profileBuf[base2 + P_MODE] = code;
      this.profileComputers[DEFAULTS_PROFILE] = this.computerForMode(code);
    }
    const s = opts;
    const base = DEFAULTS_PROFILE * PROFILE_STRIDE;
    const p = this.profileBuf;
    if (s.delay !== void 0)
      p[base + P_DELAY] = s.delay;
    if (s.smoothMs !== void 0) {
      p[base + P_SMOOTH_MS] = s.smoothMs;
      p[base + P_LERP_SMOOTH_MS] = s.smoothMs;
    }
    if (s.maxExtrapolate !== void 0)
      p[base + P_MAX_EXTRAPOLATE] = s.maxExtrapolate;
    if (s.tickInterval !== void 0)
      p[base + P_TICK_INTERVAL] = s.tickInterval;
    if (s.snap !== void 0) {
      p[base + P_SNAP] = s.snap;
      this.reckonDefaults.snap = s.snap;
    }
    const r = opts;
    if (r.step !== void 0)
      this.reckonDefaults.step = r.step;
    if (r.smoothMs !== void 0)
      this.reckonDefaults.smoothMs = r.smoothMs;
    if (r.substep !== void 0)
      this.reckonDefaults.substep = r.substep;
  }
  /**
   * Snapshot every profile currently registered with this Predict. Profiles
   * include the defaults (id 0) plus one per unique `(mode, opts)` tuple that's
   * been frozen by per-field attach overrides. Returns engine state only — the
   * profile → field-names mapping the panel shows is derived by the debug
   * bridge from the `onTrack` stream, not here.
   */
  snapshotProfiles() {
    const out = [];
    for (let i = 0; i < this.profileCount; i++) {
      const base = i * PROFILE_STRIDE;
      const m = this.profileBuf[base + P_MODE] | 0;
      if (m === MODE_BOUND)
        continue;
      const mode = m === MODE_LERP ? "lerp" : m === MODE_EXTRAPOLATE ? "extrapolate" : m === MODE_DAMPED ? "damped" : m === MODE_RECKON ? "reckon" : "raw";
      out.push({
        id: i,
        isDefault: i === DEFAULTS_PROFILE,
        label: this.profileLabels[i],
        mode,
        delay: this.profileBuf[base + P_DELAY],
        // Report the smoothMs the ACTIVE mode reads (lerp's spring vs
        // damped/extrapolate's rate) — the panel slider round-trips it.
        smoothMs: this.profileBuf[base + (m === MODE_LERP ? P_LERP_SMOOTH_MS : P_SMOOTH_MS)],
        maxExtrapolate: this.profileBuf[base + P_MAX_EXTRAPOLATE],
        tickInterval: this.profileBuf[base + P_TICK_INTERVAL],
        snap: this.profileBuf[base + P_SNAP]
      });
    }
    return out;
  }
  /**
   * Mutate one profile in place. Used by the debug panel's per-profile
   * controls. Setting `mode` swaps the cached `profileComputers[id]` in
   * lock-step so slot reads pick the new dispatch immediately.
   */
  setProfile(id, opts) {
    if (id < 0 || id >= this.profileCount)
      return;
    const base = id * PROFILE_STRIDE;
    const p = this.profileBuf;
    if ((p[base + P_MODE] | 0) === MODE_BOUND)
      return;
    if (opts.mode !== void 0) {
      const code = MODE_CODES[opts.mode];
      p[base + P_MODE] = code;
      this.profileComputers[id] = this.computerForMode(code);
      if (id === DEFAULTS_PROFILE)
        this.defaultMode = opts.mode;
    }
    if (opts.delay !== void 0)
      p[base + P_DELAY] = opts.delay;
    if (opts.smoothMs !== void 0) {
      p[base + P_SMOOTH_MS] = opts.smoothMs;
      p[base + P_LERP_SMOOTH_MS] = opts.smoothMs;
    }
    if (opts.maxExtrapolate !== void 0)
      p[base + P_MAX_EXTRAPOLATE] = opts.maxExtrapolate;
    if (opts.tickInterval !== void 0)
      p[base + P_TICK_INTERVAL] = opts.tickInterval;
    if (opts.snap !== void 0)
      p[base + P_SNAP] = opts.snap;
  }
  /**
   * Tear down all subscriptions. Detaches every attached instance, frees
   * smoothing slots, removes the Predict from the debug registry, and
   * invokes onDispose listeners.
   */
  dispose() {
    for (const refId of /* @__PURE__ */ new Set([...this.slotByRef.keys(), ...this.simByRef.keys()]))
      this.detachByRef(refId);
    this.trackListeners.length = 0;
    for (const d of this.driven.splice(0))
      d.dispose?.();
    for (const cb of this.disposeListeners.splice(0))
      cb();
  }
  // --- Low-level smoothing primitives ----------------------------------------
  /**
   * @internal Low-level primitive — track one numeric field for smoothing.
   * Most consumers should use {@link attach} / {@link attachAll}; this is
   * the underlying mechanism the high-level paths build on, exposed for
   * advanced per-field control or when integrating with frameworks that
   * already manage their own attach lifecycle.
   */
  track(instance, field, opts = {}) {
    return this.trackWithProfile(instance, field, this.profileFromOpts(opts), opts.angle ?? false);
  }
  /**
   * @internal Track `field` under an explicit, pre-resolved profile. The
   * attach path uses this so a whole group shares ONE labeled profile
   * instead of each field re-resolving (and possibly collapsing onto the
   * mutable default #0). The read/sample hot path is identical either way —
   * the slot just stores whichever profile id it's given.
   */
  trackWithProfile(instance, field, profileIdx, angle = false) {
    const refId = refIdOf(instance);
    if (refId === void 0) {
      throw new Error("Predict.track(): instance has no refId \u2014 track/attach must run AFTER the decoder delivers the instance (e.g. inside onAdd).");
    }
    const fieldId = fieldIndexOf(instance, field);
    const initial = instance[field] ?? 0;
    let boundOver;
    const existingIdx = this.slotByRef.get(refId)?.get(field);
    if (existingIdx !== void 0) {
      boundOver = this.boundBySlot.get(existingIdx);
      if (boundOver !== void 0)
        this.freeStash(boundOver);
      else
        this.untrackSlot(refId, field);
    }
    const slotIdx = this.allocSlot();
    const buf = this.slotBuf;
    const base = slotIdx * SLOT_STRIDE;
    buf[base + SLOT_V1] = initial;
    buf[base + SLOT_AUX_V] = initial;
    buf[base + SLOT_AUX_T] = performance.now();
    buf[base + SLOT_LERP_PREV] = initial;
    buf[base + SLOT_PROFILE] = profileIdx;
    buf[base + SLOT_REF] = refId;
    buf[base + SLOT_FIELD] = fieldId;
    buf[base + SLOT_RING_HEAD] = 0;
    buf[base + SLOT_RING_COUNT] = 0;
    this.slotAngle[slotIdx] = angle;
    if (boundOver !== void 0) {
      boundOver.stash = slotIdx;
    } else {
      let perRef = this.slotByRef.get(refId);
      if (perRef === void 0) {
        perRef = /* @__PURE__ */ new Map();
        this.slotByRef.set(refId, perRef);
      }
      perRef.set(field, slotIdx);
    }
    for (let li = 0; li < this.trackListeners.length; li++) {
      this.trackListeners[li](profileIdx, field);
    }
    const detach = this.callbacks.listen(
      instance,
      field,
      (current) => {
        const now2 = this.clock && this.clock.lastServerTime() > 0 ? this.clock.lastServerTime() : performance.now();
        const b = this.slotBuf;
        const i = slotIdx * SLOT_STRIDE;
        if (angle) {
          const prev = b[i + SLOT_V1];
          current = prev + Math.atan2(Math.sin(current - prev), Math.cos(current - prev));
        }
        const pBase = (b[i + SLOT_PROFILE] | 0) * PROFILE_STRIDE;
        const tickInterval = this.profileBuf[pBase + P_TICK_INTERVAL];
        let head = b[i + SLOT_RING_HEAD] | 0;
        let count = b[i + SLOT_RING_COUNT] | 0;
        const snapDelta = this.profileBuf[pBase + P_SNAP];
        if (snapDelta > 0 && count > 0 && Math.abs(current - b[i + SLOT_V1]) > snapDelta) {
          head = 0;
          count = 0;
          b[i + SLOT_AUX_V] = current;
          b[i + SLOT_LERP_PREV] = current;
        }
        const lastT1 = count === 0 ? Number.NEGATIVE_INFINITY : b[i + SLOT_RING_BASE + (head === 0 ? RING_CAP - 1 : head - 1) * 2];
        let snapT = now2;
        if (tickInterval > 0 && isFinite(lastT1)) {
          const elapsed = now2 - lastT1;
          const ticks = elapsed > 0 ? Math.max(1, Math.round(elapsed / tickInterval)) : 1;
          snapT = lastT1 + ticks * tickInterval;
          const cap = now2 + tickInterval;
          if (snapT > cap)
            snapT = cap;
        }
        b[i + SLOT_V1] = current;
        const ringBase = i + SLOT_RING_BASE;
        if (count >= 2 && isFinite(lastT1)) {
          const h1 = head === 0 ? RING_CAP - 1 : head - 1;
          const h2 = h1 === 0 ? RING_CAP - 1 : h1 - 1;
          const lastInterval = lastT1 - b[ringBase + h2 * 2];
          const patchMs = this.clock?.patchInterval ? this.clock.patchInterval() : 0;
          const span = patchMs > 0 ? patchMs : lastInterval;
          const trigger = patchMs > 0 ? GAP_RESUME_PATCH_MULT * patchMs : GAP_RESUME_MULT * lastInterval;
          if (span > 0 && snapT - lastT1 > trigger) {
            const resumeSpan = span < GAP_RESUME_MAX_MS ? span : GAP_RESUME_MAX_MS;
            const sOff = ringBase + head * 2;
            b[sOff] = snapT - resumeSpan;
            b[sOff + 1] = b[ringBase + h1 * 2 + 1];
            head = head + 1 >= RING_CAP ? 0 : head + 1;
            if (count < RING_CAP)
              count++;
          }
        }
        const off = ringBase + head * 2;
        b[off] = snapT;
        b[off + 1] = current;
        b[i + SLOT_RING_HEAD] = head + 1 >= RING_CAP ? 0 : head + 1;
        if (count < RING_CAP)
          b[i + SLOT_RING_COUNT] = count + 1;
      },
      /* immediate */
      true
    );
    this.slotDetach[slotIdx] = detach;
    return () => this.untrackSlot(refId, field);
  }
  /**
   * @internal Counterpart to {@link track}. Most consumers should use
   * {@link detach} / {@link attachAll}'s onRemove subscription instead.
   */
  untrack(instance, field) {
    const refId = refIdOf(instance);
    if (refId === void 0)
      return;
    this.untrackSlot(refId, field);
  }
  untrackSlot(refId, field) {
    const perRef = this.slotByRef.get(refId);
    const slotIdx = perRef?.get(field);
    if (slotIdx === void 0)
      return;
    const bound = this.boundBySlot.get(slotIdx);
    if (bound !== void 0) {
      this.freeStash(bound);
      return;
    }
    this.slotDetach[slotIdx]?.();
    this.slotDetach[slotIdx] = void 0;
    this.freeSlots.push(slotIdx);
    perRef.delete(field);
    if (perRef.size === 0)
      this.slotByRef.delete(refId);
  }
  /** Free a bound entry's stashed passive slot (detach its listener). */
  freeStash(entry) {
    if (entry.stash < 0)
      return;
    this.slotDetach[entry.stash]?.();
    this.slotDetach[entry.stash] = void 0;
    this.freeSlots.push(entry.stash);
    entry.stash = -1;
  }
  allocSlot() {
    if (this.freeSlots.length > 0)
      return this.freeSlots.pop();
    const idx = this.slotCount++;
    const needed = (idx + 1) * SLOT_STRIDE;
    if (needed > this.slotBuf.length) {
      const grown = new Float64Array(this.slotBuf.length * 2);
      grown.set(this.slotBuf);
      this.slotBuf = grown;
    }
    return idx;
  }
  // --- Bound overlay (predict.value ← rollback controllers) -------------------
  /**
   * Install a MODE_BOUND overlay slot for each (source, numeric field) a
   * rollback controller predicts, so `predict.value(source, field)` reads the
   * controller's interpolated + smooth-corrected pose — the same idiom as
   * every passively-smoothed entity. A pre-existing passive slot (e.g. the
   * local player inside an `attachAll` lerp group) is STASHED — its field
   * listener stays subscribed and samples keep landing in its ring — and
   * restored when the controller disposes, so lerp resumes seamlessly.
   *
   * Returns the unregister (run on the controller's dispose): frees the
   * overlay slots and restores (or deletes) each mapping.
   */
  registerBound(ctrl, source, fields, poseKeys, profileIdx) {
    const refId = refIdOf(source);
    let perRef = this.slotByRef.get(refId);
    if (perRef === void 0) {
      perRef = /* @__PURE__ */ new Map();
      this.slotByRef.set(refId, perRef);
    }
    const slots = [];
    for (let k = 0; k < fields.length; k++) {
      const field = fields[k];
      const existing = perRef.get(field);
      let stash = -1;
      if (existing !== void 0) {
        const prior = this.boundBySlot.get(existing);
        if (prior !== void 0) {
          console.warn(`@colyseus/sdk Predict: "${field}" (refId ${refId}) is already bound to a controller \u2014 the newer registration wins.`);
          stash = prior.stash;
          this.boundBySlot.delete(existing);
          this.freeSlots.push(existing);
        } else {
          stash = existing;
        }
      }
      const slotIdx = this.allocSlot();
      const buf = this.slotBuf;
      const base = slotIdx * SLOT_STRIDE;
      const initial = source[field] ?? 0;
      buf[base + SLOT_V1] = initial;
      buf[base + SLOT_AUX_V] = initial;
      buf[base + SLOT_AUX_T] = 0;
      buf[base + SLOT_LERP_PREV] = initial;
      buf[base + SLOT_PROFILE] = profileIdx;
      buf[base + SLOT_REF] = refId;
      buf[base + SLOT_FIELD] = fieldIndexOf(source, field);
      buf[base + SLOT_RING_HEAD] = 0;
      buf[base + SLOT_RING_COUNT] = 0;
      this.slotAngle[slotIdx] = false;
      this.boundBySlot.set(slotIdx, { ctrl, key: poseKeys[k], stash });
      perRef.set(field, slotIdx);
      slots.push(slotIdx);
      for (let li = 0; li < this.trackListeners.length; li++) {
        this.trackListeners[li](profileIdx, field);
      }
    }
    return () => {
      for (let k = 0; k < slots.length; k++) {
        const slotIdx = slots[k];
        const entry = this.boundBySlot.get(slotIdx);
        if (entry === void 0 || entry.ctrl !== ctrl)
          continue;
        this.boundBySlot.delete(slotIdx);
        this.freeSlots.push(slotIdx);
        const pr = this.slotByRef.get(refId);
        if (pr?.get(fields[k]) === slotIdx) {
          if (entry.stash >= 0) {
            pr.set(fields[k], entry.stash);
          } else {
            pr.delete(fields[k]);
            if (pr.size === 0)
              this.slotByRef.delete(refId);
          }
        }
      }
    };
  }
  /** Wire a just-spawned controller's bound instances into the `value()`
   *  overlay (all controllers share the one MODE_BOUND profile — the side
   *  table, not the profile, carries the per-slot backing) and arrange the
   *  restore on its dispose. No-op for controllers with nothing bound (opaque
   *  sim worlds, plain-fixture reconcilers). */
  installBoundOverlay(ctrl) {
    const offs = [];
    for (const reg of ctrl.boundRegistrations) {
      if (reg.fields.length === 0 || refIdOf(reg.source) === void 0)
        continue;
      if (this.boundProfileIdx < 0) {
        this.boundProfileIdx = this.allocProfile(MODE_BOUND, 0, 0, 0, 0, 0, 0, false, "bound");
      }
      offs.push(this.registerBound(ctrl, reg.source, reg.fields, reg.poseKeys, this.boundProfileIdx));
    }
    if (offs.length > 0)
      ctrl.onDisposed(() => {
        for (const off of offs)
          off();
      });
  }
  /**
   * @internal Low-level dead-reckoning primitive — forward-simulates
   * `instance` using a step function with scratch-snapshot + substep loop +
   * predict-then-smooth on read. Most consumers should pass a reckon
   * attach config to {@link attach} / {@link attachAll}; this is the
   * underlying implementation, exposed for cases where the declarative
   * config shape doesn't fit.
   */
  trackStepped(instance, opts) {
    const substep = opts.substep ?? 16;
    const fields = opts.fields;
    const fieldIds = fields.map((f) => fieldIndexOf(instance, f));
    const step = opts.step;
    const clock = this.clock;
    const present = this.presentFn();
    const forwardMs = opts.forwardMs ?? (present ? () => {
      const stamp = clock.lastServerTime();
      return stamp > 0 ? Math.max(0, present() - stamp) : 0;
    } : () => 0);
    const elapsedMs = opts.elapsedMs ?? (present ?? (() => performance.now()));
    const liveValues = instance[$VALUES];
    const fastPathOk = opts.snapshot === void 0 && Array.isArray(liveValues) && fieldIds.every((id) => id >= 0 && id < liveValues.length);
    let advance;
    if (fastPathOk) {
      const scratch = new instance.constructor();
      const sv = scratch[$VALUES];
      advance = (live, fwd, out, endElapsed) => {
        const lv = live[$VALUES];
        for (let i = 0; i < lv.length; i++)
          sv[i] = lv[i];
        let remaining = fwd;
        let elapsed = endElapsed - fwd;
        while (remaining > 0) {
          const stepMs = remaining < substep ? remaining : substep;
          elapsed += stepMs;
          step(scratch, stepMs / 1e3, elapsed);
          remaining -= stepMs;
        }
        for (let k = 0; k < fieldIds.length; k++)
          out[k] = sv[fieldIds[k]];
      };
    } else {
      const fieldNames = scalarFieldNamesOf(instance);
      const snapshotFn = opts.snapshot ?? (fieldNames.length > 0 ? makeUnrolledSnapshot(fieldNames) : (e) => ({ ...e }));
      const names = [...fields];
      advance = (live, fwd, out, endElapsed) => {
        const scratch = snapshotFn(live);
        let remaining = fwd;
        let elapsed = endElapsed - fwd;
        while (remaining > 0) {
          const stepMs = remaining < substep ? remaining : substep;
          elapsed += stepMs;
          step(scratch, stepMs / 1e3, elapsed);
          remaining -= stepMs;
        }
        for (let k = 0; k < names.length; k++)
          out[k] = scratch[names[k]];
      };
    }
    return this.trackSimulated(instance, {
      fields,
      forwardMs,
      elapsedMs,
      smoothMs: opts.smoothMs,
      snap: opts.snap,
      advance
    });
  }
  trackSimulated(instance, opts) {
    const refId = refIdOf(instance);
    if (refId === void 0) {
      throw new Error("Predict.trackStepped(): instance has no refId \u2014 must run AFTER the decoder delivers the instance (e.g. inside onAdd).");
    }
    const fields = opts.fields;
    const n = fields.length;
    const fieldIds = fields.map((f) => fieldIndexOf(instance, f));
    let maxId = 0;
    for (const id of fieldIds)
      if (id > maxId)
        maxId = id;
    const posOf = new Int8Array(maxId + 1).fill(-1);
    for (let k = 0; k < n; k++)
      if (fieldIds[k] >= 0)
        posOf[fieldIds[k]] = k;
    const smoothed = new Float64Array(n);
    for (let k = 0; k < n; k++)
      smoothed[k] = instance[fields[k]] ?? 0;
    const present = this.presentFn();
    const elapsedMs = opts.elapsedMs ?? (present ?? (() => performance.now()));
    const state = {
      instance,
      fieldIds,
      posOf,
      forwardMs: opts.forwardMs,
      elapsedMs,
      advance: opts.advance,
      smoothMs: opts.smoothMs ?? 50,
      snap: opts.snap ?? 0,
      smoothed,
      out: new Float64Array(n),
      valueOut: new Float64Array(n),
      offset: new Float64Array(n),
      outPrev: new Float64Array(n),
      frameVel: new Float64Array(n),
      lastBaseT: NaN,
      lastApplyTime: -Infinity
    };
    this.simByRef.set(refId, state);
    return () => this.untrackSimulated(refId);
  }
  untrackSimulated(refId) {
    this.simByRef.delete(refId);
  }
  // --- High-level orchestration ----------------------------------------------
  /**
   * Attach prediction to a single schema instance via a declarative config.
   *
   * For collections, prefer {@link attachAll}. For a root-level instance
   * that arrives lazily, wrap this call in
   * `Callbacks.get(room).listen(state, "field", ..., true)`.
   */
  attach(instance, config) {
    const group = this.makeGroup("(attach)", config);
    return this.attachWithPlan(instance, this.planFor(group, instance));
  }
  /** One group per attach()/attachAll(): base plan built eagerly (so config
   *  errors throw at the call site, like before); per-type sub-plans lazy. */
  makeGroup(label, config) {
    return {
      label,
      config,
      basePlan: this.buildGroupPlan(config, label),
      planByCtor: /* @__PURE__ */ new Map()
    };
  }
  /** The plan for one child — the group's base plan unless the child's TYPE
   *  lacks some of the configured fields (those are dropped). Cached per
   *  constructor: homogeneous collections hit one entry. */
  planFor(group, child) {
    const ctor = child.constructor;
    let plan = group.planByCtor.get(ctor);
    if (plan === void 0) {
      plan = this.resolveCtorPlan(group, child);
      group.planByCtor.set(ctor, plan);
    }
    return plan;
  }
  /**
   * Once per (group, constructor): drop fields the child type doesn't declare
   * (they'd subscribe to nothing and, in reckon scratch, read garbage). Mode
   * is the group's — the client's prediction mode is explicit, never inferred
   * from the schema. Returns the base plan when every field is present;
   * otherwise builds a `label:TypeName` sub-plan with its own profile.
   */
  resolveCtorPlan(group, child) {
    const md = metadataOf(child);
    const typeName = child.constructor?.name || "?";
    const config = group.config;
    if (!isReckonAttachConfig(config)) {
      if (md === void 0)
        return group.basePlan;
      const keys = Object.keys(config).filter((k) => config[k] !== void 0);
      if (keys.every((k) => typeof md[k] === "number"))
        return group.basePlan;
      const filtered = {};
      for (const k of keys)
        if (typeof md[k] === "number")
          filtered[k] = config[k];
      return this.buildGroupPlan(filtered, `${group.label}:${typeName}`);
    }
    const rcfg = config;
    let fields = rcfg.fields;
    if (md !== void 0) {
      const filtered = fields.filter((f) => typeof md[f] === "number");
      if (filtered.length !== fields.length)
        fields = filtered;
    }
    if (fields === rcfg.fields)
      return group.basePlan;
    return this.buildGroupPlan({ ...rcfg, fields }, `${group.label}:${typeName}`);
  }
  /**
   * Resolve a group's profiles ONCE. Profiles are allocated via
   * {@link groupProfile} (labeled, never the mutable default #0), so every
   * child of the group shares the group's own profile and the panel can tune
   * it without bleeding into other groups.
   */
  buildGroupPlan(config, label) {
    const fieldProfiles = [];
    if (isReckonAttachConfig(config)) {
      const rcfg = config;
      if (!Array.isArray(rcfg.fields)) {
        throw new Error("Predict.attach(): `fields` must be a numeric-key array.");
      }
      const effectiveMode = rcfg.mode ?? this.defaultMode;
      const step = rcfg.step ?? this.reckonDefaults.step;
      const isReckon = effectiveMode === "reckon";
      if (isReckon && typeof step !== "function") {
        throw new Error("Predict.attach(): reckon mode requires a 'step' function. Either pass `step` in the attach config OR construct the Predict with `Predict.get(room, { mode: 'reckon', step: yourStepFn })` so it can be inherited.");
      }
      const profileIdx = this.groupProfile({ mode: effectiveMode, snap: rcfg.snap, smoothMs: rcfg.smoothMs }, label);
      for (const f of rcfg.fields)
        fieldProfiles.push({ field: f, profileIdx, angle: rcfg.angle });
      return {
        label,
        isReckon,
        reckonFields: isReckon ? rcfg.fields : void 0,
        reckonStep: isReckon ? step : void 0,
        reckonSmoothMs: rcfg.smoothMs ?? this.reckonDefaults.smoothMs,
        reckonSubstep: rcfg.substep ?? this.reckonDefaults.substep,
        reckonSnap: rcfg.snap ?? this.reckonDefaults.snap,
        reckonSnapshot: rcfg.snapshot,
        fieldProfiles
      };
    }
    const smoothing = config;
    for (const key of Object.keys(smoothing)) {
      const value = smoothing[key];
      if (value === void 0)
        continue;
      const o = typeof value === "string" ? { mode: value } : value;
      fieldProfiles.push({ field: key, profileIdx: this.groupProfile(o, label), angle: o.angle });
    }
    return { label, isReckon: false, fieldProfiles };
  }
  /** Attach one child using a pre-resolved {@link GroupPlan}. `forwardMs`
   *  overrides the reckon horizon for THIS instance only (e.g. the spawns
   *  store's per-entity input lead); omitted → snapshot age, as usual. */
  attachToGroup(instance, plan, forwardMs) {
    const offs = [];
    if (plan.isReckon) {
      offs.push(this.trackStepped(instance, {
        fields: plan.reckonFields,
        step: plan.reckonStep,
        smoothMs: plan.reckonSmoothMs,
        substep: plan.reckonSubstep,
        snap: plan.reckonSnap,
        snapshot: plan.reckonSnapshot,
        forwardMs
      }));
    }
    for (const { field, profileIdx, angle } of plan.fieldProfiles) {
      offs.push(this.trackWithProfile(instance, field, profileIdx, !!angle));
    }
    return () => {
      for (const f of offs)
        f();
    };
  }
  attachWithPlan(instance, plan) {
    const refId = refIdOf(instance);
    if (refId === void 0) {
      throw new Error("Predict.attach(): instance has no refId \u2014 attach must run AFTER the decoder delivers the instance (e.g. inside onAdd).");
    }
    this.attachToGroup(instance, plan);
    return () => this.detachByRef(refId);
  }
  /** Detach a previously {@link attach}'d instance. No-op if not attached. */
  detach(instance) {
    const refId = refIdOf(instance);
    if (refId !== void 0)
      this.detachByRef(refId);
  }
  detachByRef(refId) {
    const perRef = this.slotByRef.get(refId);
    if (perRef) {
      for (const field of [...perRef.keys()]) {
        const slotIdx = perRef.get(field);
        if (slotIdx === void 0)
          continue;
        const bound = this.boundBySlot.get(slotIdx);
        if (bound !== void 0) {
          this.freeStash(bound);
          this.boundBySlot.delete(slotIdx);
          this.freeSlots.push(slotIdx);
          perRef.delete(field);
        } else {
          this.untrackSlot(refId, field);
        }
      }
      if (perRef.size === 0)
        this.slotByRef.delete(refId);
    }
    this.simByRef.delete(refId);
  }
  attachAll(...args) {
    const rootForm = typeof args[0] === "string";
    const parent = rootForm ? void 0 : args[0];
    const key = rootForm ? args[0] : args[1];
    const config = rootForm ? args[1] : args[2];
    const group = this.makeGroup(key, config);
    const tracked = /* @__PURE__ */ new Set();
    const onAdd = (child) => {
      this.attachWithPlan(child, this.planFor(group, child));
      tracked.add(child);
    };
    const onRemove = (child) => {
      tracked.delete(child);
      this.detach(child);
    };
    const addOff = rootForm ? this.callbacks.onAdd(key, onAdd) : this.callbacks.onAdd(parent, key, onAdd);
    const removeOff = rootForm ? this.callbacks.onRemove(key, onRemove) : this.callbacks.onRemove(parent, key, onRemove);
    return () => {
      addOff?.();
      removeOff?.();
      for (const child of tracked)
        this.detach(child);
      tracked.clear();
    };
  }
  // --- Per-frame driver ------------------------------------------------------
  /**
   * Call once per render frame — the single per-frame driver for the whole
   * prediction stack. Returns your SEND BUDGET: how many fixed input steps are
   * due this frame — mutate + send exactly that many inputs through your input
   * handle (`for (n) { input.data.x = …; input.send(); }`), and the reconcilers
   * observe + predict each send. Besides pacing, the call reconciles + steps +
   * decays every {@link reconciler}/{@link sim} spawned here, advances
   * smoothing, and prunes every event channel/spawn store.
   *
   * Returns 0 while the fixed step is UNKNOWN: the rate is adopted from the
   * first {@link reconciler}/{@link sim} spawned here, so pre-spawn frames —
   * and passive smoothing-only Predicts — pace nothing. That is the send loop
   * self-gating before the local player exists, not an error; keep calling
   * `tick()` and the budget starts flowing the frame the controller spawns.
   *
   * ORDER WITHIN THE FRAME MATTERS: send the returned steps FIRST, then read
   * render values (`value()`/`pose()`). A read between this call and the frame's
   * sends is one fixed step stale — the interpolation clamps at the latest
   * applied step (never extrapolates), so late frames flat-top and fast objects
   * visibly stutter. The reconciler warns once when it detects that pattern.
   * Game logic that wants the exact predicted state (hit-reg, zone checks)
   * should read `.state`/`.world` instead, which this ordering doesn't affect.
   * In engines that run per-object update callbacks (rather than one frame
   * function), tick AND pump in the earliest registered callback — the frame
   * driver owns input; objects only read. `room.input()` returns the same
   * handle everywhere, so the driver and the entity that predicts through it
   * don't need to share plumbing.
   *
   * `now` defaults to `performance.now()`. When you drive from
   * `requestAnimationFrame`, pass ITS timestamp argument — not `performance.now()`
   * (or `room.clock.now()`) sampled inside the callback: the rAF timestamp is
   * vsync-aligned and evenly spaced, whereas an in-callback reading folds JS
   * scheduling jitter into the frame `dt`, which makes render interpolation advance
   * unevenly (motion looks "not smooth" though it never stutters). Pass it
   * explicitly, too, when ticking multiple Predicts in one frame so they share one
   * frame-time reference.
   */
  tick(now2 = performance.now()) {
    this.renderTime = now2;
    let steps = 0;
    const stepMs = this.fixedStepMs;
    if (stepMs !== void 0 && stepMs > 0) {
      const dt = this.lastFrameNow < 0 ? 0 : now2 - this.lastFrameNow;
      this.stepAcc += dt;
      steps = Math.floor(this.stepAcc / stepMs);
      if (steps > _Predict.MAX_STEPS_PER_FRAME) {
        this.stepAcc = 0;
        steps = _Predict.MAX_STEPS_PER_FRAME;
      } else {
        this.stepAcc -= steps * stepMs;
      }
    }
    this.lastFrameNow = now2;
    const driven = this.driven;
    let live = 0;
    for (let i = 0; i < driven.length; i++) {
      const d = driven[i];
      if (d.dead)
        continue;
      d.tick?.(now2);
      d.prune?.();
      if (live !== i)
        driven[live] = d;
      live++;
    }
    if (live !== driven.length)
      driven.length = live;
    return steps;
  }
  // --- Event channels --------------------------------------------------------
  /**
   * Declare a typed optimistic-event CHANNEL — one logical event type
   * (a goal, a kill, a pickup) owned end-to-end: predicted from the sim
   * (`ctx.predict(channel, payload)` inside a reconciler `step`, replay-safe
   * by construction) or from UI (`channel.predict(payload)`), optimistic
   * feedback via `onPredict`, and settlement against the server:
   * `channel.confirm()` on the authoritative signal, or auto-reject once
   * the server has processed past the prediction without confirming (see
   * the channel header's SETTLEMENT notes).
   *
   * The channel OBJECT is the identity — no string key; call sites hold the
   * binding. Auto-driven by this Predict's {@link tick} — no manual
   * `prune()`.
   *
   *     const goals = predict.defineEvent<Team>({
   *         onPredict: (team) => { celebrate(team); hidePuck(); },
   *         onReject:  ()     => showPuck(),
   *     });
   *     // in the reconciler step:      if (crossed) ctx.predict(goals, team);
   *     // on the server's broadcast:   room.onMessage("score", () => goals.confirm());
   *
   * When the authoritative signal is a STATE change rather than a broadcast,
   * declare it with `confirmOn` and skip the hand-wired listener entirely —
   * the Predict subscribes it for you and tears it down with the channel:
   *
   *     const breaks = predict.defineEvent<string>({
   *         label: "break",
   *         // when a crate's `alive` flips false, confirm the entry keyed
   *         // by that crate's collection key
   *         confirmOn: { collection: "crates", field: "alive", equals: false },
   *     });
   *
   * Also `{ collection, event: "add" | "remove" }` when membership itself is
   * the signal (`add` settles keyless, optionally gated by `mine`). The
   * field/remove forms require channel entry keys (the `uniqueBy` output) to
   * BE collection keys; root-level collections only — mismatched schemes
   * confirm manually (see the `confirmOn` module header).
   */
  defineEvent(opts) {
    const { confirmOn, ...channelOpts } = opts;
    const channel = new PredictedEventChannel(channelOpts, this.clock ?? null);
    if (confirmOn !== void 0) {
      if (confirmOn.mine !== void 0 && typeof this.sessionSource.sessionId !== "string") {
        throw new Error(`Predict.defineEvent: confirmOn.mine ("${confirmOn.mine}") requires a Predict built from a Room (it compares against room.sessionId); confirm manually instead.`);
      }
      channel._addTeardown(wireConfirmOn(this.callbacks, channel, confirmOn, () => this.sessionSource.sessionId));
    }
    this.driven.push(channel);
    return channel;
  }
  /**
   * Spawn a {@link PredictedSpawns} store for a collection of optimistically-
   * spawned entities (bullets, grenades, dropped items) at `state[key]`.
   *
   * Predicted locals (added via the store's `spawn(...)`) render instantly;
   * when the authoritative entity arrives in the collection it's correlated
   * to the matching prediction and the two collapse onto one logical entry
   * with a stable `id`. Wires the collection's `onAdd`/`onRemove` and is
   * auto-ticked + pruned by this Predict's {@link tick} — no separate drive.
   *
   * With `fields`, the store also owns the collection's **motion** (no
   * separate `attachAll` needed): confirmed entities are dead-reckoned with
   * the same `step` that advances pending locals, and `store.value(entry,
   * field)` is one read path across the whole life of the entity. Foreign
   * entities reckon to server-present; with `spawnTime`, owned ones reckon
   * to server-present *plus the measured input lead*, so the authoritative
   * entity continues the prediction's flight on the shooter's timeline —
   * no snap-back at the handoff, and the rendered trajectory is the one a
   * favor-the-shooter lag-comp hit test actually judges.
   *
   * The server element type `S` is inferred from `key`; the predicted-local
   * shape defaults to `Partial<S>`, so `spawn()` is type-checked against the
   * server fields with no annotations. To carry client-only fields, annotate
   * a callback param (e.g. `step: (b: { x: number; speed: number }, dt) => …`)
   * and `L` is inferred from it. An optional `data` factory gives each entry
   * an auto-cleaned render-scratch slot (`entry.data: D`), inferred from its
   * return.
   *
   * ```ts
   * const rockets = predict.spawns("rockets", {
   *   owned:     r => r.owner === room.sessionId,      // r: Rocket
   *   spawnTime: r => r.bornMs,                        // exact per-shot lead
   *   step:      stepRocket,                           // shared client/server sim
   *   fields:    ["x", "z"],                           // reckon confirmed entities
   * });
   * // on the predicted fire (live input step):
   * rockets.spawn({ x, z, heading });
   * // render — one path, handoff-invisible, keyed on the stable entry id:
   * for (const e of rockets.entries()) {
   *   draw(e.id, rockets.value(e, "x"), rockets.value(e, "z"));
   * }
   * ```
   */
  spawns(key, opts = {}) {
    const store = new PredictedSpawns(opts, this.clock ?? null);
    const fields = opts.fields;
    const step = opts.step;
    const group = fields !== void 0 && step !== void 0 ? this.makeGroup(String(key), {
      mode: "reckon",
      fields,
      step,
      smoothMs: opts.smoothMs ?? 0,
      substep: opts.substep
    }) : void 0;
    const untrack = group !== void 0 ? /* @__PURE__ */ new Map() : void 0;
    const clock = this.clock;
    store.attach((onAdd, onRemove) => {
      const addOff = this.callbacks.onAdd(key, (server, k) => {
        onAdd(server, k);
        if (group === void 0 || untrack.has(server))
          return;
        const lead = store.entryFor(server)?.leadMs ?? 0;
        const forwardMs = clock ? () => {
          const stamp = clock.lastServerTime();
          const age = stamp > 0 ? Math.max(0, clock.serverNow() - stamp) : 0;
          return Math.max(0, age + lead);
        } : () => Math.max(0, lead);
        untrack.set(server, this.attachToGroup(server, this.planFor(group, server), forwardMs));
      });
      const removeOff = this.callbacks.onRemove(key, (server, k) => {
        untrack?.get(server)?.();
        untrack?.delete(server);
        onRemove(server, k);
      });
      return () => {
        addOff?.();
        removeOff?.();
        if (untrack !== void 0) {
          for (const off of untrack.values())
            off();
          untrack.clear();
        }
      };
    });
    if (group !== void 0) {
      store.bindReader((server, field) => this.value(server, field));
    }
    this.driven.push(store);
    return store;
  }
  /**
   * The canonical interpolation `delay` (the default profile's `delay`, from
   * `Predict.get(room, { delay })` / {@link setDefaults}). Lag compensation's
   * `renderDelay` is bound to this by {@link reconciler}/{@link sim} so the
   * interp buffer the remotes render at and the server's rewind instant are
   * derived from ONE number — they can't drift out of sync.
   */
  canonicalDelay() {
    return this.profileBuf[DEFAULTS_PROFILE * PROFILE_STRIDE + P_DELAY];
  }
  /**
   * Bind lag-comp's `renderDelay` on the input handle to this Predict's lerp
   * `delay` (the impl's `bindRenderDelay`) so the remote interp
   * buffer and the server's rewind instant stay one value — no "keep the two
   * delays equal" footgun. `instanceof`-narrowed (not cast), so a non-impl
   * input (a test mock) is a no-op; an explicit `room.input({ renderDelay })`
   * still wins inside `bindRenderDelay`.
   */
  bindInputRenderDelay(input) {
    if (input instanceof InputHandleImpl) {
      input.bindRenderDelay(() => this.canonicalDelay());
    }
  }
  /**
   * Spawn a {@link Reconciler} for a locally-controlled entity — server-
   * reconciled rollback (predict your inputs immediately, rewind to the server's
   * authoritative state + replay unacked inputs, smoothly correcting
   * mispredictions). The active counterpart to this Predict's passive modes: use
   * `reconciler()` for the entity you control, lerp/reckon for the rest.
   *
   * A pure OBSERVER of `opts.input` (`room.input(...)`): you mutate + send through
   * the handle (`input.data.x = …; input.send()`) and the reconciler steps each
   * send + reads the server ack (`input.lastProcessed`) off it — the channel you
   * send on is the channel that knows what's acked. `predict.tick(now)` returns
   * how many fixed input steps are due this frame.
   *
   * Auto-ticked by this Predict's {@link tick} each frame (reconcile + smooth-
   * correction decay) — no separate `tick()` call to forget.
   *
   * `opts.fields` defaults to every scalar field of `instance`'s schema — see
   * {@link Reconciler} for the derivation and when to subset explicitly.
   */
  reconciler(instance, opts) {
    const recon = new Reconciler(instance, { ...opts, clock: opts.clock ?? this.clock });
    this.adoptFixedStep(recon.stepMs);
    this.bindInputRenderDelay(opts.input);
    this.installBoundOverlay(recon);
    this.driven.push(recon);
    return recon;
  }
  /**
   * Spawn a {@link SimReconciler} for the entity (or entities) your inputs
   * control — server-reconciled rollback (predict immediately, rewind to the
   * server's authoritative state + replay unacked inputs, smoothly correcting
   * mispredictions) — when their truth isn't a single flat scalar `fields` list:
   * composite scalar state across several schema instances (a paddle + the puck
   * it strikes, reconciled together), or an opaque physics-engine handle. Your
   * `world` owns the state via `step` / `adopt` / `pose` callbacks; the controller
   * runs the rollback loop and passes the world handle to each.
   *
   * Like {@link reconciler}, it OBSERVES `opts.input` (you mutate + send through
   * the handle; `predict.tick(now)` returns the fixed-step count) and is
   * auto-ticked by this Predict's {@link tick} each frame (reconcile + decay).
   */
  sim(opts) {
    const ctl = new SimReconciler({
      ...opts,
      clock: opts.clock ?? this.clock
    });
    this.adoptFixedStep(ctl.stepMs);
    this.bindInputRenderDelay(opts.input);
    this.installBoundOverlay(ctl);
    this.driven.push(ctl);
    return ctl;
  }
  /**
   * Adopt a spawned reconciler's fixed step as this Predict's room-wide pacing
   * rate (the first one wins — the server has a single tick rate). Warns if a
   * later reconciler advertises a different step, since one accumulator can't
   * pace two rates.
   */
  adoptFixedStep(stepMs) {
    if (this.fixedStepMs === void 0) {
      this.fixedStepMs = stepMs;
      this.stepAcc = 0;
      this.lastFrameNow = -1;
      return;
    }
    if (Math.abs(this.fixedStepMs - stepMs) > 1e-6) {
      console.warn(`@colyseus/sdk Predict: a reconciler's fixed step (${stepMs}ms) differs from this Predict's (${this.fixedStepMs}ms). tick() paces one rate for the whole room; use a separate Predict per rate.`);
    }
  }
  // --- Reads -----------------------------------------------------------------
  /**
   * Smoothed/predicted RENDER value for a numeric field — the one read idiom:
   * passively-smoothed entities (lerp/reckon/…) and instances bound by a
   * live `reconciler()`/`sim()` controller all resolve here (the controller
   * overlays the slot while it lives; dispose restores the passive slot or
   * the raw fallback). Falls through to raw `instance[field]` if the field
   * isn't being tracked — so the read is valid across the entity's whole
   * lifecycle. For game logic on a controlled entity read the controller's
   * `.state`/`.world` instead (exact, no smoothing offset).
   */
  value(instance, field) {
    const refId = refIdOf(instance);
    const slotIdx = refId === void 0 ? void 0 : this.slotByRef.get(refId)?.get(field);
    if (slotIdx === void 0)
      return instance[field];
    const profileIdx = this.slotBuf[slotIdx * SLOT_STRIDE + SLOT_PROFILE] | 0;
    return this.profileComputers[profileIdx](slotIdx);
  }
  /**
   * RAW reckoned value at an ARBITRARY server-time instant `time`
   * (server-clock ms) — the reckoned position WITHOUT the decaying
   * smooth-correction offset that {@link value} adds for rendering.
   *
   * Use this for GAME LOGIC (collision / hit tests), and {@link value} for
   * RENDERING. The offset exists only to hide snapshot-rebase pops on screen;
   * feeding it into a hit test makes the client judge an overlap against a
   * position a few cm off the physical prediction, which flips knife-edge
   * stomp/hit calls vs the server (the server reads the exact timeline, no
   * offset). Controller-bound fields' exact predicted state lives on the
   * controller (`me.state` / `me.world`), not behind this read.
   *
   * For client-side collision/hit prediction, sample remote entities at the
   * input's `ctx.reckonTime` (the instant the server rewinds to) so the client's
   * hit call matches the server's lag-comp read BY CONSTRUCTION — on the live
   * step AND deterministically on rollback replay (same `time` per seq). For
   * logic reads at the present instant outside a step, pass
   * `room.clock.serverNow()`.
   *
   * Perf: the render read's per-frame reckon is cached; `valueAt` re-runs the
   * forward projection on EVERY call. Hot per-frame consumers should batch
   * with {@link readAt} — one projection per instance instead of one per field.
   *
   * Reckons FORWARD from the latest server snapshot to `time`: integrates the
   * tracked `step` from `lastServerTime()` to `time`, evaluating time-sampled
   * formulas (sinusoids, cooldown snaps) at `time`. The SDK keeps no per-entity
   * history, so `time ≤ lastServerTime()` CLAMPS to the snapshot (reckoning
   * into the past is the server rewind buffer's job — a non-reckonable discrete
   * motion you replay backward must be reconstructed from its own schedule). On
   * the live step `time = reckonTime ≈ serverNow() > lastServerTime()`, so it's
   * exact. Non-reckon / untracked fields ignore `time` and return {@link value}.
   */
  valueAt(instance, field, time) {
    const refId = refIdOf(instance);
    const slotIdx = refId === void 0 ? void 0 : this.slotByRef.get(refId)?.get(field);
    if (slotIdx === void 0)
      return instance[field];
    const i = slotIdx * SLOT_STRIDE;
    const profileIdx = this.slotBuf[i + SLOT_PROFILE] | 0;
    if (this.profileComputers[profileIdx] !== this.computeReckon) {
      return this.profileComputers[profileIdx](slotIdx);
    }
    const sim = this.simByRef.get(this.slotBuf[i + SLOT_REF]);
    if (sim !== void 0) {
      const fieldId = this.slotBuf[i + SLOT_FIELD] | 0;
      const pos = fieldId < sim.posOf.length ? sim.posOf[fieldId] : -1;
      if (pos >= 0) {
        const base = this.clock?.lastServerTime?.() ?? NaN;
        const fwd = Number.isNaN(base) ? 0 : Math.max(0, time - base);
        sim.advance(sim.instance, fwd, sim.valueOut, time);
        return sim.valueOut[pos];
      }
    }
    return this.slotBuf[i + SLOT_V1];
  }
  /**
   * Batch {@link value} reads — the render value of each listed field written
   * into one object. The `fields` YOU list define the result's shape
   * (`Record<field, number>`). Pass `out` to fill (and return) a reused
   * scratch instead of allocating — its properties beyond `fields` are left
   * untouched, so a scratch can carry extra context (an `alive` flag, say).
   * Mirrors the server's `seen.read` — the same batch-read concept on both
   * sides of the wire.
   *
   * Hot-path guidance (per-frame loops): hoist `fields` as a module-level
   * const and reuse the scratch — a fresh array or object literal per frame
   * allocates. The batch resolves the instance's ref once for the whole
   * group, then reads each field through the same computers as {@link value}.
   */
  read(instance, fields, out) {
    const o = out ?? {};
    const refId = refIdOf(instance);
    const fieldMap = refId === void 0 ? void 0 : this.slotByRef.get(refId);
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const slotIdx = fieldMap?.get(field);
      o[field] = slotIdx === void 0 ? instance[field] : this.profileComputers[this.slotBuf[slotIdx * SLOT_STRIDE + SLOT_PROFILE] | 0](slotIdx);
    }
    return o;
  }
  /**
   * Batch {@link valueAt} reads — every listed field sampled at the same
   * server-time instant `time`, with {@link read}'s scratch contract.
   *
   * For client-side hit prediction, sample a remote's pose at the input's
   * `ctx.reckonTime` in one call: the batch runs the forward reckon
   * integration ONCE per instance instead of once per field, so a
   * four-field pose read costs one `step` walk, not four. Non-reckon and
   * untracked fields ignore `time`, exactly like {@link valueAt}.
   */
  readAt(instance, fields, time, out) {
    const o = out ?? {};
    const refId = refIdOf(instance);
    const fieldMap = refId === void 0 ? void 0 : this.slotByRef.get(refId);
    let sim;
    let advanced = false;
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const slotIdx = fieldMap?.get(field);
      if (slotIdx === void 0) {
        o[field] = instance[field];
        continue;
      }
      const s = slotIdx * SLOT_STRIDE;
      const profileIdx = this.slotBuf[s + SLOT_PROFILE] | 0;
      if (this.profileComputers[profileIdx] !== this.computeReckon) {
        o[field] = this.profileComputers[profileIdx](slotIdx);
        continue;
      }
      if (!advanced) {
        advanced = true;
        sim = this.simByRef.get(this.slotBuf[s + SLOT_REF]);
        if (sim !== void 0) {
          const base = this.clock?.lastServerTime?.() ?? NaN;
          const fwd = Number.isNaN(base) ? 0 : Math.max(0, time - base);
          sim.advance(sim.instance, fwd, sim.valueOut, time);
        }
      }
      if (sim !== void 0) {
        const fieldId = this.slotBuf[s + SLOT_FIELD] | 0;
        const pos = fieldId < sim.posOf.length ? sim.posOf[fieldId] : -1;
        if (pos >= 0) {
          o[field] = sim.valueOut[pos];
          continue;
        }
      }
      o[field] = this.slotBuf[s + SLOT_V1];
    }
    return o;
  }
  /**
   * Exponential smoothing toward the latest server value (`v1`). Reads
   * `smoothMs` from the slot's profile.
   */
  computeDamped = (slotIdx) => {
    const buf = this.slotBuf;
    const i = slotIdx * SLOT_STRIDE;
    const pBuf = this.profileBuf;
    const pBase = (buf[i + SLOT_PROFILE] | 0) * PROFILE_STRIDE;
    const now2 = this.renderTime;
    const v1 = buf[i + SLOT_V1];
    const lastT = buf[i + SLOT_AUX_T];
    const dtFrame = now2 - lastT;
    buf[i + SLOT_AUX_T] = now2;
    let damped = buf[i + SLOT_AUX_V];
    if (dtFrame > 0) {
      const tau = pBuf[pBase + P_SMOOTH_MS];
      const k = tau > 0 ? 1 - Math.exp(-dtFrame / tau) : 1;
      damped += (v1 - damped) * k;
      buf[i + SLOT_AUX_V] = damped;
    }
    return damped;
  };
  /**
   * Canonical entity interpolation:
   *   1. Render at `target = now - delay` (delay sized so the snapshot
   *      ring almost always brackets the target).
   *   2. Find the latest pair (k, k+1) with ts(k) <= target.
   *   3. Lerp between them. On underrun (target past newest snapshot) or
   *      warmup (only one snapshot), hold at the newest sample — *don't*
   *      extrapolate. Extrapolation here is what produced the "flickery"
   *      feel; bracketing changes happen at predictable render-time
   *      crossings, not at jittered packet arrivals.
   *   4. Optionally chase the result with an output spring (`smoothMs`,
   *      default 0 = off) — display-side velocity continuity for imperfect
   *      snapshot streams; see {@link SmoothingOptions.smoothMs}.
   */
  computeLerp = (slotIdx) => {
    const raw = this.computeLerpRaw(slotIdx);
    const buf = this.slotBuf;
    const i = slotIdx * SLOT_STRIDE;
    const tau = this.profileBuf[(buf[i + SLOT_PROFILE] | 0) * PROFILE_STRIDE + P_LERP_SMOOTH_MS];
    const now2 = this.renderTime;
    if (tau <= 0) {
      buf[i + SLOT_AUX_V] = raw;
      buf[i + SLOT_LERP_PREV] = raw;
      buf[i + SLOT_AUX_T] = now2;
      return raw;
    }
    const lastT = buf[i + SLOT_AUX_T];
    const dt = now2 - lastT;
    if (dt <= 0)
      return buf[i + SLOT_AUX_V];
    const u0 = buf[i + SLOT_LERP_PREV];
    const y0 = buf[i + SLOT_AUX_V];
    const kdt = dt / tau;
    const trail = (raw - u0) / kdt;
    const y = raw - trail + (y0 - u0 + trail) * Math.exp(-kdt);
    buf[i + SLOT_AUX_V] = y;
    buf[i + SLOT_LERP_PREV] = raw;
    buf[i + SLOT_AUX_T] = now2;
    return y;
  };
  /** Steps 1–3 of {@link computeLerp} — the undamped interpolant. */
  computeLerpRaw(slotIdx) {
    const buf = this.slotBuf;
    const i = slotIdx * SLOT_STRIDE;
    const pBuf = this.profileBuf;
    const pBase = (buf[i + SLOT_PROFILE] | 0) * PROFILE_STRIDE;
    const now2 = this.renderTime;
    const count = buf[i + SLOT_RING_COUNT] | 0;
    if (count === 0)
      return buf[i + SLOT_V1];
    const head = buf[i + SLOT_RING_HEAD] | 0;
    const ringBase = i + SLOT_RING_BASE;
    const start = (head - count + RING_CAP) % RING_CAP;
    const newestPhys = (start + count - 1) % RING_CAP;
    const newestOff = ringBase + newestPhys * 2;
    if (count === 1)
      return buf[newestOff + 1];
    const delay = pBuf[pBase + P_DELAY];
    const target = this.clock && this.clock.lastServerTime() > 0 ? this.clock.serverNow() - delay - this.clock.smoothedRtt() / 2 : now2 - delay;
    const oldestOff = ringBase + start * 2;
    if (target <= buf[oldestOff])
      return buf[oldestOff + 1];
    if (target >= buf[newestOff])
      return buf[newestOff + 1];
    let k = count - 2;
    let phys = (start + k) % RING_CAP;
    while (k > 0) {
      const tk = buf[ringBase + phys * 2];
      if (tk <= target)
        break;
      k--;
      phys = phys === 0 ? RING_CAP - 1 : phys - 1;
    }
    const aOff = ringBase + phys * 2;
    const bPhys = phys + 1 >= RING_CAP ? 0 : phys + 1;
    const bOff = ringBase + bPhys * 2;
    const tA = buf[aOff], tB = buf[bOff];
    const span = tB - tA;
    if (span <= 0)
      return buf[bOff + 1];
    const u = (target - tA) / span;
    const vA = buf[aOff + 1], vB = buf[bOff + 1];
    return vA + (vB - vA) * u;
  }
  /**
   * Ring-driven forward projection with predict-then-smooth output EMA.
   *   1. Anchor on the ring's newest snapshot.
   *   2. Slope from a 2-step lookback in the ring (~2 tick intervals)
   *      when available, else last-2 fallback.
   *   3. raw = anchor + slope · clamp(now − anchor.t, 0, maxExtrapolate).
   *   4. EMA-blend raw → smoothed using `smoothMs` (0 disables → return raw).
   */
  computeExtrapolate = (slotIdx) => {
    const buf = this.slotBuf;
    const i = slotIdx * SLOT_STRIDE;
    const pBuf = this.profileBuf;
    const pBase = (buf[i + SLOT_PROFILE] | 0) * PROFILE_STRIDE;
    const now2 = this.renderTime;
    const count = buf[i + SLOT_RING_COUNT] | 0;
    if (count === 0)
      return buf[i + SLOT_V1];
    const head = buf[i + SLOT_RING_HEAD] | 0;
    const ringBase = i + SLOT_RING_BASE;
    const start = (head - count + RING_CAP) % RING_CAP;
    const newestPhys = (start + count - 1) % RING_CAP;
    const newestOff = ringBase + newestPhys * 2;
    const newestT = buf[newestOff];
    const newestV = buf[newestOff + 1];
    let raw;
    if (count === 1) {
      raw = newestV;
    } else {
      const steps = count >= 3 ? 2 : 1;
      const lbPhys = (start + count - 1 - steps + RING_CAP) % RING_CAP;
      const lbOff = ringBase + lbPhys * 2;
      const lbT = buf[lbOff];
      const lbV = buf[lbOff + 1];
      const dt = newestT - lbT;
      if (dt <= 0) {
        raw = newestV;
      } else {
        const slope = (newestV - lbV) / dt;
        const maxExt = pBuf[pBase + P_MAX_EXTRAPOLATE];
        let ahead = now2 - newestT;
        if (ahead < 0)
          ahead = 0;
        else if (ahead > maxExt)
          ahead = maxExt;
        raw = newestV + slope * ahead;
      }
    }
    const lastT = buf[i + SLOT_AUX_T];
    buf[i + SLOT_AUX_T] = now2;
    const tau = pBuf[pBase + P_SMOOTH_MS];
    if (tau <= 0) {
      buf[i + SLOT_AUX_V] = raw;
      return raw;
    }
    const dtFrame = now2 - lastT;
    let smoothed = buf[i + SLOT_AUX_V];
    if (dtFrame > 0) {
      const k = 1 - Math.exp(-dtFrame / tau);
      smoothed += (raw - smoothed) * k;
      buf[i + SLOT_AUX_V] = smoothed;
    }
    return smoothed;
  };
  /**
   * Dead-reckoning dispatch. Recovers (refId, fieldId) from the slot, finds
   * the `SimState` registered by `trackStepped`, and runs predict-then-smooth.
   * If the slot's profile flipped to reckon at runtime but no SimState was
   * ever allocated (e.g. attach was smoothing-only), falls back to the latest
   * server value mirrored in SLOT_V1 — degraded but functional, no object
   * access.
   */
  computeReckon = (slotIdx) => {
    const buf = this.slotBuf;
    const i = slotIdx * SLOT_STRIDE;
    const refId = buf[i + SLOT_REF];
    const fieldId = buf[i + SLOT_FIELD] | 0;
    const sim = this.simByRef.get(refId);
    if (sim !== void 0) {
      const pos = fieldId < sim.posOf.length ? sim.posOf[fieldId] : -1;
      if (pos >= 0)
        return this.applySimulation(sim, pos);
    }
    return buf[i + SLOT_V1];
  };
  /**
   * Raw dispatch — return the latest server value as-is, no smoothing/
   * prediction. SLOT_V1 mirrors the latest sample on every update, so this
   * needs no object access. The slot ring still receives samples from the
   * listener (so a panel flip back to a smoothing mode works without
   * re-attach), but they're unused while raw is active.
   */
  computeRaw = (slotIdx) => {
    return this.slotBuf[slotIdx * SLOT_STRIDE + SLOT_V1];
  };
  /**
   * Bound-overlay dispatch — the slot's value is a rollback controller's
   * interpolated + smooth-corrected pose read (`ctrl.value(poseKey)`). Same
   * dispatch class as reckon's `simByRef` read: one side-table lookup, then
   * the controller read — which also runs the read-before-pump bookkeeping,
   * so `predict.value(entity, f)` and `me.value(f)` warn identically.
   */
  computeBound = (slotIdx) => {
    const e = this.boundBySlot.get(slotIdx);
    return e !== void 0 ? e.ctrl.value(e.key) : this.slotBuf[slotIdx * SLOT_STRIDE + SLOT_V1];
  };
  // --- Internal smoothing math -----------------------------------------------
  /** `pos` indexes the SoA buffers (`sim.smoothed` / `sim.out`).
   *
   * Predict + OFFSET-DECAY smoothing (not an EMA chase): the display is
   * `out + offset`. Between snapshots the forward sim is continuous, so the
   * display moves at the target's full velocity — STEADY-STATE EXACT, no
   * systematic lag on a moving entity (an EMA chasing a mover lags it by
   * ~v × smoothMs forever — enough to flip knife-edge hit calls vs the
   * server, which always reads the exact timeline). When a new SNAPSHOT
   * rebases the sim and the trajectory jumps (a real misprediction), the
   * discontinuity is captured into `offset` and decays out — the pop-hiding
   * the smoothing exists for. Same construction as the Reconciler's
   * error-decay for the local player.
   *
   * Without a clock (`lastBaseT` stays NaN — rebase undetectable), falls
   * back to the EMA chase. */
  applySimulation(sim, pos) {
    const now2 = this.renderTime;
    if (sim.lastApplyTime !== now2) {
      const out = sim.out;
      const sm = sim.smoothed;
      const off = sim.offset;
      const n = sm.length;
      const baseT = this.clock?.lastServerTime?.() ?? NaN;
      sim.advance(sim.instance, sim.forwardMs(), out, sim.elapsedMs());
      const first = sim.lastApplyTime === -Infinity;
      if (first || sim.smoothMs <= 0) {
        for (let k = 0; k < n; k++) {
          off[k] = 0;
          sm[k] = out[k];
        }
      } else if (!Number.isNaN(baseT)) {
        const dtMs = Math.max(0, Math.min(now2 - sim.lastApplyTime, 100));
        if (baseT !== sim.lastBaseT && !Number.isNaN(sim.lastBaseT)) {
          const snap = sim.snap;
          const vel = sim.frameVel;
          for (let k = 0; k < n; k++) {
            const d = sm[k] + vel[k] * dtMs - out[k];
            off[k] = snap > 0 && Math.abs(d) > snap ? 0 : d;
          }
        } else if (dtMs > 0) {
          const outPrev2 = sim.outPrev, vel = sim.frameVel;
          for (let k = 0; k < n; k++)
            vel[k] = (out[k] - outPrev2[k]) / dtMs;
        }
        const decay = Math.exp(-dtMs / sim.smoothMs);
        for (let k = 0; k < n; k++) {
          off[k] *= decay;
          sm[k] = out[k] + off[k];
        }
      } else {
        const dtMs = Math.max(0, Math.min(now2 - sim.lastApplyTime, 100));
        const kk = 1 - Math.exp(-dtMs / sim.smoothMs);
        for (let k = 0; k < n; k++)
          sm[k] += (out[k] - sm[k]) * kk;
      }
      const outPrev = sim.outPrev;
      for (let k = 0; k < n; k++)
        outPrev[k] = out[k];
      sim.lastBaseT = baseT;
      sim.lastApplyTime = now2;
    }
    return sim.smoothed[pos];
  }
};

export {
  Protocol,
  ProtocolModifier,
  PROTOCOL_CODE_MASK,
  ResponseStatus,
  HandshakeSection,
  InputFlags,
  CloseCode,
  now,
  publishDebug,
  InputHandleImpl,
  NULL_CLOCK,
  RoomClockImpl,
  classifyDrift,
  DEFAULT_GRACE_TICKS,
  PredictedEventChannel,
  PredictedSpawns,
  Reconciler,
  SimReconciler,
  Predict
};

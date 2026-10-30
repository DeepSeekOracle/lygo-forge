"use strict";
(() => {
  // src/page/animation-gate.ts
  var PACE_SLACK_MS = 2;
  var MS_PER_SECOND = 1e3;
  function animationGate(host) {
    let visible = true;
    let next = 0;
    let minIntervalMs = 0;
    let frameAt = Number.NEGATIVE_INFINITY;
    const due = (time) => {
      if (minIntervalMs === 0 || time === frameAt) return true;
      if (time - frameAt < minIntervalMs - PACE_SLACK_MS) return false;
      frameAt = time;
      return true;
    };
    const pending = /* @__PURE__ */ new Map();
    const arm2 = (id) => {
      const entry = pending.get(id);
      if (!entry || !visible || entry.native !== null) return;
      const generation = ++entry.generation;
      entry.native = host.request((time) => {
        if (!visible || pending.get(id) !== entry || generation !== entry.generation) return;
        if (!due(time)) {
          entry.native = null;
          arm2(id);
          return;
        }
        pending.delete(id);
        entry.callback(time);
      });
    };
    return {
      request(callback) {
        const id = ++next;
        pending.set(id, { callback, native: null, generation: 0 });
        arm2(id);
        return id;
      },
      cancel(id) {
        const entry = pending.get(id);
        if (entry?.native !== null && entry?.native !== void 0) host.cancel(entry.native);
        pending.delete(id);
      },
      /** At most this many frames a second; 0 (or less) lifts the cap. */
      setMaxFps(fps2) {
        minIntervalMs = fps2 > 0 ? MS_PER_SECOND / fps2 : 0;
      },
      setVisible(value) {
        if (visible === value) return;
        visible = value;
        for (const [id, entry] of pending) {
          if (visible) arm2(id);
          else {
            if (entry.native !== null) host.cancel(entry.native);
            entry.native = null;
          }
        }
      }
    };
  }

  // src/page/capture.ts
  var CAPTURE_RACE_MS = 250;
  var ASYNC_TICKS = 8;
  var ASYNC_TICK_MS = 16;
  var THREE_KINDS = /* @__PURE__ */ new Set(["webgl", "webgl2", "webgpu"]);
  var TRANSPARENT = /^(?:transparent|rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0(?:\.0+)?\s*\))$/i;
  var DEFAULT_BACKGROUND = "#ffffff";
  var NO_CANVAS = "this page has no canvas to photograph";
  var TRANSPARENT_WEBGPU = "this WebGPU canvas is transparent and the page cannot composite it, so the compositor takes the frame";
  var NOTHING_DREW = "nothing was drawn for this frame, so the canvas holds no picture";
  var PAINTED_BACKGROUND = "the page background is an image or a gradient, so the page cannot resolve one colour behind the frame";
  var guarded = (fn, fallback = null) => {
    try {
      const value = fn();
      return value === void 0 ? fallback : value;
    } catch {
      return fallback;
    }
  };
  var isImage = (value) => typeof value === "string" && value.startsWith("data:image/");
  function surfaces(c) {
    const seen = guarded(() => c.deps.canvases?.(), null);
    const elements = Array.isArray(seen?.elements) ? seen.elements : [];
    const descriptors = Array.isArray(seen?.descriptors) ? seen.descriptors : [];
    return { elements, descriptors };
  }
  var totals = (c) => guarded(() => c.deps.draws?.(), null);
  function drawnSoFar(c) {
    const now = totals(c);
    const calls = Number(now?.drawCalls);
    return Number.isFinite(calls) ? calls : 0;
  }
  function countersLive(c) {
    const now = totals(c);
    return Boolean(now) && now.counting !== false;
  }
  var usable = (descriptor) => Boolean(descriptor) && descriptor.visible !== false && (descriptor.width ?? 0) > 0 && (descriptor.height ?? 0) > 0;
  function largest(elements, descriptors, wanted) {
    let best = null;
    descriptors.forEach((descriptor, index) => {
      if (!wanted(descriptor) || !usable(descriptor)) return;
      const area = (descriptor.width ?? 0) * (descriptor.height ?? 0);
      if (best && area <= (best.area ?? 0)) return;
      best = {
        canvas: elements[index],
        descriptor,
        index,
        area,
        why: THREE_KINDS.has(descriptor.kind) ? "largest 3D canvas" : "largest canvas"
      };
    });
    return best;
  }
  function pick(c) {
    const { elements, descriptors } = surfaces(c);
    const own = guarded(() => c.deps.rendererCanvas?.(), null);
    const ownIndex = own ? elements.indexOf(own) : -1;
    if (ownIndex >= 0 && usable(descriptors[ownIndex])) {
      return { canvas: own, descriptor: descriptors[ownIndex], index: ownIndex, why: "renderer" };
    }
    const best = largest(elements, descriptors, (descriptor) => THREE_KINDS.has(descriptor.kind)) ?? largest(elements, descriptors, (descriptor) => descriptor.kind !== "2d");
    return best ?? { canvas: null, descriptor: null, index: -1, why: NO_CANVAS };
  }
  var MAX_BACKGROUND_HOPS = 32;
  function ownBackground(style) {
    const image = String(style.backgroundImage ?? "none");
    if (image && image !== "none") return { ok: false, reason: PAINTED_BACKGROUND };
    const colour = String(style.backgroundColor ?? "");
    if (colour && !TRANSPARENT.test(colour.trim())) return { ok: true, colour };
    return null;
  }
  function background(c, canvas) {
    let element = canvas;
    let hops = 0;
    while (element && hops++ < MAX_BACKGROUND_HOPS) {
      const style = guarded(() => c.deps.computedStyle?.(element), null);
      if (!style) break;
      const found = ownBackground(style);
      if (found) return found;
      element = guarded(() => c.deps.parentOf?.(element), null);
    }
    return { ok: true, colour: DEFAULT_BACKGROUND };
  }
  function nextFrame(c) {
    return new Promise((resolve) => {
      let settled = false;
      let timer = null;
      let unsubscribe = null;
      const finish = (fired) => {
        if (settled) return;
        settled = true;
        if (timer !== null) c.cancel(timer);
        try {
          unsubscribe?.();
        } catch {
        }
        resolve(fired);
      };
      timer = c.later(() => finish(false), c.raceMs);
      try {
        unsubscribe = c.deps.afterFrame?.(() => finish(true)) ?? null;
        if (!unsubscribe) finish(false);
      } catch {
        finish(false);
      }
    });
  }
  function record(c, patch2) {
    c.info = { ...c.info, ...patch2, count: c.info.count + 1 };
    return c.info;
  }
  function pickedSummary(picked, kind) {
    if (!picked.descriptor) return null;
    const { index, descriptor, why } = picked;
    return { index, kind, width: descriptor.width, height: descriptor.height, why };
  }
  var NOTED = ["source", "reason", "picked", "background", "composited", "drawCalls", "ladder", "backend", "kind"];
  function note(c, patch2) {
    const clean = { source: "game", ladder: ["game"], canvases: [] };
    if (patch2 && typeof patch2 === "object") {
      for (const key of NOTED) if (patch2[key] !== void 0) clean[key] = patch2[key];
    }
    record(c, clean);
    return captureInfo(c);
  }
  var decodeImage = (c, dataUrl) => Promise.resolve(guarded(() => c.deps.decode?.(dataUrl), null)).catch(() => null);
  var pixelSize = (canvas) => ({
    width: Math.max(1, Math.round(Number(canvas?.width) || 0)),
    height: Math.max(1, Math.round(Number(canvas?.height) || 0))
  });
  async function paint(c, dataUrl, patch2 = {}) {
    const picked = pick(c);
    const kind = picked.descriptor?.kind ?? null;
    const keep = (extra) => note(c, {
      picked: pickedSummary(picked, kind),
      kind,
      backend: THREE_KINDS.has(kind) ? kind : null,
      ...patch2,
      ...extra
    });
    if (!isImage(dataUrl)) {
      keep({ reason: patch2.reason ?? "the game's own capture produced no image", composited: false, background: null });
      return null;
    }
    const colour = picked.canvas ? background(c, picked.canvas) : { ok: false, reason: NO_CANVAS };
    if (!colour.ok) {
      keep({ composited: false, background: null });
      return dataUrl;
    }
    const decoded = await decodeImage(c, dataUrl);
    const { width, height } = pixelSize(picked.canvas);
    const painted = decoded ? composite(c, decoded, colour.colour, width, height) : null;
    keep({ composited: Boolean(painted), background: colour.colour });
    return painted ?? dataUrl;
  }
  function composite(c, source, colour, width, height) {
    const scratch = guarded(() => c.deps.createCanvas?.(), null);
    const context = scratch ? guarded(() => scratch.getContext("2d"), null) : null;
    if (!context) return null;
    scratch.width = width;
    scratch.height = height;
    context.fillStyle = colour;
    context.fillRect(0, 0, width, height);
    const drawn = guarded(() => {
      context.drawImage(source, 0, 0);
      return true;
    }, false);
    if (!drawn) return null;
    const url = guarded(() => scratch.toDataURL("image/png"), null);
    return isImage(url) ? url : null;
  }
  async function capture(c, options = {}) {
    if (c.busy) return null;
    c.busy = true;
    try {
      return await photograph(c, options ?? {});
    } catch {
      record(c, { reason: "the page-side capture threw", composited: false });
      return null;
    } finally {
      c.busy = false;
    }
  }
  function pumpOne(c, ladder, why) {
    ladder.push(why);
    guarded(() => c.deps.pumpFrame?.(0), false);
  }
  async function awaitAsyncDraw(c, climb) {
    climb.ladder.push("async");
    for (let tick2 = 0; tick2 < ASYNC_TICKS; tick2++) {
      await new Promise((resolve) => c.later(resolve, ASYNC_TICK_MS));
      if (drawnSoFar(c) > climb.before) return true;
    }
    return false;
  }
  async function climbLadder(c, climb) {
    const grew = () => drawnSoFar(c) > climb.before;
    if (climb.kind === "webgpu" && await awaitAsyncDraw(c, climb)) return true;
    climb.ladder.push("game");
    const own = await Promise.resolve(guarded(() => c.deps.gameCapture?.(), null)).catch(() => null);
    if (isImage(own)) return own;
    if (grew()) return true;
    climb.ladder.push("camera");
    guarded(() => c.deps.debugCamera?.(guarded(() => c.deps.currentCamera?.(), null) ?? "default"), null);
    if (grew()) return true;
    if (!climb.allowResume) return false;
    climb.ladder.push("resume");
    guarded(() => c.deps.start?.(), null);
    guarded(() => c.deps.pumpFrame?.(16), false);
    guarded(() => c.deps.pause?.(), null);
    return grew();
  }
  async function readWebGpuFrame(c, picked, colour, drawCalls, shot) {
    const direct = guarded(() => picked.canvas.toDataURL("image/png"), null);
    if (!isImage(direct)) return void 0;
    const alphaMode = picked.descriptor?.alphaMode ?? null;
    if (alphaMode === null || alphaMode === "opaque") {
      shot({ reason: null, composited: false, drawCalls: drawCalls(), background: colour });
      return direct;
    }
    const decoded = await decodeImage(c, direct);
    const { width, height } = pixelSize(picked.canvas);
    const painted = decoded ? composite(c, decoded, colour, width, height) : null;
    if (painted) {
      shot({ reason: null, composited: true, drawCalls: drawCalls(), background: colour });
      return painted;
    }
    shot({ reason: TRANSPARENT_WEBGPU, composited: false, drawCalls: drawCalls(), background: colour });
    return null;
  }
  async function readFrame(c, picked, kind, before, shot) {
    const drawCalls = () => drawnSoFar(c) - before;
    const paint2 = background(c, picked.canvas);
    if (!paint2.ok) {
      shot({ reason: paint2.reason, composited: false, drawCalls: drawCalls(), background: null });
      return null;
    }
    const colour = paint2.colour;
    if (kind === "webgpu") {
      const read = await readWebGpuFrame(c, picked, colour, drawCalls, shot);
      if (read !== void 0) return read;
    }
    const { width, height } = pixelSize(picked.canvas);
    const url = composite(c, picked.canvas, colour, width, height);
    if (!url) {
      shot({
        reason: "the frame could not be composited onto a scratch canvas",
        composited: false,
        drawCalls: drawCalls(),
        background: colour
      });
      return null;
    }
    shot({ reason: null, composited: true, drawCalls: drawCalls(), background: colour });
    return url;
  }
  async function photograph(c, options) {
    const climb = { ladder: [], before: 0, kind: null, allowResume: options.allowResume === true };
    const { descriptors } = surfaces(c);
    const picked = pick(c);
    const kind = picked.descriptor?.kind ?? null;
    climb.kind = kind;
    const shot = (patch2) => record(c, {
      source: "page",
      picked: pickedSummary(picked, kind),
      canvases: descriptors,
      backend: THREE_KINDS.has(kind) ? kind : null,
      kind,
      ladder: climb.ladder,
      ...patch2
    });
    if (!picked.canvas) {
      shot({ reason: NO_CANVAS, composited: false, drawCalls: null, background: null });
      return null;
    }
    climb.before = drawnSoFar(c);
    if (guarded(() => c.deps.frozen?.(), false)) pumpOne(c, climb.ladder, "pump");
    else if (await nextFrame(c)) climb.ladder.push("frame");
    else pumpOne(c, climb.ladder, "timeout");
    const drewAlready = !countersLive(c) || drawnSoFar(c) > climb.before;
    const drawn = drewAlready || await climbLadder(c, climb);
    if (typeof drawn === "string") {
      shot({ reason: null, composited: false, drawCalls: drawnSoFar(c) - climb.before, background: null });
      return drawn;
    }
    if (!drawn) {
      shot({ reason: NOTHING_DREW, composited: false, drawCalls: 0, background: null });
      return null;
    }
    return readFrame(c, picked, kind, climb.before, shot);
  }
  function captureInfo(c) {
    return {
      ...c.info,
      canvases: c.info.canvases.map((descriptor) => ({ ...descriptor })),
      ladder: [...c.info.ladder]
    };
  }
  function createFrameCapture(deps = {}) {
    const c = {
      deps,
      raceMs: Number.isFinite(Number(deps.raceMs)) ? Number(deps.raceMs) : CAPTURE_RACE_MS,
      later: typeof deps.setTimeout === "function" ? deps.setTimeout : (fn, ms) => globalThis.setTimeout(fn, ms),
      cancel: typeof deps.clearTimeout === "function" ? deps.clearTimeout : (id) => globalThis.clearTimeout(id),
      busy: false,
      info: {
        source: "page",
        reason: "nothing has been photographed yet",
        picked: null,
        canvases: [],
        background: null,
        composited: false,
        drawCalls: null,
        ladder: [],
        backend: null,
        kind: null,
        /** How many pictures this object has recorded. A caller reads it either side of a capture
         * to learn whether the record it is holding describes the frame it just asked for, or a
         * frame somebody else took — a game with its own `capture()` never comes through here. */
        count: 0
      }
    };
    return {
      capture: (options = {}) => capture(c, options),
      captureInfo: () => captureInfo(c),
      note: (patch2) => note(c, patch2),
      paint: (dataUrl, patch2 = {}) => paint(c, dataUrl, patch2),
      pick: () => pick(c)
    };
  }

  // src/page/counters.ts
  var DRAW_VERSION = 1;
  var GL_TRIANGLES = 4;
  var GL_TRIANGLE_STRIP = 5;
  var GL_TRIANGLE_FAN = 6;
  var MESSAGE_CAP = 200;
  function trianglesFor(mode, count, instances = 1) {
    const vertices = Number(count) || 0;
    const reps = Math.trunc(Number(instances) || 0);
    if (vertices <= 0 || reps <= 0) return 0;
    if (mode === GL_TRIANGLES) return Math.floor(vertices / 3) * reps;
    if (mode === GL_TRIANGLE_STRIP || mode === GL_TRIANGLE_FAN) return Math.max(0, vertices - 2) * reps;
    return 0;
  }
  function verticesFor(count, instances = 1) {
    const vertices = Number(count) || 0;
    const reps = Math.trunc(Number(instances) || 0);
    if (vertices <= 0 || reps <= 0) return 0;
    return vertices * reps;
  }
  function addDraw(t, calls, tris, verts, flags = {}) {
    if (!t.enabled) return;
    t.drawCalls += calls;
    t.frameCalls += calls;
    if (flags.indirect) t.indirect += flags.indirect;
    if (flags.inexact) t.exact = false;
    if (flags.unknown) t.known = false;
    t.triangles += tris;
    t.frameTriangles += tris;
    t.vertices += verts;
    t.frameVertices += verts;
  }
  function patch(t, proto, name, make) {
    if (!proto || typeof proto[name] !== "function") return;
    const original = proto[name];
    if (original.__studioCounter) return;
    let wrapper;
    try {
      wrapper = make(original);
      wrapper.__studioCounter = true;
      const had = Object.hasOwn(proto, name);
      proto[name] = wrapper;
      t.restores.push(() => {
        if (proto[name] !== wrapper) return;
        if (had) proto[name] = original;
        else delete proto[name];
      });
    } catch {
    }
  }
  var prototypeOf = (scope, key) => typeof scope[key] === "function" ? scope[key].prototype : null;
  function patchWebGl(t, proto) {
    patch(
      t,
      proto,
      "drawArrays",
      (original) => function drawArrays(mode, first, count) {
        const result = original.apply(this, arguments);
        addDraw(t, 1, trianglesFor(mode, count, 1), verticesFor(count, 1));
        return result;
      }
    );
    patch(
      t,
      proto,
      "drawElements",
      (original) => function drawElements(mode, count) {
        const result = original.apply(this, arguments);
        addDraw(t, 1, trianglesFor(mode, count, 1), verticesFor(count, 1));
        return result;
      }
    );
    patch(
      t,
      proto,
      "drawArraysInstanced",
      (original) => function drawArraysInstanced(mode, first, count, instanceCount) {
        const result = original.apply(this, arguments);
        addDraw(t, 1, trianglesFor(mode, count, instanceCount), verticesFor(count, instanceCount));
        return result;
      }
    );
    patch(
      t,
      proto,
      "drawElementsInstanced",
      (original) => function drawElementsInstanced(mode, count, type, offset, instanceCount) {
        const result = original.apply(this, arguments);
        addDraw(t, 1, trianglesFor(mode, count, instanceCount), verticesFor(count, instanceCount));
        return result;
      }
    );
    patch(
      t,
      proto,
      "drawRangeElements",
      (original) => function drawRangeElements(mode, start2, end, count) {
        const result = original.apply(this, arguments);
        addDraw(t, 1, trianglesFor(mode, count, 1), verticesFor(count, 1));
        return result;
      }
    );
  }
  function patchAngle(t, angle) {
    patch(
      t,
      angle,
      "drawArraysInstancedANGLE",
      (original) => function drawArraysInstancedANGLE(mode, first, count, primcount) {
        const result = original.apply(this, arguments);
        addDraw(t, 1, trianglesFor(mode, count, primcount), verticesFor(count, primcount));
        return result;
      }
    );
    patch(
      t,
      angle,
      "drawElementsInstancedANGLE",
      (original) => function drawElementsInstancedANGLE(mode, count, type, offset, primcount) {
        const result = original.apply(this, arguments);
        addDraw(t, 1, trianglesFor(mode, count, primcount), verticesFor(count, primcount));
        return result;
      }
    );
  }
  function patchMultiDraw(t, multi) {
    const multiDraw = (original) => function multiDrawWEBGL() {
      const result = original.apply(this, arguments);
      const count = Math.max(0, Math.trunc(Number(arguments[arguments.length - 1]) || 0));
      addDraw(t, count, 0, 0, { inexact: true });
      return result;
    };
    patch(t, multi, "multiDrawArraysWEBGL", multiDraw);
    patch(t, multi, "multiDrawElementsWEBGL", multiDraw);
  }
  function patchRenderPass(t, passProto, bundleTallies) {
    patch(
      t,
      passProto,
      "draw",
      (original) => function draw(vertexCount, instanceCount) {
        const result = original.apply(this, arguments);
        addDraw(t, 1, 0, verticesFor(vertexCount, instanceCount ?? 1), { unknown: true });
        return result;
      }
    );
    patch(
      t,
      passProto,
      "drawIndexed",
      (original) => function drawIndexed(indexCount, instanceCount) {
        const result = original.apply(this, arguments);
        addDraw(t, 1, 0, verticesFor(indexCount, instanceCount ?? 1), { unknown: true });
        return result;
      }
    );
    for (const name of ["drawIndirect", "drawIndexedIndirect"]) {
      patch(
        t,
        passProto,
        name,
        (original) => function drawIndirectCall() {
          const result = original.apply(this, arguments);
          addDraw(t, 1, 0, 0, { unknown: true, inexact: true, indirect: 1 });
          return result;
        }
      );
    }
    patch(
      t,
      passProto,
      "executeBundles",
      (original) => function executeBundles(bundles) {
        const result = original.apply(this, arguments);
        for (const bundle of bundles ?? []) {
          const tally = bundleTallies.get(bundle);
          if (!tally) continue;
          addDraw(t, tally.drawCalls, 0, tally.vertices, {
            unknown: true,
            inexact: tally.inexact,
            indirect: tally.indirect
          });
        }
        return result;
      }
    );
  }
  function patchRenderBundles(t, bundleProto, bundleTallies) {
    const recording = /* @__PURE__ */ new WeakMap();
    const record2 = (encoder, calls, verts, flags = {}) => {
      const tally = recording.get(encoder) ?? { drawCalls: 0, vertices: 0, indirect: 0, inexact: false };
      tally.drawCalls += calls;
      tally.vertices += verts;
      if (flags.indirect) tally.indirect += flags.indirect;
      if (flags.inexact) tally.inexact = true;
      recording.set(encoder, tally);
    };
    patch(
      t,
      bundleProto,
      "draw",
      (original) => function draw(vertexCount, instanceCount) {
        const result = original.apply(this, arguments);
        record2(this, 1, verticesFor(vertexCount, instanceCount ?? 1));
        return result;
      }
    );
    patch(
      t,
      bundleProto,
      "drawIndexed",
      (original) => function drawIndexed(indexCount, instanceCount) {
        const result = original.apply(this, arguments);
        record2(this, 1, verticesFor(indexCount, instanceCount ?? 1));
        return result;
      }
    );
    for (const name of ["drawIndirect", "drawIndexedIndirect"]) {
      patch(
        t,
        bundleProto,
        name,
        (original) => function drawIndirectCall() {
          const result = original.apply(this, arguments);
          record2(this, 1, 0, { indirect: 1, inexact: true });
          return result;
        }
      );
    }
    patch(
      t,
      bundleProto,
      "finish",
      (original) => function finish() {
        const bundle = original.apply(this, arguments);
        const tally = recording.get(this);
        recording.delete(this);
        if (bundle && tally) bundleTallies.set(bundle, tally);
        return bundle;
      }
    );
  }
  var gpuMessage = (label, message) => `${label}${message ? `: ${String(message).slice(0, MESSAGE_CAP)}` : ""}`;
  function watchDevice(device, note2) {
    if (!device || typeof device !== "object") return;
    const handler = (event) => note2(gpuMessage("GPU_UNCAPTURED_ERROR", event?.error?.message ?? event?.message ?? ""));
    try {
      if (typeof device.addEventListener === "function") device.addEventListener("uncapturederror", handler);
      else device.onuncapturederror = handler;
    } catch {
    }
    try {
      device.lost?.then?.(
        (info) => note2(gpuMessage("GPU_DEVICE_LOST", info?.reason)),
        () => {
        }
      );
    } catch {
    }
  }
  function patchAdapter(t, adapterProto, note2) {
    const attach = (device) => watchDevice(device, note2);
    patch(
      t,
      adapterProto,
      "requestDevice",
      (original) => function requestDevice() {
        const result = original.apply(this, arguments);
        try {
          if (result && typeof result.then === "function") result.then(attach, () => {
          });
        } catch {
        }
        return result;
      }
    );
  }
  function counterApi(t, scope) {
    const shape = () => ({
      drawCalls: t.drawCalls,
      triangles: t.known ? t.triangles : null,
      vertices: t.vertices,
      indirect: t.indirect,
      frames: t.frames,
      trianglesExact: t.known && t.exact,
      counting: t.enabled
    });
    const api = {
      version: DRAW_VERSION,
      /** Close a frame: the frame tally becomes the last frame's, and a new one starts. */
      mark() {
        t.frames++;
        t.last = { drawCalls: t.frameCalls, triangles: t.frameTriangles, vertices: t.frameVertices };
        t.frameCalls = 0;
        t.frameTriangles = 0;
        t.frameVertices = 0;
        return { ...t.last };
      },
      /** What the last completed frame cost. */
      frame: () => ({ ...t.last, triangles: t.known ? t.last.triangles : null, trianglesExact: t.known && t.exact }),
      /** Everything since install. */
      totals: shape,
      /** A point-in-time copy — subtract two of these rather than dividing a lifetime total. */
      snapshot: () => ({ ...shape(), at: Date.now() }),
      /** The optimization observer quiets the counters around a sample; the patches stay. */
      enable(on) {
        t.enabled = on !== false;
        return t.enabled;
      },
      enabled: () => t.enabled,
      /** Put every prototype method back with its original identity. */
      end() {
        for (const restore of t.restores.splice(0)) {
          try {
            restore();
          } catch {
          }
        }
        t.enabled = false;
        if (scope.__studioDraw === api) delete scope.__studioDraw;
        return true;
      }
    };
    return api;
  }
  function publish(scope, api) {
    try {
      Object.defineProperty(scope, "__studioDraw", {
        configurable: true,
        enumerable: true,
        get: () => api,
        set: () => {
        }
      });
    } catch {
      scope.__studioDraw = api;
    }
  }
  function installStudioDrawCounters(options = {}) {
    const scope = options.scope ?? globalThis;
    const existing = scope.__studioDraw;
    if (existing && existing.version === DRAW_VERSION) return existing;
    const note2 = (message) => {
      try {
        if (typeof options.note === "function") options.note(String(message));
        else scope.__studioGl?.note?.(String(message));
      } catch {
      }
    };
    const t = {
      enabled: options.enabled !== false,
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      indirect: 0,
      frames: 0,
      exact: true,
      known: true,
      frameCalls: 0,
      frameTriangles: 0,
      frameVertices: 0,
      last: { drawCalls: 0, triangles: 0, vertices: 0 },
      restores: []
    };
    for (const key of ["WebGLRenderingContext", "WebGL2RenderingContext"]) {
      const proto = prototypeOf(scope, key);
      if (proto) patchWebGl(t, proto);
    }
    patchAngle(t, prototypeOf(scope, "ANGLE_instanced_arrays"));
    patchMultiDraw(t, prototypeOf(scope, "WEBGL_multi_draw"));
    const bundleTallies = /* @__PURE__ */ new WeakMap();
    patchRenderPass(t, prototypeOf(scope, "GPURenderPassEncoder"), bundleTallies);
    patchRenderBundles(t, prototypeOf(scope, "GPURenderBundleEncoder"), bundleTallies);
    patchAdapter(t, prototypeOf(scope, "GPUAdapter"), note2);
    const api = counterApi(t, scope);
    if (options.install !== false) publish(scope, api);
    return api;
  }

  // src/page/shim.ts
  var CLOCK_VERSION = 1;
  var MAX_STEP_FRAMES = 4096;
  var MAX_STEP_MS = 6e4;
  var MAX_INTERVAL_FIRES_PER_FRAME = 4;
  var MAX_TIMER_FIRES_PER_FRAME = 512;
  var NESTED_TIMER_MIN_MS = 4;
  var TIMER_HANDLE_BASE = 5e8;
  var FALLBACK_FRAME_MS = 16;
  var AUTO_RESUME_MS = 2e4;
  var BOOT_BUDGET_SPENT = "the page was still booting when its boot budget ran out";
  var DEFAULT_SHIM_OPTIONS = Object.freeze({
    clock: "wall",
    frameMs: 1e3 / 60,
    readyMs: 15e3,
    quietMs: 250,
    seed: 1,
    pointerLock: true,
    counters: true,
    maxTimers: 4096
  });
  function seedOption(seed2) {
    if (seed2 === null) return null;
    return Number.isFinite(Number(seed2)) ? Number(seed2) >>> 0 : DEFAULT_SHIM_OPTIONS.seed;
  }
  function normalizeShimOptions(raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    const num = (value, fallback, min, max) => {
      const n = Number(value);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    };
    const seed2 = seedOption(input.seed);
    return {
      clock: input.clock === "studio" ? "studio" : "wall",
      frameMs: num(input.frameMs, DEFAULT_SHIM_OPTIONS.frameMs, 1, 1e3),
      readyMs: num(input.readyMs, DEFAULT_SHIM_OPTIONS.readyMs, 1e3, 6e5),
      quietMs: num(input.quietMs, DEFAULT_SHIM_OPTIONS.quietMs, 0, 1e4),
      seed: seed2,
      pointerLock: input.pointerLock !== false,
      counters: input.counters !== false,
      maxTimers: Math.round(num(input.maxTimers, DEFAULT_SHIM_OPTIONS.maxTimers, 16, 65536))
    };
  }
  function mulberry32(seed2) {
    let a = seed2 >>> 0;
    return function rng() {
      a += 1831565813;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function installSeededRandom(host, seed2) {
    let rng = mulberry32(Number(seed2) >>> 0);
    let current = Number(seed2) >>> 0;
    const random = () => rng();
    const native = host.Math.random;
    try {
      host.Math.random = random;
    } catch {
      return { installed: false, reseed: () => current, value: () => current, native };
    }
    return {
      installed: true,
      native,
      value: () => current,
      reseed(next) {
        current = Number(next) >>> 0;
        rng = mulberry32(current);
        return current;
      }
    };
  }
  var FPS_SAMPLES = 120;
  var nativeNow = (k) => k.host.now();
  var virtualNow = (k) => k.frozen ? k.pinned : nativeNow(k) + k.offset;
  function arm(k, entry) {
    entry.native = k.host.raf(() => {
      entry.native = null;
      k.rafEntries.delete(entry.id);
      try {
        entry.cb(virtualNow(k));
      } catch (err) {
        k.report(err);
      } finally {
        settle(k, entry);
      }
    });
  }
  function settle(k, entry) {
    if (!k.frameSet) return;
    if (k.frameSet.delete(entry) && k.frameSet.size === 0) {
      k.frameSet = null;
      closeFrame(k, false);
    }
  }
  function requestFrame(k, cb) {
    if (typeof cb !== "function") throw new TypeError("requestAnimationFrame expects a function");
    const entry = { id: k.nextRafId++, cb, native: null };
    k.rafEntries.set(entry.id, entry);
    if (!k.frozen) arm(k, entry);
    return entry.id;
  }
  function cancelFrame(k, id) {
    const entry = k.rafEntries.get(id);
    if (!entry) return;
    if (entry.native != null) k.host.cancelRaf(entry.native);
    k.rafEntries.delete(id);
    settle(k, entry);
  }
  function schedule(k, fn, delay, args, repeat) {
    if (typeof fn !== "function" || k.timers.size >= k.options.maxTimers) {
      k.overflow += typeof fn === "function" ? 1 : 0;
      return repeat ? k.host.setInterval(fn, delay, ...args) : k.host.setTimeout(fn, delay, ...args);
    }
    const asked = Math.max(0, Number(delay) || 0);
    const delayMs = k.firing && asked < NESTED_TIMER_MIN_MS ? NESTED_TIMER_MIN_MS : asked;
    const entry = {
      handle: k.nextTimer++,
      fn,
      args,
      delayMs,
      repeat,
      due: virtualNow(k) + delayMs,
      native: null,
      seq: k.seq++
    };
    k.timers.set(entry.handle, entry);
    if (!k.frozen) armTimer(k, entry);
    return entry.handle;
  }
  function armTimer(k, entry) {
    const wait = Math.max(0, entry.due - virtualNow(k));
    entry.native = k.host.setTimeout(() => {
      entry.native = null;
      fire(k, entry);
      if (entry.repeat && k.timers.get(entry.handle) === entry) {
        entry.due = virtualNow(k) + entry.delayMs;
        if (!k.frozen) armTimer(k, entry);
      }
    }, wait);
  }
  function fire(k, entry) {
    if (!entry.repeat) k.timers.delete(entry.handle);
    const nested = k.firing;
    k.firing = true;
    try {
      entry.fn(...entry.args);
    } catch (err) {
      k.report(err);
    } finally {
      k.firing = nested;
    }
  }
  function clearTimerEntry(k, handle) {
    const entry = k.timers.get(handle);
    if (!entry) {
      k.host.clearTimeout(handle);
      if (k.host.clearInterval) k.host.clearInterval(handle);
      return;
    }
    if (entry.native != null) k.host.clearTimeout(entry.native);
    k.timers.delete(handle);
  }
  var firesBefore = (entry, next) => !next || entry.due < next.due || entry.due === next.due && entry.seq < next.seq;
  function nextDueTimer(k, capped) {
    let next = null;
    for (const entry of k.timers.values()) {
      if (entry.due > k.pinned || capped.has(entry.handle)) continue;
      if (firesBefore(entry, next)) next = entry;
    }
    return next;
  }
  function runDueTimers(k) {
    const fired = /* @__PURE__ */ new Map();
    const capped = /* @__PURE__ */ new Set();
    let total = 0;
    for (; ; ) {
      const next = nextDueTimer(k, capped);
      if (!next || total >= MAX_TIMER_FIRES_PER_FRAME) return;
      const count = (fired.get(next.handle) ?? 0) + 1;
      if (next.repeat && count > MAX_INTERVAL_FIRES_PER_FRAME) {
        capped.add(next.handle);
        next.due = k.pinned + next.delayMs;
        continue;
      }
      fired.set(next.handle, count);
      total++;
      if (next.repeat) next.due += Math.max(next.delayMs, 0);
      fire(k, next);
    }
  }
  function notifyAll(k, fns) {
    for (const fn of fns) {
      try {
        fn?.();
      } catch (err) {
        k.report(err);
      }
    }
  }
  function closeFrame(k, stepped) {
    k.frames++;
    if (stepped) k.steppedFrames++;
    const at = virtualNow(k);
    if (k.lastFrame && at > k.lastFrame) {
      k.fpsSamples.push(1e3 / (at - k.lastFrame));
      if (k.fpsSamples.length > FPS_SAMPLES) k.fpsSamples.shift();
    }
    k.lastFrame = at;
    notifyAll(k, [...k.afterFrameSubscribers]);
    notifyAll(k, [() => k.host.onFrame?.()]);
  }
  function openFrame(k) {
    if (k.frozen) return;
    const pending = [];
    for (const entry of k.rafEntries.values()) if (entry.native != null) pending.push(entry);
    if (!pending.length) {
      k.frameSet = null;
      closeFrame(k, false);
      return;
    }
    k.frameSet = new Set(pending);
  }
  function drawTotals(k) {
    try {
      return k.host.drawTotals?.() ?? null;
    } catch {
      return null;
    }
  }
  function pause(k) {
    k.lastFreezeTouch = nativeNow(k);
    if (k.frozen) return true;
    k.pinned = virtualNow(k);
    k.frozen = true;
    k.frameSet = null;
    for (const entry of k.rafEntries.values()) {
      if (entry.native != null) k.host.cancelRaf(entry.native);
      entry.native = null;
    }
    for (const entry of k.timers.values()) {
      if (entry.native != null) k.host.clearTimeout(entry.native);
      entry.native = null;
    }
    return true;
  }
  function start(k) {
    if (!k.frozen) return true;
    k.offset = k.pinned - nativeNow(k);
    k.frozen = false;
    for (const entry of k.rafEntries.values()) if (entry.native == null) arm(k, entry);
    for (const entry of k.timers.values()) if (entry.native == null) armTimer(k, entry);
    return true;
  }
  function drainFrame(k, at) {
    const snapshot = [...k.rafEntries.values()];
    if (!snapshot.length) return false;
    for (const entry of snapshot) {
      if (!k.rafEntries.delete(entry.id)) continue;
      if (entry.native != null) k.host.cancelRaf(entry.native);
      entry.native = null;
      try {
        entry.cb(at);
      } catch (err) {
        k.report(err);
      }
    }
    return true;
  }
  function stepFrames(k, ms) {
    const asked = Number(ms);
    const span = Math.max(0, Math.min(MAX_STEP_MS, Number.isFinite(asked) ? asked : k.frameMs));
    const want = Math.max(1, Math.round(span / k.frameMs));
    return { want, count: Math.min(want, MAX_STEP_FRAMES) };
  }
  function drawnBetween(before, after) {
    if (!after) return { drawCalls: null, triangles: null };
    const triangles = after.triangles != null ? after.triangles - (before?.triangles ?? 0) : null;
    return { drawCalls: (after.drawCalls ?? 0) - (before?.drawCalls ?? 0), triangles };
  }
  async function step(k, ms) {
    if (!k.frozen) pause(k);
    k.lastFreezeTouch = nativeNow(k);
    const { want, count } = stepFrames(k, ms);
    const before = drawTotals(k);
    let idle = 0;
    for (let i = 0; i < count; i++) {
      k.pinned += k.frameMs;
      runDueTimers(k);
      if (!drainFrame(k, k.pinned)) idle++;
      closeFrame(k, true);
      await null;
    }
    const drawn = drawnBetween(before, drawTotals(k));
    return {
      ok: true,
      frames: count,
      idle,
      now: k.pinned,
      drawCalls: drawn.drawCalls,
      triangles: drawn.triangles,
      ...count < want ? { truncated: true } : {}
    };
  }
  function pumpFrame(k, dtMs) {
    const advance = Math.max(0, Number(dtMs) || 0);
    if (k.frozen) k.pinned += advance;
    else k.offset += advance;
    if (!drainFrame(k, virtualNow(k))) return false;
    closeFrame(k, false);
    return true;
  }
  function seed(k, value) {
    k.lastFreezeTouch = nativeNow(k);
    return k.host.reseed ? k.host.reseed(value) : Number(value) >>> 0;
  }
  function fps(k) {
    if (!k.fpsSamples.length) return 0;
    return Math.round(k.fpsSamples.reduce((a, b) => a + b, 0) / k.fpsSamples.length);
  }
  function tick(k) {
    if (k.frozen && nativeNow(k) - k.lastFreezeTouch > AUTO_RESUME_MS) {
      k.autoResumes++;
      k.lastFreezeTouch = nativeNow(k);
      start(k);
    }
  }
  function clockWrappers(k) {
    function clearTimer(handle) {
      clearTimerEntry(k, handle);
    }
    return {
      requestAnimationFrame: function requestAnimationFrame(cb) {
        return requestFrame(k, cb);
      },
      cancelAnimationFrame: function cancelAnimationFrame(id) {
        return cancelFrame(k, id);
      },
      setTimeout: (fn, delay, ...args) => schedule(k, fn, delay, args, false),
      setInterval: (fn, delay, ...args) => schedule(k, fn, delay, args, true),
      clearTimeout: clearTimer,
      clearInterval: clearTimer,
      now: () => virtualNow(k),
      dateNow: () => Math.round(k.dateBase + virtualNow(k))
    };
  }
  function createClock(host, rawOptions = {}) {
    const options = normalizeShimOptions(rawOptions);
    const frozen = options.clock === "studio";
    const k = {
      host,
      options,
      frameMs: options.frameMs,
      report: host.report ?? (() => {
      }),
      dateBase: (host.dateNow ? host.dateNow() : Date.now()) - host.now(),
      offset: 0,
      pinned: host.now(),
      frozen,
      frames: 0,
      steppedFrames: 0,
      lastFrame: 0,
      autoResumes: 0,
      lastFreezeTouch: 0,
      installedAt: 0,
      rafEntries: /* @__PURE__ */ new Map(),
      nextRafId: 1,
      frameSet: null,
      timers: /* @__PURE__ */ new Map(),
      nextTimer: TIMER_HANDLE_BASE,
      overflow: 0,
      seq: 0,
      firing: false,
      afterFrameSubscribers: /* @__PURE__ */ new Set(),
      fpsSamples: []
    };
    k.lastFreezeTouch = nativeNow(k);
    k.installedAt = frozen ? k.pinned : nativeNow(k);
    const wrappers = clockWrappers(k);
    return {
      version: CLOCK_VERSION,
      mode: () => options.clock,
      options: () => ({ ...options }),
      frozen: () => k.frozen,
      now: () => virtualNow(k),
      dateNow: () => Math.round(k.dateBase + virtualNow(k)),
      elapsed: () => virtualNow(k) - k.installedAt,
      pause: () => pause(k),
      start: () => start(k),
      step: (ms) => step(k, ms),
      seed: (value) => seed(k, value),
      pumpFrame: (dtMs) => pumpFrame(k, dtMs),
      openFrame: () => openFrame(k),
      closeFrame: (stepped) => closeFrame(k, stepped),
      tick: () => tick(k),
      fps: () => fps(k),
      frames: () => k.frames,
      steppedFrames: () => k.steppedFrames,
      autoResumes: () => k.autoResumes,
      pendingRaf: () => k.rafEntries.size,
      timerStats: () => ({ pending: k.timers.size, overflow: k.overflow }),
      afterFrame(fn) {
        if (typeof fn !== "function") return () => {
        };
        k.afterFrameSubscribers.add(fn);
        return () => k.afterFrameSubscribers.delete(fn);
      },
      wrappers
    };
  }
  function readinessVerdict(input = {}) {
    const readyMs = Number.isFinite(Number(input.readyMs)) ? Number(input.readyMs) : DEFAULT_SHIM_OPTIONS.readyMs;
    const elapsed = Number(input.elapsed) || 0;
    const quiet = input.quiet === true;
    const frames = Number(input.frames) || 0;
    const drawCalls = input.drawCalls === null || input.drawCalls === void 0 ? null : Number(input.drawCalls);
    if (quiet && frames >= 2 && (drawCalls === null || drawCalls > 0))
      return { settle: "quiet", ready: true, timedOut: false };
    if (quiet && input.complete === true && elapsed > readyMs / 2)
      return { settle: "quiet-no-draw", ready: true, timedOut: false };
    return { settle: null, ready: false, timedOut: elapsed > readyMs };
  }
  function createPointerLock(deps) {
    let faked = null;
    let realSeen = false;
    const element = () => deps.nativeElement() ?? faked;
    return {
      element,
      locked: () => Boolean(element()),
      request(target) {
        faked = target ?? null;
        deps.dispatch?.("pointerlockchange");
        return faked;
      },
      exit() {
        faked = null;
        deps.dispatch?.("pointerlockchange");
        return null;
      },
      /** A real change: a granted lock makes the fake irrelevant; losing one (Esc) clears it. */
      onNativeChange() {
        const real = deps.nativeElement();
        if (real) {
          realSeen = true;
          faked = null;
        } else if (realSeen) {
          faked = null;
          realSeen = false;
        }
        return element();
      },
      faked: () => faked
    };
  }
  var FACADE_VALUES = ["version", "hud"];
  var FACADE_OWN_ALWAYS = ["state", "step", "pause", "start", "seed", "ready"];
  var FACADE_DELEGATED = [
    "inspect",
    "capture",
    "captureInfo",
    "cameras",
    "debugCamera",
    "eyes",
    "eye",
    "sceneSummary",
    "demos",
    "demo",
    "begin",
    "audio",
    "probes",
    "player",
    "injectInput"
  ];
  function createFacade({ own, getAssigned }) {
    const facade = {};
    const assigned = () => {
      try {
        return getAssigned();
      } catch {
        return null;
      }
    };
    const supplied = (name) => {
      const target = assigned();
      if (!target || target === facade) return null;
      try {
        return typeof target[name] === "function" ? target : null;
      } catch {
        return null;
      }
    };
    for (const name of FACADE_DELEGATED) {
      Object.defineProperty(facade, name, {
        enumerable: true,
        configurable: true,
        get() {
          const target = supplied(name);
          if (target) return (...args) => target[name](...args);
          return own[name];
        }
      });
    }
    for (const name of FACADE_OWN_ALWAYS) {
      Object.defineProperty(facade, name, { enumerable: true, configurable: true, value: own[name], writable: false });
    }
    for (const name of FACADE_VALUES) {
      Object.defineProperty(facade, name, {
        enumerable: true,
        configurable: true,
        get() {
          const target = assigned();
          try {
            if (target && target !== facade && target[name] !== void 0) return target[name];
          } catch {
          }
          return own[name];
        }
      });
    }
    Object.defineProperty(facade, "__shim", { enumerable: false, configurable: true, value: true });
    Object.defineProperty(facade, "__attached", {
      enumerable: false,
      configurable: true,
      get: () => Boolean(own.attached?.())
    });
    Object.defineProperty(facade, "__game", { enumerable: false, configurable: true, get: () => assigned() });
    facade.__absorb = function absorb(value) {
      if (!value || typeof value !== "object") return facade;
      const keys = /* @__PURE__ */ new Set();
      try {
        for (const key in value) keys.add(key);
        for (const key of Object.getOwnPropertyNames(value)) keys.add(key);
      } catch {
      }
      for (const key of keys) {
        if (key === "constructor" || key.startsWith("__") || key in facade) continue;
        Object.defineProperty(facade, key, {
          enumerable: true,
          configurable: true,
          get() {
            const target = assigned();
            if (!target || target === facade) return void 0;
            try {
              const member = target[key];
              return typeof member === "function" ? (...args) => target[key](...args) : member;
            } catch {
              return void 0;
            }
          }
        });
      }
      return facade;
    };
    Object.defineProperty(facade, "__absorb", { enumerable: false });
    return facade;
  }
  function installFacade(target, own) {
    let assigned = null;
    const facade = createFacade({ own, getAssigned: () => assigned });
    Object.defineProperty(target, "__studio", {
      configurable: true,
      get: () => facade,
      set: (value) => {
        assigned = value && typeof value === "object" ? value : null;
        if (assigned) facade.__absorb(assigned);
      }
    });
    return facade;
  }
  var FACADE_MEMBERS = Object.freeze([...FACADE_VALUES, ...FACADE_OWN_ALWAYS, ...FACADE_DELEGATED]);
  function installPageGlobal(target, name, value) {
    try {
      Object.defineProperty(target, name, {
        configurable: true,
        enumerable: true,
        get: () => value,
        set: () => {
        }
      });
    } catch {
      try {
        target[name] = value;
      } catch {
      }
    }
    return value;
  }
  function contextKind(type) {
    const name = String(type ?? "").toLowerCase();
    if (name === "2d") return "2d";
    if (name === "webgl" || name === "experimental-webgl") return "webgl";
    if (name === "webgl2" || name === "experimental-webgl2") return "webgl2";
    if (name === "webgpu") return "webgpu";
    return "unknown";
  }
  function nativesOf(win) {
    return {
      performanceNow: win.performance ? win.performance.now.bind(win.performance) : Date.now,
      dateNow: Date.now.bind(Date),
      raf: typeof win.requestAnimationFrame === "function" ? win.requestAnimationFrame.bind(win) : null,
      cancelRaf: typeof win.cancelAnimationFrame === "function" ? win.cancelAnimationFrame.bind(win) : null,
      setTimeout: win.setTimeout.bind(win),
      clearTimeout: win.clearTimeout.bind(win),
      setInterval: win.setInterval.bind(win),
      clearInterval: win.clearInterval.bind(win)
    };
  }
  var realFrame = (natives, cb) => natives.raf ? natives.raf(cb) : natives.setTimeout(() => cb(natives.performanceNow()), FALLBACK_FRAME_MS);
  var pageDrawTotals = () => globalThis.__studioDraw?.totals?.() ?? null;
  var drawCallsOf = (totals2) => totals2 ? totals2.drawCalls ?? 0 : null;
  var GL_NAMES = {
    1280: "INVALID_ENUM",
    1281: "INVALID_VALUE",
    1282: "INVALID_OPERATION",
    1285: "OUT_OF_MEMORY",
    1286: "INVALID_FRAMEBUFFER_OPERATION",
    37442: "CONTEXT_LOST_WEBGL"
  };
  var MAX_GL_ERRORS = 16;
  var GL_DRAIN_PER_CONTEXT = 8;
  function noteGl(watch, message) {
    if (!watch.glErrors.includes(message) && watch.glErrors.length < MAX_GL_ERRORS) watch.glErrors.push(message);
  }
  var noteGlCode = (watch, code) => noteGl(watch, `GL_${GL_NAMES[code] || String(code)}`);
  function recordAlphaMode(watch, canvas, context, kind) {
    try {
      const nativeConfigure = context.configure.bind(context);
      context.configure = function configure(descriptor) {
        try {
          const seen = watch.canvasInfo.get(canvas) ?? { kind, attrs: {}, alphaMode: null };
          seen.alphaMode = descriptor && typeof descriptor === "object" && descriptor.alphaMode ? String(descriptor.alphaMode) : "opaque";
          watch.canvasInfo.set(canvas, seen);
        } catch {
        }
        return nativeConfigure(descriptor);
      };
      context.__studioConfigure = true;
    } catch {
    }
  }
  function recordContext(watch, canvas, context, type, attrs) {
    const kind = contextKind(type);
    if (!watch.canvasInfo.has(canvas) || watch.canvasInfo.get(canvas)?.kind === "unknown") {
      watch.canvasInfo.set(canvas, {
        kind,
        attrs: attrs && typeof attrs === "object" ? { ...attrs } : {},
        alphaMode: null
      });
    }
    watch.tracked.add(canvas);
    if (kind === "webgpu" && typeof context.configure === "function" && !context.__studioConfigure)
      recordAlphaMode(watch, canvas, context, kind);
    if ((kind === "webgl" || kind === "webgl2") && !watch.glContexts.has(canvas)) {
      watch.glContexts.set(canvas, context);
      canvas.addEventListener("webglcontextlost", () => noteGl(watch, "GL_CONTEXT_LOST"));
    }
  }
  function watchCanvases(win) {
    const watch = { canvasInfo: /* @__PURE__ */ new WeakMap(), tracked: /* @__PURE__ */ new Set(), glContexts: /* @__PURE__ */ new WeakMap(), glErrors: [] };
    if (typeof win.HTMLCanvasElement === "function") {
      const originalGetContext = win.HTMLCanvasElement.prototype.getContext;
      win.HTMLCanvasElement.prototype.getContext = function getContext(type, attrs) {
        const context = originalGetContext.apply(this, arguments);
        if (context) recordContext(watch, this, context, type, attrs);
        return context;
      };
    }
    for (const name of ["WebGLRenderingContext", "WebGL2RenderingContext"]) {
      const ctor = win[name];
      if (typeof ctor !== "function" || ctor.prototype.__studioWrapped) continue;
      ctor.prototype.__studioWrapped = true;
      const original = ctor.prototype.getError;
      ctor.prototype.getError = function() {
        const code = original.call(this);
        if (code && code !== this.NO_ERROR) noteGlCode(watch, code);
        return code;
      };
    }
    return watch;
  }
  function drainGl(watch) {
    for (const canvas of watch.tracked) {
      const gl = watch.glContexts.get(canvas);
      if (!gl || typeof gl.getError !== "function" || gl.isContextLost?.()) continue;
      let n = 0;
      let code = gl.getError();
      while (code !== gl.NO_ERROR && n++ < GL_DRAIN_PER_CONTEXT) {
        noteGlCode(watch, code);
        code = gl.getError();
      }
    }
  }
  function describeCanvas(watch, canvas, index) {
    const info = watch.canvasInfo.get(canvas) ?? { kind: "unknown", attrs: {}, alphaMode: null };
    let rect = { width: 0, height: 0 };
    try {
      rect = canvas.getBoundingClientRect();
    } catch {
    }
    return {
      index,
      kind: info.kind,
      alpha: info.attrs.alpha !== false,
      /** What a WebGPU context was configured with (`opaque`, `premultiplied`), or null. */
      alphaMode: info.alphaMode ?? null,
      preserveDrawingBuffer: info.attrs.preserveDrawingBuffer === true,
      width: canvas.width ?? 0,
      height: canvas.height ?? 0,
      cssWidth: Math.round(rect.width ?? 0),
      cssHeight: Math.round(rect.height ?? 0),
      visible: Boolean(canvas.isConnected) && (rect.width ?? 0) > 0 && (rect.height ?? 0) > 0
    };
  }
  function canvasesOf(watch) {
    const elements = [...watch.tracked];
    try {
      for (const canvas of document.querySelectorAll("canvas")) if (!elements.includes(canvas)) elements.push(canvas);
    } catch {
    }
    const descriptors = elements.map((canvas, index) => describeCanvas(watch, canvas, index));
    return { elements, descriptors };
  }
  function installGlGlobal(win, watch, counters) {
    try {
      for (const message of win.__studioGl?.errors?.() ?? []) noteGl(watch, String(message));
    } catch {
    }
    let counting = counters;
    installPageGlobal(
      win,
      "__studioGl",
      Object.freeze({
        errors: () => {
          drainGl(watch);
          return watch.glErrors.slice();
        },
        note: (message) => noteGl(watch, String(message)),
        /** The optimization observer turns the draw counters off around a sample. */
        count: (on) => {
          counting = on !== false;
          try {
            globalThis.__studioDraw?.enable?.(counting);
          } catch {
          }
          return counting;
        },
        counting: () => counting
      })
    );
  }
  function watchLoaders(win, natives) {
    const loaders = { inflight: 0, lastResourceAt: natives.performanceNow() };
    const bumpResource = () => {
      loaders.lastResourceAt = natives.performanceNow();
    };
    const settled = () => {
      loaders.inflight = Math.max(0, loaders.inflight - 1);
      bumpResource();
    };
    if (typeof win.fetch === "function") {
      const nativeFetch = win.fetch.bind(win);
      win.fetch = function studioFetch(...args) {
        loaders.inflight++;
        bumpResource();
        return nativeFetch(...args).finally(settled);
      };
    }
    if (typeof win.XMLHttpRequest === "function") {
      const proto = win.XMLHttpRequest.prototype;
      const nativeSend = proto.send;
      proto.send = function send(...args) {
        loaders.inflight++;
        bumpResource();
        this.addEventListener("loadend", () => settled(), { once: true });
        return nativeSend.apply(this, args);
      };
    }
    try {
      const observer = new win.PerformanceObserver(() => bumpResource());
      observer.observe({ type: "resource", buffered: true });
    } catch {
    }
    return loaders;
  }
  var reportError = (err) => {
    try {
      console.error(err);
    } catch {
    }
  };
  function installClock(win, natives, options, random, drawCounters) {
    const clock = createClock(
      {
        now: natives.performanceNow,
        dateNow: natives.dateNow,
        raf: natives.raf ?? ((cb) => realFrame(natives, cb)),
        cancelRaf: natives.cancelRaf ?? natives.clearTimeout,
        setTimeout: natives.setTimeout,
        clearTimeout: natives.clearTimeout,
        setInterval: natives.setInterval,
        clearInterval: natives.clearInterval,
        reseed: (value) => random ? random.reseed(value) : Number(value) >>> 0,
        drawTotals: pageDrawTotals,
        // The frame boundary the counters divide their tally on. It runs after the hook's
        // `afterFrame`, so the frame the hook just judged is the frame these numbers describe.
        onFrame: () => drawCounters?.mark(),
        report: reportError
      },
      options
    );
    const w = clock.wrappers;
    win.requestAnimationFrame = w.requestAnimationFrame;
    win.cancelAnimationFrame = w.cancelAnimationFrame;
    win.setTimeout = w.setTimeout;
    win.setInterval = w.setInterval;
    win.clearTimeout = w.clearTimeout;
    win.clearInterval = w.clearInterval;
    try {
      if (win.performance) win.performance.now = w.now;
      Date.now = w.dateNow;
    } catch {
    }
    return clock;
  }
  function patchRequestPointerLock(win, lock) {
    const elementProto = win.Element?.prototype;
    if (!elementProto) return;
    const nativeRequest = elementProto.requestPointerLock;
    elementProto.requestPointerLock = function requestPointerLock(...args) {
      lock.pointerLock.request(this);
      try {
        const result = nativeRequest?.apply(this, args);
        if (result && typeof result.catch === "function") {
          result.catch(() => {
            lock.denied = true;
          });
          return result;
        }
      } catch {
        lock.denied = true;
      }
      return void 0;
    };
  }
  function patchExitPointerLock(docProto, lock) {
    const nativeExit = docProto.exitPointerLock;
    docProto.exitPointerLock = function exitPointerLock(...args) {
      lock.pointerLock.exit();
      try {
        return nativeExit?.apply(this, args);
      } catch {
        return void 0;
      }
    };
  }
  function listenForNativeLock(lock) {
    try {
      document.addEventListener("pointerlockchange", () => lock.pointerLock.onNativeChange(), true);
      document.addEventListener(
        "pointerlockerror",
        () => {
          lock.denied = true;
        },
        true
      );
    } catch {
    }
  }
  function installPointerLock(win, options) {
    const docProto = typeof win.Document === "function" ? win.Document.prototype : null;
    const nativeLockDescriptor = docProto ? Object.getOwnPropertyDescriptor(docProto, "pointerLockElement") : null;
    const pointerLock = createPointerLock({
      nativeElement: () => {
        try {
          return nativeLockDescriptor?.get ? nativeLockDescriptor.get.call(document) : null;
        } catch {
          return null;
        }
      },
      dispatch: (type) => {
        queueMicrotask(() => {
          try {
            document.dispatchEvent(new Event(type, { bubbles: true }));
          } catch {
          }
        });
      }
    });
    const lock = { pointerLock, denied: false };
    if (!options.pointerLock || !docProto || !nativeLockDescriptor) return lock;
    Object.defineProperty(docProto, "pointerLockElement", {
      configurable: true,
      enumerable: nativeLockDescriptor.enumerable ?? true,
      get() {
        return pointerLock.element();
      }
    });
    patchRequestPointerLock(win, lock);
    patchExitPointerLock(docProto, lock);
    listenForNativeLock(lock);
    return lock;
  }
  function pickCanvas(watch) {
    const { descriptors, elements } = canvasesOf(watch);
    let best = null;
    let bestArea = -1;
    descriptors.forEach((d, index) => {
      if (d.kind === "unknown" || !d.visible) return;
      const area = d.cssWidth * d.cssHeight;
      if (area > bestArea) {
        bestArea = area;
        best = elements[index];
      }
    });
    return best ?? elements[0] ?? null;
  }
  function mouseMover(win, lock, watch) {
    return function mouseMove(dx, dy, x, y) {
      const target = lock.pointerLock.element() ?? pickCanvas(watch) ?? document;
      const init = {
        clientX: Number(x) || 0,
        clientY: Number(y) || 0,
        screenX: Number(x) || 0,
        screenY: Number(y) || 0,
        movementX: Number(dx) || 0,
        movementY: Number(dy) || 0,
        bubbles: true,
        cancelable: true,
        view: win
      };
      try {
        target.dispatchEvent(new MouseEvent("mousemove", init));
        if (typeof win.PointerEvent === "function") {
          target.dispatchEvent(new win.PointerEvent("pointermove", { ...init, pointerId: 1, pointerType: "mouse" }));
        }
      } catch {
        return false;
      }
      return true;
    };
  }
  var drawCallsNow = () => drawCallsOf(pageDrawTotals());
  function settleReady(r, natives, clock, why, ready) {
    if (r.state.ready || r.state.phase === "failed") return r.state;
    const at = natives.performanceNow();
    r.state = { ready, phase: ready ? "ready" : "failed", why, at };
    r.resolve({
      ready,
      why,
      ms: Math.round(at - r.bootAt),
      frames: clock.frames(),
      drawCalls: drawCallsNow()
    });
    return r.state;
  }
  var documentComplete = () => {
    try {
      return document.readyState === "complete";
    } catch {
      return false;
    }
  };
  function evaluateReady(r, page) {
    if (r.state.at !== null) return;
    const { natives, clock, loaders, options } = page;
    const verdict = readinessVerdict({
      elapsed: natives.performanceNow() - r.bootAt,
      quiet: loaders.inflight === 0 && natives.performanceNow() - loaders.lastResourceAt > options.quietMs,
      complete: documentComplete(),
      frames: clock.frames(),
      drawCalls: drawCallsNow(),
      readyMs: options.readyMs
    });
    if (verdict.settle) return void settleReady(r, natives, clock, verdict.settle, true);
    if (verdict.timedOut) r.timedOut = true;
  }
  function bootReport(r, natives, clock, lock) {
    const reasons = lock.denied ? ["pointer lock was refused without a gesture"] : [];
    return {
      ready: r.state.ready,
      phase: r.state.phase,
      /** The boot budget passed with the page still booting: a note for the waiter, not a failure. */
      timedOut: r.timedOut,
      attached: Boolean(globalThis.__studioHook?.current?.()),
      since: Math.round(natives.performanceNow() - r.bootAt),
      at: r.state.at === null ? null : Math.round(r.state.at - r.bootAt),
      frames: clock.frames(),
      steppedFrames: clock.steppedFrames(),
      drawCalls: drawCallsNow(),
      reason: r.state.why ?? (r.timedOut ? BOOT_BUDGET_SPENT : null),
      gesture: { needed: reasons.length > 0, reasons, done: r.gestureSeen }
    };
  }
  var GESTURE_TYPES = ["keydown", "keyup", "mousedown", "mouseup", "mousemove", "wheel", "pointerdown"];
  function watchTrustedInput(win, r) {
    try {
      for (const type of GESTURE_TYPES) {
        win.addEventListener(
          type,
          (event) => {
            if (!event.isTrusted) return;
            r.gestureSeen = true;
            win.__studioTrustedInput = true;
            (win.__studioTrustedTypes = win.__studioTrustedTypes || {})[event.type] = true;
          },
          true
        );
      }
      win.__studioTrustedProbe = true;
    } catch {
    }
  }
  var READINESS_POLL_MS = 100;
  var GL_DRAIN_EVERY_FRAMES = 30;
  function glDrainBudget(drain) {
    let frames = 0;
    return () => {
      frames++;
      if (frames % GL_DRAIN_EVERY_FRAMES === 0) drain();
    };
  }
  function startPump(page, watch, r) {
    const { natives, clock } = page;
    const drain = glDrainBudget(() => drainGl(watch));
    const pump = () => {
      if (natives.raf) natives.raf(pump);
      try {
        drain();
        evaluateReady(r, page);
        clock.tick();
        clock.openFrame();
      } catch (err) {
        reportError(err);
      }
    };
    if (natives.raf) natives.raf(pump);
    natives.setInterval(() => {
      evaluateReady(r, page);
      clock.tick();
    }, READINESS_POLL_MS);
  }
  function callGame(win, verb, ...args) {
    const game = win.__studio?.__game;
    if (!game || typeof game[verb] !== "function") return;
    try {
      game[verb](...args);
    } catch (err) {
      console.error(err);
    }
  }
  function readGameState(win) {
    const game = win.__studio?.__game;
    if (!game || typeof game.state !== "function") return null;
    try {
      return game.state();
    } catch {
      return null;
    }
  }
  function backendOf(watch) {
    const { descriptors } = canvasesOf(watch);
    const three = descriptors.find((d) => d.kind === "webgpu") ?? descriptors.find((d) => d.kind === "webgl2" || d.kind === "webgl");
    return three ? three.kind : null;
  }
  function renderReport(watch, clock) {
    const drawn = globalThis.__studioDraw?.frame?.() ?? null;
    return {
      backend: backendOf(watch),
      drawCalls: drawn ? drawn.drawCalls ?? 0 : null,
      triangles: drawn ? drawn.triangles ?? null : null,
      vertices: drawn ? drawn.vertices ?? null : null,
      fps: clock.fps(),
      source: drawn ? "counters" : "shim",
      trianglesExact: drawn ? drawn.trianglesExact !== false : false
    };
  }
  function withRender(game, render) {
    const merged = { ...game, __render: render };
    if (merged.drawCalls === void 0 && render.drawCalls !== null) merged.drawCalls = render.drawCalls;
    if (merged.triangles === void 0 && render.triangles !== null) merged.triangles = render.triangles;
    return merged;
  }
  var hookAttached = () => {
    try {
      return Boolean(globalThis.__studioHook?.current?.());
    } catch {
      return false;
    }
  };
  function pageState(win, watch, clock, lock) {
    const game = readGameState(win);
    const render = renderReport(watch, clock);
    if (game && typeof game === "object") return withRender(game, render);
    return {
      frame: clock.frames(),
      simulatedMs: Math.round(clock.elapsed()),
      running: !clock.frozen(),
      fps: clock.fps(),
      pointerLock: lock.pointerLock.locked(),
      render,
      __render: render,
      __attached: hookAttached()
    };
  }
  function hookedAnswers() {
    const page = globalThis;
    return {
      inspect: () => page.__studioHook?.inspect?.() ?? {
        available: false,
        reason: "no renderer has been seen on this page"
      },
      capture: () => page.__studioCapture?.capture?.() ?? null,
      captureInfo: () => page.__studioCapture?.captureInfo?.() ?? {
        source: "page",
        reason: "the page-side capture is not installed",
        picked: null
      },
      cameras: () => page.__studioHook?.cameras?.() ?? [],
      debugCamera: (name) => page.__studioHook?.debugCamera?.(name) ?? { ok: false, available: [] },
      eyes: () => [],
      eye: () => ({ ok: false, reason: "this page declares no player, so it has no eye cameras" }),
      sceneSummary: () => page.__studioHook?.sceneSummary?.() ?? { available: false },
      demos: () => [],
      demo: () => ({ ok: false, available: [] }),
      // A page with no front-end of its own is already in play: the harness reads `ok: false` as
      // nothing to skip, never as a missing contract.
      begin: () => ({ ok: false, reason: "this page declares no begin()" }),
      audio: () => ({ available: false, rms: 0, centroid: 0 }),
      probes: () => ({}),
      player: () => null
    };
  }
  function studioFacade({ win, watch, clock, lock, ready }) {
    const injected = { keys: /* @__PURE__ */ new Set(), look: { x: 0, y: 0 } };
    return {
      version: CLOCK_VERSION,
      hud: void 0,
      attached: hookAttached,
      state: () => pageState(win, watch, clock, lock),
      ready,
      async step(ms) {
        const result = await clock.step(ms);
        callGame(win, "step", ms);
        return result;
      },
      pause() {
        clock.pause();
        callGame(win, "pause");
        return true;
      },
      start() {
        callGame(win, "start");
        clock.start();
        return true;
      },
      seed(value) {
        const seeded = clock.seed(value);
        callGame(win, "seed", value);
        return seeded;
      },
      ...hookedAnswers(),
      // Recorded, never dispatched: preview.ts sends the DOM events itself, and a second copy
      // from here delivered every look twice on a page with no contract of its own.
      injectInput: (input) => {
        for (const key of input?.down ?? []) injected.keys.add(key);
        for (const key of input?.up ?? []) injected.keys.delete(key);
        injected.look.x += Number(input?.look?.dx) || 0;
        injected.look.y += Number(input?.look?.dy) || 0;
        return { keys: [...injected.keys], look: { ...injected.look } };
      }
    };
  }
  function installCaptureGlobal(win, watch, clock, natives) {
    installPageGlobal(
      win,
      "__studioCapture",
      Object.freeze(
        createFrameCapture({
          canvases: () => {
            drainGl(watch);
            return canvasesOf(watch);
          },
          rendererCanvas: () => globalThis.__studioHook?.current?.()?.canvas ?? null,
          afterFrame: clock.afterFrame,
          pumpFrame: clock.pumpFrame,
          draws: pageDrawTotals,
          frozen: clock.frozen,
          start: () => clock.start(),
          pause: () => clock.pause(),
          // The game's own picture, when it has one — never the facade's, which is this function.
          gameCapture: () => {
            const game = win.__studio?.__game;
            return typeof game?.capture === "function" ? game.capture() : null;
          },
          // Through the facade, so the template re-renders on its own named rig and an attached game
          // gets the hook's answer; the ladder only reaches here when nothing drew by itself.
          debugCamera: (name) => win.__studio?.debugCamera?.(name) ?? null,
          currentCamera: () => {
            const named = win.__studio?.cameras?.();
            return Array.isArray(named) && named.length ? named[0] : "default";
          },
          computedStyle: (element) => win.getComputedStyle?.(element) ?? null,
          parentOf: (element) => element?.parentElement ?? null,
          createCanvas: () => document.createElement("canvas"),
          // A data URL decoded back into something `drawImage` accepts: how a transparent WebGPU
          // frame, which cannot be copied from its own canvas, is painted over the page background.
          decode: async (url) => {
            const image = new win.Image();
            image.src = url;
            if (typeof image.decode === "function") await image.decode();
            return image;
          },
          setTimeout: natives.setTimeout,
          clearTimeout: natives.clearTimeout
        })
      )
    );
  }
  function clockStats({ win, options, clock, watch, lock, readiness, random }) {
    const totals2 = pageDrawTotals();
    return {
      mode: options.clock,
      frozen: clock.frozen(),
      now: clock.now(),
      frames: clock.frames(),
      steppedFrames: clock.steppedFrames(),
      pendingRaf: clock.pendingRaf(),
      timers: clock.timerStats(),
      drawCalls: drawCallsOf(totals2),
      triangles: totals2 ? totals2.triangles ?? null : null,
      lastFrame: Math.round(clock.now()),
      ready: readiness.state.ready,
      contract: Boolean(win.__studio?.__game),
      pointerLock: lock.pointerLock.locked(),
      backend: backendOf(watch),
      autoResumes: clock.autoResumes(),
      seed: random ? random.value() : null
    };
  }
  function installClockGlobal(parts) {
    const { win, natives, options, clock, watch, loaders, lock, readiness } = parts;
    installPageGlobal(
      win,
      "__studioClock",
      Object.freeze({
        version: CLOCK_VERSION,
        mode: clock.mode,
        frozen: clock.frozen,
        now: clock.now,
        pause: clock.pause,
        start: clock.start,
        step: clock.step,
        seed: clock.seed,
        boot: () => bootReport(readiness, natives, clock, lock),
        ready: parts.ready,
        rafReal: (cb) => realFrame(natives, cb),
        afterFrame: clock.afterFrame,
        pumpFrame: clock.pumpFrame,
        canvases: () => canvasesOf(watch),
        draws: () => pageDrawTotals() ?? {
          drawCalls: 0,
          triangles: null,
          frames: clock.frames(),
          trianglesExact: false
        },
        loaders: () => ({
          inflight: loaders.inflight,
          quietFor: Math.round(natives.performanceNow() - loaders.lastResourceAt),
          quietMs: options.quietMs
        }),
        pointerLock: () => lock.pointerLock.locked(),
        mouseMove: mouseMover(win, lock, watch),
        stats: () => clockStats(parts)
      })
    );
  }
  function installStudioShim(rawOptions) {
    const win = globalThis;
    if (win.__studioClock && win.__studioClock.version === CLOCK_VERSION) return win.__studioClock;
    const options = normalizeShimOptions(rawOptions);
    const natives = nativesOf(win);
    if (natives.raf && natives.cancelRaf) {
      const gate = animationGate({ request: natives.raf, cancel: natives.cancelRaf });
      natives.raf = gate.request;
      natives.cancelRaf = gate.cancel;
      installPageGlobal(
        win,
        "__studioAnimation",
        Object.freeze({ setVisible: gate.setVisible, setMaxFps: gate.setMaxFps })
      );
    }
    const random = options.seed === null ? null : installSeededRandom(win, options.seed);
    const watch = watchCanvases(win);
    installGlGlobal(win, watch, options.counters);
    const drawCounters = options.counters ? installStudioDrawCounters({ scope: win, note: (message) => noteGl(watch, message) }) : null;
    const loaders = watchLoaders(win, natives);
    const clock = installClock(win, natives, options, random, drawCounters);
    const lock = installPointerLock(win, options);
    const readiness = {
      bootAt: natives.performanceNow(),
      state: { ready: false, phase: "boot", why: null, at: null },
      timedOut: false,
      gestureSeen: false,
      resolve: () => {
      }
    };
    win.__studioReady = new Promise((resolve) => {
      readiness.resolve = resolve;
    });
    const ready = (why) => settleReady(readiness, natives, clock, typeof why === "string" && why ? why : "declared", true);
    watchTrustedInput(win, readiness);
    startPump({ natives, clock, loaders, options }, watch, readiness);
    installFacade(win, studioFacade({ win, watch, clock, lock, ready }));
    installCaptureGlobal(win, watch, clock, natives);
    installClockGlobal({ win, natives, options, clock, watch, loaders, lock, readiness, random, ready });
    return win.__studioClock;
  }

  // src/page/entry.ts
  function readOptions() {
    try {
      const tag = document.currentScript ?? document.querySelector("script[data-studio-shim]");
      const raw = tag?.getAttribute("data-studio-options");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  installStudioShim(readOptions());
})();
//# sourceMappingURL=shim.js.map

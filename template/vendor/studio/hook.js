// src/page/hook.ts
var HOOK_VERSION = 1;
var RECORDS_PER_FRAME = 32;
var OBJECT_CAP = 2048;
var COUNT_INTERVAL_MS = 500;
var SCENE_TTL_MS = 1e3;
var WRAPPED_METHODS = Object.freeze(["render", "renderAsync", "setRenderTarget"]);
var HOOKED_KEYS = Object.freeze(["three", "three/webgpu"]);
var UNAVAILABLE = "the game's scene graph is not available";
var NO_RENDER_REASON = "no scene has been rendered yet \u2014 the game has not called renderer.render(scene, camera) since load, and installStudio was not given a scene";
var state = {
  /** Every namespace the serve layer handed us: `{ key, url, revision, wrapped: [] }`. */
  namespaces: [],
  /** The current frame's render records; drained by endFrame(). */
  records: [],
  frames: 0,
  renders: 0,
  /** The last frame's winner: `{ renderer, scene, camera, at, score }`. */
  world: null,
  /** Every scene that won a frame recently, most recent first. */
  worlds: [],
  /** Render targets the page pointed a renderer at, without the builder's help. */
  targets: /* @__PURE__ */ new Set(),
  /** Whether the frame boundary is being driven by the studio's clock. */
  driven: false,
  wrapErrors: []
};
var wrappedInstances = /* @__PURE__ */ new WeakSet();
var wrappedClasses = /* @__PURE__ */ new WeakSet();
var trapped = /* @__PURE__ */ new WeakMap();
var counts = /* @__PURE__ */ new WeakMap();
var renderDepth = 0;
var instancesWrapped = 0;
function now() {
  try {
    return globalThis.performance ? globalThis.performance.now() : Date.now();
  } catch {
    return Date.now();
  }
}
function reset() {
  state.namespaces = [];
  state.records = [];
  state.frames = 0;
  state.renders = 0;
  state.world = null;
  state.worlds = [];
  state.targets = /* @__PURE__ */ new Set();
  state.wrapErrors = [];
  renderDepth = 0;
  instancesWrapped = 0;
}
function hook(namespace, key, url) {
  const entry = { key: String(key ?? "three"), url: String(url ?? ""), revision: null, wrapped: [] };
  state.namespaces.push(entry);
  if (!namespace || typeof namespace !== "object" && typeof namespace !== "function") return entry;
  entry.revision = namespaceRevision(namespace);
  for (const name of exportNames(namespace)) {
    if (!/Renderer$/.test(name)) continue;
    const ctor = rendererClass(namespace, name);
    if (ctor && wrapClass(ctor, name)) entry.wrapped.push(name);
  }
  return entry;
}
function namespaceRevision(namespace) {
  try {
    return typeof namespace.REVISION === "string" ? namespace.REVISION : null;
  } catch {
    return null;
  }
}
function exportNames(namespace) {
  try {
    return Object.keys(namespace);
  } catch {
    return [];
  }
}
function rendererClass(namespace, name) {
  let ctor = null;
  try {
    ctor = namespace[name];
  } catch {
    return null;
  }
  return typeof ctor === "function" && ctor.prototype ? ctor : null;
}
function wrapClass(ctor, name = "") {
  const proto = ctor?.prototype;
  if (!proto || wrappedClasses.has(proto)) return Boolean(proto);
  wrappedClasses.add(proto);
  let any = false;
  for (const method of WRAPPED_METHODS) {
    const owner = ownerOf(proto, method);
    try {
      if (owner) {
        const original = Object.getOwnPropertyDescriptor(owner, method).value;
        if (original.__studioHooked) continue;
        Object.defineProperty(proto, method, {
          configurable: true,
          writable: true,
          enumerable: false,
          value: wrapMethod(original, method)
        });
        any = true;
      } else {
        installTrap(proto, method);
        any = true;
      }
    } catch (err) {
      state.wrapErrors.push(`${name || "renderer"}.${method}: ${String(err)}`);
    }
  }
  return any;
}
function ownerOf(proto, method) {
  let cursor = proto;
  while (cursor && cursor !== Object.prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(cursor, method);
    if (descriptor) return typeof descriptor.value === "function" ? cursor : null;
    cursor = Object.getPrototypeOf(cursor);
  }
  return null;
}
function installTrap(proto, method) {
  Object.defineProperty(proto, method, {
    configurable: true,
    enumerable: false,
    get() {
      const slot = trapped.get(this);
      return slot ? slot[method] : void 0;
    },
    set(value) {
      const slot = trapped.get(this) ?? {};
      slot[method] = typeof value === "function" && !value.__studioHooked ? wrapMethod(value, method) : value;
      trapped.set(this, slot);
    }
  });
}
function wrapRenderer(instance) {
  if (!instance || typeof instance !== "object") return false;
  if (wrappedInstances.has(instance)) return true;
  wrappedInstances.add(instance);
  instancesWrapped++;
  let any = false;
  for (const method of WRAPPED_METHODS) {
    let original = null;
    try {
      original = instance[method];
    } catch {
      continue;
    }
    if (typeof original !== "function" || original.__studioHooked) continue;
    try {
      Object.defineProperty(instance, method, {
        configurable: true,
        writable: true,
        enumerable: false,
        value: wrapMethod(original, method)
      });
      any = true;
    } catch (err) {
      state.wrapErrors.push(`renderer.${method}: ${String(err)}`);
    }
  }
  return any;
}
function wrapMethod(original, method) {
  if (method === "setRenderTarget") {
    const wrapped2 = function studioSetRenderTarget(target, ...rest) {
      if (target) state.targets.add(target);
      return original.call(this, target, ...rest);
    };
    wrapped2.__studioHooked = true;
    return wrapped2;
  }
  const wrapped = function studioRender(...args) {
    record(this, args[0], args[1], method);
    renderDepth++;
    try {
      return original.apply(this, args);
    } finally {
      renderDepth--;
    }
  };
  wrapped.__studioHooked = true;
  return wrapped;
}
function record(renderer, scene, camera, method) {
  if (!scene || typeof scene !== "object") return null;
  for (const existing of state.records) {
    if (existing.renderer === renderer && existing.scene === scene && existing.camera === camera) {
      existing.calls++;
      return existing;
    }
  }
  if (state.records.length >= RECORDS_PER_FRAME) return null;
  state.renders++;
  const entry = {
    renderer,
    scene,
    camera: camera ?? null,
    method,
    depth: renderDepth,
    calls: 1,
    target: renderTargetOf(renderer),
    viewport: drawingBufferOf(renderer),
    at: now()
  };
  state.records.push(entry);
  return entry;
}
function renderTargetOf(renderer) {
  try {
    return typeof renderer?.getRenderTarget === "function" ? renderer.getRenderTarget() ?? null : null;
  } catch {
    return null;
  }
}
function drawingBufferOf(renderer) {
  try {
    const canvas2 = renderer?.domElement ?? null;
    if (canvas2 && Number(canvas2.width) > 0) return { width: Number(canvas2.width), height: Number(canvas2.height) };
  } catch {
  }
  return null;
}
function describeObservation(record2, at = now()) {
  const scene = record2?.scene ?? null;
  const camera = record2?.camera ?? null;
  const target = record2?.target ?? null;
  const counted = countDrawables(scene, at);
  return {
    depth: Number(record2?.depth) || 0,
    method: record2?.method ?? "render",
    calls: Number(record2?.calls) || 1,
    toTarget: Boolean(target),
    targetSize: target ? { width: Number(target.width) || 0, height: Number(target.height) || 0 } : null,
    viewport: record2?.viewport ?? null,
    cameraKind: cameraKind(camera),
    unitFrustum: isUnitFrustum(camera),
    isScene: Boolean(scene?.isScene),
    quadRoot: isQuadRoot(scene),
    drawables: counted.drawables,
    objects: counted.objects,
    capped: counted.capped,
    scene,
    camera,
    renderer: record2?.renderer ?? null
  };
}
function cameraKind(camera) {
  if (!camera || typeof camera !== "object") return "none";
  if (camera.isCubeCamera || camera.parent?.isCubeCamera || camera.type === "CubeCamera") return "cube";
  if (camera.isArrayCamera) return "array";
  if (camera.isPerspectiveCamera) return "perspective";
  if (camera.isOrthographicCamera) return "orthographic";
  const type = String(camera.type ?? "");
  if (type === "PerspectiveCamera") return "perspective";
  if (type === "OrthographicCamera") return "orthographic";
  return "unknown";
}
function isUnitFrustum(camera) {
  if (!camera || cameraKind(camera) !== "orthographic") return false;
  const near = (a, b) => Math.abs(Number(a) - b) < 1e-6;
  return near(camera.left, -1) && near(camera.right, 1) && near(camera.top, 1) && near(camera.bottom, -1);
}
function isQuadRoot(scene) {
  if (!scene || typeof scene !== "object") return false;
  if (scene.isScene) return false;
  return Boolean(scene.isQuadMesh || scene.isMesh || scene.type === "QuadMesh" || scene.type === "Mesh");
}
function scoreObservation(obs) {
  if (!obs) return -1;
  if ((Number(obs.depth) || 0) > 0) return -1;
  if (obs.quadRoot) return -1;
  if (obs.cameraKind === "cube" || obs.cameraKind === "none") return -1;
  const drawables = Number(obs.drawables) || 0;
  if (obs.unitFrustum && drawables <= 2) return -1;
  if (drawables === 0) return -1;
  let score = 1;
  if (obs.cameraKind === "perspective" || obs.cameraKind === "array") score += 3;
  else if (obs.cameraKind === "orthographic") score += 1;
  score += Math.min(4, Math.log2(1 + drawables));
  if (obs.toTarget) score += 1;
  score += 2 * coverage(obs);
  return score;
}
function coverage(obs) {
  const full = obs.viewport ? (Number(obs.viewport.width) || 0) * (Number(obs.viewport.height) || 0) : 0;
  if (!obs.targetSize) return 1;
  const area = (Number(obs.targetSize.width) || 0) * (Number(obs.targetSize.height) || 0);
  if (!(full > 0) || !(area > 0)) return 1;
  return Math.min(1, area / full);
}
function chooseWorld(observations) {
  let best = -1;
  let bestScore = 0;
  const list = Array.isArray(observations) ? observations : [];
  for (let i = 0; i < list.length; i++) {
    const score = scoreObservation(list[i]);
    if (score > 0 && score >= bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}
function countDrawables(root, at = now()) {
  const empty = { drawables: 0, objects: 0, capped: false };
  if (!root || typeof root !== "object") return empty;
  const children = childCount(root);
  if (children === null) return empty;
  const cached = counts.get(root);
  if (cached && cached.children === children && at - cached.at < COUNT_INTERVAL_MS) return cached.value;
  const value = walkDrawables(root);
  try {
    counts.set(root, { at, children, value });
  } catch {
  }
  return value;
}
function childCount(root) {
  try {
    const roots = root.children;
    return Array.isArray(roots) ? roots.length : 0;
  } catch {
    return null;
  }
}
function pushObjectChildren(stack, node) {
  let kids = null;
  try {
    kids = node.children;
  } catch {
    kids = null;
  }
  if (!Array.isArray(kids)) return;
  for (let i = 0; i < kids.length; i++) if (kids[i] && typeof kids[i] === "object") stack.push(kids[i]);
}
function walkDrawables(root) {
  const stack = [root];
  let objects = 0;
  let drawables = 0;
  let capped = false;
  while (stack.length) {
    if (objects >= OBJECT_CAP) {
      capped = true;
      break;
    }
    const node = stack.pop();
    objects++;
    if (node !== root && isDrawable(node)) drawables++;
    pushObjectChildren(stack, node);
  }
  return { drawables, objects, capped };
}
function isDrawable(node) {
  return Boolean(
    node && (node.isMesh || node.isInstancedMesh || node.isSkinnedMesh || node.isBatchedMesh || node.isPoints || node.isLine || node.isLineSegments || node.isSprite)
  );
}
function endFrame(at = now()) {
  const records = state.records;
  state.records = [];
  state.frames++;
  if (!records.length) return state.world;
  const observations = records.map((entry) => describeObservation(entry, at)).filter((obs) => obs.depth === 0);
  const index = chooseWorld(observations);
  if (index < 0) return state.world;
  const won = observations[index];
  state.world = { renderer: won.renderer, scene: won.scene, camera: won.camera, at, score: scoreObservation(won) };
  rememberWorld(state.world);
  return state.world;
}
function rememberWorld(world) {
  const existing = state.worlds.findIndex((entry) => entry.scene === world.scene);
  if (existing >= 0) state.worlds.splice(existing, 1);
  state.worlds.unshift({ ...world });
  state.worlds = state.worlds.filter((entry, index) => index === 0 || world.at - entry.at <= SCENE_TTL_MS);
  if (state.worlds.length > 8) state.worlds.length = 8;
}
function current() {
  if (!state.world) return null;
  const { renderer, scene, camera } = state.world;
  return { renderer, scene, camera, canvas: canvasOf(renderer) };
}
function scenes() {
  const at = now();
  return state.worlds.filter((entry, index) => index === 0 || at - entry.at <= SCENE_TTL_MS).map((entry) => entry.scene);
}
function constructorName(value) {
  try {
    if (!value || typeof value !== "object") return null;
    return value.constructor && value.constructor.name ? String(value.constructor.name) : typeof value;
  } catch {
    return null;
  }
}
function nameOf(value) {
  try {
    if (!value || typeof value !== "object") return null;
    return value.name ? String(value.name) : constructorName(value);
  } catch {
    return null;
  }
}
function canvasOf(renderer) {
  try {
    return renderer?.domElement ?? null;
  } catch {
    return null;
  }
}
function sceneHelpers(source = {}) {
  const scene = source.scene ?? null;
  const roots = (Array.isArray(source.roots) && source.roots.length ? source.roots : [scene]).filter(Boolean);
  const objects = (tag) => {
    const out = [];
    for (const root of roots) {
      walk(root, (obj) => {
        if (obj === root) return;
        if (tag === void 0 || obj.userData?.tag === tag) out.push(obj);
      });
    }
    return out;
  };
  const meshes = (tag) => objects(tag).filter((o) => o.isMesh || o.isInstancedMesh || o.isSkinnedMesh);
  const materials = (tag) => {
    const set = /* @__PURE__ */ new Set();
    for (const mesh of meshes(tag)) {
      const m = mesh.material;
      if (Array.isArray(m)) m.forEach((x) => x && set.add(x));
      else if (m) set.add(m);
    }
    return [...set];
  };
  const lights = () => objects().filter((o) => o.isLight);
  const tags = () => {
    const seen = /* @__PURE__ */ new Set();
    walk(scene, (obj) => {
      if (obj?.userData?.tag) seen.add(String(obj.userData.tag));
    });
    return [...seen];
  };
  const ancestorTag = (obj) => {
    let cursor = obj.parent;
    while (cursor) {
      if (cursor.userData?.tag) return cursor.userData.tag;
      cursor = cursor.parent;
    }
    return null;
  };
  const untagged = () => meshes().filter((m) => !m.userData?.tag && !ancestorTag(m)).length;
  const bbox = (tag) => boundsOf(objects(tag));
  const bboxOf = (obj) => {
    if (!obj) return null;
    const list = [];
    walk(obj, (o) => list.push(o));
    return boundsOf(list);
  };
  return {
    objects,
    meshes,
    materials,
    lights,
    tags,
    untagged,
    count: (tag) => objects(tag).length,
    bbox,
    bboxOf,
    domUi: () => domUi(canvasOf(source.renderer) ?? current()?.canvas ?? null),
    renderTargets: source.renderTargets ?? (() => [...state.targets])
  };
}
function walk(root, visit) {
  if (!root || typeof root !== "object") return;
  const stack = [root];
  let seen = 0;
  while (stack.length && seen < OBJECT_CAP) {
    const node = stack.pop();
    seen++;
    visit(node);
    const kids = node.children;
    if (Array.isArray(kids)) {
      for (let i = 0; i < kids.length; i++) if (kids[i] && typeof kids[i] === "object") stack.push(kids[i]);
    }
  }
}
function boxCorners(box) {
  return [
    [box.min.x, box.min.y, box.min.z],
    [box.max.x, box.min.y, box.min.z],
    [box.min.x, box.max.y, box.min.z],
    [box.max.x, box.max.y, box.min.z],
    [box.min.x, box.min.y, box.max.z],
    [box.max.x, box.min.y, box.max.z],
    [box.min.x, box.max.y, box.max.z],
    [box.max.x, box.max.y, box.max.z]
  ];
}
function toWorld(e, c) {
  if (!e) return c;
  return [
    e[0] * c[0] + e[4] * c[1] + e[8] * c[2] + e[12],
    e[1] * c[0] + e[5] * c[1] + e[9] * c[2] + e[13],
    e[2] * c[0] + e[6] * c[1] + e[10] * c[2] + e[14]
  ];
}
function localBox(obj) {
  if (!obj.geometry) return null;
  obj.updateWorldMatrix?.(true, false);
  obj.geometry.computeBoundingBox?.();
  return obj.geometry.boundingBox;
}
function boundsOf(list) {
  if (!list.length) return null;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const obj of list) {
    const box = localBox(obj);
    if (!box) continue;
    for (const c of boxCorners(box)) {
      const w = toWorld(obj.matrixWorld?.elements, c);
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], w[axis]);
        max[axis] = Math.max(max[axis], w[axis]);
      }
    }
  }
  if (!Number.isFinite(min[0])) return null;
  return { min: xyz(min), max: xyz(max), size: xyz([max[0] - min[0], max[1] - min[1], max[2] - min[2]]) };
}
function xyz(v) {
  const out = { x: v[0], y: v[1], z: v[2] };
  Object.defineProperty(out, 0, { value: v[0], enumerable: false });
  Object.defineProperty(out, 1, { value: v[1], enumerable: false });
  Object.defineProperty(out, 2, { value: v[2], enumerable: false });
  Object.defineProperty(out, "length", { value: 3, enumerable: false });
  return out;
}
var NOT_UI_TAGS = /* @__PURE__ */ new Set(["CANVAS", "SCRIPT", "STYLE", "LINK", "META", "TEMPLATE", "TITLE", "HEAD", "HTML", "BODY"]);
var VISUAL_TAGS = /* @__PURE__ */ new Set(["IMG", "SVG", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "VIDEO", "PROGRESS", "METER"]);
var MAX_DOM_UI = 12;
var UI_TEXT_CHARS = 40;
function isNotUi(el) {
  if (NOT_UI_TAGS.has(el.tagName) || el.closest("svg") !== null && el.tagName !== "SVG") return true;
  return el.id === "fatal" && !el.textContent.trim();
}
function isInvisible(el, style) {
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return true;
  const rect = el.getBoundingClientRect();
  return rect.width <= 0 || rect.height <= 0 || el.getClientRects().length === 0;
}
function ownTextOf(el) {
  return [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => (n.textContent ?? "").trim()).join(" ").trim();
}
function isPainted(style) {
  const background = style.backgroundColor && !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)|transparent/.test(style.backgroundColor);
  const image = style.backgroundImage && style.backgroundImage !== "none";
  const border = style.borderStyle && style.borderStyle !== "none" && parseFloat(style.borderWidth) > 0;
  return Boolean(background || image || border);
}
function uiName(el) {
  const id = el.id ? `#${el.id}` : "";
  const classes = el.className && typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).join(".")}` : "";
  return `${el.tagName.toLowerCase()}${id}${classes}`;
}
function secondCanvas(el, game) {
  if (!game || el === game || typeof game.getBoundingClientRect !== "function") return null;
  if (isInvisible(el, getComputedStyle(el))) return null;
  const rect = el.getBoundingClientRect();
  const own = game.getBoundingClientRect();
  const over = rect.left < own.right && rect.right > own.left && rect.top < own.bottom && rect.bottom > own.top;
  return over ? `${uiName(el)} (second canvas over the game)` : null;
}
function domUi(game = current()?.canvas ?? null) {
  const out = [];
  if (typeof document === "undefined" || !document.body) return out;
  for (const el of document.body.querySelectorAll("*")) {
    const entry = uiEntry(el, game);
    if (!entry) continue;
    out.push(entry);
    if (out.length >= MAX_DOM_UI) break;
  }
  return out;
}
function uiEntry(el, game) {
  if (el.tagName === "CANVAS") return secondCanvas(el, game);
  if (isNotUi(el)) return null;
  const style = getComputedStyle(el);
  if (isInvisible(el, style)) return null;
  const ownText = ownTextOf(el);
  if (!ownText && !VISUAL_TAGS.has(el.tagName) && !isPainted(style)) return null;
  const name = uiName(el);
  return ownText ? `${name} "${ownText.slice(0, UI_TEXT_CHARS)}"` : name;
}
function unavailable(reason = NO_RENDER_REASON) {
  const fail = () => {
    throw new Error(`${UNAVAILABLE}: ${reason}`);
  };
  return {
    available: false,
    reason,
    scene: null,
    renderer: null,
    camera: null,
    state: null,
    player: null,
    objects: fail,
    meshes: fail,
    materials: fail,
    lights: fail,
    tags: fail,
    untagged: fail,
    count: fail,
    bbox: fail,
    bboxOf: fail,
    domUi,
    hud: () => ({ items: [], crosshair: false, flash: 0 }),
    renderTargets: () => [...state.targets],
    audio: () => ({ available: false, rms: 0, centroid: 0 })
  };
}
function inspect(options = {}) {
  const world = current();
  const scene = options.scene ?? world?.scene ?? null;
  if (!scene) return unavailable(options.reason ?? NO_RENDER_REASON);
  const renderer = options.renderer ?? world?.renderer ?? null;
  const camera = options.camera ?? world?.camera ?? null;
  const roots = Array.isArray(options.roots) && options.roots.length ? options.roots : [scene];
  const helpers = sceneHelpers({ ...options, scene, roots });
  return {
    available: true,
    scene,
    renderer,
    camera,
    state: options.state ?? pageState(),
    player: options.player ?? null,
    ...helpers,
    hud: options.hud ?? (() => ({ items: [], crosshair: false, flash: 0 })),
    audio: options.audio ?? (() => ({ available: false, rms: 0, centroid: 0 }))
  };
}
function pageState() {
  try {
    const game = globalThis.__studio?.__game;
    if (game && typeof game.state === "function") return game.state();
  } catch {
  }
  return null;
}
function sceneSummary(options = {}) {
  const I = inspect(options);
  if (I.available === false) return { available: false, reason: I.reason };
  const byTag = {};
  for (const tag of I.tags()) byTag[tag] = I.count(tag);
  return {
    available: true,
    meshes: I.meshes().length,
    untagged: I.untagged(),
    byTag,
    lights: I.lights().map((l) => l.type),
    renderTargets: I.renderTargets().map((rt) => ({ width: rt.width, height: rt.height })),
    scenes: state.worlds.length
  };
}
function cameras() {
  return current()?.camera ? ["default"] : [];
}
function debugCamera(name) {
  const available = cameras();
  if (name === "default" && available.length) {
    return { ok: true, camera: "default" };
  }
  return { ok: false, available };
}
function hookState() {
  const world = current();
  return {
    version: HOOK_VERSION,
    attached: Boolean(world),
    renders: state.renders,
    frames: state.frames,
    scenes: state.worlds.length,
    renderer: constructorName(world?.renderer),
    scene: nameOf(world?.scene),
    camera: constructorName(world?.camera),
    cameraKind: cameraKind(world?.camera ?? null),
    three: state.namespaces.map((entry) => ({
      key: entry.key,
      url: entry.url,
      revision: entry.revision,
      wrapped: entry.wrapped.slice()
    })),
    targets: state.targets.size,
    driven: state.driven,
    reason: world ? null : attachReason(),
    errors: state.wrapErrors.slice(0, 4)
  };
}
function attachReason() {
  if (!state.namespaces.length && instancesWrapped === 0) {
    return "the studio never reached this page's three \u2014 its renderer is inside its own bundle; call installStudio({ renderer, player }) from the game's entry";
  }
  if (state.renders === 0 && state.frames > 30) {
    return "the page has drawn frames but no wrapped renderer was called \u2014 a game that replaces renderer.render after construction is invisible to the studio";
  }
  return NO_RENDER_REASON;
}
function capture(options) {
  try {
    return globalThis.__studioCapture?.capture?.(options) ?? null;
  } catch {
    return null;
  }
}
function canvas() {
  return current()?.canvas ?? null;
}
function installStudioHook(target = globalThis) {
  const existing = target.__studioHook;
  if (existing && existing.version === HOOK_VERSION) return existing;
  const api = {
    version: HOOK_VERSION,
    hook,
    wrapRenderer,
    wrapClass,
    current,
    scenes,
    inspect,
    sceneSummary,
    cameras,
    debugCamera,
    state: hookState,
    endFrame,
    capture,
    canvas,
    reset,
    describeObservation,
    scoreObservation,
    chooseWorld
  };
  try {
    Object.defineProperty(target, "__studioHook", {
      configurable: true,
      enumerable: true,
      get: () => api,
      set: () => {
      }
    });
  } catch {
    target.__studioHook = api;
  }
  const clock = target.__studioClock;
  if (clock && typeof clock.afterFrame === "function") {
    clock.afterFrame(() => endFrame());
    state.driven = true;
  } else if (typeof target.requestAnimationFrame === "function") {
    const beat = () => {
      target.requestAnimationFrame(beat);
      endFrame();
    };
    target.requestAnimationFrame(beat);
  }
  return api;
}
try {
  installStudioHook();
} catch {
}
export {
  COUNT_INTERVAL_MS,
  HOOKED_KEYS,
  HOOK_VERSION,
  NO_RENDER_REASON,
  OBJECT_CAP,
  RECORDS_PER_FRAME,
  SCENE_TTL_MS,
  UNAVAILABLE,
  WRAPPED_METHODS,
  cameraKind,
  cameras,
  canvas,
  capture,
  chooseWorld,
  countDrawables,
  current,
  debugCamera,
  describeObservation,
  domUi,
  endFrame,
  hook,
  hookState,
  inspect,
  installStudioHook,
  isQuadRoot,
  isUnitFrustum,
  reset,
  sceneHelpers,
  sceneSummary,
  scenes,
  scoreObservation,
  unavailable,
  wrapClass,
  wrapRenderer
};
//# sourceMappingURL=hook.js.map

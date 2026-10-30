import {
  AUTHORIZE_ENTRY_REF_PARAM,
  DASHBOARD_RESERVED_KEYS,
  EMBED_REFERRER_PARAM,
  ENTRY_HASH_KEY,
  ENTRY_REFERRER_KEY,
  MAX_ENTRY_QUERY_LENGTH,
  MAX_RETURN_TO_LENGTH,
  NATIVE_CHANNEL,
  NATIVE_PROTOCOL_VERSION,
  NATIVE_RECEIVER,
  PLATFORM_PROTOCOL_VERSION,
  PLATFORM_REQUEST_TYPE,
  RESERVED_QUERY_PREFIX,
  SAVE_MAX_BYTES,
  createBridgeId,
  encodeBridgeMessage,
  hasNativeMarker,
  isGenerationId,
  isGenerationTerminal,
  isPlatformUrl,
  isSaveName,
  parseGenerationStreamEvent,
  parsePlatformRequest,
  parsePlatformResult,
  readBridgeNativeCommand,
  readNativeEntry,
  readPlatformCaps,
  sanitizeEntryHash,
  sanitizeEntryReferrer,
  sanitizePassthroughQuery,
  savableMime,
  stripNativeEntry,
  stripReturnMarker
} from "./chunk-QBCWKMVQ.js";

// src/platform.ts
var ctx = null;
function _initPlatform(c) {
  ctx = c;
}
var replyTimeoutMs = 3e3;
var confirmTimeoutMs = 18e4;
var SAVE_URL_LIFETIME_MS = 6e4;
var pending = /* @__PURE__ */ new Map();
var listening = null;
var wakeWanted = false;
var wakeSentinel = null;
var wakeRequest = null;
var wakeHook = null;
var shareParamsWarned = false;
function win() {
  return globalThis.window;
}
function doc() {
  return globalThis.document;
}
function shell() {
  return ctx ? ctx.getShell() : "standalone";
}
function localTest() {
  if (!ctx) return false;
  return ctx.isLocalTest ? ctx.isLocalTest() : ctx.getShell() === "local";
}
function fail(error) {
  return { ok: false, error };
}
async function settled(run, fallback) {
  try {
    return await run();
  } catch {
    return fallback;
  }
}
function share(options) {
  let url = "";
  try {
    url = shareUrl(options?.params);
  } catch {
  }
  return settled(
    async () => {
      const nav = win()?.navigator;
      if (url && nav && !localTest() && typeof nav.share === "function") {
        const data = { url };
        if (typeof options?.text === "string" && options.text) data.text = options.text;
        if (canShare(nav, data)) {
          try {
            await nav.share(data);
            return { status: "shared", url };
          } catch (error) {
            if (error?.name === "AbortError") {
              return { status: "dismissed", url };
            }
          }
        }
      }
      if (url && (await copyText(url)).ok) return { status: "copied", url };
      return { status: "unavailable", url };
    },
    { status: "unavailable", url }
  );
}
function canShare(nav, data) {
  if (typeof nav.canShare !== "function") return true;
  try {
    return nav.canShare(data);
  } catch {
    return false;
  }
}
function shareUrl(params) {
  const base = shareBase();
  if (!base) return "";
  const query = shareQuery(params);
  return query ? `${base}?${query}` : base;
}
function shareBase() {
  const w = win();
  if (!w) return "";
  const page = httpAddress(w.__GENEX__?.pageUrl);
  if (page) return page;
  const dashboard = trustedParent();
  const config3 = ctx?.getConfig();
  if (dashboard !== null && config3) {
    const built = pageOnDashboard(dashboard, config3.slug);
    if (built) return built;
  }
  try {
    return httpAddress(w.location.origin + w.location.pathname);
  } catch {
    return "";
  }
}
function pageOnDashboard(dashboard, slug) {
  try {
    return httpAddress(`${new URL(dashboard).origin}/${encodeURIComponent(slug)}`);
  } catch {
    return "";
  }
}
function httpAddress(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    if (url.username || url.password) return "";
    return url.origin + url.pathname;
  } catch {
    return "";
  }
}
function shareQuery(params) {
  if (!params || typeof params !== "object") return "";
  const pairs = [];
  let leftOut = false;
  for (const key of Object.keys(params)) {
    const value = params[key];
    const kind = typeof value;
    if (!key || kind !== "string" && kind !== "number" && kind !== "boolean") {
      leftOut = true;
      continue;
    }
    try {
      pairs.push(`${queryPart(key)}=${queryPart(String(value))}`);
    } catch {
      leftOut = true;
    }
  }
  const asked = pairs.join("&");
  const kept = asked.length <= MAX_ENTRY_QUERY_LENGTH ? sanitizePassthroughQuery(asked, DASHBOARD_RESERVED_KEYS) : "";
  if ((leftOut || kept !== asked) && !shareParamsWarned) {
    shareParamsWarned = true;
    try {
      console.warn(
        "[genex] share(): some params were left out of the link. embed, ref, s, from, remix, slug and names starting genex_ are reserved, values are strings, numbers or booleans, and the whole query is capped at 1024 characters."
      );
    } catch {
    }
  }
  return kept;
}
function queryPart(text) {
  return encodeURIComponent(text).replace(/'/g, "%27");
}
function copyText(text) {
  return settled(async () => {
    if (typeof text !== "string" || text.length === 0) return fail("invalid_request");
    const d = doc();
    const clipboard = win()?.navigator?.clipboard;
    let tried = false;
    if (clipboard && typeof clipboard.writeText === "function") {
      tried = true;
      try {
        await clipboard.writeText(text);
        return { ok: true };
      } catch {
      }
    }
    if (d && typeof d.execCommand === "function") {
      tried = true;
      if (selectionCopy(d, text)) return { ok: true };
    }
    return fail(tried ? "needs_gesture" : "unsupported");
  }, fail("unsupported"));
}
function selectionCopy(d, text) {
  const host = d.body ?? d.documentElement;
  if (!host) return false;
  const focused = d.activeElement;
  const field = d.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.setAttribute("aria-hidden", "true");
  field.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;font-size:16px;";
  host.appendChild(field);
  let copied = false;
  try {
    field.focus({ preventScroll: true });
    field.select();
    field.setSelectionRange(0, text.length);
    copied = d.execCommand("copy");
  } catch {
    copied = false;
  }
  field.remove();
  try {
    if (focused && typeof focused.focus === "function") focused.focus({ preventScroll: true });
  } catch {
  }
  return copied;
}
function keepAwake(on2) {
  return settled(() => {
    if (shell() === "app") return { ok: true };
    if (!on2) {
      wakeWanted = false;
      releaseWake();
      return { ok: true };
    }
    const d = doc();
    const lock = win()?.navigator?.wakeLock;
    if (!d || !lock || typeof lock.request !== "function") return fail("unsupported");
    wakeWanted = true;
    hookWake(d);
    return acquireWake(d, lock);
  }, fail("unsupported"));
}
function acquireWake(d, lock) {
  if (wakeRequest) return wakeRequest;
  if (wakeSentinel && !wakeSentinel.released) return Promise.resolve({ ok: true });
  if (d.visibilityState === "hidden") return Promise.resolve({ ok: true });
  const request2 = (async () => {
    try {
      const sentinel = await lock.request("screen");
      if (wakeWanted) holdSentinel(sentinel);
      else dropSentinel(sentinel);
      return { ok: true };
    } catch {
      if (d.visibilityState === "hidden") return { ok: true };
      wakeWanted = false;
      return fail("unsupported");
    }
  })();
  wakeRequest = request2;
  void request2.then(() => {
    if (wakeRequest === request2) wakeRequest = null;
  });
  return request2;
}
function holdSentinel(sentinel) {
  wakeSentinel = sentinel;
  try {
    sentinel.addEventListener?.("release", () => {
      if (wakeSentinel === sentinel) wakeSentinel = null;
    });
  } catch {
  }
}
function hookWake(d) {
  if (wakeHook || typeof d.addEventListener !== "function") return;
  const onVisibility = () => {
    const lock = win()?.navigator?.wakeLock;
    if (wakeWanted && lock && d.visibilityState === "visible") void acquireWake(d, lock);
  };
  d.addEventListener("visibilitychange", onVisibility);
  wakeHook = { d, onVisibility };
}
function releaseWake() {
  const sentinel = wakeSentinel;
  wakeSentinel = null;
  if (sentinel && !sentinel.released) dropSentinel(sentinel);
}
function dropSentinel(sentinel) {
  try {
    void sentinel.release().catch(() => {
    });
  } catch {
  }
}
var HAPTIC_PATTERNS = {
  selection: [8],
  light: [12],
  medium: [20],
  heavy: [35],
  success: [12, 60, 24],
  warning: [24, 80, 24],
  error: [35, 60, 35, 60, 35]
};
function haptic(kind) {
  try {
    if (shell() === "app") return;
    const nav = win()?.navigator;
    if (!nav || typeof nav.vibrate !== "function") return;
    if (!Object.prototype.hasOwnProperty.call(HAPTIC_PATTERNS, kind)) return;
    if (nav.userActivation && nav.userActivation.hasBeenActive === false) return;
    nav.vibrate(HAPTIC_PATTERNS[kind]);
  } catch {
  }
}
function openExternal(url) {
  return settled(() => {
    const href = serialisedLink(url);
    if (href === null) return fail("invalid_request");
    const where = shell();
    if (where === "app") return fail("unsupported");
    if (where === "page") {
      return askShell("open", (id) => ({ ...requestHead(id), cap: "open", url: href }));
    }
    const w = win();
    if (!w || typeof w.open !== "function") return fail("unsupported");
    const tab = w.open("", "_blank");
    if (!tab) return fail("needs_gesture");
    try {
      tab.opener = null;
      tab.location.replace(href);
    } catch {
      try {
        tab.close();
      } catch {
      }
      return fail("unsupported");
    }
    return { ok: true };
  }, fail("unsupported"));
}
function serialisedLink(url) {
  if (typeof url !== "string") return null;
  let href;
  try {
    href = new URL(url).href;
  } catch {
    return null;
  }
  return isPlatformUrl(href) ? href : null;
}
function saveFile(file, name) {
  return settled(() => {
    if (!isSaveName(name) || !isBlob(file)) return fail("invalid_request");
    if (file.size > SAVE_MAX_BYTES) return fail("too_large");
    const mime = savableMime(file.type);
    if (mime === null) return fail("invalid_request");
    const where = shell();
    if (where === "app") return fail("unsupported");
    if (where === "page") {
      return askShell("save", (id) => ({ ...requestHead(id), cap: "save", name, file }));
    }
    return downloadHere(file, withExtension(name, mime));
  }, fail("unsupported"));
}
function isBlob(value) {
  if (typeof value !== "object" || value === null) return false;
  const tag = Object.prototype.toString.call(value);
  return (tag === "[object Blob]" || tag === "[object File]") && typeof value.size === "number";
}
var SAVE_EXTENSIONS = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "video/webm": ["webm"],
  "video/mp4": ["mp4"],
  "application/json": ["json"],
  "text/plain": ["txt"]
};
function withExtension(name, mime) {
  const extensions = SAVE_EXTENSIONS[mime];
  const dot = name.lastIndexOf(".");
  const current = dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
  return extensions.includes(current) ? name : `${name}.${extensions[0]}`;
}
function downloadHere(file, name) {
  const w = win();
  const d = doc();
  const urls = w?.URL;
  const host = d?.body ?? d?.documentElement;
  if (!d || !host || !urls || typeof urls.createObjectURL !== "function") return fail("unsupported");
  const href = urls.createObjectURL(file);
  try {
    const link = d.createElement("a");
    link.href = href;
    link.download = name;
    link.style.display = "none";
    host.appendChild(link);
    link.click();
    link.remove();
  } finally {
    const timer = setTimeout(() => {
      try {
        urls.revokeObjectURL(href);
      } catch {
      }
    }, SAVE_URL_LIFETIME_MS);
    timer.unref?.();
  }
  return { ok: true };
}
function setFullscreen(on2) {
  return settled(() => {
    if (typeof on2 !== "boolean") return fail("invalid_request");
    const where = shell();
    if (where === "app") return fail("unsupported");
    if (where === "page" && shellOffers("fullscreen")) {
      return askShell("fullscreen", (id) => ({ ...requestHead(id), cap: "fullscreen", on: on2 }));
    }
    return fullscreenHere(on2);
  }, fail("unsupported"));
}
function fullscreenAllowed(d) {
  const root = d.documentElement;
  const request2 = root?.requestFullscreen ?? root?.webkitRequestFullscreen;
  return typeof request2 === "function" && (d.fullscreenEnabled ?? d.webkitFullscreenEnabled) !== false;
}
async function fullscreenHere(on2) {
  const d = doc();
  if (!d) return fail("unsupported");
  const current = d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
  if (!on2) {
    if (!current) return { ok: true };
    const exit = d.exitFullscreen ?? d.webkitExitFullscreen;
    if (typeof exit !== "function") return fail("unsupported");
    await exit.call(d);
    return { ok: true };
  }
  if (!fullscreenAllowed(d)) return fail("unsupported");
  if (current) return { ok: true };
  const root = d.documentElement;
  try {
    await (root.requestFullscreen ?? root.webkitRequestFullscreen).call(root, { navigationUI: "hide" });
    return { ok: true };
  } catch {
    return fail("needs_gesture");
  }
}
function trustedParent() {
  const origin = ctx?.getParentOrigin() ?? null;
  const allowed = ctx?.getConfig()?.dashboardOrigins;
  return origin !== null && allowed !== void 0 && allowed.includes(origin) ? origin : null;
}
function shellOffers(cap) {
  return trustedParent() !== null && (ctx?.getShellCaps().includes(cap) ?? false);
}
function requestHead(id) {
  return { type: PLATFORM_REQUEST_TYPE, v: PLATFORM_PROTOCOL_VERSION, id };
}
function askShell(cap, build) {
  const w = win();
  const origin = trustedParent();
  if (!w || origin === null || !shellOffers(cap)) return fail("unsupported");
  for (const waiting of pending.values()) {
    if (waiting.cap === cap) return fail("busy");
  }
  const request2 = parsePlatformRequest(build(createBridgeId()));
  if (!request2) return fail("invalid_request");
  return new Promise((resolve) => {
    const timer = setTimeout(
      () => settle(request2.id, fail("timeout")),
      cap === "fullscreen" ? replyTimeoutMs : confirmTimeoutMs
    );
    pending.set(request2.id, { cap, origin, resolve, timer });
    if (!listening && typeof w.addEventListener === "function") {
      w.addEventListener("message", onShellMessage);
      listening = w;
    }
    if (cap !== "fullscreen") _releasePointer();
    try {
      w.parent.postMessage(request2, origin);
    } catch {
      settle(request2.id, fail("unsupported"));
    }
  });
}
function _releasePointer() {
  try {
    doc()?.exitPointerLock?.();
  } catch {
  }
}
function settle(id, outcome2) {
  const waiting = pending.get(id);
  if (!waiting) return;
  pending.delete(id);
  clearTimeout(waiting.timer);
  waiting.resolve(outcome2);
}
function onShellMessage(event) {
  const w = win();
  if (!w || event.source !== w.parent) return;
  const result = parsePlatformResult(event.data);
  if (!result) return;
  const waiting = pending.get(result.id);
  if (!waiting || event.origin !== waiting.origin) return;
  settle(result.id, result.ok ? { ok: true } : fail(result.code));
}
function supports(feature) {
  try {
    const w = win();
    const d = doc();
    if (!w || !d) return false;
    const nav = w.navigator;
    const where = shell();
    const copy = typeof nav?.clipboard?.writeText === "function" || typeof d.execCommand === "function";
    switch (feature) {
      case "copy":
        return copy;
      case "share": {
        const url = shareUrl(void 0);
        if (!url) return false;
        const sheet = !localTest() && !!nav && typeof nav.share === "function" && canShare(nav, { url });
        return sheet || copy;
      }
      case "awake":
        return where === "app" || typeof nav?.wakeLock?.request === "function";
      case "haptic":
        return where !== "app" && typeof nav?.vibrate === "function";
      case "open":
        return where === "page" ? shellOffers("open") : where !== "app" && typeof w.open === "function";
      case "save":
        return where === "page" ? shellOffers("save") : where !== "app" && typeof w.URL?.createObjectURL === "function";
      case "fullscreen":
        if (where === "app") return false;
        return where === "page" && shellOffers("fullscreen") || fullscreenAllowed(d);
      default:
        return false;
    }
  } catch {
    return false;
  }
}
function _resetPlatform(overrides) {
  for (const waiting of pending.values()) clearTimeout(waiting.timer);
  pending.clear();
  if (listening) {
    try {
      listening.removeEventListener("message", onShellMessage);
    } catch {
    }
  }
  listening = null;
  if (wakeHook) {
    try {
      wakeHook.d.removeEventListener("visibilitychange", wakeHook.onVisibility);
    } catch {
    }
  }
  wakeHook = null;
  wakeWanted = false;
  wakeSentinel = null;
  wakeRequest = null;
  shareParamsWarned = false;
  replyTimeoutMs = overrides?.replyTimeoutMs ?? 3e3;
  confirmTimeoutMs = overrides?.confirmTimeoutMs ?? 18e4;
}

// src/commerce.ts
var cfg = null;
function _initCommerce(c) {
  cfg = c;
}
function must() {
  if (!cfg) throw new Error("genex commerce: call initEmbed() first");
  return cfg;
}
function authHeaders() {
  const token = must().getToken();
  if (!token) throw new Error("genex commerce: no player session");
  return { Authorization: `Bearer ${token}` };
}
async function getShop() {
  const c = must();
  if (c.isLocalTest()) return [];
  const res = await fetch(`${c.apiUrl}/api/coin/catalog`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`genex shop failed (${res.status})`);
  return (await res.json()).items;
}
async function getEntitlements(opts) {
  const c = must();
  if (c.isLocalTest()) return [];
  const qs = opts?.excludeConsumed ? "?excludeConsumed=true" : "";
  const res = await fetch(`${c.apiUrl}/api/coin/entitlements${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`genex entitlements failed (${res.status})`);
  return (await res.json()).items;
}
async function consumeEntitlement(entitlementId) {
  const c = must();
  if (c.isLocalTest()) return { consumed: true, alreadyConsumed: false };
  const res = await fetch(
    `${c.apiUrl}/api/coin/entitlements/${encodeURIComponent(entitlementId)}/consume`,
    { method: "POST", headers: authHeaders() }
  );
  if (!res.ok) throw new Error(`genex consume failed (${res.status})`);
  return await res.json();
}
async function awaitOutcome(intentId, timeoutMs) {
  const c = must();
  const deadline = Date.now() + timeoutMs;
  let delay = 400;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 2e3);
    const res = await fetch(`${c.apiUrl}/api/coin/intents/${encodeURIComponent(intentId)}`, {
      headers: authHeaders()
    }).catch(() => null);
    if (!res || !res.ok) continue;
    const view = await res.json();
    switch (view.status) {
      case "succeeded":
      case "consumed":
        return { status: "succeeded" };
      case "canceled":
        return { status: "canceled" };
      case "expired":
        return { status: "expired" };
      case "failed":
        return { status: "failed", message: "the purchase could not be completed" };
      default:
        break;
    }
  }
  return { status: "expired" };
}
function openConfirmSurface(view, parentOrigin2) {
  const c = must();
  const w = typeof window === "undefined" ? null : window;
  if (!w) return { ok: false, reason: "no_window" };
  if (c.isNative()) return { ok: false, reason: "native_unsupported" };
  if (c.isEmbedded() && w.parent) {
    _releasePointer();
    for (const origin of parentOrigin2 ? [parentOrigin2] : c.dashboardOrigins) {
      try {
        w.parent.postMessage({ type: "genex:commerce:confirm", v: 1, intentId: view.id }, origin);
      } catch {
      }
    }
    return { ok: true };
  }
  const popup = w.open(view.confirmUrl, `genex_confirm_${view.id}`, "popup,width=420,height=640");
  return popup === null ? { ok: false, reason: "popup_blocked" } : { ok: true };
}
async function buy(opts) {
  const c = must();
  if (c.isLocalTest()) {
    return { status: "failed", message: "purchases are unavailable in local test mode" };
  }
  const created = await fetch(`${c.apiUrl}/api/coin/intents`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ skuId: opts.skuId, quantity: opts.quantity ?? 1 })
  });
  if (!created.ok) {
    const body = await created.json().catch(() => ({}));
    return { status: "failed", message: body.error ?? `intent failed (${created.status})` };
  }
  const view = await created.json();
  const opened = openConfirmSurface(view);
  if (!opened.ok) {
    const message = opened.reason === "popup_blocked" ? "the confirmation window was blocked \u2014 tap again to confirm" : opened.reason === "native_unsupported" ? "purchases are not available in the app yet" : "the confirmation window could not be opened";
    return { status: "failed", message };
  }
  return awaitOutcome(view.id, opts.timeoutMs ?? 18e4);
}
async function getPayment(orderId) {
  const c = must();
  if (c.isLocalTest()) return null;
  if (!validOrderId(orderId)) throw new Error("invalid_order_id");
  return readPayment(orderId, 15e3);
}
async function getPayments(opts) {
  const c = must();
  if (c.isLocalTest()) return { payments: [], nextCursor: null };
  const qs = new URLSearchParams();
  if (opts?.cursor !== void 0) qs.set("cursor", opts.cursor);
  if (opts?.limit !== void 0) qs.set("limit", String(opts.limit));
  const query = qs.size ? `?${qs}` : "";
  const res = await fetch(`${c.apiUrl}/api/coin/payments${query}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(15e3)
  });
  if (!res.ok) throw new Error(`genex payments failed (${res.status})`);
  return await res.json();
}
function validOrderId(orderId) {
  return typeof orderId === "string" && orderId.length > 0 && orderId.length <= 128 && orderId !== "." && orderId !== "..";
}
async function readPayment(orderId, timeoutMs) {
  const res = await fetch(`${must().apiUrl}/api/coin/payments/orders/${encodeURIComponent(orderId)}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(Math.max(1, Math.ceil(timeoutMs)))
  });
  if (res.status === 404) {
    const body = await res.json().catch(() => null);
    if (body?.error === "payment_not_found") return null;
  }
  if (!res.ok) throw new Error(`genex payment failed (${res.status})`);
  const payment = await res.json();
  if (payment.orderId !== orderId) throw new Error("invalid_payment_response");
  return payment;
}
function paymentOutcome(payment) {
  switch (payment.status) {
    case "succeeded":
    case "canceled":
    case "expired":
      return { status: payment.status, payment };
    case "failed":
      return {
        status: payment.failureCode === "insufficient_balance" ? "insufficient_balance" : "failed",
        payment,
        message: payment.failureCode ?? "payment_failed"
      };
    default:
      return null;
  }
}
async function awaitPaymentOutcome(payment, deadline) {
  let delay = 400;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, deadline - Date.now())));
    if (Date.now() >= deadline) break;
    delay = Math.min(delay * 1.4, 2e3);
    try {
      const latest = await readPayment(payment.orderId, Math.min(15e3, deadline - Date.now()));
      if (!latest || latest.id !== payment.id) continue;
      payment = latest;
      const result = paymentOutcome(payment);
      if (result) return result;
    } catch {
    }
  }
  return { status: "pending", payment, message: "payment_timeout" };
}
async function requestPayment(opts) {
  const c = must();
  if (c.isLocalTest()) return { status: "failed", message: "payments are unavailable in local test mode" };
  if (c.isNative()) return { status: "failed", message: "payments are not available in the app yet" };
  if (typeof window === "undefined") return { status: "failed", message: "no_window" };
  if (!c.getToken()) return { status: "failed", message: "no_player_session" };
  const parentOrigin2 = c.getParentOrigin();
  if (c.isEmbedded() && (!parentOrigin2 || !c.dashboardOrigins.includes(parentOrigin2))) {
    return { status: "failed", message: "untrusted_parent" };
  }
  if (!validOrderId(opts.orderId)) return { status: "failed", message: "invalid_order_id" };
  const title = typeof opts.title === "string" ? opts.title.trim() : "";
  if (!title || title.length > 80) return { status: "failed", message: "invalid_title" };
  if (opts.description !== void 0 && typeof opts.description !== "string") {
    return { status: "failed", message: "invalid_description" };
  }
  const description = opts.description?.trim();
  if (description && description.length > 1e3) return { status: "failed", message: "invalid_description" };
  if (!Number.isSafeInteger(opts.amountCoins) || opts.amountCoins < 1 || opts.amountCoins > 1e5) {
    return { status: "failed", message: "invalid_amount_coins" };
  }
  const timeoutMs = opts.timeoutMs ?? 18e4;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) {
    return { status: "failed", message: "invalid_timeout" };
  }
  const deadline = Date.now() + timeoutMs;
  let popup = null;
  if (!c.isEmbedded()) {
    try {
      popup = window.open("about:blank", "_blank", "popup,width=420,height=640");
      if (popup) popup.opener = null;
    } catch {
      popup?.close();
      return { status: "failed", message: "popup_blocked" };
    }
    if (!popup) return { status: "failed", message: "popup_blocked" };
  }
  let payment;
  try {
    const created = await fetch(`${c.apiUrl}/api/coin/payments`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: opts.orderId,
        title,
        amountCoins: opts.amountCoins,
        ...description ? { description } : {}
      }),
      signal: AbortSignal.timeout(Math.max(1, Math.ceil(Math.min(15e3, deadline - Date.now()))))
    });
    if (!created.ok) {
      popup?.close();
      const body = await created.json().catch(() => ({}));
      return {
        status: created.status >= 500 ? "pending" : "failed",
        message: body.error ?? `payment_failed_${created.status}`
      };
    }
    const view = await created.json();
    if (view.orderId !== opts.orderId || view.title !== title || view.amountCoins !== opts.amountCoins || view.description !== (description || null) || typeof view.id !== "string") {
      throw new Error("invalid_payment_response");
    }
    const { confirmUrl, ...receipt } = view;
    payment = receipt;
    const result = paymentOutcome(payment);
    if (result) {
      popup?.close();
      return result;
    }
    if (payment.status === "requires_confirmation") {
      const url = new URL(confirmUrl);
      const trustedProtocol = url.protocol === "https:" || url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (!trustedProtocol || !c.dashboardOrigins.includes(url.origin) || url.username || url.password || url.pathname !== `/confirm/${encodeURIComponent(payment.id)}` || url.search || url.hash) {
        popup?.close();
        return { status: "pending", payment, message: "invalid_confirm_url" };
      }
      if (popup) {
        if (!popup.closed) popup.location.href = url.href;
      } else {
        const opened = openConfirmSurface({ id: payment.id, confirmUrl: url.href }, parentOrigin2);
        if (!opened.ok) return { status: "pending", payment, message: opened.reason };
      }
    } else {
      popup?.close();
    }
  } catch (error) {
    popup?.close();
    return { status: "pending", ...payment ? { payment } : {}, message: error instanceof Error ? error.message : "payment_unavailable" };
  }
  return awaitPaymentOutcome(payment, deadline);
}

// src/stream.ts
function createSseParser(onEvent) {
  let buffer = "";
  let data = [];
  let name = "";
  const line = (text) => {
    if (text === "") {
      if (data.length) onEvent({ event: name || "message", data: data.join("\n") });
      data = [];
      name = "";
      return;
    }
    if (text.startsWith(":")) return;
    const colon = text.indexOf(":");
    const field = colon === -1 ? text : text.slice(0, colon);
    let value = colon === -1 ? "" : text.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") data.push(value);
    else if (field === "event") name = value;
  };
  const drain = (final) => {
    for (; ; ) {
      const match = /\r\n|\r|\n/.exec(buffer);
      if (!match) break;
      if (match[0] === "\r" && match.index === buffer.length - 1 && !final) break;
      line(buffer.slice(0, match.index));
      buffer = buffer.slice(match.index + match[0].length);
    }
    if (final) {
      if (buffer) line(buffer);
      buffer = "";
      line("");
    }
  };
  return {
    push(text) {
      buffer += text;
      drain(false);
    },
    end() {
      drain(true);
    }
  };
}
function firstStringProperty(schema) {
  if (!schema || typeof schema !== "object") return void 0;
  const properties = schema.properties;
  if (schema.type !== "object" || !properties || typeof properties !== "object" || Array.isArray(properties)) return void 0;
  for (const [name, child] of Object.entries(properties)) {
    if (child && typeof child === "object" && child.type === "string") return name;
  }
  return void 0;
}
var ESCAPES = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "	" };
function readString(text, start) {
  let value = "";
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') return { value, end: i + 1, complete: true };
    if (c !== "\\") {
      value += c;
      i++;
      continue;
    }
    const next = text[i + 1];
    if (next === void 0) break;
    if (next === "u") {
      const hex = text.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) return { value: withoutHalfPair(value), end: text.length, complete: false };
      value += String.fromCharCode(parseInt(hex, 16));
      i += 6;
      continue;
    }
    value += ESCAPES[next] ?? next;
    i += 2;
  }
  return { value: withoutHalfPair(value), end: text.length, complete: false };
}
function withoutHalfPair(value) {
  return /[\uD800-\uDBFF]$/.test(value) ? value.slice(0, -1) : value;
}
function partialStringField(text, name) {
  let i = 0;
  const skip = () => {
    while (i < text.length && /\s/.test(text[i])) i++;
  };
  skip();
  if (text[i] !== "{") return void 0;
  i++;
  let depth = 1;
  let expectKey = true;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      const read = readString(text, i);
      if (depth === 1 && expectKey) {
        if (!read.complete) return void 0;
        i = read.end;
        skip();
        if (text[i] !== ":") return void 0;
        i++;
        skip();
        expectKey = false;
        if (read.value !== name) continue;
        if (text[i] !== '"') return void 0;
        return readString(text, i).value;
      }
      if (!read.complete) return void 0;
      i = read.end;
      continue;
    }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return void 0;
    } else if (c === "," && depth === 1) expectKey = true;
    i++;
  }
  return void 0;
}

// src/generation.ts
var config = null;
function _initGeneration(value) {
  config = value;
}
function must2() {
  if (!config) throw new Error("genex generation: call initEmbed() first");
  return config;
}
async function request(path, body) {
  const c = must2();
  const token = c.getToken();
  if (!token) throw new Error("no_player_session");
  const response = await fetch(`${c.apiUrl}/api/runtime${path}`, {
    method: body === void 0 ? "GET" : "POST",
    credentials: "omit",
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, ...body === void 0 ? {} : { "Content-Type": "application/json" } },
    ...body === void 0 ? {} : { body: JSON.stringify(body) }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof result.error === "string" ? result.error : "generation_unavailable");
    error.status = response.status;
    throw error;
  }
  return result;
}
function validEstimateCoins(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 1e6;
}
function ceilingField(options) {
  const credits = options.maxCredits, coins = options.estimateCoins;
  if (credits !== void 0 && !validEstimateCoins(credits)) return { error: "invalid_max_credits" };
  if (coins !== void 0 && !validEstimateCoins(coins)) return { error: "invalid_estimate_coins" };
  if (credits === void 0 && coins === void 0) return { error: "invalid_max_credits" };
  if (credits !== void 0 && coins !== void 0 && credits !== coins) return { error: "invalid_max_credits" };
  return { field: credits !== void 0 ? { maxCredits: credits } : { estimateCoins: coins } };
}
function validMaxOutputTokens(value) {
  return value === void 0 || Number.isSafeInteger(value) && value >= 1;
}
var GENERATION_WAIT_MS = 12e5;
function getGenerationModels() {
  return request("/models");
}
function isWorkflowIdentifier(value) {
  return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,120}$/.test(value) && value !== "." && value !== "..";
}
function getWorkflowOfferings(workflowId) {
  if (!isWorkflowIdentifier(workflowId)) return Promise.reject(new Error("invalid_workflow_id"));
  return request(`/workflows/${encodeURIComponent(workflowId)}/offerings`);
}
function getGeneration(generationId) {
  if (!isGenerationId(generationId)) return Promise.reject(new Error("invalid_generation_id"));
  return request(`/generations/${encodeURIComponent(generationId)}`);
}
function outcome(view) {
  if (!isGenerationTerminal(view.status)) return void 0;
  return {
    status: view.status,
    generationId: view.id,
    ...billingReceipt(view),
    ...view.status === "succeeded" ? {
      output: view.output,
      source: view.source,
      ...view.modelProvenance ? { modelProvenance: view.modelProvenance } : {}
    } : {},
    ...view.error ? { error: view.error } : {}
  };
}
function billingReceipt(view) {
  return {
    ...view.billingStatus !== void 0 ? { billingStatus: view.billingStatus } : {},
    ...view.currency !== void 0 ? { currency: view.currency } : {},
    ...view.maxCredits !== void 0 ? { maxCredits: view.maxCredits } : {},
    ...view.reservedCredits !== void 0 ? { reservedCredits: view.reservedCredits } : {},
    ...view.chargedCredits !== void 0 ? { chargedCredits: view.chargedCredits } : {},
    ...view.reservedCoins !== void 0 ? { reservedCoins: view.reservedCoins } : {},
    ...view.reservedDisplayUsdCents !== void 0 ? { reservedDisplayUsdCents: view.reservedDisplayUsdCents } : {},
    ...view.chargedCoins !== void 0 ? { chargedCoins: view.chargedCoins } : {},
    ...view.chargedDisplayUsdCents !== void 0 ? { chargedDisplayUsdCents: view.chargedDisplayUsdCents } : {}
  };
}
function authorizationOutcome(view) {
  if (["queued", "dispatching", "awaiting_external", "succeeded"].includes(view.status)) {
    return { status: "authorized", generationId: view.id, ...billingReceipt(view), ...view.funding ? { funding: view.funding } : {} };
  }
  if (!isGenerationTerminal(view.status)) return void 0;
  return {
    status: view.status === "canceled" || view.status === "expired" ? view.status : "failed",
    generationId: view.id,
    ...billingReceipt(view),
    ...view.error ? { error: view.error } : view.status === "unknown" ? { error: "unknown_execution" } : {}
  };
}
async function poll(generationId, timeoutMs, readOutcome, popup) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const view = await getGeneration(generationId);
      const result = readOutcome(view);
      if (result) return result;
      if (popup?.closed && view.status === "requires_confirmation") {
        const canceled = await request(`/generations/${generationId}/cancel`, {});
        const cancelResult = readOutcome(canceled);
        if (cancelResult) return cancelResult;
      }
    } catch {
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return { status: "pending", generationId, error: "wait_timeout" };
}
function waitForGeneration(generationId, timeoutMs = GENERATION_WAIT_MS) {
  if (!isGenerationId(generationId)) return Promise.resolve({ status: "failed", error: "invalid_generation_id" });
  return poll(generationId, timeoutMs, outcome);
}
async function generate(options) {
  const ceiling = ceilingField(options);
  if ("error" in ceiling) return { status: "failed", error: ceiling.error };
  if (!validMaxOutputTokens(options.maxOutputTokens)) return { status: "failed", error: "invalid_max_output_tokens" };
  const { timeoutMs, idempotencyKey, grantId, maxCredits: _credits, estimateCoins: _coins, ...rest } = options;
  const input = { ...rest, ...ceiling.field };
  if (grantId !== void 0) return generateUnderGrant(grantId, input, idempotencyKey, timeoutMs ?? GENERATION_WAIT_MS);
  return startGeneration(
    "/generations",
    { ...input, idempotencyKey },
    timeoutMs ?? GENERATION_WAIT_MS,
    outcome
  );
}
async function requestWorkflow(options) {
  const ceiling = ceilingField(options);
  if ("error" in ceiling) return { status: "failed", error: ceiling.error };
  if (!isWorkflowIdentifier(options.workflowId)) return { status: "failed", error: "invalid_workflow_id" };
  if (!isWorkflowIdentifier(options.offeringId)) return { status: "failed", error: "invalid_offering_id" };
  return startGeneration(`/workflows/${encodeURIComponent(options.workflowId)}/requests`, {
    offeringId: options.offeringId,
    input: options.input,
    ...ceiling.field,
    ...options.allowExternal !== void 0 ? { allowExternal: options.allowExternal } : {},
    idempotencyKey: options.idempotencyKey
  }, options.timeoutMs ?? 6e5, authorizationOutcome, options);
}
async function resumeWorkflow(generationId, options = {}) {
  if (!isGenerationId(generationId)) return { status: "failed", error: "invalid_generation_id" };
  return startGeneration("", {}, options.timeoutMs ?? 6e5, authorizationOutcome, void 0, generationId);
}
function approvalGuards() {
  const c = must2();
  if (c.isLocalTest()) return { status: "failed", error: "local_test_unsupported" };
  if (c.isNative()) return { status: "failed", error: "native_unsupported" };
  if (typeof window === "undefined") return { status: "failed", error: "no_window" };
  if (!c.getToken()) return { status: "failed", error: "no_player_session" };
  const parentOrigin2 = c.getParentOrigin();
  if (c.isEmbedded() && (!parentOrigin2 || !c.dashboardOrigins.includes(parentOrigin2))) {
    return { status: "failed", error: "untrusted_parent" };
  }
  return { parentOrigin: parentOrigin2 };
}
function reserveApprovalSurface(placeholder) {
  const guarded = approvalGuards();
  if ("status" in guarded) return guarded;
  const c = must2();
  if (c.isEmbedded()) return { popup: null, parentOrigin: guarded.parentOrigin };
  let dashboard;
  try {
    dashboard = new URL(c.dashboardOrigins[0]);
    if (dashboard.protocol !== "https:" && !(dashboard.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(dashboard.hostname))) throw new Error();
  } catch {
    return { status: "failed", error: "invalid_dashboard_origin" };
  }
  const popup = window.open(`${dashboard.origin}${placeholder}`, "_blank", "popup,width=480,height=760");
  if (!popup) return { status: "failed", error: "popup_blocked" };
  try {
    popup.opener = null;
  } catch {
  }
  return { popup, dashboard, parentOrigin: guarded.parentOrigin };
}
async function startGeneration(path, body, timeoutMs, readOutcome, workflow, resumeId) {
  const surface = reserveApprovalSurface("/play/generate");
  if ("status" in surface) return surface;
  const { popup, dashboard, parentOrigin: parentOrigin2 } = surface;
  try {
    const view = resumeId ? await getGeneration(resumeId) : await request(path, { ...body, idempotencyKey: body.idempotencyKey ?? crypto.randomUUID() });
    if (resumeId && (view.id !== resumeId || view.kind !== "workflow")) throw new Error("invalid_generation_response");
    if (!isGenerationId(view.id) || workflow && (view.kind !== "workflow" || view.workflow?.id !== workflow.workflowId || view.workflow.offeringId !== workflow.offeringId)) {
      throw new Error("invalid_generation_response");
    }
    const result = readOutcome(view);
    const needsReceipt = view.billingStatus === "pending" || view.quote?.billingPolicy !== void 0 && ((view.chargedCoins ?? 0) > 0 || (view.chargedCredits ?? 0) > 0);
    if (result && result.status !== "authorized" && !needsReceipt) {
      popup?.close();
      return result;
    }
    if (popup && dashboard) {
      if (!popup.closed) popup.location.href = `${dashboard.origin}/play/generate/${encodeURIComponent(view.id)}`;
    } else if (parentOrigin2) {
      _releasePointer();
      window.parent.postMessage({ type: "genex:generation:confirm", v: 1, generationId: view.id }, parentOrigin2);
    }
    if (result) return result;
    return poll(view.id, timeoutMs, readOutcome, popup);
  } catch (error) {
    popup?.close();
    return { status: "failed", error: error instanceof Error ? error.message : "generation_unavailable" };
  }
}
var LIVE_GRANT_STATUSES = ["active", "suspended_insufficient_funds", "waiting_for_plan"];
function isGrantId(value) {
  return isGenerationId(value);
}
function validCount(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}
function invalidGrantOptions(options) {
  const judge2 = options.judge;
  if (judge2 !== void 0 && (typeof judge2 !== "object" || judge2 === null || typeof judge2.enabled !== "boolean" || !validCount(judge2.estimatedCallsPerPeriod, 1, 1e5))) return "invalid_judge_terms";
  if (!Array.isArray(options.models) || options.models.length < (judge2?.enabled ? 0 : 1) || options.models.length > 8 || options.models.some((id) => typeof id !== "string" || !id || id.length > 150) || new Set(options.models).size !== options.models.length) return "invalid_models";
  const max = options.perCallMaxCredits ?? options.perCallMaxCoins;
  const estimate = options.perCallEstimateCredits ?? options.perCallEstimateCoins;
  if (!validCount(max, 1, 1e6) || estimate !== void 0 && (!validCount(estimate, 1, 1e6) || estimate > max) || options.perCallMaxCredits !== void 0 && options.perCallMaxCoins !== void 0 && options.perCallMaxCredits !== options.perCallMaxCoins || options.perCallEstimateCredits !== void 0 && options.perCallEstimateCoins !== void 0 && options.perCallEstimateCredits !== options.perCallEstimateCoins) return "invalid_declared_price";
  const d = options.disclosure;
  const perPeriod = d && typeof d === "object" ? d.estimatedCreditsPerPeriod ?? d.estimatedCoinsPerPeriod : void 0;
  if (!d || typeof d !== "object" || !["minute", "hour", "session"].includes(d.periodLabel) || !validCount(d.estimatedCallsPerPeriod, 1, 1e4) || !validCount(perPeriod, 0, 1e6)) return "invalid_disclosure";
  if (options.maxConcurrent !== void 0 && !validCount(options.maxConcurrent, 1, 8)) return "invalid_grant_terms";
  if (options.maxCallsPerMinute !== void 0 && !validCount(options.maxCallsPerMinute, 1, 120)) return "invalid_grant_terms";
  if (options.maxPendingExternal !== void 0 && !validCount(options.maxPendingExternal, 1, 8)) return "invalid_grant_terms";
  if (options.allowExternal !== void 0 && typeof options.allowExternal !== "boolean") return "invalid_grant_terms";
  if (options.idempotencyKey !== void 0 && (typeof options.idempotencyKey !== "string" || options.idempotencyKey.length < 8 || options.idempotencyKey.length > 100)) return "invalid_idempotency_key";
  return void 0;
}
function grantOutcome(view) {
  if (LIVE_GRANT_STATUSES.includes(view.status)) return { status: "active", grantId: view.id, grant: view };
  switch (view.status) {
    // The player closing the sheet, or stopping later, is a normal outcome —
    // whatever reason the server recorded for the stop.
    case "stopped":
      return { status: "canceled", grantId: view.id, grant: view };
    case "expired":
      return { status: "expired", grantId: view.id, grant: view };
    // Spent out before it could serve this caller — a real answer, with the
    // same code a call under an exhausted budget reports.
    case "exhausted":
      return { status: "failed", grantId: view.id, grant: view, error: "grant_limit_reached" };
    default:
      return void 0;
  }
}
function getSpendGrant(grantId) {
  if (!isGrantId(grantId)) return Promise.reject(new Error("invalid_grant_id"));
  return request(`/grants/${encodeURIComponent(grantId)}`);
}
async function getActiveSpendGrant() {
  try {
    const view = await request("/grants/current");
    if (!isGrantId(view.id)) throw new Error("invalid_grant_response");
    return view;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}
function stopSpendGrant(grantId) {
  if (!isGrantId(grantId)) return Promise.reject(new Error("invalid_grant_id"));
  return request(`/grants/${encodeURIComponent(grantId)}/stop`, {});
}
async function pollGrant(grantId, timeoutMs, popup) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const view = await getSpendGrant(grantId);
      const result = grantOutcome(view);
      if (result) return result;
      if (popup?.closed && view.status === "requires_confirmation") {
        const stopped = await request(`/grants/${encodeURIComponent(grantId)}/stop`, {});
        const stopResult = grantOutcome(stopped);
        if (stopResult) return stopResult;
      }
    } catch {
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  return { status: "pending", grantId, error: "wait_timeout" };
}
async function requestSpendGrant(options) {
  const invalid = invalidGrantOptions(options);
  if (invalid) return { status: "failed", error: invalid };
  const surface = reserveApprovalSurface("/play/grant");
  if ("status" in surface) return surface;
  const { popup, dashboard, parentOrigin: parentOrigin2 } = surface;
  try {
    const estimate = options.perCallEstimateCredits ?? options.perCallEstimateCoins;
    const view = await request("/grants", {
      idempotencyKey: options.idempotencyKey ?? crypto.randomUUID(),
      models: options.models,
      perCallMaxCredits: options.perCallMaxCredits ?? options.perCallMaxCoins,
      ...estimate !== void 0 ? { perCallEstimateCredits: estimate } : {},
      disclosure: {
        periodLabel: options.disclosure.periodLabel,
        estimatedCallsPerPeriod: options.disclosure.estimatedCallsPerPeriod,
        estimatedCreditsPerPeriod: options.disclosure.estimatedCreditsPerPeriod ?? options.disclosure.estimatedCoinsPerPeriod
      },
      ...options.maxConcurrent !== void 0 ? { maxConcurrent: options.maxConcurrent } : {},
      ...options.maxCallsPerMinute !== void 0 ? { maxCallsPerMinute: options.maxCallsPerMinute } : {},
      ...options.maxPendingExternal !== void 0 ? { maxPendingExternal: options.maxPendingExternal } : {},
      ...options.allowExternal !== void 0 ? { allowExternal: options.allowExternal } : {},
      ...options.judge !== void 0 ? { judge: { enabled: options.judge.enabled, estimatedCallsPerPeriod: options.judge.estimatedCallsPerPeriod } } : {}
    });
    if (!isGrantId(view.id)) throw new Error("invalid_grant_response");
    const settled2 = grantOutcome(view);
    if (settled2) {
      popup?.close();
      return settled2;
    }
    if (popup && dashboard) {
      if (!popup.closed) popup.location.href = `${dashboard.origin}/play/grant/${encodeURIComponent(view.id)}`;
    } else if (parentOrigin2) {
      _releasePointer();
      window.parent.postMessage({ type: "genex:grant:confirm", v: 1, grantId: view.id }, parentOrigin2);
    }
    return pollGrant(view.id, options.timeoutMs ?? 6e5, popup);
  } catch (error) {
    popup?.close();
    return { status: "failed", error: error instanceof Error ? error.message : "grant_unavailable" };
  }
}
async function generateUnderGrant(grantId, input, idempotencyKey, timeoutMs) {
  if (!isGrantId(grantId)) return { status: "failed", error: "invalid_grant_id" };
  const guarded = approvalGuards();
  if ("status" in guarded) return guarded;
  const { allowExternal: _unused, ...body } = input;
  try {
    const view = await request(
      `/grants/${encodeURIComponent(grantId)}/generations`,
      { ...body, idempotencyKey: idempotencyKey ?? crypto.randomUUID() }
    );
    if (!isGenerationId(view.id) || view.grantId !== grantId) throw new Error("invalid_generation_response");
    const result = outcome(view);
    if (result) return result;
    return poll(view.id, timeoutMs, outcome);
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "generation_unavailable" };
  }
}
async function generateStream(options) {
  const ceiling = ceilingField(options);
  if ("error" in ceiling) return { status: "failed", error: ceiling.error };
  if (!validMaxOutputTokens(options.maxOutputTokens)) return { status: "failed", error: "invalid_max_output_tokens" };
  const { timeoutMs, idempotencyKey, grantId, onDelta, onPartialField, signal, allowExternal: _unused, maxCredits: _credits, estimateCoins: _coins, ...rest } = options;
  const body = { ...rest, ...ceiling.field };
  if (grantId === void 0 || grantId === null) return { status: "failed", error: "stream_requires_grant" };
  if (!isGrantId(grantId)) return { status: "failed", error: "invalid_grant_id" };
  const guarded = approvalGuards();
  if ("status" in guarded) return guarded;
  const c = must2();
  const field = body.outputFormat === "json" && onPartialField ? firstStringProperty(body.schema) : void 0;
  let generationId;
  let soFar = "";
  let shown;
  const showField = (value) => {
    if (!field || value === shown) return;
    shown = value;
    try {
      onPartialField(field, value);
    } catch {
    }
  };
  const deliver = (text) => {
    soFar += text;
    try {
      onDelta?.(text, soFar);
    } catch {
    }
    if (field) {
      const partial = partialStringField(soFar, field);
      if (partial !== void 0) showField(partial);
    }
  };
  const finish = (result) => {
    if (result.status === "succeeded") {
      const output = result.output;
      if (typeof output === "string" && output.startsWith(soFar) && output.length > soFar.length) deliver(output.slice(soFar.length));
      else if (field && output && typeof output === "object" && typeof output[field] === "string") showField(output[field]);
    }
    return result;
  };
  const aborted = () => ({ status: "pending", ...generationId ? { generationId } : {}, error: "stream_aborted" });
  try {
    const token = c.getToken();
    if (!token) return { status: "failed", error: "no_player_session" };
    const response = await fetch(`${c.apiUrl}/api/runtime/grants/${encodeURIComponent(grantId)}/generations/stream`, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ ...body, idempotencyKey: idempotencyKey ?? crypto.randomUUID() }),
      ...signal ? { signal } : {}
    });
    if (!response.ok) {
      const refusal = await response.json().catch(() => ({}));
      return { status: "failed", error: typeof refusal.error === "string" ? refusal.error : "generation_unavailable" };
    }
    if (!response.body || !(response.headers.get("content-type") ?? "").includes("text/event-stream")) throw new Error("invalid_generation_response");
    let done;
    const parser = createSseParser(({ event, data }) => {
      const parsed = parseGenerationStreamEvent(event, data);
      if (!parsed || done) return;
      if (parsed.event === "start") generationId ??= parsed.data.generationId;
      else if (parsed.event === "delta") deliver(parsed.data.text);
      else done = parsed.data;
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    try {
      for (; ; ) {
        const { value, done: ended } = await reader.read();
        if (ended) break;
        parser.push(decoder.decode(value, { stream: true }));
        if (done) {
          reader.cancel().catch(() => {
          });
          break;
        }
      }
      if (!done) {
        parser.push(decoder.decode());
        parser.end();
      }
    } catch {
      if (signal?.aborted) return aborted();
    }
    if (signal?.aborted) return aborted();
    if (done) {
      const view = done;
      if (!isGenerationId(view.id) || view.grantId !== grantId || generationId !== void 0 && view.id !== generationId) throw new Error("invalid_generation_response");
      return finish(outcome(view) ?? await poll(view.id, timeoutMs ?? GENERATION_WAIT_MS, outcome));
    }
    if (generationId) return finish(await poll(generationId, timeoutMs ?? GENERATION_WAIT_MS, outcome));
    return { status: "failed", error: "generation_unavailable" };
  } catch (error) {
    if (signal?.aborted) return aborted();
    return { status: "failed", error: error instanceof Error ? error.message : "generation_unavailable" };
  }
}
var JUDGE_QUESTION_NAME = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
function invalidJudgeOptions(options) {
  if (options.grantId === void 0 || options.grantId === null) return "judge_requires_grant";
  if (!isGrantId(options.grantId)) return "invalid_grant_id";
  if (options.state === void 0) return "invalid_request";
  const questions = options.questions;
  if (!questions || typeof questions !== "object" || Array.isArray(questions)) return "invalid_request";
  const names = Object.keys(questions);
  if (names.length < 1 || names.length > 64 || names.some((name) => !JUDGE_QUESTION_NAME.test(name))) return "invalid_request";
  if (names.some((name) => !["choice", "score", "noul"].includes(questions[name]?.type))) return "invalid_request";
  if (options.timeoutMs !== void 0 && !validCount(options.timeoutMs, 1e3, 2e4)) return "invalid_timeout";
  if (options.idempotencyKey !== void 0 && (typeof options.idempotencyKey !== "string" || options.idempotencyKey.length < 8 || options.idempotencyKey.length > 100)) return "invalid_idempotency_key";
  return void 0;
}
function judgeOutcome(view) {
  if (!isGenerationTerminal(view.status)) return void 0;
  return {
    status: view.status === "expired" ? "failed" : view.status,
    generationId: view.id,
    ...view.status === "succeeded" ? { answers: view.output } : {},
    ...view.error ? { error: view.error } : {}
  };
}
async function judge(options) {
  const invalid = invalidJudgeOptions(options);
  if (invalid) return { status: "failed", error: invalid };
  const guarded = approvalGuards();
  if ("status" in guarded) return guarded;
  try {
    const view = await request(`/grants/${encodeURIComponent(options.grantId)}/judgments`, {
      idempotencyKey: options.idempotencyKey ?? crypto.randomUUID(),
      state: options.state,
      questions: options.questions,
      ...options.timeoutMs !== void 0 ? { timeoutMs: options.timeoutMs } : {}
    });
    if (!isGenerationId(view.generationId) || view.grantId !== options.grantId) throw new Error("invalid_judgment_response");
    if (view.status === "dispatching") {
      const settled2 = await poll(view.generationId, (options.timeoutMs ?? 2e4) + 1e4, judgeOutcome);
      return settled2.status === "pending" ? { ...settled2, billing: view.billing } : settled2;
    }
    return {
      status: view.status,
      generationId: view.generationId,
      billing: view.billing,
      ...view.answers ? { answers: view.answers } : {},
      ...view.error ? { error: view.error } : {}
    };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "judge_unavailable" };
  }
}
function generationErrorMessage(code) {
  switch (code) {
    // --- the outcome is not known yet. Never a failure sentence. ------------
    case "unknown":
    case "unknown_execution":
    case "provider_outcome_unknown":
      return "We don\u2019t know how this one ended yet \u2014 it is still being settled. Check back in a moment.";
    case "wait_timeout":
      return "This is taking longer than usual. It is still running \u2014 check back in a moment.";
    // --- the player's credits -----------------------------------------------
    case "insufficient_credits":
      return "You don\u2019t have enough Genex credits for this request. Top up on Genex and try again.";
    case "credits_unverified":
      return "Verify your email on Genex to use your credits here.";
    case "generation_paused":
      return "Genex has paused generation for now. Try again later.";
    case "payer_busy":
      return "Genex is busy with your account for a moment. Try again shortly.";
    case "insufficient_balance":
      return "There isn\u2019t enough in your Genex wallet for this request.";
    case "grant_insufficient_funds":
      return "Your budget paused because your Genex credits ran low. Top them up and it picks up again.";
    // --- standing budgets ---------------------------------------------------
    case "grant_limit_reached":
      return "This budget has reached the limit you set. Set up a new one to keep going.";
    case "grant_stopped":
      return "This budget was stopped. Set up a new one to keep going.";
    case "grant_expired":
      return "This budget has ended. Set up a new one to keep going.";
    case "grant_not_active":
    case "grant_not_found":
      return "There is no budget running for this. Set one up to keep going.";
    case "grant_price_unreasonable":
      return "This asked to charge more for one request than your approval allows, so nothing was charged.";
    case "grant_concurrency":
      return "As many requests are running as your budget allows at once. Wait for one to finish.";
    case "grant_rate_limited":
      return "Requests are coming too quickly for this budget. Wait a moment and try again.";
    case "grant_already_active":
      return "A budget is already running here. Stop it on Genex before setting up another.";
    case "external_grant_active":
      return "A budget on your own plan is already running. Stop it on Genex before setting up another.";
    case "invalid_grant_limit":
      return "That limit is outside the range Genex offers. Choose one on the slider.";
    // --- the judge ------------------------------------------------------------
    case "judge_requires_grant":
      return "This game\u2019s quick checks run under a budget you approve. Set one up to keep going.";
    case "judge_not_enabled":
      return "This budget doesn\u2019t cover the game\u2019s quick checks. Set up a new one to keep going.";
    case "judge_requires_coins":
    case "judge_requires_credits":
      return "The game\u2019s quick checks are paid from your Genex credits, not your own plan.";
    case "invalid_judge_terms":
      return "This budget request isn\u2019t valid, so nothing was requested.";
    case "judge_period_limit":
      return "The game\u2019s quick checks have reached the most your budget allows for now. They pick up again shortly.";
    case "judge_busy":
      return "The game\u2019s quick checks are busy right now. Try again in a moment.";
    case "judge_paused":
      return "The game\u2019s quick checks are paused for now. Try again later.";
    // --- streamed replies -----------------------------------------------------
    case "stream_requires_grant":
      return "Live replies run under a budget you approve. Set one up to keep going.";
    case "stream_aborted":
      return "This reply stopped showing, but it is still finishing and is charged as usual. Check back in a moment.";
    case "waiting_for_plan":
      return "Your own plan is at its rate limit right now. This resumes on its own once the limit resets.";
    // --- personal plans and the player watcher ------------------------------
    case "external_request_active":
      return "Finish your current request on your own plan before starting another.";
    case "external_not_allowed":
      return "This game only generates through Genex.";
    case "external_unavailable":
      return "Your own plan can\u2019t answer this right now.";
    case "player_update_required":
      return "The Genex player watcher on your computer is out of date. Update it and try again.";
    // --- approval, identity and the trusted surface -------------------------
    case "popup_blocked":
      return "Your browser blocked the Genex approval window. Allow pop-ups for this page and try again.";
    case "no_player_session":
    case "unauthorized":
    case "guest_no_wallet":
      return "Sign in to Genex to use this.";
    // ONE code for a guest anywhere and for anybody but the owner on a TEST
    // build (`genex preview`), so the sentence has to be true for both.
    case "player_wallet_required":
      return "Sign in to Genex to use this. Only the game\u2019s owner can use this on a test build.";
    case "session_revoked":
      return "Your Genex session ended. Sign in again to continue.";
    case "untrusted_parent":
    case "invalid_dashboard_origin":
    case "forbidden_origin":
    case "credential_scope":
      return "This page can\u2019t reach Genex safely, so nothing was requested.";
    case "native_unsupported":
      return "In-game generation isn\u2019t available in the app yet.";
    case "local_test_unsupported":
      return "In-game generation doesn\u2019t run in local test mode.";
    case "staging_no_generation":
      return "Only the game\u2019s owner can use this on a test build.";
    // --- quotes and terms ---------------------------------------------------
    case "quote_expired":
    case "generation_expired":
    case "expired":
      return "This request expired before it was approved. Try again.";
    case "quote_changed":
    case "quote_mismatch":
    case "offering_changed":
      return "The price changed. Start this again to see the new offer.";
    case "billing_policy_mismatch":
    case "billing_policy_required":
    case "billing_policy_unsupported":
      return "These terms need a fresh review on Genex. Reload the page and try again.";
    case "funding_mismatch":
    case "funding_conflict":
      return "That payment option doesn\u2019t match this request. Start it again.";
    case "invalid_declared_price":
    case "invalid_estimate_coins":
    case "invalid_max_credits":
      return "This request\u2019s spending limit isn\u2019t valid, so nothing was charged.";
    // --- what the game asked for --------------------------------------------
    case "model_not_allowed":
      return "This budget doesn\u2019t cover that model. Choose one it does.";
    case "model_not_available":
    case "offering_unavailable":
    case "workflow_unavailable":
    case "runtime_models_unavailable":
      return "That model isn\u2019t available here. Choose another.";
    case "provider_budget_insufficient":
    case "estimate_exceeds_provider_budget":
      return "This request is too large for its approved budget. Make it smaller and try again.";
    case "provider_budget_exceeded":
    case "provider_budget_exhausted":
    case "workflow_provider_budget_exhausted":
    case "budget_exhausted":
    case "budget_limit":
    case "runtime_budget_exhausted":
    case "provider_token_limit":
      return "The model ran out of room before a usable answer was ready. The attempt is still charged.";
    case "request_too_large":
    case "prompt_too_large":
    case "schema_too_large":
      return "That request is too long. Shorten it and try again.";
    case "output_tokens_too_large":
      return "This request asks for a longer answer than Genex allows. Ask for a shorter one.";
    case "invalid_request":
    case "invalid_schema":
    case "invalid_max_output_tokens":
      return "This request wasn\u2019t something Genex could accept.";
    case "generation_limit":
      return "As many requests are running as Genex allows at once. Wait for one to finish.";
    case "generation_not_found":
      return "That request no longer exists.";
    case "idempotency_conflict":
      return "That request was already started with different details.";
    // --- the result -----------------------------------------------------------
    case "rejected":
    case "invalid_output":
    case "validation_failed":
    case "invalid_provider_response":
      return "The answer didn\u2019t match what this game asked for.";
    // TWO DIFFERENT ENDINGS, and the difference is money. A budget that was
    // stopped, expired or revoked cancels what it admitted but never
    // dispatched, at zero cost — that is the one case where "before it ran" is
    // true. A `canceled` row that carries this code instead comes from the
    // cancel door closing on work already dispatched, or a workflow stopped
    // after steps ran: a fixed-price attempt is charged in full and a metered
    // one is charged for what it consumed. Denying the charge in the sentence a
    // game shows was the SDK telling the player the opposite of their receipt.
    case "player_stopped":
    case "game_stopped":
    case "operator_stopped":
      return "This request was stopped before it ran, so nothing was charged for it.";
    case "admission_revoked":
    case "canceled":
      return "This request was stopped. Work that had already started is still charged.";
    case "account_erased":
      return "This request was stopped because the account was erased.";
    case "provider_failed":
    case "provider_unavailable":
    case "provider_response_unavailable":
    case "provider_response_too_large":
    case "context_unavailable":
      return "The model couldn\u2019t finish this request.";
    default:
      return "Generation isn\u2019t available right now. Try again in a moment.";
  }
}

// src/index.ts
var PROTOCOL_VERSION = 1;
var RETRY_FLAG = "genex:embed:retry";
var POPOVER_DISMISSED_FLAG = "genex:guest:popover-dismissed";
var LOCAL_AUTH_FLAG = "genex:embed:local-auth";
var ENTRY_REFERRER_MEMO = "genex:embed:entry-referrer";
var ENTRY_REFERRER_NONE = "none";
var PLAYER_ID_KEY = "genex:player";
var SDK_VERSION = "0.33.0";
var config2 = null;
var state = "pending";
var user = null;
var localTestMode = false;
var nativeEntry = null;
var nativeReauthPending = false;
var nativeReauthTimer;
var heartbeatTimer;
var nativeBootAt = 0;
var embedToken;
var colyseusUrls;
var parentOrigin = null;
var shellCaps = [];
var initialized = false;
var redeeming = false;
var requestingGuest = false;
var identityEpoch = 0;
var handshakeTimeoutMs = 1e4;
var standaloneWatchdogGraceMs = 2e3;
var refreshDelayMs = 10 * 6e4;
var refreshRetryMs = 6e4;
var overlayTextDelayMs = 500;
var nativeReauthTimeoutMs = 3e4;
var heartbeatIntervalMs = 3e4;
var handshakeTimer;
var refreshTimer;
var unattendedWaiterTimer;
var earlyWaiterWarned = false;
var messageHandler;
var entrySnapshot = null;
var closingListeners = /* @__PURE__ */ new Set();
var closingHooks = null;
var closingFired = false;
var listeners = /* @__PURE__ */ new Map();
var authWaiters = [];
var playerWaiters = [];
var overlayEl = null;
var popoverEl = null;
var popoverMinimizeTimer;
var pendingPlayerSave;
var hasPendingPlayerSave = false;
var pendingScores = /* @__PURE__ */ new Map();
function win2() {
  return globalThis.window;
}
function doc2() {
  return globalThis.document;
}
function doFetch(input, init, timeoutMs) {
  let signal;
  if (timeoutMs !== void 0) {
    try {
      const ctor = globalThis.AbortSignal;
      if (ctor && typeof ctor.timeout === "function") signal = ctor.timeout(timeoutMs);
    } catch {
    }
  }
  return globalThis.fetch(input, signal ? { ...init, signal } : init);
}
function readRetryFlag() {
  try {
    return win2()?.sessionStorage?.getItem(RETRY_FLAG) === "1";
  } catch {
    return false;
  }
}
function writeRetryFlag() {
  try {
    win2()?.sessionStorage?.setItem(RETRY_FLAG, "1");
  } catch {
  }
}
function clearRetryFlag() {
  try {
    win2()?.sessionStorage?.removeItem(RETRY_FLAG);
  } catch {
  }
}
function readLocalAuthFlag() {
  try {
    return win2()?.sessionStorage?.getItem(LOCAL_AUTH_FLAG) === "1";
  } catch {
    return false;
  }
}
function writeLocalAuthFlag() {
  try {
    win2()?.sessionStorage?.setItem(LOCAL_AUTH_FLAG, "1");
  } catch {
  }
}
function readEntryReferrerMemo() {
  try {
    const stored = win2()?.sessionStorage?.getItem(ENTRY_REFERRER_MEMO);
    if (stored === null || stored === void 0) return void 0;
    return sanitizeEntryReferrer(stored);
  } catch {
    return void 0;
  }
}
function writeEntryReferrerMemo(referrer) {
  try {
    win2()?.sessionStorage?.setItem(ENTRY_REFERRER_MEMO, referrer ?? ENTRY_REFERRER_NONE);
  } catch {
  }
}
function readPopoverDismissed() {
  try {
    return win2()?.sessionStorage?.getItem(POPOVER_DISMISSED_FLAG) === "1";
  } catch {
    return false;
  }
}
function writePopoverDismissed() {
  try {
    win2()?.sessionStorage?.setItem(POPOVER_DISMISSED_FLAG, "1");
  } catch {
  }
}
function playerId() {
  try {
    const store = win2()?.localStorage;
    if (!store) return "no-storage";
    let id = store.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      store.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
}
function initEmbed(cfg2) {
  const w = win2();
  if (!w) return;
  if (initialized) return;
  initialized = true;
  if (unattendedWaiterTimer !== void 0) {
    clearTimeout(unattendedWaiterTimer);
    unattendedWaiterTimer = void 0;
  }
  config2 = {
    slug: cfg2.slug,
    apiUrl: cfg2.apiUrl.replace(/\/$/, ""),
    dashboardOrigins: [...cfg2.dashboardOrigins]
  };
  state = "pending";
  rememberEntry(w);
  _initCommerce({
    apiUrl: config2.apiUrl,
    dashboardOrigins: config2.dashboardOrigins,
    getToken: () => embedToken,
    getParentOrigin: () => parentOrigin,
    isEmbedded,
    isNative: inNativeMode,
    isLocalTest: () => localTestMode
  });
  _initGeneration({
    apiUrl: config2.apiUrl,
    dashboardOrigins: config2.dashboardOrigins,
    getToken: () => embedToken,
    getParentOrigin: () => parentOrigin,
    isEmbedded,
    isNative: inNativeMode,
    isLocalTest: () => localTestMode
  });
  if (wantsLocalTestMode(w)) {
    enterLocalTestMode(w);
    return;
  }
  showOverlay("connecting");
  const entry = detectNativeEntry(w);
  if (entry) {
    startNativeHandshake(w, entry);
    return;
  }
  if (isEmbedded()) {
    startEmbeddedHandshake(w);
  } else {
    void startStandaloneFlow(w);
  }
}
function isEmbedded() {
  const w = win2();
  if (!w) return false;
  try {
    return w.self !== w.top;
  } catch {
    return true;
  }
}
function getEntry() {
  const w = win2();
  const entry = w ? rememberEntry(w) : { search: "", hash: "", referrer: null };
  return {
    search: entry.search,
    params: new URLSearchParams(entry.search),
    hash: entry.hash,
    referrer: entry.referrer
  };
}
function getShell() {
  const w = win2();
  if (!w) return "standalone";
  if (isEmbedded()) return "page";
  if (inNativeMode() || nativeBridge(w)) return "app";
  if (initialized) return localTestMode ? "local" : "standalone";
  return wantsLocalTestMode(w, false) ? "local" : "standalone";
}
function onShellClosing(cb) {
  closingListeners.add(cb);
  hookShellClosing();
  return () => {
    closingListeners.delete(cb);
  };
}
function getAuthState() {
  return state;
}
function getUser() {
  return user;
}
function getEmbedToken() {
  return embedToken;
}
function getColyseusAuth() {
  return embedToken ? { embedToken } : void 0;
}
function getColyseusUrls() {
  return colyseusUrls ?? [];
}
function waitForAuth() {
  if (state === "authenticated" && user) return Promise.resolve({ user });
  if (state === "blocked") return Promise.reject(new Error("genex embed auth: blocked"));
  noteWaiterBeforeInit("waitForAuth");
  return new Promise((resolve, reject) => {
    authWaiters.push({ resolve, reject });
  });
}
function waitForPlayer() {
  if ((state === "authenticated" || state === "guest") && user) {
    return Promise.resolve({ user, guest: state === "guest" });
  }
  if (state === "blocked") return Promise.reject(new Error("genex embed auth: blocked"));
  noteWaiterBeforeInit("waitForPlayer");
  return new Promise((resolve, reject) => {
    playerWaiters.push({ resolve, reject });
  });
}
function noteWaiterBeforeInit(fn) {
  if (initialized) return;
  if (!earlyWaiterWarned) {
    earlyWaiterWarned = true;
    try {
      console.error(
        `[genex] ${fn}() called before initEmbed() \u2014 identity can never resolve and the game will sit black. Call initEmbed({ slug, apiUrl, dashboardOrigins }) first (genex-threejs-embed-auth), and draw a frame before you await identity.`
      );
    } catch {
    }
  }
  if (unattendedWaiterTimer === void 0) {
    unattendedWaiterTimer = setTimeout(() => {
      unattendedWaiterTimer = void 0;
      if (!initialized) enterBlocked("no-identity");
    }, handshakeTimeoutMs);
  }
}
function on(event, cb) {
  let set = listeners.get(event);
  if (!set) {
    set = /* @__PURE__ */ new Set();
    listeners.set(event, set);
  }
  set.add(cb);
  return () => {
    set.delete(cb);
  };
}
var KEEPALIVE_MAX_BYTES = 32 * 1024;
async function ensurePlayer() {
  if (!config2) throw new Error("genex embed: call initEmbed() first");
  if (state === "pending") await waitForPlayer();
  if (state === "blocked") throw new Error("genex embed auth: blocked");
}
var lastWorldVersion;
function stateFetch(path, init = {}) {
  const headers = { Authorization: `Bearer ${embedToken}` };
  if (init.body !== void 0) headers["Content-Type"] = "application/json";
  if (init.ifVersion !== void 0) headers["If-Match"] = String(init.ifVersion);
  return doFetch(`${config2.apiUrl}/api/projects/${encodeURIComponent(config2.slug)}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body,
    keepalive: init.body !== void 0 && init.body.length <= KEEPALIVE_MAX_BYTES ? true : void 0
  });
}
async function refusedAsStaging(res) {
  if (res.status !== 403) return false;
  const body = await res.json().catch(() => null);
  return body?.error === "staging_no_save";
}
async function decodeSave(res) {
  if (res.status === 409) {
    const body2 = await res.json().catch(() => ({}));
    return { saved: false, conflict: true, version: body2.version };
  }
  if (!res.ok) {
    if (await refusedAsStaging(res)) return { saved: false, staging: true };
    emit("error", { error: new Error(`genex state save failed (${res.status})`) });
    return { saved: false };
  }
  const body = await res.json();
  return { saved: true, version: body.version };
}
async function loadPlayerState() {
  await ensurePlayer();
  if (state === "guest") {
    return { data: hasPendingPlayerSave ? pendingPlayerSave : null, version: 0, guest: true };
  }
  const res = await stateFetch("/state/me");
  if (!res.ok) {
    if (await refusedAsStaging(res)) return { data: null, version: 0, staging: true };
    throw new Error(`genex load player state failed (${res.status})`);
  }
  const body = await res.json();
  return { data: body.data, version: body.version };
}
async function savePlayerState(data, opts) {
  await ensurePlayer();
  if (state === "guest") {
    pendingPlayerSave = data;
    hasPendingPlayerSave = true;
    return { saved: false, guest: true, queued: true };
  }
  return decodeSave(
    await stateFetch("/state/me", {
      method: "PUT",
      body: JSON.stringify(data),
      ifVersion: opts?.ifVersion
    })
  );
}
async function loadWorldState() {
  await ensurePlayer();
  if (state === "guest") return { data: null, version: 0, guest: true };
  const res = await stateFetch("/state");
  if (!res.ok) {
    if (await refusedAsStaging(res)) return { data: null, version: 0, staging: true };
    throw new Error(`genex load world state failed (${res.status})`);
  }
  const body = await res.json();
  lastWorldVersion = body.version;
  return { data: body.data, version: body.version };
}
async function saveWorldState(data, opts) {
  await ensurePlayer();
  if (state === "guest") return { saved: false, guest: true };
  const guard = opts && "ifVersion" in opts ? opts.ifVersion : lastWorldVersion;
  const result = await decodeSave(
    await stateFetch("/state", {
      method: "PUT",
      body: JSON.stringify(data),
      ifVersion: guard == null ? void 0 : guard
    })
  );
  if (result.version !== void 0) lastWorldVersion = result.version;
  return result;
}
async function submitScore(score, opts) {
  const board = opts?.board ?? "main";
  const mode = opts?.mode ?? "max";
  await ensurePlayer();
  if (state === "guest") {
    const prev = pendingScores.get(board);
    if (!prev || (mode === "min" ? score < prev.score : score > prev.score)) {
      pendingScores.set(board, { score, mode });
    }
    return { submitted: false, guest: true, queued: true };
  }
  const res = await stateFetch("/scores", {
    method: "POST",
    body: JSON.stringify({ score, board, mode })
  });
  if (!res.ok) {
    emit("error", { error: new Error(`genex score submit failed (${res.status})`) });
    return { submitted: false };
  }
  const body = await res.json();
  return { submitted: true, best: body.best, improved: body.improved };
}
async function getLeaderboard(opts) {
  if (!config2) throw new Error("genex embed: call initEmbed() first");
  if (localTestMode) return { items: [], me: null };
  if (state === "pending") {
    try {
      await waitForPlayer();
    } catch {
    }
  }
  const params = new URLSearchParams();
  if (opts?.board !== void 0) params.set("board", opts.board);
  if (opts?.limit !== void 0) params.set("limit", String(opts.limit));
  if (opts?.order !== void 0) params.set("order", opts.order);
  const qs = params.toString();
  const headers = {};
  if (embedToken) headers.Authorization = `Bearer ${embedToken}`;
  const res = await doFetch(
    `${config2.apiUrl}/api/projects/${encodeURIComponent(config2.slug)}/leaderboard${qs ? `?${qs}` : ""}`,
    { headers }
  );
  if (!res.ok) throw new Error(`genex leaderboard failed (${res.status})`);
  return await res.json();
}
async function readFetch(path, headers = {}) {
  if (state === "pending") {
    try {
      await waitForPlayer();
    } catch {
    }
  }
  const h = { ...headers };
  if (embedToken) h.Authorization = `Bearer ${embedToken}`;
  return doFetch(`${config2.apiUrl}/api/projects/${encodeURIComponent(config2.slug)}${path}`, {
    headers: h
  });
}
function sharedPath(collection, rest) {
  return `/shared/${encodeURIComponent(collection)}${rest === void 0 ? "" : `/${encodeURIComponent(rest)}`}`;
}
async function errorBody(res) {
  return await res.json().catch(() => null) ?? {};
}
async function putShared(collection, key, data, opts) {
  await ensurePlayer();
  if (state === "guest") return { saved: false, guest: true };
  const body = { data };
  if (opts?.meta !== void 0) body.meta = opts.meta;
  const res = await stateFetch(sharedPath(collection, key), {
    method: "PUT",
    body: JSON.stringify(body),
    ifVersion: opts?.ifVersion
  });
  if (res.ok) {
    const ok = await res.json();
    return { saved: true, id: ok.id, version: ok.version, created: ok.created };
  }
  const err = await errorBody(res);
  if (res.status === 409) return { saved: false, conflict: true, version: err.version };
  if (res.status === 413) return { saved: false, tooLarge: true };
  if (res.status === 403 && err.error === "staging_no_save") return { saved: false, staging: true };
  if (res.status === 403 && err.error === "quota_exceeded") {
    return {
      saved: false,
      quota: { scope: err.scope, limit: err.limit }
    };
  }
  emit("error", { error: new Error(`genex shared publish failed (${res.status})`) });
  return { saved: false };
}
async function deleteShared(collection, key, opts) {
  await ensurePlayer();
  if (state === "guest") return { deleted: false, guest: true };
  const res = await stateFetch(sharedPath(collection, key), {
    method: "DELETE",
    ifVersion: opts?.ifVersion
  });
  if (res.ok) return { deleted: true };
  const err = await errorBody(res);
  if (res.status === 404) return { deleted: false };
  if (res.status === 409) return { deleted: false, conflict: true, version: err.version };
  if (res.status === 403 && err.error === "staging_no_save") return { deleted: false, staging: true };
  emit("error", { error: new Error(`genex shared delete failed (${res.status})`) });
  return { deleted: false };
}
async function listShared(collection, opts) {
  if (!config2) throw new Error("genex embed: call initEmbed() first");
  if (localTestMode) return { items: [], next: null };
  let userFilter = opts?.user;
  if (opts?.mine) {
    if (state === "pending") await waitForPlayer().catch(() => void 0);
    if (state !== "authenticated" || !user) return { items: [], next: null };
    userFilter = user.id;
  }
  const params = new URLSearchParams();
  if (opts?.cursor !== void 0) params.set("cursor", opts.cursor);
  if (opts?.limit !== void 0) params.set("limit", String(opts.limit));
  if (userFilter !== void 0) params.set("user", userFilter);
  const qs = params.toString();
  const res = await readFetch(`${sharedPath(collection)}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`genex shared list failed (${res.status})`);
  return await res.json();
}
async function getShared(collection, id, opts) {
  if (!config2) throw new Error("genex embed: call initEmbed() first");
  if (localTestMode) return null;
  const qs = opts?.version !== void 0 ? `?v=${encodeURIComponent(String(opts.version))}` : "";
  let res = await readFetch(`${sharedPath(collection, id)}${qs}`);
  if (res.status === 404 && qs) {
    const err = await errorBody(res);
    if (err.error !== "version_gone") return null;
    res = await readFetch(sharedPath(collection, id));
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`genex shared read failed (${res.status})`);
  return await res.json();
}
async function appendEvent(stream, data) {
  await ensurePlayer();
  if (state === "guest") return { appended: false, guest: true };
  const res = await stateFetch(`/events/${encodeURIComponent(stream)}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  if (res.ok) return { appended: true, id: (await res.json()).id };
  const err = await errorBody(res);
  if (res.status === 413) return { appended: false, tooLarge: true };
  if (res.status === 403 && err.error === "staging_no_save") return { appended: false, staging: true };
  emit("error", { error: new Error(`genex event append failed (${res.status})`) });
  return { appended: false };
}
async function listEvents(stream, opts) {
  if (!config2) throw new Error("genex embed: call initEmbed() first");
  if (localTestMode) return { items: [], next: opts?.after ?? opts?.before ?? null, more: false };
  const params = new URLSearchParams();
  if (opts?.after !== void 0) params.set("after", opts.after);
  if (opts?.before !== void 0) params.set("before", opts.before);
  if (opts?.limit !== void 0) params.set("limit", String(opts.limit));
  if (opts?.order !== void 0) params.set("order", opts.order);
  const qs = params.toString();
  const res = await readFetch(`/events/${encodeURIComponent(stream)}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`genex events read failed (${res.status})`);
  return await res.json();
}
async function flushGuestQueue() {
  try {
    if (hasPendingPlayerSave) {
      const save = pendingPlayerSave;
      pendingPlayerSave = void 0;
      hasPendingPlayerSave = false;
      await savePlayerState(save);
    }
    const queued = [...pendingScores.entries()];
    pendingScores.clear();
    for (const [board, { score, mode }] of queued) {
      await submitScore(score, { board, mode });
    }
  } catch (error) {
    emit("error", { error });
  }
}
function emit(event, ctx2) {
  const set = listeners.get(event);
  if (!set) return;
  for (const cb of [...set]) {
    try {
      cb(ctx2);
    } catch {
    }
  }
}
var ENTRY_HIDDEN_KEYS = ["embed"];
function readReturnFragment(hash, ownOrigin) {
  const empty = { ticket: null, guest: false, entryHash: "", entryReferrer: null };
  if (!hash || hash.length < 2) return empty;
  try {
    const params = new URLSearchParams(hash.slice(1));
    return {
      ticket: params.get("genex_ticket"),
      guest: params.get("genex_guest") === "1",
      entryHash: sanitizeEntryHash(params.get(ENTRY_HASH_KEY)),
      entryReferrer: sanitizeEntryReferrer(params.get(ENTRY_REFERRER_KEY), ownOrigin)
    };
  } catch {
    return empty;
  }
}
function queryValue(search, key) {
  try {
    return new URLSearchParams(search).get(key);
  } catch {
    return null;
  }
}
function rememberEntry(w) {
  if (entrySnapshot) return entrySnapshot;
  let search = "";
  let hash = "";
  let ownOrigin = null;
  try {
    search = w.location.search ?? "";
    hash = stashedTicketHash ?? w.location.hash ?? "";
    ownOrigin = w.location.origin ?? null;
  } catch {
  }
  const embedded = isEmbedded();
  const carried = readReturnFragment(hash, ownOrigin);
  const returnTrip = !embedded && (!!carried.ticket || carried.guest);
  const pairs = sanitizePassthroughQuery(search, ENTRY_HIDDEN_KEYS);
  entrySnapshot = {
    search: pairs ? `?${pairs}` : "",
    // Anywhere else the fragment is the game's as it stands, unless it names a
    // Genex key: that namespace is the platform's in a fragment too.
    hash: returnTrip ? carried.entryHash : hash.includes(RESERVED_QUERY_PREFIX) ? "" : hash,
    referrer: resolveEntryReferrer(search, embedded, returnTrip, carried.entryReferrer, ownOrigin)
  };
  return entrySnapshot;
}
function resolveEntryReferrer(search, embedded, returnTrip, carried, ownOrigin) {
  const known = readEntryReferrerMemo();
  if (known !== void 0) return known;
  let referrer;
  if (embedded) referrer = sanitizeEntryReferrer(queryValue(search, EMBED_REFERRER_PARAM), ownOrigin);
  else if (returnTrip) referrer = carried;
  else referrer = sanitizeEntryReferrer(doc2()?.referrer, ownOrigin);
  writeEntryReferrerMemo(referrer);
  return referrer;
}
function hookShellClosing() {
  const w = win2();
  if (!w || closingHooks || typeof w.addEventListener !== "function") return;
  const hide = () => fireShellClosing();
  const show = () => {
    closingFired = false;
  };
  w.addEventListener("pagehide", hide);
  w.addEventListener("pageshow", show);
  closingHooks = { w, hide, show };
}
function fireShellClosing() {
  if (closingFired || closingListeners.size === 0) return;
  closingFired = true;
  for (const cb of [...closingListeners]) {
    try {
      cb();
    } catch {
    }
  }
}
function startEmbeddedHandshake(w) {
  messageHandler = (event) => {
    void handleParentMessage(event);
  };
  w.addEventListener("message", messageHandler);
  w.parent.postMessage({ type: "genex:embed:ready", v: PROTOCOL_VERSION }, "*");
  handshakeTimer = setTimeout(() => {
    void requestGuestSession();
  }, handshakeTimeoutMs);
}
function acceptsTicket() {
  return (state === "pending" || state === "guest") && !redeeming;
}
async function handleParentMessage(event) {
  if (!config2) return;
  const data = event.data;
  if (!data || data.v !== PROTOCOL_VERSION) return;
  const isTicket = data.type === "genex:embed:ticket";
  const isGuest = data.type === "genex:embed:guest";
  if (!isTicket && !isGuest) return;
  if (isTicket && (!acceptsTicket() || typeof data.ticket !== "string" || !data.ticket)) return;
  if (isGuest && (state !== "pending" || redeeming || requestingGuest)) return;
  if (!config2.dashboardOrigins.includes(event.origin)) {
    const fresh = await fetchDashboardOrigins();
    if (isTicket && !acceptsTicket()) return;
    if (isGuest && (state !== "pending" || redeeming || requestingGuest)) return;
    if (!fresh.includes(event.origin)) return;
  }
  if (handshakeTimer !== void 0) clearTimeout(handshakeTimer);
  parentOrigin = event.origin;
  shellCaps = readPlatformCaps(data.caps);
  if (isGuest) {
    await requestGuestSession();
    return;
  }
  await redeemTicket(data.ticket);
}
function nativeBridge(w) {
  const candidate = w.ReactNativeWebView;
  if (!candidate || typeof candidate !== "object") return null;
  const post = candidate.postMessage;
  return typeof post === "function" ? candidate : null;
}
function detectNativeEntry(w) {
  if (isEmbedded()) return null;
  let search;
  try {
    search = w.location.search ?? "";
  } catch {
    return null;
  }
  if (!hasNativeMarker(search)) return null;
  if (!nativeBridge(w)) return null;
  return readNativeEntry(search);
}
function inNativeMode() {
  return nativeEntry !== null;
}
function postToNative(message) {
  const w = win2();
  if (!w || !config2 || !nativeEntry) return;
  const bridge = nativeBridge(w);
  if (!bridge) return;
  const encoded = encodeBridgeMessage({
    channel: NATIVE_CHANNEL,
    v: NATIVE_PROTOCOL_VERSION,
    slug: config2.slug,
    attemptId: nativeEntry.attemptId,
    nonce: nativeEntry.nonce,
    ...message
  });
  if (!encoded) return;
  try {
    bridge.postMessage(encoded);
  } catch {
  }
}
function postNativeError(code) {
  if (inNativeMode()) postToNative({ type: "error", code });
}
function startNativeHandshake(w, entry) {
  nativeEntry = entry;
  nativeBootAt = Date.now();
  w[NATIVE_RECEIVER] = (payload) => {
    void handleNativeCommand(payload);
  };
  const capabilities = ["native-ticket", "native-guest", "heartbeat"];
  postToNative({ type: "ready", sdkVersion: SDK_VERSION, capabilities });
  handshakeTimer = setTimeout(() => {
    void requestGuestSession();
  }, handshakeTimeoutMs);
}
async function handleNativeCommand(payload) {
  if (!config2 || !nativeEntry) return;
  const read = readBridgeNativeCommand(payload);
  if (!read.ok) return;
  const command = read.message;
  if (command.slug !== config2.slug || command.attemptId !== nativeEntry.attemptId || command.nonce !== nativeEntry.nonce) {
    return;
  }
  switch (command.type) {
    case "ticket":
      if (handshakeTimer !== void 0) clearTimeout(handshakeTimer);
      await redeemTicket(command.ticket);
      return;
    case "guest":
      if (handshakeTimer !== void 0) clearTimeout(handshakeTimer);
      await requestGuestSession();
      return;
    case "cancel":
      stopNativeTimers();
      fireShellClosing();
      return;
    case "foreground":
    case "network":
      return;
  }
}
function stopNativeTimers() {
  if (handshakeTimer !== void 0) clearTimeout(handshakeTimer);
  handshakeTimer = void 0;
  if (refreshTimer !== void 0) clearTimeout(refreshTimer);
  refreshTimer = void 0;
  if (nativeReauthTimer !== void 0) clearTimeout(nativeReauthTimer);
  nativeReauthTimer = void 0;
  if (heartbeatTimer !== void 0) clearInterval(heartbeatTimer);
  heartbeatTimer = void 0;
}
function startHeartbeat() {
  if (!inNativeMode() || heartbeatTimer !== void 0) return;
  heartbeatTimer = setInterval(() => {
    postToNative({ type: "heartbeat", uptimeMs: Math.max(0, Date.now() - nativeBootAt) });
  }, heartbeatIntervalMs);
  heartbeatTimer.unref?.();
}
function requestNativeReauth() {
  if (!inNativeMode() || nativeReauthPending) return;
  nativeReauthPending = true;
  postToNative({ type: "reauth-required" });
  nativeReauthTimer = setTimeout(() => {
    nativeReauthTimer = void 0;
    if (!nativeReauthPending) return;
    nativeReauthPending = false;
    emit("error", { error: new Error("embed session expired") });
    enterBlocked("session-expired");
  }, nativeReauthTimeoutMs);
}
function clearNativeReauth() {
  nativeReauthPending = false;
  if (nativeReauthTimer !== void 0) clearTimeout(nativeReauthTimer);
  nativeReauthTimer = void 0;
}
function postToParent(message, targetOrigin) {
  const w = win2();
  if (!w || !isEmbedded()) return;
  try {
    w.parent.postMessage(message, targetOrigin);
  } catch {
  }
}
async function startStandaloneFlow(w) {
  const frag = readFragment(w);
  if (frag.ticket) {
    armStandaloneWatchdog();
    await redeemTicket(frag.ticket);
    return;
  }
  if (frag.guest) {
    armStandaloneWatchdog();
    await requestGuestSession();
    return;
  }
  showOverlay("redirecting");
  await redirectToAuthorize(w, { guestOk: true });
}
function armStandaloneWatchdog() {
  if (handshakeTimer !== void 0) clearTimeout(handshakeTimer);
  handshakeTimer = setTimeout(() => {
    handshakeTimer = void 0;
    if (state === "pending") enterBlocked("no-identity");
  }, handshakeTimeoutMs + standaloneWatchdogGraceMs);
}
var stashedTicketHash = null;
function _stashTicketFromUrl() {
  const w = win2();
  if (!w) return;
  const hash = w.location.hash;
  if (!hash || !hash.includes("genex_")) return;
  stashedTicketHash = hash;
  try {
    w.history.replaceState(w.history.state ?? null, "", cleanUrl(w) + readReturnFragment(hash).entryHash);
  } catch {
  }
}
function cleanUrl(w) {
  return w.location.pathname + stripReturnMarker(w.location.search);
}
function readFragment(w) {
  const hash = stashedTicketHash ?? w.location.hash;
  stashedTicketHash = null;
  const { ticket, guest, entryHash } = readReturnFragment(hash);
  if (ticket || guest) {
    try {
      w.history.replaceState(w.history.state ?? null, "", cleanUrl(w) + entryHash);
    } catch {
    }
  }
  return { ticket, guest };
}
async function redirectToAuthorize(w, opts) {
  if (!config2 || localTestMode) return;
  if (inNativeMode()) return;
  const origin = opts?.guestOk ? config2.dashboardOrigins[0] ?? (await fetchDashboardOrigins())[0] : (await fetchDashboardOrigins())[0] ?? config2.dashboardOrigins[0];
  if (!origin) {
    enterBlocked();
    return;
  }
  let returnTo = w.location.origin + w.location.pathname;
  const query = stripNativeEntry(stripReturnMarker(w.location.search));
  if (
    // The cap is on the pairs; `query` is '' or starts with the one `?`.
    query.length - 1 <= MAX_ENTRY_QUERY_LENGTH && returnTo.length + query.length <= MAX_RETURN_TO_LENGTH && query.indexOf("#") === -1
  ) {
    returnTo += query;
  }
  const guestParam = opts?.guestOk ? "&guest=ok" : "";
  let url = `${origin}/play/authorize?returnTo=${encodeURIComponent(returnTo)}&slug=${encodeURIComponent(config2.slug)}${guestParam}`;
  const referrer = rememberEntry(w).referrer;
  if (referrer) url += `&${AUTHORIZE_ENTRY_REF_PARAM}=${encodeURIComponent(referrer)}`;
  url += sanitizeEntryHash(w.location.hash);
  w.location.replace(url);
}
async function fetchDashboardOrigins() {
  if (!config2) return [];
  try {
    const res = await doFetch(`${config2.apiUrl}/api/embed/dashboard-origins`);
    if (!res.ok) return config2.dashboardOrigins;
    const body = await res.json();
    if (Array.isArray(body.origins) && body.origins.every((o) => typeof o === "string")) {
      return body.origins;
    }
  } catch {
  }
  return config2.dashboardOrigins;
}
async function redeemTicket(ticket) {
  if (!config2 || localTestMode || redeeming) return;
  const reauthing = nativeReauthPending && state === "authenticated";
  if (state !== "pending" && state !== "guest" && !reauthing) return;
  const upgradingFromGuest = state === "guest";
  const epoch = ++identityEpoch;
  redeeming = true;
  try {
    const res = await doFetch(
      `${config2.apiUrl}/api/embed/session`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket })
      },
      handshakeTimeoutMs
    );
    if (epoch !== identityEpoch) return;
    if (!res.ok) {
      emit("error", { error: new Error(`ticket redemption failed (${res.status})`) });
      if (!upgradingFromGuest) await handleRedeemFailure();
      return;
    }
    const body = await res.json();
    if (epoch !== identityEpoch) return;
    embedToken = body.embedToken;
    user = body.user;
    colyseusUrls = body.colyseus?.urls;
    state = "authenticated";
    if (handshakeTimer !== void 0) clearTimeout(handshakeTimer);
    handshakeTimer = void 0;
    clearRetryFlag();
    removeOverlay();
    removeGuestPopover();
    scheduleRefresh();
    if (isEmbedded() && parentOrigin) {
      postToParent({ type: "genex:embed:authenticated", v: PROTOCOL_VERSION }, parentOrigin);
    }
    if (inNativeMode()) {
      clearNativeReauth();
      postToNative({ type: "authenticated", guest: false });
      startHeartbeat();
    }
    if (upgradingFromGuest) await flushGuestQueue();
    const ctx2 = { user };
    for (const waiter of authWaiters.splice(0)) waiter.resolve(ctx2);
    for (const waiter of playerWaiters.splice(0)) waiter.resolve({ user, guest: false });
    emit("authenticated", ctx2);
  } catch (error) {
    if (epoch !== identityEpoch) return;
    emit("error", { error });
    if (!upgradingFromGuest) await handleRedeemFailure();
  } finally {
    redeeming = false;
  }
}
async function requestGuestSession() {
  if (!config2 || localTestMode || requestingGuest || redeeming) return;
  if (state !== "pending" && state !== "guest") return;
  const epoch = ++identityEpoch;
  requestingGuest = true;
  try {
    const res = await doFetch(`${config2.apiUrl}/api/embed/guest-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // playerId is analytics-only: the SERVER still mints the session's own
      // guest id and the token is unchanged — this just lets the play event
      // key on something that survives the tab.
      body: JSON.stringify({ slug: config2.slug, playerId: playerId() })
    }, handshakeTimeoutMs);
    if (epoch !== identityEpoch) return;
    if (!res.ok) {
      emit("error", { error: new Error(`guest session failed (${res.status})`) });
      postNativeError("guest-failed");
      enterBlocked(res.status === 404 ? "not-available" : "no-identity");
      return;
    }
    const body = await res.json();
    if (epoch !== identityEpoch) return;
    embedToken = body.embedToken;
    user = body.user;
    colyseusUrls = body.colyseus?.urls;
    enterGuest();
  } catch (error) {
    if (epoch !== identityEpoch) return;
    emit("error", { error });
    enterBlocked();
  } finally {
    requestingGuest = false;
  }
}
function enterGuest() {
  const firstEntry = state !== "guest";
  state = "guest";
  if (handshakeTimer !== void 0) clearTimeout(handshakeTimer);
  removeOverlay();
  scheduleRefresh();
  if (isEmbedded()) {
    postToParent(
      { type: "genex:embed:authenticated", v: PROTOCOL_VERSION, guest: true },
      parentOrigin ?? "*"
    );
  } else if (inNativeMode()) {
    postToNative({ type: "authenticated", guest: true });
    startHeartbeat();
  } else if (firstEntry && !readPopoverDismissed()) {
    showGuestPopover();
  }
  if (user) {
    const ctx2 = { user };
    for (const waiter of playerWaiters.splice(0)) waiter.resolve({ user, guest: true });
    emit("guest", ctx2);
  }
}
function isLoopbackLocation(w) {
  try {
    const u = new URL(w.location.origin);
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]");
  } catch {
    return false;
  }
}
function wantsLocalTestMode(w, latch = true) {
  if (isEmbedded()) return false;
  if (detectNativeEntry(w)) return false;
  if (!isLoopbackLocation(w)) return false;
  let params = null;
  try {
    params = new URLSearchParams(w.location.search);
  } catch {
  }
  if (params?.get("genex_local_test") === "1") return true;
  if (params?.get("genex_auth") === "1") {
    if (latch) writeLocalAuthFlag();
    return false;
  }
  if (readLocalAuthFlag()) return false;
  return !hasGenexFragment(w);
}
function hasGenexFragment(w) {
  const hash = stashedTicketHash ?? w.location.hash;
  return !!hash && hash.includes("genex_");
}
function enterLocalTestMode(w) {
  localTestMode = true;
  readFragment(w);
  const localUser = { id: "local:test", name: "Local Tester" };
  user = localUser;
  state = "guest";
  removeOverlay();
  try {
    console.info(
      "[genex] local test mode \u2014 local visuals and controls only. Auth, saves, leaderboards, and multiplayer are NOT validated here; no Genex credential exists."
    );
  } catch {
  }
  for (const waiter of playerWaiters.splice(0)) waiter.resolve({ user: localUser, guest: true });
  emit("guest", { user: localUser });
}
async function handleRedeemFailure() {
  const w = win2();
  if (handshakeTimer !== void 0) clearTimeout(handshakeTimer);
  handshakeTimer = void 0;
  if (inNativeMode()) {
    clearNativeReauth();
    postNativeError("ticket-rejected");
    enterBlocked();
    return;
  }
  if (w && !isEmbedded() && !readRetryFlag()) {
    writeRetryFlag();
    showOverlay("redirecting");
    await redirectToAuthorize(w, { guestOk: true });
    return;
  }
  enterBlocked();
}
function scheduleRefresh() {
  if (refreshTimer !== void 0) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    void refreshToken();
  }, refreshDelayMs);
}
async function refreshToken() {
  if (!config2 || state !== "authenticated" && state !== "guest" || !embedToken) return;
  const epoch = identityEpoch;
  const tokenAtStart = embedToken;
  let status;
  try {
    const res = await doFetch(`${config2.apiUrl}/api/embed/session/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenAtStart}` },
      // Best-effort completion if the tab starts unloading mid-refresh; zero
      // security consequence either way (worst case the token just expires).
      keepalive: true
    });
    status = res.status;
    if (epoch !== identityEpoch || embedToken !== tokenAtStart) return;
    if (res.ok) {
      const body = await res.json();
      if (epoch !== identityEpoch || embedToken !== tokenAtStart) return;
      embedToken = body.embedToken;
      scheduleRefresh();
      return;
    }
  } catch {
    status = void 0;
  }
  if (epoch !== identityEpoch || embedToken !== tokenAtStart) return;
  if (status === 401) {
    if (state === "guest") {
      void requestGuestSession();
      return;
    }
    if (inNativeMode()) {
      requestNativeReauth();
      return;
    }
    emit("error", { error: new Error("embed session expired") });
    enterBlocked("session-expired");
    return;
  }
  if (refreshTimer !== void 0) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    void refreshToken();
  }, refreshRetryMs);
}
function enterBlocked(reason = "no-identity") {
  if (state === "blocked") return;
  identityEpoch++;
  state = "blocked";
  user = null;
  embedToken = void 0;
  if (handshakeTimer !== void 0) clearTimeout(handshakeTimer);
  if (refreshTimer !== void 0) clearTimeout(refreshTimer);
  removeGuestPopover();
  if (inNativeMode()) {
    stopNativeTimers();
    clearNativeReauth();
    removeOverlay();
    postToNative({ type: "blocked", reason });
  } else {
    showOverlay(isEmbedded() ? "blocked-embedded" : "blocked-standalone");
  }
  if (isEmbedded()) {
    postToParent({ type: "genex:embed:blocked", v: PROTOCOL_VERSION }, parentOrigin ?? "*");
  }
  const err = new Error("genex embed auth: blocked");
  for (const waiter of authWaiters.splice(0)) waiter.reject(err);
  for (const waiter of playerWaiters.splice(0)) waiter.reject(err);
  emit("blocked");
}
var OVERLAY_TEXT = {
  // Delayed (text grace period): most connects finish before the text ever
  // shows — a sub-second text flash reads as a glitch. `wordmark` states show
  // GENEX in the breathing decrypt loop instead of an instruction.
  connecting: { title: "GENEX", wordmark: true },
  // Same treatment as `connecting` so the whole standalone bounce (gate ->
  // /play/authorize -> gate) reads as ONE continuous screen. Still neutral:
  // the automatic bounce precedes GUEST play as often as sign-in.
  redirecting: { title: "GENEX", wordmark: true },
  // Terminal states need the visitor to act — text shows immediately.
  "blocked-standalone": { title: "Sign in to play", button: "Sign in", instant: true },
  "blocked-embedded": { title: "Sign in on the Genex dashboard to continue", instant: true }
};
var OVERLAY_FONT_URL = "https://cdn.genex.technology/fonts/GeistMono-variable.woff2";
var OVERLAY_FONT_STACK = "'Geist Mono',ui-monospace,SFMono-Regular,Menlo,monospace";
var overlayFontRequested = false;
var SCRAMBLE_NOISE = "!<>-_/[]{}=+*^?#$%&@";
var SCRAMBLE_TICK_MS = 50;
var SCRAMBLE_SETTLE_TICKS = 10;
var WORDMARK_LOOP_PHASES = [
  { name: "churn", ticks: 5 },
  { name: "settle", ticks: 10 },
  { name: "hold", ticks: 12 },
  { name: "dissolve", ticks: 8 }
];
function scrambleNoise(length) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SCRAMBLE_NOISE[Math.floor(Math.random() * SCRAMBLE_NOISE.length)];
  }
  return out;
}
function scrambleStatic() {
  try {
    const w = win2();
    if (!w || typeof w.matchMedia !== "function") return true;
    return w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}
function scrambleIn(el, text) {
  if (scrambleStatic()) {
    el.textContent = text;
    return () => {
    };
  }
  let i = 0;
  el.textContent = scrambleNoise(text.length);
  const id = setInterval(() => {
    i++;
    if (i >= SCRAMBLE_SETTLE_TICKS) {
      el.textContent = text;
      clearInterval(id);
      return;
    }
    const lock = Math.floor(i / SCRAMBLE_SETTLE_TICKS * text.length);
    el.textContent = text.slice(0, lock) + scrambleNoise(text.length - lock);
  }, SCRAMBLE_TICK_MS);
  return () => clearInterval(id);
}
function wordmarkLoop(el, text) {
  if (scrambleStatic()) {
    el.textContent = text;
    return () => {
    };
  }
  let phase = 0;
  let i = 0;
  const frame = () => {
    const p = WORDMARK_LOOP_PHASES[phase];
    let kept;
    if (p.name === "churn") kept = 0;
    else if (p.name === "settle") kept = Math.floor(i / p.ticks * text.length);
    else if (p.name === "hold") kept = text.length;
    else kept = text.length - Math.floor(i / p.ticks * text.length);
    el.textContent = text.slice(0, kept) + scrambleNoise(text.length - kept);
    i++;
    if (i >= p.ticks) {
      i = 0;
      phase = (phase + 1) % WORDMARK_LOOP_PHASES.length;
    }
  };
  frame();
  const id = setInterval(frame, SCRAMBLE_TICK_MS);
  return () => clearInterval(id);
}
function ensureOverlayFont(d) {
  if (overlayFontRequested) return;
  overlayFontRequested = true;
  try {
    const FF = win2()?.FontFace;
    const fonts = d.fonts;
    if (!FF || !fonts?.add) return;
    const face = new FF("Geist Mono", `url(${OVERLAY_FONT_URL}) format('woff2')`, {
      weight: "100 900",
      display: "swap"
    });
    face.load().then((loaded) => fonts.add(loaded)).catch(() => {
    });
  } catch {
  }
}
function showOverlay(kind) {
  const d = doc2();
  if (!d?.createElement) return;
  try {
    if (!overlayEl) overlayEl = buildOverlay(d);
    overlayEl.setContent(kind);
  } catch {
  }
}
function removeOverlay(instant = false) {
  try {
    const el = overlayEl;
    overlayEl = null;
    if (!el) return;
    el.stopText();
    const root = el.root;
    if (instant || !root.style) {
      root.remove?.();
      return;
    }
    root.style.pointerEvents = "none";
    root.style.transition = "opacity 180ms ease";
    root.style.opacity = "0";
    setTimeout(() => {
      try {
        root.remove?.();
      } catch {
      }
    }, 220);
  } catch {
  }
}
function buildOverlay(d) {
  ensureOverlayFont(d);
  const root = d.createElement("div");
  root.setAttribute("data-genex-embed-overlay", "");
  root.style.cssText = `position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;background:#000;color:#fff;font-family:${OVERLAY_FONT_STACK};text-align:center;pointer-events:auto;user-select:none`;
  const title = d.createElement("div");
  title.style.cssText = "font-size:13px;font-weight:400;line-height:1.3;padding:0 24px;opacity:0;min-height:1.3em;font-variant-ligatures:none";
  root.appendChild(title);
  const button = d.createElement("button");
  button.style.cssText = "font-family:inherit;font-size:13px;font-weight:500;line-height:1.3;padding:8px 22px;border-radius:9px;border:none;cursor:pointer;background:#4b60bf;color:#fff;display:none";
  button.addEventListener("mouseenter", () => {
    button.style.background = "#3f51a8";
  });
  button.addEventListener("mouseleave", () => {
    button.style.background = "#4b60bf";
  });
  button.addEventListener("click", () => {
    const w = win2();
    if (!w) return;
    button.disabled = true;
    clearRetryFlag();
    void redirectToAuthorize(w);
  });
  root.appendChild(button);
  const mount = () => {
    if (d.body && !root.isConnected) d.body.appendChild(root);
  };
  if (d.body) mount();
  else d.addEventListener?.("DOMContentLoaded", mount);
  let textTimer;
  let cancelScramble;
  const stopText = () => {
    if (textTimer !== void 0) {
      clearTimeout(textTimer);
      textTimer = void 0;
    }
    if (cancelScramble) {
      cancelScramble();
      cancelScramble = void 0;
    }
  };
  return {
    root,
    stopText,
    setContent(kind) {
      const text = OVERLAY_TEXT[kind];
      stopText();
      title.textContent = text.title;
      title.style.letterSpacing = text.wordmark ? "0.22em" : "";
      title.style.marginRight = text.wordmark ? "-0.22em" : "";
      const reveal = () => {
        title.style.opacity = "1";
        cancelScramble = text.wordmark ? wordmarkLoop(title, text.title) : scrambleIn(title, text.title);
      };
      if (text.instant || overlayTextDelayMs <= 0) {
        reveal();
      } else {
        title.style.opacity = "0";
        textTimer = setTimeout(() => {
          textTimer = void 0;
          reveal();
        }, overlayTextDelayMs);
      }
      button.style.display = text.button ? "inline-block" : "none";
      if (text.button) button.textContent = text.button;
      mount();
    }
  };
}
function showGuestPopover() {
  const d = doc2();
  if (!d?.createElement || popoverEl) return;
  try {
    popoverEl = buildGuestPopover(d);
  } catch {
  }
}
function removeGuestPopover() {
  if (popoverMinimizeTimer !== void 0) {
    clearTimeout(popoverMinimizeTimer);
    popoverMinimizeTimer = void 0;
  }
  try {
    const root = popoverEl?.root;
    root?.remove?.();
  } catch {
  }
  popoverEl = null;
}
function buildGuestPopover(d) {
  ensureOverlayFont(d);
  let mobile = false;
  try {
    const w = win2();
    const nav = w?.navigator;
    if (w && nav) {
      const coarse = w.matchMedia?.("(pointer: coarse)").matches ?? false;
      const touch = (nav.maxTouchPoints ?? 0) > 1;
      const mobileUA = nav.userAgentData ? nav.userAgentData.mobile : /Mobi|Android/i.test(nav.userAgent ?? "");
      mobile = touch && coarse || mobileUA;
    }
  } catch {
  }
  const root = d.createElement("div");
  root.setAttribute("data-genex-guest-popover", "");
  root.style.cssText = "position:fixed;top:calc(12px + env(safe-area-inset-top));right:calc(12px + env(safe-area-inset-right));z-index:2147483646;display:flex;justify-content:flex-end;pointer-events:none";
  const card = d.createElement("div");
  card.style.cssText = `display:flex;align-items:center;border-radius:12px;background:rgba(0,0,0,0.85);color:#fff;font-family:${OVERLAY_FONT_STACK};box-shadow:0 4px 24px rgba(0,0,0,0.4);pointer-events:auto;user-select:none;` + (mobile ? "gap:8px;padding:8px 8px 8px 12px;font-size:12px;max-width:calc(100vw - 88px)" : "gap:12px;padding:10px 12px 10px 16px;font-size:13px");
  root.appendChild(card);
  const text = d.createElement("span");
  text.textContent = !mobile && user?.name ? `Playing as ${user.name} \u2014 sign in to save progress` : "Sign in to save progress";
  if (mobile) text.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
  card.appendChild(text);
  const signIn = d.createElement("button");
  signIn.textContent = "Sign in";
  signIn.style.cssText = "font-family:inherit;font-weight:500;border-radius:9px;border:none;cursor:pointer;background:#4b60bf;color:#fff;" + (mobile ? "font-size:12px;padding:5px 12px" : "font-size:13px;padding:6px 16px");
  signIn.addEventListener("mouseenter", () => {
    signIn.style.background = "#3f51a8";
  });
  signIn.addEventListener("mouseleave", () => {
    signIn.style.background = "#4b60bf";
  });
  signIn.addEventListener("click", () => {
    const w = win2();
    if (!w) return;
    signIn.disabled = true;
    clearRetryFlag();
    void redirectToAuthorize(w);
  });
  card.appendChild(signIn);
  const dismiss = d.createElement("button");
  dismiss.textContent = "\xD7";
  dismiss.setAttribute("aria-label", "Dismiss");
  dismiss.style.cssText = "font-size:16px;line-height:1;padding:6px 8px;border:none;cursor:pointer;background:transparent;color:rgba(255,255,255,0.6)";
  dismiss.addEventListener("click", () => {
    writePopoverDismissed();
    removeGuestPopover();
  });
  card.appendChild(dismiss);
  if (mobile) {
    const chip = d.createElement("button");
    chip.setAttribute("aria-label", "Sign in to save progress");
    chip.style.cssText = "display:none;width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;background:rgba(0,0,0,0.55);color:#fff;align-items:center;justify-content:center;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);pointer-events:auto";
    chip.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';
    root.appendChild(chip);
    const setMinimized = (v) => {
      card.style.display = v ? "none" : "flex";
      chip.style.display = v ? "flex" : "none";
    };
    popoverMinimizeTimer = setTimeout(() => setMinimized(true), 5e3);
    card.addEventListener("pointerdown", () => {
      if (popoverMinimizeTimer !== void 0) clearTimeout(popoverMinimizeTimer);
      popoverMinimizeTimer = void 0;
    });
    chip.addEventListener("click", () => setMinimized(false));
  }
  const mount = () => {
    if (d.body && !root.isConnected) d.body.appendChild(root);
  };
  if (d.body) mount();
  else d.addEventListener?.("DOMContentLoaded", mount);
  return { root };
}
function __resetForTests(overrides) {
  const w = win2();
  if (w && messageHandler) w.removeEventListener("message", messageHandler);
  messageHandler = void 0;
  if (handshakeTimer !== void 0) clearTimeout(handshakeTimer);
  if (refreshTimer !== void 0) clearTimeout(refreshTimer);
  if (unattendedWaiterTimer !== void 0) clearTimeout(unattendedWaiterTimer);
  handshakeTimer = void 0;
  refreshTimer = void 0;
  unattendedWaiterTimer = void 0;
  earlyWaiterWarned = false;
  stopNativeTimers();
  if (w) delete w[NATIVE_RECEIVER];
  nativeEntry = null;
  nativeReauthPending = false;
  nativeBootAt = 0;
  removeOverlay(true);
  removeGuestPopover();
  overlayFontRequested = false;
  config2 = null;
  state = "pending";
  user = null;
  localTestMode = false;
  embedToken = void 0;
  colyseusUrls = void 0;
  parentOrigin = null;
  shellCaps = [];
  initialized = false;
  redeeming = false;
  requestingGuest = false;
  identityEpoch++;
  listeners.clear();
  authWaiters = [];
  playerWaiters = [];
  stashedTicketHash = null;
  entrySnapshot = null;
  if (closingHooks) {
    try {
      closingHooks.w.removeEventListener("pagehide", closingHooks.hide);
      closingHooks.w.removeEventListener("pageshow", closingHooks.show);
    } catch {
    }
  }
  closingHooks = null;
  closingListeners.clear();
  closingFired = false;
  pendingPlayerSave = void 0;
  hasPendingPlayerSave = false;
  pendingScores.clear();
  handshakeTimeoutMs = overrides?.handshakeTimeoutMs ?? 1e4;
  standaloneWatchdogGraceMs = overrides?.standaloneWatchdogGraceMs ?? 2e3;
  refreshDelayMs = overrides?.refreshDelayMs ?? 10 * 6e4;
  refreshRetryMs = overrides?.refreshRetryMs ?? 6e4;
  overlayTextDelayMs = overrides?.overlayTextDelayMs ?? 500;
  nativeReauthTimeoutMs = overrides?.nativeReauthTimeoutMs ?? 3e4;
  heartbeatIntervalMs = overrides?.heartbeatIntervalMs ?? 3e4;
  _resetPlatform({
    replyTimeoutMs: overrides?.platformReplyTimeoutMs,
    confirmTimeoutMs: overrides?.platformConfirmTimeoutMs
  });
}
_initPlatform({
  getShell,
  // getShell()'s own reading of local test mode, without its `app` answer
  // in front: a dev server inside a React Native WebView is both.
  isLocalTest: () => {
    const w = win2();
    if (!w || isEmbedded()) return false;
    return initialized ? localTestMode : wantsLocalTestMode(w, false);
  },
  getConfig: () => config2,
  getParentOrigin: () => parentOrigin,
  getShellCaps: () => shellCaps
});

export {
  share,
  copyText,
  keepAwake,
  haptic,
  openExternal,
  saveFile,
  setFullscreen,
  supports,
  getShop,
  getEntitlements,
  consumeEntitlement,
  buy,
  getPayment,
  getPayments,
  requestPayment,
  getGenerationModels,
  getWorkflowOfferings,
  getGeneration,
  waitForGeneration,
  generate,
  requestWorkflow,
  resumeWorkflow,
  getSpendGrant,
  getActiveSpendGrant,
  stopSpendGrant,
  requestSpendGrant,
  generateStream,
  judge,
  generationErrorMessage,
  initEmbed,
  isEmbedded,
  getEntry,
  getShell,
  onShellClosing,
  getAuthState,
  getUser,
  getEmbedToken,
  getColyseusAuth,
  getColyseusUrls,
  waitForAuth,
  waitForPlayer,
  on,
  loadPlayerState,
  savePlayerState,
  loadWorldState,
  saveWorldState,
  submitScore,
  getLeaderboard,
  putShared,
  deleteShared,
  listShared,
  getShared,
  appendEvent,
  listEvents,
  _stashTicketFromUrl,
  __resetForTests
};

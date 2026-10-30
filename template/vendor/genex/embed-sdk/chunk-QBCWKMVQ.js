// ../embed-protocol/src/constants.ts
var NATIVE_CHANNEL = "genex-native";
var NATIVE_PROTOCOL_VERSION = 1;
var NATIVE_MARKER_PARAM = "genex_native";
var NATIVE_MARKER_VALUE = "1";
var NATIVE_PROTOCOL_PARAM = "genex_protocol";
var NATIVE_ATTEMPT_PARAM = "genex_attempt";
var NATIVE_NONCE_PARAM = "genex_nonce";
var NATIVE_CAPS_PARAM = "genex_caps";
var RESERVED_QUERY_PREFIX = "genex_";
var DASHBOARD_RESERVED_KEYS = ["ref", "s", "from", "remix", "embed", "slug"];
var RETURN_MARKER_PARAM = "genex_r";
var AUTHORIZE_ENTRY_REF_PARAM = "entryRef";
var ENTRY_HASH_KEY = "genex_hash";
var ENTRY_REFERRER_KEY = "genex_referrer";
var EMBED_REFERRER_PARAM = "genex_ref";
var MAX_ENTRY_QUERY_LENGTH = 1024;
var MAX_ENTRY_HASH_LENGTH = 4096;
var MAX_ENTRY_REFERRER_LENGTH = 255;
var MAX_RETURN_TO_LENGTH = 2048;
var NATIVE_RECEIVER = "__genexNative";
var MAX_BRIDGE_MESSAGE_BYTES = 4096;
var BRIDGE_ID_LENGTH = 32;
var BRIDGE_ID_RE = /^[0-9a-f]{32}$/;
var SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
function isBridgeId(value) {
  return typeof value === "string" && BRIDGE_ID_RE.test(value);
}
function isBridgeSlug(value) {
  return typeof value === "string" && SLUG_RE.test(value);
}

// ../embed-protocol/src/base64url.ts
var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
var LOOKUP = (() => {
  const table = new Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) table[ALPHABET.charCodeAt(i)] = i;
  return table;
})();
function utf8Bytes(text) {
  const out = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 55296 && code <= 56319) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
      if (next >= 56320 && next <= 57343) {
        code = 65536 + (code - 55296 << 10) + (next - 56320);
        i++;
      } else {
        code = 65533;
      }
    } else if (code >= 56320 && code <= 57343) {
      code = 65533;
    }
    if (code < 128) out.push(code);
    else if (code < 2048) out.push(192 | code >> 6, 128 | code & 63);
    else if (code < 65536) {
      out.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
    } else {
      out.push(
        240 | code >> 18,
        128 | code >> 12 & 63,
        128 | code >> 6 & 63,
        128 | code & 63
      );
    }
  }
  return out;
}
function utf8Text(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i];
    let code;
    let size;
    if (b0 < 128) {
      code = b0;
      size = 1;
    } else if ((b0 & 224) === 192) {
      code = b0 & 31;
      size = 2;
    } else if ((b0 & 240) === 224) {
      code = b0 & 15;
      size = 3;
    } else if ((b0 & 248) === 240) {
      code = b0 & 7;
      size = 4;
    } else return null;
    if (i + size > bytes.length) return null;
    for (let k = 1; k < size; k++) {
      const b = bytes[i + k];
      if ((b & 192) !== 128) return null;
      code = code << 6 | b & 63;
    }
    if (size === 2 && code < 128) return null;
    if (size === 3 && (code < 2048 || code >= 55296 && code <= 57343)) return null;
    if (size === 4 && (code < 65536 || code > 1114111)) return null;
    if (code > 65535) {
      const v = code - 65536;
      out += String.fromCharCode(55296 + (v >> 10), 56320 + (v & 1023));
    } else {
      out += String.fromCharCode(code);
    }
    i += size;
  }
  return out;
}
function utf8ByteLength(text) {
  return utf8Bytes(text).length;
}
function encodeBase64UrlJson(value) {
  const bytes = utf8Bytes(JSON.stringify(value));
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += ALPHABET[b0 >> 2];
    out += ALPHABET[(b0 & 3) << 4 | (b1 ?? 0) >> 4];
    if (b1 === void 0) break;
    out += ALPHABET[(b1 & 15) << 2 | (b2 ?? 0) >> 6];
    if (b2 === void 0) break;
    out += ALPHABET[b2 & 63];
  }
  return out;
}
function decodeBase64UrlJson(encoded) {
  if (encoded.length % 4 === 1) return void 0;
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < encoded.length; i++) {
    const code = encoded.charCodeAt(i);
    const value = code < 128 ? LOOKUP[code] : -1;
    if (value < 0) return void 0;
    buffer = buffer << 6 | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push(buffer >> bits & 255);
    }
  }
  if (bits > 0 && (buffer & (1 << bits) - 1) !== 0) return void 0;
  const text = utf8Text(bytes);
  if (text === null) return void 0;
  try {
    return JSON.parse(text);
  } catch {
    return void 0;
  }
}

// ../embed-protocol/src/messages.ts
var MAX_TICKET_LENGTH = 2048;
var MAX_EXPIRES_AT_LENGTH = 32;
var ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasExactKeys(value, keys) {
  const own = Object.keys(value);
  if (own.length !== keys.length) return false;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return false;
  }
  return true;
}
var BASE_KEYS = ["channel", "v", "type", "slug", "attemptId", "nonce"];
function envelopeBaseIsValid(value) {
  return value.channel === NATIVE_CHANNEL && value.v === NATIVE_PROTOCOL_VERSION && isBridgeSlug(value.slug) && isBridgeId(value.attemptId) && isBridgeId(value.nonce);
}
function parseBridgeNativeCommand(value) {
  if (!isRecord(value) || !envelopeBaseIsValid(value)) return void 0;
  switch (value.type) {
    case "ticket":
      if (!hasExactKeys(value, [...BASE_KEYS, "ticket", "expiresAt"])) return void 0;
      if (typeof value.ticket !== "string" || value.ticket.length === 0 || value.ticket.length > MAX_TICKET_LENGTH) {
        return void 0;
      }
      if (typeof value.expiresAt !== "string" || value.expiresAt.length > MAX_EXPIRES_AT_LENGTH || !ISO_INSTANT_RE.test(value.expiresAt)) {
        return void 0;
      }
      return value;
    case "guest":
    case "cancel":
      if (!hasExactKeys(value, BASE_KEYS)) return void 0;
      return value;
    case "foreground":
      if (!hasExactKeys(value, [...BASE_KEYS, "active"])) return void 0;
      if (typeof value.active !== "boolean") return void 0;
      return value;
    case "network":
      if (!hasExactKeys(value, [...BASE_KEYS, "online"])) return void 0;
      if (typeof value.online !== "boolean") return void 0;
      return value;
    default:
      return void 0;
  }
}

// ../embed-protocol/src/transport.ts
function read(raw, parse) {
  if (typeof raw !== "string" || raw.length === 0) return { ok: false, reason: "undecodable" };
  if (utf8ByteLength(raw) > MAX_BRIDGE_MESSAGE_BYTES) return { ok: false, reason: "too-large" };
  const decoded = decodeBase64UrlJson(raw);
  if (decoded === void 0) return { ok: false, reason: "undecodable" };
  const message = parse(decoded);
  if (message === void 0) return { ok: false, reason: "invalid" };
  return { ok: true, message };
}
function readBridgeNativeCommand(raw) {
  return read(raw, parseBridgeNativeCommand);
}
function encodeBridgeMessage(message) {
  const encoded = encodeBase64UrlJson(message);
  if (encoded.length > MAX_BRIDGE_MESSAGE_BYTES) return void 0;
  return encoded;
}

// ../embed-protocol/src/entry-url.ts
function readParam(search, key) {
  const query = search.charAt(0) === "?" ? search.slice(1) : search;
  if (query.length === 0) return null;
  for (const pair of query.split("&")) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    if (pair.slice(0, eq) === key) return pair.slice(eq + 1);
  }
  return null;
}
function hasNativeMarker(search) {
  return readParam(search, NATIVE_MARKER_PARAM) === NATIVE_MARKER_VALUE;
}
function readNativeEntry(search) {
  if (!hasNativeMarker(search)) return null;
  const attemptId = readParam(search, NATIVE_ATTEMPT_PARAM);
  const nonce = readParam(search, NATIVE_NONCE_PARAM);
  const protocol = Number(readParam(search, NATIVE_PROTOCOL_PARAM));
  if (!isBridgeId(attemptId) || !isBridgeId(nonce)) return null;
  if (protocol !== NATIVE_PROTOCOL_VERSION) return null;
  return { attemptId, nonce, protocol };
}
function decodeAsciiEscapes(text) {
  if (text.indexOf("%") === -1) return text;
  return text.replace(/%([0-9A-Fa-f]{2})/g, (escape, hex) => {
    const code = parseInt(hex, 16);
    return code < 128 ? String.fromCharCode(code) : escape;
  });
}
function pairKey(pair) {
  const eq = pair.indexOf("=");
  const raw = eq === -1 ? pair : pair.slice(0, eq);
  return decodeAsciiEscapes(raw.indexOf("+") === -1 ? raw : raw.split("+").join(" "));
}
function stripReturnMarker(search) {
  return stripPairs(search, [RETURN_MARKER_PARAM]);
}
var NATIVE_ENTRY_PARAMS = [
  NATIVE_MARKER_PARAM,
  NATIVE_PROTOCOL_PARAM,
  NATIVE_ATTEMPT_PARAM,
  NATIVE_NONCE_PARAM,
  NATIVE_CAPS_PARAM
];
function stripNativeEntry(search) {
  return stripPairs(search, NATIVE_ENTRY_PARAMS);
}
function stripPairs(search, keys) {
  const query = search.charAt(0) === "?" ? search.slice(1) : search;
  if (query.length === 0) return "";
  const pairs = query.split("&");
  const kept = pairs.filter((pair) => !keys.includes(pairKey(pair)));
  if (kept.length === pairs.length) return `?${query}`;
  const rest = kept.join("&");
  return rest.length === 0 ? "" : `?${rest}`;
}
var QUERY_VERBATIM_RE = /^[!$-&(-;=?-~]+$/;
function sanitizePassthroughQuery(search, reservedKeys) {
  if (typeof search !== "string") return "";
  let query = search.charAt(0) === "?" ? search.slice(1) : search;
  const fragmentAt = query.indexOf("#");
  if (fragmentAt !== -1) query = query.slice(0, fragmentAt);
  if (query.length === 0 || !QUERY_VERBATIM_RE.test(query)) return "";
  const kept = query.split("&").filter((pair) => {
    if (pair.length === 0) return false;
    const key = pairKey(pair);
    return !key.startsWith(RESERVED_QUERY_PREFIX) && !reservedKeys.includes(key);
  });
  const passthrough = kept.join("&");
  return passthrough.length > MAX_ENTRY_QUERY_LENGTH ? "" : passthrough;
}
var HASH_VERBATIM_RE = /^#[!#-;=?-_a-~]+$/;
function sanitizeEntryHash(hash) {
  if (typeof hash !== "string") return "";
  if (hash.length < 2 || hash.length > MAX_ENTRY_HASH_LENGTH) return "";
  if (!HASH_VERBATIM_RE.test(hash)) return "";
  if (decodeAsciiEscapes(hash).includes(RESERVED_QUERY_PREFIX)) return "";
  return hash;
}
var HOST_NAME_RE = /^[a-z0-9._-]+$/;
var HOST_IPV6_RE = /^\[[0-9a-f:.]+\]$/;
function isHost(host) {
  return HOST_NAME_RE.test(host) && /[a-z0-9]/.test(host) || HOST_IPV6_RE.test(host);
}
function httpOrigin(value) {
  const head = value.slice(0, 8).toLowerCase();
  const scheme = head === "https://" ? "https" : head.slice(0, 7) === "http://" ? "http" : null;
  if (scheme === null) return null;
  const start = scheme.length + 3;
  let end = value.length;
  for (let i = start; i < value.length; i++) {
    const c = value.charAt(i);
    if (c === "/" || c === "?" || c === "#" || c === "\\") {
      end = i;
      break;
    }
  }
  if (end - start > 255) return null;
  const authority = value.slice(start, end).toLowerCase();
  if (authority.length === 0 || authority.indexOf("@") !== -1) return null;
  let host = authority;
  let port = "";
  const colon = authority.lastIndexOf(":");
  if (colon !== -1 && authority.charAt(authority.length - 1) !== "]") {
    host = authority.slice(0, colon);
    port = authority.slice(colon + 1);
  }
  if (!isHost(host)) return null;
  if (port.length > 0) {
    if (!/^[0-9]{1,5}$/.test(port)) return null;
    const number = Number(port);
    if (number > 65535) return null;
    port = number === (scheme === "https" ? 443 : 80) ? "" : `:${number}`;
  }
  return `${scheme}://${host}${port}`;
}
function sanitizeEntryReferrer(value, ownOrigin) {
  if (typeof value !== "string" || value.length === 0) return null;
  const origin = httpOrigin(value);
  if (origin === null || origin.length > MAX_ENTRY_REFERRER_LENGTH) return null;
  if (typeof ownOrigin === "string" && httpOrigin(ownOrigin) === origin) return null;
  return origin;
}

// ../embed-protocol/src/platform.ts
var PLATFORM_REQUEST_TYPE = "genex:platform:request";
var PLATFORM_RESULT_TYPE = "genex:platform:result";
var PLATFORM_PROTOCOL_VERSION = 1;
var PLATFORM_CAPS = ["open", "save", "fullscreen"];
var PLATFORM_ERRORS = [
  "unsupported",
  "needs_gesture",
  "dismissed",
  "busy",
  "rate_limited",
  "invalid_request",
  "too_large",
  "timeout"
];
var MAX_PLATFORM_URL_LENGTH = 2048;
var MAX_SAVE_NAME_LENGTH = 128;
var SAVE_MIME_ALLOWLIST = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/webm",
  "video/mp4",
  "application/json",
  "text/plain"
];
var SAVE_MAX_BYTES = 50 * 1024 * 1024;
var MAX_ADVERTISED_CAPS = 16;
var MAX_MIME_LENGTH = 255;
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasExactKeys2(value, keys) {
  const own = Object.keys(value);
  if (own.length !== keys.length) return false;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return false;
  }
  return true;
}
function isPlatformCap(value) {
  return typeof value === "string" && PLATFORM_CAPS.includes(value);
}
function isPlatformError(value) {
  return typeof value === "string" && PLATFORM_ERRORS.includes(value);
}
function readPlatformCaps(value) {
  if (!Array.isArray(value)) return [];
  const caps = [];
  const count = Math.min(value.length, MAX_ADVERTISED_CAPS);
  for (let i = 0; i < count; i++) {
    const cap = value[i];
    if (isPlatformCap(cap) && !caps.includes(cap)) caps.push(cap);
  }
  return caps;
}
var VISIBLE_ASCII_RE = /^[!-~]+$/;
function isPlatformUrl(value) {
  if (typeof value !== "string" || value.length > MAX_PLATFORM_URL_LENGTH) return false;
  if (value.slice(0, 8) !== "https://" || !VISIBLE_ASCII_RE.test(value)) return false;
  return httpOrigin(value) !== null;
}
var SAVE_NAME_REFUSED_RE = /[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069\/\\]/;
function isSaveName(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= MAX_SAVE_NAME_LENGTH && !SAVE_NAME_REFUSED_RE.test(value);
}
function savableMime(type) {
  if (typeof type !== "string" || type.length > MAX_MIME_LENGTH) return null;
  const semicolon = type.indexOf(";");
  const essence = (semicolon === -1 ? type : type.slice(0, semicolon)).trim().toLowerCase();
  for (const mime of SAVE_MIME_ALLOWLIST) {
    if (mime === essence) return mime;
  }
  return null;
}
function isSavableFile(value) {
  if (typeof value !== "object" || value === null) return false;
  const tag = Object.prototype.toString.call(value);
  if (tag !== "[object Blob]" && tag !== "[object File]") return false;
  const file = value;
  return typeof file.size === "number" && Number.isInteger(file.size) && file.size >= 0 && file.size <= SAVE_MAX_BYTES && savableMime(file.type) !== null;
}
var OPEN_KEYS = ["type", "v", "id", "cap", "url"];
var SAVE_KEYS = ["type", "v", "id", "cap", "name", "file"];
var FULLSCREEN_KEYS = ["type", "v", "id", "cap", "on"];
function parsePlatformRequest(value) {
  if (!isRecord2(value)) return void 0;
  if (value.type !== PLATFORM_REQUEST_TYPE || value.v !== PLATFORM_PROTOCOL_VERSION) return void 0;
  if (!isBridgeId(value.id)) return void 0;
  const base = { type: PLATFORM_REQUEST_TYPE, v: PLATFORM_PROTOCOL_VERSION, id: value.id };
  switch (value.cap) {
    case "open":
      if (!hasExactKeys2(value, OPEN_KEYS) || !isPlatformUrl(value.url)) return void 0;
      return { ...base, cap: "open", url: value.url };
    case "save":
      if (!hasExactKeys2(value, SAVE_KEYS)) return void 0;
      if (!isSaveName(value.name) || !isSavableFile(value.file)) return void 0;
      return { ...base, cap: "save", name: value.name, file: value.file };
    case "fullscreen":
      if (!hasExactKeys2(value, FULLSCREEN_KEYS) || typeof value.on !== "boolean") return void 0;
      return { ...base, cap: "fullscreen", on: value.on };
    default:
      return void 0;
  }
}
var RESULT_OK_KEYS = ["type", "v", "id", "ok"];
var RESULT_FAILED_KEYS = ["type", "v", "id", "ok", "code"];
function parsePlatformResult(value) {
  if (!isRecord2(value)) return void 0;
  if (value.type !== PLATFORM_RESULT_TYPE || value.v !== PLATFORM_PROTOCOL_VERSION) return void 0;
  if (!isBridgeId(value.id)) return void 0;
  const base = { type: PLATFORM_RESULT_TYPE, v: PLATFORM_PROTOCOL_VERSION, id: value.id };
  if (value.ok === true) {
    return hasExactKeys2(value, RESULT_OK_KEYS) ? { ...base, ok: true } : void 0;
  }
  if (value.ok === false) {
    if (!hasExactKeys2(value, RESULT_FAILED_KEYS) || !isPlatformError(value.code)) return void 0;
    return { ...base, ok: false, code: value.code };
  }
  return void 0;
}

// ../embed-protocol/src/runtime-generation.ts
function isGenerationId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}
function parseGenerationStreamEvent(event, data) {
  let value;
  try {
    value = JSON.parse(data);
  } catch {
    return void 0;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
  const fields = value;
  if (event === "start") return isGenerationId(fields.generationId) ? { event, data: { generationId: fields.generationId } } : void 0;
  if (event === "delta") return typeof fields.text === "string" ? { event, data: { text: fields.text } } : void 0;
  if (event === "done") return isGenerationId(fields.id) && typeof fields.status === "string" ? { event, data: value } : void 0;
  return void 0;
}
function isGenerationTerminal(status) {
  return ["succeeded", "failed", "unknown", "canceled", "expired"].includes(status);
}

// ../embed-protocol/src/ids.ts
var HEX = "0123456789abcdef";
function createBridgeId(random = Math.random) {
  let out = "";
  for (let i = 0; i < BRIDGE_ID_LENGTH; i++) {
    const index = Math.min(15, Math.max(0, random() * 16 | 0));
    out += HEX[index];
  }
  return out;
}

export {
  NATIVE_CHANNEL,
  NATIVE_PROTOCOL_VERSION,
  RESERVED_QUERY_PREFIX,
  DASHBOARD_RESERVED_KEYS,
  AUTHORIZE_ENTRY_REF_PARAM,
  ENTRY_HASH_KEY,
  ENTRY_REFERRER_KEY,
  EMBED_REFERRER_PARAM,
  MAX_ENTRY_QUERY_LENGTH,
  MAX_RETURN_TO_LENGTH,
  NATIVE_RECEIVER,
  createBridgeId,
  readBridgeNativeCommand,
  encodeBridgeMessage,
  hasNativeMarker,
  readNativeEntry,
  stripReturnMarker,
  stripNativeEntry,
  sanitizePassthroughQuery,
  sanitizeEntryHash,
  sanitizeEntryReferrer,
  PLATFORM_REQUEST_TYPE,
  PLATFORM_PROTOCOL_VERSION,
  SAVE_MAX_BYTES,
  readPlatformCaps,
  isPlatformUrl,
  isSaveName,
  savableMime,
  parsePlatformRequest,
  parsePlatformResult,
  isGenerationId,
  parseGenerationStreamEvent,
  isGenerationTerminal
};

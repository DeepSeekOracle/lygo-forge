var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@colyseus/schema/build/index.mjs
var SWITCH_TO_STRUCTURE = 255;
var TYPE_ID = 213;
var OPERATION;
(function(OPERATION2) {
  OPERATION2[OPERATION2["ADD"] = 128] = "ADD";
  OPERATION2[OPERATION2["REPLACE"] = 0] = "REPLACE";
  OPERATION2[OPERATION2["DELETE"] = 64] = "DELETE";
  OPERATION2[OPERATION2["DELETE_AND_MOVE"] = 96] = "DELETE_AND_MOVE";
  OPERATION2[OPERATION2["MOVE_AND_ADD"] = 160] = "MOVE_AND_ADD";
  OPERATION2[OPERATION2["DELETE_AND_ADD"] = 192] = "DELETE_AND_ADD";
  OPERATION2[OPERATION2["CLEAR"] = 10] = "CLEAR";
  OPERATION2[OPERATION2["REVERSE"] = 15] = "REVERSE";
  OPERATION2[OPERATION2["MOVE"] = 32] = "MOVE";
  OPERATION2[OPERATION2["DELETE_BY_REFID"] = 33] = "DELETE_BY_REFID";
  OPERATION2[OPERATION2["ADD_BY_REFID"] = 129] = "ADD_BY_REFID";
})(OPERATION || (OPERATION = {}));
Symbol.metadata ??= /* @__PURE__ */ Symbol.for("Symbol.metadata");
function shadowMetadata(ctor) {
  Object.defineProperty(ctor, Symbol.metadata, {
    value: void 0,
    writable: true,
    configurable: true,
    enumerable: false
  });
}
var _g = (function() {
  if (typeof globalThis !== "undefined")
    return globalThis;
  if (typeof global !== "undefined")
    return global;
  if (typeof self !== "undefined")
    return self;
  if (typeof window !== "undefined")
    return window;
  return {};
})();
if (typeof Symbol === "function" && typeof Symbol.for !== "function") {
  const REGISTRY_KEY = "colyseus.symbolRegistry";
  const registry = _g[REGISTRY_KEY] || (_g[REGISTRY_KEY] = /* @__PURE__ */ Object.create(null));
  Symbol.for = function(key) {
    return registry[key] || (registry[key] = Symbol(key));
  };
  Symbol.keyFor = function(sym) {
    for (const k in registry)
      if (registry[k] === sym)
        return k;
    return void 0;
  };
}
var $refId = /* @__PURE__ */ Symbol.for("$refId");
var $track = "~track";
var $encoder = "~encoder";
var $decoder = "~decoder";
var $filter = "~filter";
var $getByIndex = "~getByIndex";
var $deleteByIndex = "~deleteByIndex";
var $resyncPrune = "~resyncPrune";
var $changes = /* @__PURE__ */ Symbol.for("$changes");
var $childType = /* @__PURE__ */ Symbol.for("$childType");
var $proxyTarget = /* @__PURE__ */ Symbol.for("$proxyTarget");
var $onEncodeEnd = "~onEncodeEnd";
var $reset = "~reset";
var $onDecodeEnd = "~onDecodeEnd";
var $values = /* @__PURE__ */ Symbol.for("$values");
var $builder = "~builder";
var $descriptors = "~descriptors";
var $encodeDescriptor = "~__encodeDescriptor";
var $encoders = "~encoders";
var $numFields = "~__numFields";
var $refTypeFieldIndexes = "~__refTypeFieldIndexes";
var $viewFieldIndexes = "~__viewFieldIndexes";
var $fieldIndexesByViewTag = "$__fieldIndexesByViewTag";
var $unreliableFieldIndexes = "~__unreliableFieldIndexes";
var $patchOnlyFieldIndexes = "~__patchOnlyFieldIndexes";
var $fullSyncSkipIndexes = "~__fullSyncSkipIndexes";
var $fullStateOnlyFieldIndexes = "~__fullStateOnlyFieldIndexes";
var $streamFieldIndexes = "~__streamFieldIndexes";
var $streamPriorities = "~__streamPriorities";
var textEncoder;
try {
  textEncoder = new TextEncoder();
} catch (e) {
}
var _convoBuffer$1 = new ArrayBuffer(8);
var _int32$1 = new Int32Array(_convoBuffer$1);
var _float32$1 = new Float32Array(_convoBuffer$1);
var _float64$1 = new Float64Array(_convoBuffer$1);
var _int64$1 = new BigInt64Array(_convoBuffer$1);
var hasBufferByteLength = typeof Buffer !== "undefined" && Buffer.byteLength;
var utf8Length = hasBufferByteLength ? Buffer.byteLength : function(str, _) {
  var c = 0, length = 0;
  for (var i = 0, l = str.length; i < l; i++) {
    c = str.charCodeAt(i);
    if (c < 128) {
      length += 1;
    } else if (c < 2048) {
      length += 2;
    } else if (c < 55296 || c >= 57344) {
      length += 3;
    } else {
      i++;
      length += 4;
    }
  }
  return length;
};
function utf8Write(view2, str, it) {
  var c = 0;
  for (var i = 0, l = str.length; i < l; i++) {
    c = str.charCodeAt(i);
    if (c < 128) {
      view2[it.offset++] = c;
    } else if (c < 2048) {
      view2[it.offset] = 192 | c >> 6;
      view2[it.offset + 1] = 128 | c & 63;
      it.offset += 2;
    } else if (c < 55296 || c >= 57344) {
      view2[it.offset] = 224 | c >> 12;
      view2[it.offset + 1] = 128 | c >> 6 & 63;
      view2[it.offset + 2] = 128 | c & 63;
      it.offset += 3;
    } else {
      i++;
      c = 65536 + ((c & 1023) << 10 | str.charCodeAt(i) & 1023);
      view2[it.offset] = 240 | c >> 18;
      view2[it.offset + 1] = 128 | c >> 12 & 63;
      view2[it.offset + 2] = 128 | c >> 6 & 63;
      view2[it.offset + 3] = 128 | c & 63;
      it.offset += 4;
    }
  }
}
function int8$1(bytes, value, it) {
  bytes[it.offset++] = value & 255;
}
function uint8$1(bytes, value, it) {
  bytes[it.offset++] = value & 255;
}
function int16$1(bytes, value, it) {
  bytes[it.offset++] = value & 255;
  bytes[it.offset++] = value >> 8 & 255;
}
function uint16$1(bytes, value, it) {
  bytes[it.offset++] = value & 255;
  bytes[it.offset++] = value >> 8 & 255;
}
function int32$1(bytes, value, it) {
  bytes[it.offset++] = value & 255;
  bytes[it.offset++] = value >> 8 & 255;
  bytes[it.offset++] = value >> 16 & 255;
  bytes[it.offset++] = value >> 24 & 255;
}
function uint32$1(bytes, value, it) {
  const b4 = value >> 24;
  const b3 = value >> 16;
  const b2 = value >> 8;
  const b1 = value;
  bytes[it.offset++] = b1 & 255;
  bytes[it.offset++] = b2 & 255;
  bytes[it.offset++] = b3 & 255;
  bytes[it.offset++] = b4 & 255;
}
function int64$1(bytes, value, it) {
  const high = Math.floor(value / Math.pow(2, 32));
  const low = value >>> 0;
  uint32$1(bytes, low, it);
  uint32$1(bytes, high, it);
}
function uint64$1(bytes, value, it) {
  const high = value / Math.pow(2, 32) >> 0;
  const low = value >>> 0;
  uint32$1(bytes, low, it);
  uint32$1(bytes, high, it);
}
function bigint64$1(bytes, value, it) {
  _int64$1[0] = BigInt.asIntN(64, value);
  int32$1(bytes, _int32$1[0], it);
  int32$1(bytes, _int32$1[1], it);
}
function biguint64$1(bytes, value, it) {
  _int64$1[0] = BigInt.asIntN(64, value);
  int32$1(bytes, _int32$1[0], it);
  int32$1(bytes, _int32$1[1], it);
}
function float32$1(bytes, value, it) {
  _float32$1[0] = value;
  int32$1(bytes, _int32$1[0], it);
}
function float64$1(bytes, value, it) {
  _float64$1[0] = value;
  int32$1(bytes, _int32$1[0], it);
  int32$1(bytes, _int32$1[1], it);
}
function boolean$1(bytes, value, it) {
  bytes[it.offset++] = value ? 1 : 0;
}
function string$1(bytes, value, it) {
  if (!value) {
    value = "";
  }
  let length = utf8Length(value, "utf8");
  let size = 0;
  if (length < 32) {
    bytes[it.offset++] = length | 160;
    size = 1;
  } else if (length < 256) {
    bytes[it.offset++] = 217;
    bytes[it.offset++] = length;
    size = 2;
  } else if (length < 65536) {
    bytes[it.offset++] = 218;
    uint16$1(bytes, length, it);
    size = 3;
  } else if (length < 4294967296) {
    bytes[it.offset++] = 219;
    uint32$1(bytes, length, it);
    size = 5;
  } else {
    throw new Error("String too long");
  }
  utf8Write(bytes, value, it);
  return size + length;
}
function number$1(bytes, value, it) {
  if (isNaN(value)) {
    return number$1(bytes, 0, it);
  } else if (!isFinite(value)) {
    return number$1(bytes, value > 0 ? Number.MAX_SAFE_INTEGER : -Number.MAX_SAFE_INTEGER, it);
  } else if (value !== (value | 0)) {
    if (Math.abs(value) <= 34028235e31) {
      _float32$1[0] = value;
      if (Math.abs(Math.abs(_float32$1[0]) - Math.abs(value)) < 1e-4) {
        bytes[it.offset++] = 202;
        float32$1(bytes, value, it);
        return 5;
      }
    }
    bytes[it.offset++] = 203;
    float64$1(bytes, value, it);
    return 9;
  }
  if (value >= 0) {
    if (value < 128) {
      bytes[it.offset++] = value & 255;
      return 1;
    }
    if (value < 256) {
      bytes[it.offset++] = 204;
      bytes[it.offset++] = value & 255;
      return 2;
    }
    if (value < 65536) {
      bytes[it.offset++] = 205;
      uint16$1(bytes, value, it);
      return 3;
    }
    if (value < 4294967296) {
      bytes[it.offset++] = 206;
      uint32$1(bytes, value, it);
      return 5;
    }
    bytes[it.offset++] = 207;
    uint64$1(bytes, value, it);
    return 9;
  } else {
    if (value >= -32) {
      bytes[it.offset++] = 224 | value + 32;
      return 1;
    }
    if (value >= -128) {
      bytes[it.offset++] = 208;
      int8$1(bytes, value, it);
      return 2;
    }
    if (value >= -32768) {
      bytes[it.offset++] = 209;
      int16$1(bytes, value, it);
      return 3;
    }
    if (value >= -2147483648) {
      bytes[it.offset++] = 210;
      int32$1(bytes, value, it);
      return 5;
    }
    bytes[it.offset++] = 211;
    int64$1(bytes, value, it);
    return 9;
  }
}
var encode = {
  int8: int8$1,
  uint8: uint8$1,
  int16: int16$1,
  uint16: uint16$1,
  int32: int32$1,
  uint32: uint32$1,
  int64: int64$1,
  uint64: uint64$1,
  bigint64: bigint64$1,
  biguint64: biguint64$1,
  float32: float32$1,
  float64: float64$1,
  boolean: boolean$1,
  string: string$1,
  number: number$1,
  utf8Write,
  utf8Length
};
var _convoBuffer = new ArrayBuffer(8);
var _int32 = new Int32Array(_convoBuffer);
var _float32 = new Float32Array(_convoBuffer);
var _float64 = new Float64Array(_convoBuffer);
var _uint64 = new BigUint64Array(_convoBuffer);
var _int64 = new BigInt64Array(_convoBuffer);
function utf8Read(bytes, it, length) {
  if (length > bytes.length - it.offset) {
    length = bytes.length - it.offset;
  }
  var string2 = "", chr = 0;
  for (var i = it.offset, end = it.offset + length; i < end; i++) {
    var byte = bytes[i];
    if ((byte & 128) === 0) {
      string2 += String.fromCharCode(byte);
      continue;
    }
    if ((byte & 224) === 192) {
      string2 += String.fromCharCode((byte & 31) << 6 | bytes[++i] & 63);
      continue;
    }
    if ((byte & 240) === 224) {
      string2 += String.fromCharCode((byte & 15) << 12 | (bytes[++i] & 63) << 6 | (bytes[++i] & 63) << 0);
      continue;
    }
    if ((byte & 248) === 240) {
      chr = (byte & 7) << 18 | (bytes[++i] & 63) << 12 | (bytes[++i] & 63) << 6 | (bytes[++i] & 63) << 0;
      if (chr >= 65536) {
        chr -= 65536;
        string2 += String.fromCharCode((chr >>> 10) + 55296, (chr & 1023) + 56320);
      } else {
        string2 += String.fromCharCode(chr);
      }
      continue;
    }
    console.error("decode.utf8Read(): Invalid byte " + byte + " at offset " + i + ". Skip to end of string: " + (it.offset + length));
    break;
  }
  it.offset += length;
  return string2;
}
function int8(bytes, it) {
  return uint8(bytes, it) << 24 >> 24;
}
function uint8(bytes, it) {
  return bytes[it.offset++];
}
function int16(bytes, it) {
  return uint16(bytes, it) << 16 >> 16;
}
function uint16(bytes, it) {
  return bytes[it.offset++] | bytes[it.offset++] << 8;
}
function int32(bytes, it) {
  return bytes[it.offset++] | bytes[it.offset++] << 8 | bytes[it.offset++] << 16 | bytes[it.offset++] << 24;
}
function uint32(bytes, it) {
  return int32(bytes, it) >>> 0;
}
function float32(bytes, it) {
  _int32[0] = int32(bytes, it);
  return _float32[0];
}
function float64(bytes, it) {
  _int32[0] = int32(bytes, it);
  _int32[1] = int32(bytes, it);
  return _float64[0];
}
function int64(bytes, it) {
  const low = uint32(bytes, it);
  const high = int32(bytes, it) * Math.pow(2, 32);
  return high + low;
}
function uint64(bytes, it) {
  const low = uint32(bytes, it);
  const high = uint32(bytes, it) * Math.pow(2, 32);
  return high + low;
}
function bigint64(bytes, it) {
  _int32[0] = int32(bytes, it);
  _int32[1] = int32(bytes, it);
  return _int64[0];
}
function biguint64(bytes, it) {
  _int32[0] = int32(bytes, it);
  _int32[1] = int32(bytes, it);
  return _uint64[0];
}
function boolean(bytes, it) {
  return uint8(bytes, it) > 0;
}
function string(bytes, it) {
  const prefix = bytes[it.offset++];
  let length;
  if (prefix < 192) {
    length = prefix & 31;
  } else if (prefix === 217) {
    length = uint8(bytes, it);
  } else if (prefix === 218) {
    length = uint16(bytes, it);
  } else if (prefix === 219) {
    length = uint32(bytes, it);
  }
  return utf8Read(bytes, it, length);
}
function number(bytes, it) {
  const prefix = bytes[it.offset++];
  if (prefix < 128) {
    return prefix;
  } else if (prefix === 202) {
    return float32(bytes, it);
  } else if (prefix === 203) {
    return float64(bytes, it);
  } else if (prefix === 204) {
    return uint8(bytes, it);
  } else if (prefix === 205) {
    return uint16(bytes, it);
  } else if (prefix === 206) {
    return uint32(bytes, it);
  } else if (prefix === 207) {
    return uint64(bytes, it);
  } else if (prefix === 208) {
    return int8(bytes, it);
  } else if (prefix === 209) {
    return int16(bytes, it);
  } else if (prefix === 210) {
    return int32(bytes, it);
  } else if (prefix === 211) {
    return int64(bytes, it);
  } else if (prefix > 223) {
    return (255 - prefix + 1) * -1;
  }
}
function stringCheck(bytes, it) {
  const prefix = bytes[it.offset];
  return (
    // fixstr
    prefix < 192 && prefix > 160 || // str 8
    prefix === 217 || // str 16
    prefix === 218 || // str 32
    prefix === 219
  );
}
var decode = {
  utf8Read,
  int8,
  uint8,
  int16,
  uint16,
  int32,
  uint32,
  float32,
  float64,
  int64,
  uint64,
  bigint64,
  biguint64,
  boolean,
  string,
  number,
  stringCheck
};
var registeredTypes = {};
var identifiers = /* @__PURE__ */ new Map();
function registerType(identifier, definition) {
  if (definition.constructor) {
    if (Object.prototype.hasOwnProperty.call(definition, "constructor") && definition.constructor[Symbol.metadata] == null) {
      shadowMetadata(definition.constructor);
    }
    identifiers.set(definition.constructor, identifier);
    registeredTypes[identifier] = definition;
  }
  if (definition.encode) {
    encode[identifier] = definition.encode;
  }
  if (definition.decode) {
    decode[identifier] = definition.decode;
  }
}
function getType(identifier) {
  return registeredTypes[identifier];
}
var ARRAY_STREAM_NOT_SUPPORTED = "ArraySchema does not support streaming \u2014 positional ops (splice / unshift / reverse) shift subsequent indexes, so holding ADDs back for a later tick under `maxPerTick` would desync the decoder. Use `t.stream(X)` (stable monotonic positions) or `t.map(X).stream()` (stable keys) instead.";
function createStreamableState() {
  return {
    pendingByView: /* @__PURE__ */ new Map(),
    sentByView: /* @__PURE__ */ new Map(),
    broadcastPending: /* @__PURE__ */ new Set(),
    sentBroadcast: /* @__PURE__ */ new Set(),
    broadcastDeletes: /* @__PURE__ */ new Set(),
    maxPerTick: 32
  };
}
function ensureStreamState(s) {
  return s._stream ??= createStreamableState();
}
function streamRouteAdd(s, root, index) {
  if (root.activeViews.size === 0) {
    ensureStreamState(s).broadcastPending.add(index);
  }
}
function streamRouteRemove(s, root, refId, index) {
  const st = s._stream;
  if (st === void 0)
    return true;
  let neverSent = false;
  if (st.broadcastPending.delete(index)) {
    neverSent = true;
  } else if (st.sentBroadcast.delete(index)) {
    st.broadcastDeletes.add(index);
  }
  root.forEachActiveView((view2) => {
    const pending = st.pendingByView.get(view2.id);
    if (pending?.has(index)) {
      pending.delete(index);
      neverSent = true;
      return;
    }
    const sent = st.sentByView.get(view2.id);
    if (sent?.has(index)) {
      sent.delete(index);
      let changes = view2.changes.get(refId);
      if (changes === void 0) {
        changes = /* @__PURE__ */ new Map();
        view2.changes.set(refId, changes);
      }
      changes.set(index, OPERATION.DELETE);
    }
  });
  return neverSent;
}
function streamRouteClear(s, root, refId) {
  const st = s._stream;
  if (st === void 0)
    return;
  st.broadcastPending.clear();
  for (const index of st.sentBroadcast)
    st.broadcastDeletes.add(index);
  st.sentBroadcast.clear();
  root.forEachActiveView((view2) => {
    st.pendingByView.get(view2.id)?.clear();
    const sent = st.sentByView.get(view2.id);
    if (sent !== void 0 && sent.size > 0) {
      let changes = view2.changes.get(refId);
      if (changes === void 0) {
        changes = /* @__PURE__ */ new Map();
        view2.changes.set(refId, changes);
      }
      for (const index of sent)
        changes.set(index, OPERATION.DELETE);
      sent.clear();
    }
  });
}
function streamHasViewBacklog(s, root) {
  const byView = s._stream?.pendingByView;
  if (byView === void 0)
    return false;
  for (const [viewId, pending] of byView) {
    if (pending.size > 0 && root.activeViews.get(viewId)?.deref() !== void 0)
      return true;
  }
  return false;
}
function streamHasBroadcastBacklog(s) {
  const st = s._stream;
  return st !== void 0 && (st.broadcastPending.size > 0 || st.broadcastDeletes.size > 0);
}
function streamEnqueueForView(s, viewId, index) {
  const st = ensureStreamState(s);
  let pending = st.pendingByView.get(viewId);
  if (pending === void 0) {
    pending = /* @__PURE__ */ new Set();
    st.pendingByView.set(viewId, pending);
  }
  pending.add(index);
}
function streamDropView(s, viewId) {
  const st = s._stream;
  if (st === void 0)
    return;
  st.pendingByView.delete(viewId);
  st.sentByView.delete(viewId);
  st.priorityByView?.delete(viewId);
}
var WIRE_BY_BITS = {
  8: "uint8",
  16: "uint16",
  32: "uint32"
};
function resolveQuantize(opts) {
  if (opts == null || typeof opts !== "object") {
    throw new Error("t.quantized(): options object with { min, max } is required.");
  }
  const { min, max } = opts;
  if (typeof min !== "number" || typeof max !== "number" || !(max > min) || !Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error(`t.quantized(): require finite min < max (got min=${min}, max=${max}).`);
  }
  const bits = opts.bits ?? 16;
  if (bits !== 8 && bits !== 16 && bits !== 32) {
    throw new Error(`t.quantized(): bits must be 8, 16 or 32 (got ${bits}).`);
  }
  const mode = opts.mode ?? "clamp";
  if (mode !== "clamp" && mode !== "wrap") {
    throw new Error(`t.quantized(): mode must be "clamp" or "wrap" (got ${JSON.stringify(mode)}).`);
  }
  const wrap = mode === "wrap";
  const steps = Math.pow(2, bits);
  return {
    min,
    max,
    bits,
    wrap,
    wire: WIRE_BY_BITS[bits],
    range: max - min,
    // wrapping spreads `2^bits` steps across [min,max) (top ≡ bottom); clamped
    // maps the endpoints onto `0` and `2^bits − 1` inclusive — one fewer on a
    // symmetric range so zero lands on a step too. Ports must match this rule.
    span: wrap ? steps : min === -max ? steps - 2 : steps - 1
  };
}
function isQuantizedType(type) {
  return type !== null && typeof type === "object" && type.quantized !== void 0;
}
function quantize(desc, value) {
  if (desc.wrap) {
    if (!Number.isFinite(value))
      return 0;
    const range = desc.range;
    let a = (value - desc.min) % range;
    if (a < 0)
      a += range;
    const steps = desc.span;
    return Math.floor(a / range * steps + 0.5) % steps;
  }
  if (value !== value)
    return 0;
  const v = value < desc.min ? desc.min : value > desc.max ? desc.max : value;
  return Math.floor((v - desc.min) / desc.range * desc.span + 0.5);
}
function dequantize(desc, q) {
  return desc.min + q / desc.span * desc.range;
}
function makeQuantizedEncoder(desc) {
  const writeWire = encode[desc.wire];
  return (bytes, value, it) => writeWire(bytes, quantize(desc, value), it);
}
function decodeQuantized(desc, bytes, it) {
  const readWire = decode[desc.wire];
  return dequantize(desc, readWire(bytes, it));
}
var TypeContext = class _TypeContext {
  types = {};
  schemas = /* @__PURE__ */ new Map();
  hasFilters = false;
  /**
   * For inheritance support
   * Keeps track of which classes extends which. (parent -> children)
   *
   * Both are weak: `Reflection.decode()` makes new classes on every
   * handshake (an SDK's state and `room.input()` class per join), and they
   * must go away with their decoder instead of living here forever.
   */
  static inheritedTypes = /* @__PURE__ */ new WeakMap();
  static cachedContexts = /* @__PURE__ */ new WeakMap();
  static register(target) {
    const parent = Object.getPrototypeOf(target);
    if (parent !== Schema) {
      let inherits = _TypeContext.inheritedTypes.get(parent);
      if (!inherits) {
        inherits = /* @__PURE__ */ new Set();
        _TypeContext.inheritedTypes.set(parent, inherits);
      }
      inherits.add(target);
    }
  }
  static cache(rootClass) {
    let context = _TypeContext.cachedContexts.get(rootClass);
    if (!context) {
      context = new _TypeContext(rootClass);
      _TypeContext.cachedContexts.set(rootClass, context);
    }
    return context;
  }
  constructor(rootClass) {
    if (rootClass) {
      this.discoverTypes(rootClass);
    }
  }
  has(schema2) {
    return this.schemas.has(schema2);
  }
  get(typeid) {
    return this.types[typeid];
  }
  add(schema2, typeid = this.schemas.size) {
    if (this.schemas.has(schema2)) {
      return false;
    }
    this.types[typeid] = schema2;
    if (schema2[Symbol.metadata] == null) {
      Metadata.initialize(schema2);
    }
    this.schemas.set(schema2, typeid);
    return true;
  }
  getTypeId(klass) {
    return this.schemas.get(klass);
  }
  discoverTypes(klass) {
    if (!this.add(klass)) {
      return;
    }
    _TypeContext.inheritedTypes.get(klass)?.forEach((child) => {
      this.discoverTypes(child);
    });
    let parent = klass;
    while ((parent = Object.getPrototypeOf(parent)) && parent !== Schema && // stop at root (Schema)
    parent !== Function.prototype) {
      this.discoverTypes(parent);
    }
    const metadata = klass[Symbol.metadata];
    if (metadata[$viewFieldIndexes] || metadata[$streamFieldIndexes]) {
      this.hasFilters = true;
    }
    for (const fieldIndex in metadata) {
      const index = fieldIndex;
      const fieldType = metadata[index].type;
      if (typeof fieldType === "string") {
        continue;
      }
      if (isQuantizedType(fieldType)) {
        continue;
      }
      if (typeof fieldType === "function") {
        this.discoverTypes(fieldType);
      } else {
        const type = Object.values(fieldType)[0];
        if (typeof type === "string") {
          continue;
        }
        this.discoverTypes(type);
      }
    }
  }
  debug() {
    return `TypeContext ->
	Schema types: ${this.schemas.size}
	hasFilters: ${this.hasFilters}`;
  }
};
var MAX_FIELDS = 63;
function resolveFieldType(type) {
  const complexTypeKlass = typeof Object.keys(type)[0] === "string" && getType(Object.keys(type)[0]);
  return {
    complexTypeKlass,
    childType: complexTypeKlass ? Object.values(type)[0] : type
  };
}
function getNormalizedType(type) {
  if (Array.isArray(type)) {
    return { array: getNormalizedType(type[0]) };
  } else if (isQuantizedType(type)) {
    return typeof type.quantized.wire === "string" ? type : { quantized: resolveQuantize(type.quantized) };
  } else if (typeof type["type"] !== "undefined") {
    return type["type"];
  } else if (isTSEnum(type)) {
    return Object.keys(type).every((key) => typeof type[key] === "string") ? "string" : "number";
  } else if (typeof type === "object" && type !== null) {
    const collectionType = Object.keys(type).find((k) => registeredTypes[k] !== void 0);
    if (collectionType) {
      type[collectionType] = getNormalizedType(type[collectionType]);
      return type;
    }
  }
  return type;
}
function isTSEnum(_enum) {
  if (typeof _enum === "function" && _enum[Symbol.metadata]) {
    return false;
  }
  const keys = Object.keys(_enum);
  const numericFields = keys.filter((k) => /\d+/.test(k));
  if (numericFields.length > 0 && numericFields.length === keys.length / 2 && _enum[_enum[numericFields[0]]] == numericFields[0]) {
    return true;
  }
  if (keys.length > 0 && keys.every((key) => typeof _enum[key] === "string" && _enum[key] === key)) {
    return true;
  }
  return false;
}
var INHERITED_ARRAY_KEYS = [
  $refTypeFieldIndexes,
  $unreliableFieldIndexes,
  $patchOnlyFieldIndexes,
  $fullSyncSkipIndexes,
  $fullStateOnlyFieldIndexes,
  $streamFieldIndexes,
  $encoders
];
function pushIndexList(metadata, key, index) {
  if (!metadata[key]) {
    Object.defineProperty(metadata, key, {
      value: [],
      enumerable: false,
      configurable: true,
      writable: true
    });
  }
  metadata[key].push(index);
}
var Metadata = {
  addField(metadata, index, name, type, descriptor) {
    if (index >= MAX_FIELDS) {
      throw new Error(`Can't define field '${name}'.
Schema instances may only have up to ${MAX_FIELDS} fields.`);
    }
    metadata[index] = Object.assign(
      metadata[index] || {},
      // avoid overwriting previous field metadata (@deprecated / @unreliable)
      {
        type: getNormalizedType(type),
        index,
        name
      }
    );
    Object.defineProperty(metadata, $descriptors, {
      value: metadata[$descriptors] || {},
      enumerable: false,
      configurable: true
    });
    if (descriptor) {
      metadata[$descriptors][name] = descriptor;
    } else {
      metadata[$descriptors][name] = {
        value: void 0,
        writable: true,
        enumerable: true,
        configurable: true
      };
    }
    Object.defineProperty(metadata, $numFields, {
      value: index,
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(metadata, name, {
      value: index,
      enumerable: false,
      configurable: true
    });
    if (typeof metadata[index].type !== "string" && !isQuantizedType(metadata[index].type)) {
      if (metadata[$refTypeFieldIndexes] === void 0) {
        Object.defineProperty(metadata, $refTypeFieldIndexes, {
          value: [],
          enumerable: false,
          configurable: true
        });
      }
      metadata[$refTypeFieldIndexes].push(index);
    }
    const t2 = metadata[index].type;
    if (t2 && typeof t2 === "object" && t2["stream"] !== void 0) {
      if (t2.array !== void 0) {
        throw new Error(ARRAY_STREAM_NOT_SUPPORTED);
      }
      metadata[index].stream = true;
      if (!metadata[$streamFieldIndexes]) {
        Object.defineProperty(metadata, $streamFieldIndexes, {
          value: [],
          enumerable: false,
          configurable: true,
          writable: true
        });
      }
      if (!metadata[$streamFieldIndexes].includes(index)) {
        metadata[$streamFieldIndexes].push(index);
      }
      const priorityFn = type?.priority;
      if (typeof priorityFn === "function") {
        Metadata.setStreamPriority(metadata, name, priorityFn);
      }
    }
  },
  setTag(metadata, fieldName, tag) {
    const index = metadata[fieldName];
    const field = metadata[index];
    field.tag = tag;
    if (!metadata[$viewFieldIndexes]) {
      Object.defineProperty(metadata, $viewFieldIndexes, {
        value: [],
        enumerable: false,
        configurable: true
      });
      Object.defineProperty(metadata, $fieldIndexesByViewTag, {
        value: {},
        enumerable: false,
        configurable: true
      });
    }
    metadata[$viewFieldIndexes].push(index);
    if (tag < 0) {
      if (!metadata[$fieldIndexesByViewTag][tag]) {
        metadata[$fieldIndexesByViewTag][tag] = [];
      }
      metadata[$fieldIndexesByViewTag][tag].push(index);
    } else {
      for (let bits = tag; bits > 0; bits &= bits - 1) {
        const bit = bits & -bits;
        if (!metadata[$fieldIndexesByViewTag][bit]) {
          metadata[$fieldIndexesByViewTag][bit] = [];
        }
        metadata[$fieldIndexesByViewTag][bit].push(index);
      }
    }
  },
  setUnreliable(metadata, fieldName) {
    const index = metadata[fieldName];
    const fieldType = metadata[index].type;
    if (typeof fieldType !== "string") {
      throw new Error(`@unreliable cannot be applied to ref-type field "${fieldName}". For ref-type fields, mark each primitive sub-field with @unreliable instead. See README "Limitations and best practices".`);
    }
    metadata[index].unreliable = true;
    if (!metadata[$unreliableFieldIndexes]) {
      Object.defineProperty(metadata, $unreliableFieldIndexes, {
        value: [],
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    metadata[$unreliableFieldIndexes].push(index);
  },
  setPatchOnly(metadata, fieldName) {
    const index = metadata[fieldName];
    if (metadata[index].fullStateOnly) {
      throw new Error(`field "${fieldName}" cannot be both patchOnly and fullStateOnly \u2014 those are the only two delivery channels, so the field would never reach a client.`);
    }
    metadata[index].patchOnly = true;
    pushIndexList(metadata, $patchOnlyFieldIndexes, index);
    pushIndexList(metadata, $fullSyncSkipIndexes, index);
  },
  /**
   * `@deprecated()` bookkeeping: the field keeps its wire index (so peers
   * that still carry it stay compatible) but is excluded from full sync —
   * its accessor may throw — and hidden from `for..in` consumers.
   */
  setDeprecated(metadata, fieldName) {
    const index = metadata[fieldName];
    metadata[index].deprecated = true;
    pushIndexList(metadata, $fullSyncSkipIndexes, index);
    Object.defineProperty(metadata, index, {
      value: metadata[index],
      enumerable: false,
      configurable: true
    });
  },
  setFullStateOnly(metadata, fieldName) {
    const index = metadata[fieldName];
    if (metadata[index].patchOnly) {
      throw new Error(`field "${fieldName}" cannot be both patchOnly and fullStateOnly \u2014 those are the only two delivery channels, so the field would never reach a client.`);
    }
    metadata[index].fullStateOnly = true;
    pushIndexList(metadata, $fullStateOnlyFieldIndexes, index);
  },
  setStream(metadata, fieldName) {
    const index = metadata[fieldName];
    metadata[index].stream = true;
    if (!metadata[$streamFieldIndexes]) {
      Object.defineProperty(metadata, $streamFieldIndexes, {
        value: [],
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    metadata[$streamFieldIndexes].push(index);
  },
  /**
   * Attach a declaration-scope priority callback to a stream field.
   * Called at schema definition time (via `t.stream(X).priority(fn)` or
   * `@type({ stream: X, priority: fn })`), looked up at stream-attach
   * time to seed the instance's `_stream.priority` slot. The callback
   * signature is `(view: StateView, element: V) => number` — only fires
   * during `encodeView`, broadcast mode emits FIFO regardless.
   */
  setStreamPriority(metadata, fieldName, fn) {
    const index = metadata[fieldName];
    if (!metadata[$streamPriorities]) {
      Object.defineProperty(metadata, $streamPriorities, {
        value: {},
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    metadata[$streamPriorities][index] = fn;
  },
  getStreamPriority(metadata, index) {
    return metadata?.[$streamPriorities]?.[index];
  },
  /**
   * Install a single field with full encoder wiring: accessor descriptor
   * on the prototype + `metadata[$encoders]` slot for primitives. Shared
   * between `Metadata.setFields` (build path) and
   * `Reflection.makeEncodable` (Reflection upgrade path).
   */
  defineField(target, metadata, fieldIndex, fieldName, type) {
    const normalized = getNormalizedType(type);
    const { complexTypeKlass, childType } = resolveFieldType(normalized);
    Metadata.addField(metadata, fieldIndex, fieldName, normalized, getPropertyDescriptor(fieldName, fieldIndex, childType, complexTypeKlass));
    if (metadata[$descriptors][fieldName]) {
      Object.defineProperty(target.prototype, fieldName, metadata[$descriptors][fieldName]);
    }
    if (typeof normalized === "string" || isQuantizedType(normalized)) {
      if (!metadata[$encoders]) {
        Object.defineProperty(metadata, $encoders, {
          value: [],
          enumerable: false,
          configurable: true,
          writable: true
        });
      }
      metadata[$encoders][fieldIndex] = typeof normalized === "string" ? encode[normalized] : makeQuantizedEncoder(normalized.quantized);
    }
  },
  setFields(target, fields) {
    const constructor = target.prototype.constructor;
    TypeContext.register(constructor);
    const parentClass = Object.getPrototypeOf(constructor);
    const parentMetadata = parentClass && parentClass[Symbol.metadata];
    const metadata = Metadata.initialize(constructor);
    if (!constructor[$track]) {
      constructor[$track] = Schema[$track];
    }
    if (!constructor[$encoder]) {
      constructor[$encoder] = Schema[$encoder];
    }
    if (!constructor[$decoder]) {
      constructor[$decoder] = Schema[$decoder];
    }
    if (!constructor.prototype.toJSON) {
      constructor.prototype.toJSON = Schema.prototype.toJSON;
    }
    let fieldIndex = metadata[$numFields] ?? (parentMetadata && parentMetadata[$numFields]) ?? -1;
    fieldIndex++;
    if (!metadata[$encoders]) {
      Object.defineProperty(metadata, $encoders, {
        value: parentMetadata?.[$encoders] ? [...parentMetadata[$encoders]] : [],
        enumerable: false,
        configurable: true,
        writable: true
      });
    }
    for (const field in fields) {
      if (metadata[field] !== void 0) {
        throw new Error(`@colyseus/schema: Duplicate '${field}' definition on '${constructor.name || "(anonymous)"}'.`);
      }
      Metadata.defineField(constructor, metadata, fieldIndex, field, fields[field]);
      fieldIndex++;
    }
    return target;
  },
  isDeprecated(metadata, field) {
    return metadata[field].deprecated === true;
  },
  initialize(constructor) {
    const parentClass = Object.getPrototypeOf(constructor);
    const parentMetadata = parentClass[Symbol.metadata];
    let metadata = constructor[Symbol.metadata] ?? /* @__PURE__ */ Object.create(null);
    if (parentClass !== Schema && metadata === parentMetadata) {
      metadata = /* @__PURE__ */ Object.create(null);
      if (parentMetadata) {
        Object.setPrototypeOf(metadata, parentMetadata);
        Object.defineProperty(metadata, $numFields, {
          value: parentMetadata[$numFields],
          enumerable: false,
          configurable: true,
          writable: true
        });
        if (parentMetadata[$viewFieldIndexes] !== void 0) {
          Object.defineProperty(metadata, $viewFieldIndexes, {
            value: [...parentMetadata[$viewFieldIndexes]],
            enumerable: false,
            configurable: true,
            writable: true
          });
          Object.defineProperty(metadata, $fieldIndexesByViewTag, {
            value: { ...parentMetadata[$fieldIndexesByViewTag] },
            enumerable: false,
            configurable: true,
            writable: true
          });
        }
        for (const key of INHERITED_ARRAY_KEYS) {
          const list = parentMetadata[key];
          if (list !== void 0) {
            Object.defineProperty(metadata, key, {
              value: [...list],
              enumerable: false,
              configurable: true,
              writable: true
            });
          }
        }
        Object.defineProperty(metadata, $descriptors, {
          value: { ...parentMetadata[$descriptors] },
          enumerable: false,
          configurable: true,
          writable: true
        });
      }
    }
    Object.defineProperty(constructor, Symbol.metadata, {
      value: metadata,
      writable: false,
      configurable: true
    });
    return metadata;
  },
  isValidInstance(klass) {
    return klass.constructor[Symbol.metadata] && Object.prototype.hasOwnProperty.call(klass.constructor[Symbol.metadata], $numFields);
  },
  getFields(klass) {
    const metadata = klass[Symbol.metadata];
    const fields = {};
    for (let i = 0; i <= metadata[$numFields]; i++) {
      fields[metadata[i].name] = metadata[i].type;
    }
    return fields;
  },
  hasViewTagAtIndex(metadata, index) {
    return metadata?.[$viewFieldIndexes]?.includes(index);
  },
  hasUnreliableAtIndex(metadata, index) {
    return metadata?.[$unreliableFieldIndexes]?.includes(index);
  },
  hasPatchOnlyAtIndex(metadata, index) {
    return metadata?.[$patchOnlyFieldIndexes]?.includes(index);
  },
  hasFullStateOnlyAtIndex(metadata, index) {
    return metadata?.[$fullStateOnlyFieldIndexes]?.includes(index);
  },
  hasStreamAtIndex(metadata, index) {
    return metadata?.[$streamFieldIndexes]?.includes(index);
  }
};
var _invokeNoCtx$2 = (cb, index, op) => cb(index, op);
var SchemaChangeRecorder = class {
  // Bitmask storage for fields 0-31 (low) and 32-63 (high).
  dirtyLow = 0;
  dirtyHigh = 0;
  // ops[fieldIndex] = OPERATION value. Pre-sized to numFields+1.
  ops;
  constructor(numFields) {
    this.ops = new Uint8Array(Math.max(numFields + 1, 1));
  }
  record(index, op) {
    const prev = this.ops[index];
    if (prev === 0)
      this.ops[index] = op;
    else if (prev === OPERATION.DELETE)
      this.ops[index] = OPERATION.DELETE_AND_ADD;
    else if (prev === OPERATION.ADD && op === OPERATION.DELETE_AND_ADD) {
      this.ops[index] = OPERATION.DELETE_AND_ADD;
    }
    if (index < 32)
      this.dirtyLow |= 1 << index;
    else
      this.dirtyHigh |= 1 << index - 32;
  }
  recordDelete(index, op) {
    this.ops[index] = op;
    if (index < 32)
      this.dirtyLow |= 1 << index;
    else
      this.dirtyHigh |= 1 << index - 32;
  }
  recordRaw(index, op) {
    this.record(index, op);
  }
  operationAt(index) {
    const op = this.ops[index];
    return op === 0 ? void 0 : op;
  }
  setOperationAt(index, op) {
    this.ops[index] = op;
  }
  forEach(cb) {
    this.forEachWithCtx(cb, _invokeNoCtx$2);
  }
  forEachWithCtx(ctx, cb) {
    let low = this.dirtyLow;
    let high = this.dirtyHigh;
    const ops = this.ops;
    while (low !== 0) {
      const bit = low & -low;
      const fieldIndex = 31 - Math.clz32(bit);
      low ^= bit;
      cb(ctx, fieldIndex, ops[fieldIndex]);
    }
    while (high !== 0) {
      const bit = high & -high;
      const fieldIndex = 31 - Math.clz32(bit) + 32;
      high ^= bit;
      cb(ctx, fieldIndex, ops[fieldIndex]);
    }
  }
  size() {
    return popcount32(this.dirtyLow) + popcount32(this.dirtyHigh);
  }
  has() {
    return (this.dirtyLow | this.dirtyHigh) !== 0;
  }
  reset() {
    this.dirtyLow = 0;
    this.dirtyHigh = 0;
    this.ops.fill(0);
  }
};
var CollectionChangeRecorder = class {
  dirty = /* @__PURE__ */ new Map();
  pureOps = [];
  record(index, op) {
    const prev = this.dirty.get(index);
    if (prev === void 0)
      this.dirty.set(index, op);
    else if (prev === OPERATION.DELETE)
      this.dirty.set(index, OPERATION.DELETE_AND_ADD);
    else if (prev === OPERATION.ADD && op === OPERATION.DELETE_AND_ADD) {
      this.dirty.set(index, OPERATION.DELETE_AND_ADD);
    }
  }
  recordDelete(index, op) {
    this.dirty.set(index, op);
  }
  recordRaw(index, op) {
    this.dirty.set(index, op);
  }
  recordPure(op) {
    this.pureOps.push([this.dirty.size, op]);
  }
  operationAt(index) {
    return this.dirty.get(index);
  }
  setOperationAt(index, op) {
    if (this.dirty.has(index))
      this.dirty.set(index, op);
  }
  forEach(cb) {
    this.forEachWithCtx(cb, _invokeNoCtx$2);
  }
  forEachWithCtx(ctx, cb) {
    const pure = this.pureOps;
    if (pure.length > 0) {
      let pureIdx = 0, i = 0;
      for (const [index, op] of this.dirty) {
        while (pureIdx < pure.length && pure[pureIdx][0] <= i) {
          const pureOp = pure[pureIdx++][1];
          cb(ctx, -pureOp, pureOp);
        }
        cb(ctx, index, op);
        i++;
      }
      while (pureIdx < pure.length) {
        const pureOp = pure[pureIdx++][1];
        cb(ctx, -pureOp, pureOp);
      }
    } else {
      for (const [index, op] of this.dirty)
        cb(ctx, index, op);
    }
  }
  size() {
    return this.dirty.size + this.pureOps.length;
  }
  has() {
    return this.dirty.size > 0 || this.pureOps.length > 0;
  }
  reset() {
    this.dirty.clear();
    this.pureOps.length = 0;
  }
  shift(shiftIndex) {
    const dst = /* @__PURE__ */ new Map();
    for (const [idx, val] of this.dirty)
      dst.set(idx + shiftIndex, val);
    this.dirty = dst;
  }
};
function popcount32(n) {
  n = n - (n >>> 1 & 1431655765);
  n = (n & 858993459) + (n >>> 2 & 858993459);
  return (n + (n >>> 4) & 252645135) * 16843009 >>> 24;
}
function indexesToBitmask(indexes) {
  if (indexes === void 0)
    return 0;
  let bm = 0;
  for (let i = 0, len = indexes.length; i < len; i++) {
    const idx = indexes[i];
    if (idx < 32)
      bm |= 1 << idx;
  }
  return bm;
}
function buildFieldArrays(metadata) {
  const names = [];
  const types = [];
  const tags = [];
  const encoders = [];
  const numFields = metadata?.[$numFields];
  if (numFields === void 0)
    return { names, types, tags, encoders };
  const srcEncoders = metadata[$encoders];
  for (let i = 0; i <= numFields; i++) {
    const field = metadata[i];
    if (field === void 0) {
      names[i] = void 0;
      types[i] = void 0;
      tags[i] = void 0;
      encoders[i] = void 0;
      continue;
    }
    names[i] = field.name;
    types[i] = field.type;
    tags[i] = field.tag;
    encoders[i] = srcEncoders?.[i];
  }
  return { names, types, tags, encoders };
}
function getEncodeDescriptor(ref) {
  const ctor = ref.constructor;
  if (Object.prototype.hasOwnProperty.call(ctor, $encodeDescriptor)) {
    return ctor[$encodeDescriptor];
  }
  const metadata = ctor[Symbol.metadata];
  const isSchema = Metadata.isValidInstance(ref);
  const hasAnyView = (metadata?.[$viewFieldIndexes]?.length ?? 0) > 0;
  const arrays = buildFieldArrays(metadata);
  const filter = isSchema && !hasAnyView ? void 0 : ctor[$filter];
  const desc = {
    encoder: ctor[$encoder],
    filter,
    metadata,
    isSchema,
    filterBitmask: isSchema ? indexesToBitmask(metadata?.[$viewFieldIndexes]) : 0,
    hasAnyFullStateOnly: (metadata?.[$fullStateOnlyFieldIndexes]?.length ?? 0) > 0,
    hasAnyUnreliable: (metadata?.[$unreliableFieldIndexes]?.length ?? 0) > 0,
    hasAnyStream: (metadata?.[$streamFieldIndexes]?.length ?? 0) > 0,
    hasAnyView,
    fullStateOnlyBitmask: indexesToBitmask(metadata?.[$fullStateOnlyFieldIndexes]),
    unreliableBitmask: indexesToBitmask(metadata?.[$unreliableFieldIndexes]),
    streamBitmask: indexesToBitmask(metadata?.[$streamFieldIndexes]),
    names: arrays.names,
    types: arrays.types,
    tags: arrays.tags,
    encoders: arrays.encoders
  };
  Object.defineProperty(ctor, $encodeDescriptor, {
    value: desc,
    enumerable: false,
    writable: true,
    configurable: true
  });
  return desc;
}
function addParent(tree, parent, index) {
  if (tree.parentRef) {
    if (tree.parentRef[$changes] === parent[$changes]) {
      tree._parentIndex = index;
      return;
    }
    if (hasParent(tree, (p, _) => p[$changes] === parent[$changes])) {
      tree._parentIndex = index;
      return;
    }
  }
  if (tree.parentRef === void 0) {
    tree.parentRef = parent;
    tree._parentIndex = index;
  } else {
    tree.extraParents = {
      ref: tree.parentRef,
      index: tree._parentIndex,
      next: tree.extraParents
    };
    tree.parentRef = parent;
    tree._parentIndex = index;
  }
}
function setParentIndex(tree, parent, index) {
  if (tree.extraParents === void 0) {
    tree._parentIndex = index;
    return;
  }
  if (tree.parentRef[$changes] === parent[$changes]) {
    tree._parentIndex = index;
    return;
  }
  for (let entry = tree.extraParents; entry !== void 0; entry = entry.next) {
    if (entry.ref[$changes] === parent[$changes]) {
      entry.index = index;
      return;
    }
  }
}
function removeParent(tree, parent) {
  if (tree.parentRef && tree.parentRef[$changes] === parent[$changes]) {
    if (tree.extraParents) {
      tree.parentRef = tree.extraParents.ref;
      tree._parentIndex = tree.extraParents.index;
      tree.extraParents = tree.extraParents.next;
    } else {
      tree.parentRef = void 0;
      tree._parentIndex = void 0;
    }
    return true;
  }
  let current = tree.extraParents;
  let previous = null;
  while (current) {
    if (current.ref[$changes] === parent[$changes]) {
      if (previous) {
        previous.next = current.next;
      } else {
        tree.extraParents = current.next;
      }
      return true;
    }
    previous = current;
    current = current.next;
  }
  return tree.parentRef === void 0;
}
function findParent(tree, predicate) {
  if (tree.parentRef !== void 0 && predicate(tree.parentRef, tree._parentIndex)) {
    return { ref: tree.parentRef, index: tree._parentIndex };
  }
  for (let entry = tree.extraParents; entry !== void 0; entry = entry.next) {
    if (predicate(entry.ref, entry.index)) {
      return { ref: entry.ref, index: entry.index };
    }
  }
  return void 0;
}
function hasParent(tree, predicate) {
  if (tree.parentRef !== void 0 && predicate(tree.parentRef, tree._parentIndex)) {
    return true;
  }
  for (let entry = tree.extraParents; entry !== void 0; entry = entry.next) {
    if (predicate(entry.ref, entry.index)) {
      return true;
    }
  }
  return false;
}
function indexInParent(tree, parent) {
  if (tree.parentRef && tree.parentRef[$changes] === parent[$changes]) {
    return tree._parentIndex;
  }
  for (let entry = tree.extraParents; entry !== void 0; entry = entry.next) {
    if (entry.ref[$changes] === parent[$changes]) {
      return entry.index;
    }
  }
  return void 0;
}
function getAllParents(tree) {
  const parents = [];
  if (tree.parentRef) {
    parents.push({ ref: tree.parentRef, index: tree._parentIndex });
  }
  let current = tree.extraParents;
  while (current) {
    parents.push({ ref: current.ref, index: current.index });
    current = current.next;
  }
  return parents;
}
function isEdgeLive(tree, parentTree, index) {
  const target = parentTree.refTarget;
  if (parentTree.isArray) {
    const items = target.items;
    const at2 = items[index];
    if (at2 !== void 0 && at2[$changes] === tree)
      return true;
    for (let i = 0, len = items.length; i < len; i++) {
      const v = items[i];
      if (v !== void 0 && v[$changes] === tree)
        return true;
    }
    return false;
  }
  const at = parentTree.getValue(index);
  return at !== void 0 && at[$changes] === tree;
}
var restageLiveCb = (tree, fieldIndex) => {
  if (tree.isFieldUnreliable(fieldIndex)) {
    tree.ensureUnreliableRecorder().record(fieldIndex, OPERATION.ADD);
  } else {
    tree.record(fieldIndex, OPERATION.ADD);
  }
};
var _invokeNoCtx$1 = (cb, index) => cb(index);
function forEachLive(tree, callback) {
  forEachLiveWithCtx(tree, callback, _invokeNoCtx$1);
}
function forEachLiveWithCtx(tree, ctx, cb) {
  const ref = tree.refTarget;
  if (ref[$childType] !== void 0) {
    if (tree.isPatchOnly)
      return;
    if (Array.isArray(ref.items)) {
      const items = ref.items;
      for (let i = 0, len = items.length; i < len; i++) {
        if (items[i] !== void 0)
          cb(ctx, i);
      }
    } else if (ref.journal !== void 0) {
      for (const [index, key] of ref.journal.keyByIndex) {
        if (ref.$items.has(key))
          cb(ctx, index);
      }
    } else if (ref.$items !== void 0) {
      for (const index of ref.$items.keys()) {
        cb(ctx, index);
      }
    }
  } else {
    const metadata = tree.metadata;
    if (!metadata)
      return;
    const numFields = metadata[$numFields] ?? -1;
    const skipIndexes = metadata[$fullSyncSkipIndexes];
    const names = tree.encDescriptor.names;
    for (let i = 0; i <= numFields; i++) {
      const name = names[i];
      if (name === void 0)
        continue;
      if (skipIndexes && skipIndexes.includes(i))
        continue;
      const value = ref[name];
      if (value !== void 0 && value !== null)
        cb(ctx, i);
    }
  }
}
function checkIsFiltered(tree, parent, parentIndex, _isNewChangeTree) {
  checkInheritedFlags(tree, parent, parentIndex);
  if (tree.isFullStateOnly)
    return;
  if (tree.has()) {
    tree.root?.enqueueChangeTree(tree);
  }
  if (tree.unreliableRecorder?.has()) {
    tree.root?.enqueueUnreliable(tree);
  }
  if (!tree.has() && !tree.unreliableRecorder?.has()) {
    tree.root?.enqueueChangeTree(tree);
  }
}
function checkInheritedFlags(tree, parent, parentIndex) {
  if (!parent) {
    return;
  }
  const parentChangeTree = parent[$changes];
  const parentIsCollection = !parentChangeTree._isSchema;
  let parentMetadata;
  if (parentIsCollection) {
    parent = parentChangeTree.parent;
    parentIndex = parentChangeTree.parentIndex;
    parentMetadata = parent?.[$changes].metadata;
  } else {
    parentMetadata = parentChangeTree.metadata;
  }
  const fieldBits = (parentMetadata?.[$patchOnlyFieldIndexes]?.includes(parentIndex) ? IS_PATCH_ONLY : 0) | (parentMetadata?.[$fullStateOnlyFieldIndexes]?.includes(parentIndex) ? IS_FULL_STATE_ONLY : 0);
  const inheritedBits = parentChangeTree.flags & INHERITABLE_FLAGS | fieldBits;
  const beforeFlags = tree.flags;
  tree.flags = beforeFlags | inheritedBits;
  const gainedBits = inheritedBits & ~beforeFlags;
  if (gainedBits & IS_FULL_STATE_ONLY) {
    tree.reset();
    tree.unreliableRecorder?.reset();
  }
  const types = tree.root?.types;
  if (!types?.hasFilters)
    return;
  const fieldHasViewTag = parentMetadata?.[$viewFieldIndexes]?.includes(parentIndex) ?? false;
  const fieldHasStream = parentMetadata?.[$streamFieldIndexes]?.includes(parentIndex) ?? false;
  const newFiltered = parentChangeTree.isFiltered || fieldHasViewTag || fieldHasStream;
  tree.isFiltered = newFiltered;
  if (fieldHasStream && !parentIsCollection) {
    tree.isStreamCollection = true;
    const state = ensureStreamState(tree.ref);
    if (state.priority === void 0) {
      const declared = Metadata.getStreamPriority(parentMetadata, parentIndex);
      if (declared !== void 0)
        state.priority = declared;
    }
    tree.root?.registerStream(tree.ref);
  }
  if (newFiltered) {
    const sharesEligible = _sharesEligible(tree);
    tree.isVisibilitySharedWithParent = parentChangeTree.isFiltered && sharesEligible && !fieldHasStream && (!fieldHasViewTag || parentIsCollection && parentMetadata[parentIndex].tag !== DEFAULT_VIEW_TAG);
  }
}
function drainFilterRefresh(root) {
  const list = root.pendingFilterRefresh;
  for (let i = 0; i < list.length; i++) {
    const tree = list[i];
    if ((tree.flags & PENDING_FILTER_REFRESH) === 0)
      continue;
    refreshFilterState(tree);
  }
  list.length = 0;
}
function _sharesEligible(tree) {
  return tree._isSchema || typeof tree.refTarget[$childType] !== "string";
}
function refreshFilterState(tree) {
  tree.flags &= ~PENDING_FILTER_REFRESH;
  const root = tree.root;
  if (root === void 0 || tree.parentRef === void 0)
    return;
  const sharesEligible = _sharesEligible(tree);
  let bits = _edgeBits(tree, tree.parentRef, tree._parentIndex, sharesEligible);
  for (let e = tree.extraParents; e !== void 0 && bits !== EDGE_SATURATED; e = e.next) {
    bits |= _edgeBits(tree, e.ref, e.index, sharesEligible);
  }
  if (bits === 0)
    return;
  tree.isVisibilitySharedWithParent = (bits & EDGE_SHARES) !== 0;
  const newFiltered = (bits & EDGE_PUBLIC) === 0;
  if (newFiltered === tree.isFiltered)
    return;
  tree.isFiltered = newFiltered;
  if (!newFiltered && !tree.isFullStateOnly) {
    tree.forEachLiveWithCtx(tree, restageLiveCb);
    if (tree.has())
      root.enqueueChangeTree(tree);
    if (tree.unreliableRecorder?.has())
      root.enqueueUnreliable(tree);
  }
  tree.forEachChildWithCtx(tree, _cascadeRefreshCb);
}
var EDGE_LIVE = 1;
var EDGE_PUBLIC = 2;
var EDGE_SHARES = 4;
var EDGE_SATURATED = EDGE_LIVE | EDGE_PUBLIC | EDGE_SHARES;
function _edgeBits(tree, parentRef, index, sharesEligible) {
  const parentTree = parentRef[$changes];
  if (parentTree.root !== tree.root || !isEdgeLive(tree, parentTree, index))
    return 0;
  if (parentTree.flags & PENDING_FILTER_REFRESH)
    refreshFilterState(parentTree);
  let bits = EDGE_LIVE;
  if (parentTree._isSchema) {
    const marked = parentTree.encDescriptor.tags[index] !== void 0 || parentTree.isFieldStream(index);
    if (!marked) {
      if (!parentTree.isFiltered)
        bits |= EDGE_PUBLIC;
      else if (sharesEligible)
        bits |= EDGE_SHARES;
    }
  } else if (!parentTree.isFiltered) {
    bits |= EDGE_PUBLIC;
  } else if (sharesEligible && !parentTree.isStreamCollection) {
    const gp = parentTree.parent?.[$changes];
    const tag = gp?._isSchema ? gp.encDescriptor.tags[parentTree.parentIndex] : void 0;
    if (tag !== DEFAULT_VIEW_TAG)
      bits |= EDGE_SHARES;
  }
  return bits;
}
var _cascadeRefreshCb = (_parentTree, child, _index) => {
  refreshFilterState(child);
};
function propagateNewChildToSubscribers(parentTree, childIndex, childRef, root) {
  const subs = parentTree.subscribedViews;
  if (subs === void 0)
    return;
  const isStream = parentTree.isStreamCollection;
  const streamable = isStream ? parentTree.ref : void 0;
  const childTree = isStream ? void 0 : childRef[$changes];
  for (let slot = 0, n = subs.length; slot < n; slot++) {
    let bits = subs[slot];
    while (bits !== 0) {
      const bit = bits & -bits;
      bits ^= bit;
      const viewId = slot * 32 + (31 - Math.clz32(bit));
      const weakRef = root.activeViews.get(viewId);
      const view2 = weakRef?.deref();
      if (view2 === void 0) {
        subs[slot] &= ~bit;
        continue;
      }
      if (isStream) {
        streamEnqueueForView(streamable, viewId, childIndex);
      } else if (childTree !== void 0) {
        view2.markVisible(childTree);
      }
    }
  }
}
function setRoot(tree, root) {
  tree.root = root;
  const isNewChangeTree = root.add(tree);
  checkIsFiltered(tree, tree.parent, tree.parentIndex);
  if (isNewChangeTree) {
    forEachChildWithCtx(tree, root, _setRootChildCb);
  }
}
function setParent(tree, parent, root, parentIndex) {
  tree.addParent(parent, parentIndex);
  if (!root) {
    return;
  }
  const isNewChangeTree = root.add(tree);
  if (root !== tree.root) {
    tree.root = root;
    checkIsFiltered(tree, parent, parentIndex);
  }
  const parentTree = parent?.[$changes];
  if (parentTree !== void 0 && parentTree.subscribedViews !== void 0 && // Collection check: `$childType` on the ref identifies Array/Map/
  // Set/Collection/Stream. Schema-field parents don't have it.
  parent[$childType] !== void 0) {
    propagateNewChildToSubscribers(parentTree, parentIndex, tree.ref, root);
  }
  if (isNewChangeTree) {
    let ctx = _setParentCtxPool[_setParentDepth];
    if (ctx === void 0) {
      ctx = { parentRef: void 0, root: void 0 };
      _setParentCtxPool[_setParentDepth] = ctx;
    }
    ctx.parentRef = tree.ref;
    ctx.root = root;
    _setParentDepth++;
    forEachChildWithCtx(tree, ctx, _setParentChildCb);
    _setParentDepth--;
  }
}
function forEachChild(tree, callback) {
  forEachChildWithCtx(tree, callback, _forEachChildTrampoline);
}
function _forEachChildTrampoline(cb, change, at) {
  cb(change, at);
}
function forEachChildWithCtx(tree, ctx, callback) {
  const ref = tree.refTarget;
  if (ref[$childType]) {
    if (typeof ref[$childType] !== "string") {
      const items = ref.items;
      if (items !== void 0) {
        for (let i = 0, len = items.length; i < len; i++) {
          const value = items[i];
          if (!value) {
            continue;
          }
          callback(ctx, value[$changes], i);
        }
      } else {
        const $items = ref.$items;
        const collectionIndexes = ref._collectionIndexes;
        for (const key of $items.keys()) {
          const value = $items.get(key);
          if (!value) {
            continue;
          }
          callback(ctx, value[$changes], collectionIndexes?.[key] ?? key);
        }
      }
    }
  } else {
    const metadata = tree.metadata;
    const indexes = metadata?.[$refTypeFieldIndexes];
    if (!indexes)
      return;
    const names = tree.encDescriptor.names;
    for (let i = 0, len = indexes.length; i < len; i++) {
      const index = indexes[i];
      const value = ref[names[index]];
      if (!value) {
        continue;
      }
      callback(ctx, value[$changes], index);
    }
  }
}
function _setRootChildCb(root, child, _index) {
  if (child.root !== root) {
    child.setRoot(root);
  } else {
    root.add(child);
  }
}
var _setParentCtxPool = [];
var _setParentDepth = 0;
function _setParentChildCb(ctx, child, index) {
  if (child.root === ctx.root) {
    ctx.root.add(child);
    ctx.root.moveNextToParent(child);
    return;
  }
  child.setParent(ctx.parentRef, ctx.root, index);
}
function readInlineOpByte(low, high, index) {
  const shift = (index & 3) << 3;
  return index < 4 ? low >>> shift & 255 : high >>> shift & 255;
}
var _invokeNoCtx = (cb, index, op) => cb(index, op);
function createChangeTreeList() {
  return { next: void 0, tail: void 0, nextPosition: 0 };
}
var IS_FILTERED = 1;
var IS_VISIBILITY_SHARED = 2;
var IS_NEW = 4;
var IS_UNRELIABLE = 8;
var IS_PATCH_ONLY = 16;
var IS_FULL_STATE_ONLY = 32;
var IS_STREAM_COLLECTION = 64;
var NEEDS_RESTAGE = 128;
var PENDING_FILTER_REFRESH = 256;
var PENDING_SHIPPED_BY_FULL_SYNC = 512;
var INHERITABLE_FLAGS = IS_PATCH_ONLY | IS_FULL_STATE_ONLY;
var ChangeTree = class {
  ref;
  /**
   * Non-Proxy target of `ref` for encoder hot-path reads. For
   * `ArraySchema`, `ref` is the Proxy users interact with; every property
   * access on it runs through the `get` trap (even for symbol keys, which
   * fall through to `Reflect.get` — one extra hop per lookup). The encoder
   * loop reads `[$getByIndex]`, `[$childType]`, `.items`, `.tmpItems` at
   * high frequency during `encode()` / `encodeAll()`; going through
   * `refTarget` skips all of those traps.
   *
   * For non-proxied types (Schema, MapSchema, SetSchema, CollectionSchema,
   * StreamSchema), `refTarget === ref`. Consumers that need the user-
   * facing identity (debug output, callback parents) keep using `ref`.
   */
  refTarget;
  /**
   * True when `ref` is an ArraySchema — the only proxied type, so its
   * user-facing identity differs from `refTarget`. Canonical predicate for
   * "is this tree's ref an array" without probing `ref` (which would hit
   * the Proxy trap) — two monomorphic loads on the tree itself.
   */
  get isArray() {
    return this.refTarget !== this.ref;
  }
  metadata;
  /**
   * Per-class cache of encoder fn / filter fn / isSchema / metadata /
   * per-field arrays, looked up once at construction. The encode loop reads
   * `tree.encDescriptor` and never touches `ref.constructor` again. See
   * EncodeDescriptor.ts.
   */
  encDescriptor;
  root;
  // Inline single parent (the common case)
  parentRef;
  _parentIndex;
  extraParents;
  // linked list for 2nd+ parents (rare: instance sharing)
  // Packed boolean flags. See IS_* constants above for bit layout.
  flags = IS_NEW;
  /**
   * Per-walk visit stamp written by `Encoder.encodeFullSync`'s DFS. A
   * tree is considered "already visited by the current walk" iff
   * `tree._fullSyncGen === ctx.gen` — the encoder bumps its generation
   * counter once per walk, then stamps each tree with that value on
   * first visit; any later encounter of the same tree (shared refs
   * reachable through multiple parents) short-circuits on the equality
   * check instead of recursing again.
   */
  _fullSyncGen = 0;
  // Schema vs Collection discriminator. Set once in ctor, never changes —
  // per-tree-stable branch for inline ChangeRecorder dispatch.
  _isSchema = false;
  // Inline reliable SchemaChangeRecorder state (valid only if _isSchema).
  dirtyLow = 0;
  dirtyHigh = 0;
  // Inline ops for Schemas with ≤8 fields (4 op-bytes per number).
  // When `ops` is set (>8 fields), reads/writes go through the Uint8Array.
  opsLow = 0;
  opsHigh = 0;
  ops;
  // Inline reliable CollectionChangeRecorder state (valid only if !_isSchema).
  // `collDirty` is allocated in the ctor. `collPureOps` stays undefined
  // until the first CLEAR/REVERSE (most workloads never hit this).
  collDirty;
  collPureOps;
  // Lazy-allocated unreliable-channel recorder (rare — opt-in via @unreliable).
  unreliableRecorder;
  // When true, mutations on the ref are NOT tracked. See pause/resume/untracked.
  paused = false;
  changesNode;
  // Root.changes linked-list node
  unreliableChangesNode;
  // Root.unreliableChanges linked-list node
  // Per-StateView visibility bitmaps. Bit `(viewId & 31)` in slot
  // `(viewId >> 5)` is set iff the view can see this tree. Replaces
  // per-view WeakSet lookups with direct bitwise ops.
  // Lazy: undefined until the tree participates in any view.
  visibleViews;
  // Per-(view, tag) bitmap, indexed by tag. Custom tags only —
  // DEFAULT_VIEW_TAG visibility lives in `visibleViews`.
  tagViews;
  /**
   * Per-view subscription bitmap — same layout as `visibleViews`. Set by
   * `StateView.subscribe(collection)` to mark the view as persistently
   * interested in this collection's contents. When a new child is
   * attached to a subscribed collection (setParent hook), it's
   * auto-propagated to every subscribed view (force-shipped for
   * Array/Map/Set/Collection; enqueued into per-view pending for
   * streams). Undefined until the first subscribe.
   */
  subscribedViews;
  // Accessor properties for flags
  get isFiltered() {
    return (this.flags & IS_FILTERED) !== 0;
  }
  set isFiltered(v) {
    this.flags = v ? this.flags | IS_FILTERED : this.flags & ~IS_FILTERED;
  }
  get isVisibilitySharedWithParent() {
    return (this.flags & IS_VISIBILITY_SHARED) !== 0;
  }
  set isVisibilitySharedWithParent(v) {
    this.flags = v ? this.flags | IS_VISIBILITY_SHARED : this.flags & ~IS_VISIBILITY_SHARED;
  }
  get isNew() {
    return (this.flags & IS_NEW) !== 0;
  }
  set isNew(v) {
    this.flags = v ? this.flags | IS_NEW : this.flags & ~IS_NEW;
  }
  get isUnreliable() {
    return (this.flags & IS_UNRELIABLE) !== 0;
  }
  set isUnreliable(v) {
    this.flags = v ? this.flags | IS_UNRELIABLE : this.flags & ~IS_UNRELIABLE;
  }
  get isPatchOnly() {
    return (this.flags & IS_PATCH_ONLY) !== 0;
  }
  set isPatchOnly(v) {
    this.flags = v ? this.flags | IS_PATCH_ONLY : this.flags & ~IS_PATCH_ONLY;
  }
  get isFullStateOnly() {
    return (this.flags & IS_FULL_STATE_ONLY) !== 0;
  }
  set isFullStateOnly(v) {
    this.flags = v ? this.flags | IS_FULL_STATE_ONLY : this.flags & ~IS_FULL_STATE_ONLY;
  }
  get isStreamCollection() {
    return (this.flags & IS_STREAM_COLLECTION) !== 0;
  }
  set isStreamCollection(v) {
    this.flags = v ? this.flags | IS_STREAM_COLLECTION : this.flags & ~IS_STREAM_COLLECTION;
  }
  get needsRestage() {
    return (this.flags & NEEDS_RESTAGE) !== 0;
  }
  set needsRestage(v) {
    this.flags = v ? this.flags | NEEDS_RESTAGE : this.flags & ~NEEDS_RESTAGE;
  }
  // True iff tree inherits `isFiltered` OR its Schema class declares any
  // @view-tagged fields. StateView.addParentOf uses this to decide whether
  // a parent must be included in a view's bootstrap. Reads the class-level
  // "any viewed field" flag that `EncodeDescriptor` precomputes — same
  // pattern as `hasAnyFullStateOnly` / `hasAnyUnreliable` / `hasAnyStream`.
  get hasFilteredFields() {
    return this.isFiltered || this.encDescriptor.hasAnyView;
  }
  ensureUnreliableRecorder() {
    if (this.unreliableRecorder === void 0) {
      this.unreliableRecorder = this._isSchema ? new SchemaChangeRecorder(this.metadata?.[$numFields] ?? 0) : new CollectionChangeRecorder();
    }
    return this.unreliableRecorder;
  }
  isFieldUnreliable(index) {
    const desc = this.encDescriptor;
    if (!desc.hasAnyUnreliable)
      return false;
    if (index < 32)
      return (desc.unreliableBitmask & 1 << index) !== 0;
    return Metadata.hasUnreliableAtIndex(this.metadata, index);
  }
  // @static fields sync once via full-sync; post-init mutations are ignored
  // by the tracker (the value still lives on the instance).
  isFieldFullStateOnly(index) {
    if (this.isFullStateOnly)
      return true;
    const desc = this.encDescriptor;
    if (!desc.hasAnyFullStateOnly)
      return false;
    if (index < 32)
      return (desc.fullStateOnlyBitmask & 1 << index) !== 0;
    return Metadata.hasFullStateOnlyAtIndex(this.metadata, index);
  }
  // `t.stream(...)` collection fields — encoded via per-view priority/budget
  // gate instead of emitting all dirty ADDs in one tick. Class-level short
  // circuit avoids the metadata chase on schemas that carry no stream fields.
  isFieldStream(index) {
    const desc = this.encDescriptor;
    if (!desc.hasAnyStream)
      return false;
    if (index < 32)
      return (desc.streamBitmask & 1 << index) !== 0;
    return Metadata.hasStreamAtIndex(this.metadata, index);
  }
  constructor(ref, refTarget = ref) {
    this.ref = ref;
    this.refTarget = refTarget;
    const desc = getEncodeDescriptor(ref);
    this.encDescriptor = desc;
    this.metadata = desc.metadata;
    const isSchema = desc.isSchema;
    this._isSchema = isSchema;
    this.ops = void 0;
    this.collDirty = void 0;
    this.collPureOps = void 0;
    if (isSchema) {
      const numFields = this.metadata?.[$numFields] ?? 0;
      if (numFields > 7)
        this.ops = new Uint8Array(numFields + 1);
    } else {
      this.collDirty = /* @__PURE__ */ new Map();
    }
  }
  // ────────────────────────────────────────────────────────────────────
  // Inline ChangeRecorder implementation. Each method branches once on
  // `_isSchema` (per-tree-stable → predictable branch). Kills one
  // CollectionChangeRecorder+Map allocation per Collection tree.
  // ────────────────────────────────────────────────────────────────────
  // Schema-only helpers that own all inline-vs-array dispatch.
  _opAt(index) {
    const ops = this.ops;
    if (ops !== void 0)
      return ops[index];
    const shift = (index & 3) << 3;
    return index < 4 ? this.opsLow >>> shift & 255 : this.opsHigh >>> shift & 255;
  }
  _opPut(index, op) {
    const ops = this.ops;
    if (ops !== void 0) {
      ops[index] = op;
      return;
    }
    const shift = (index & 3) << 3;
    const mask = ~(255 << shift);
    if (index < 4)
      this.opsLow = this.opsLow & mask | op << shift;
    else
      this.opsHigh = this.opsHigh & mask | op << shift;
  }
  _markDirty(index) {
    if (index < 32)
      this.dirtyLow |= 1 << index;
    else
      this.dirtyHigh |= 1 << index - 32;
  }
  record(index, op) {
    if (this._isSchema) {
      const prev = this._opAt(index);
      if (prev === 0)
        this._opPut(index, op);
      else if (prev === OPERATION.DELETE)
        this._opPut(index, OPERATION.DELETE_AND_ADD);
      else if (prev === OPERATION.ADD && op === OPERATION.DELETE_AND_ADD) {
        this._opPut(index, OPERATION.DELETE_AND_ADD);
      }
      this._markDirty(index);
    } else {
      const dirty = this.collDirty;
      const prev = dirty.get(index);
      let finalOp;
      if (prev === void 0)
        finalOp = op;
      else if (prev === OPERATION.DELETE)
        finalOp = OPERATION.DELETE_AND_ADD;
      else if (prev === OPERATION.ADD && op === OPERATION.DELETE_AND_ADD)
        finalOp = OPERATION.DELETE_AND_ADD;
      else
        finalOp = prev;
      dirty.set(index, finalOp);
    }
  }
  recordDelete(index, op) {
    if (this._isSchema) {
      this._opPut(index, op);
      this._markDirty(index);
    } else {
      this.collDirty.set(index, op);
    }
  }
  recordRaw(index, op) {
    if (this._isSchema) {
      this._opPut(index, op);
      this._markDirty(index);
    } else {
      this.collDirty.set(index, op);
    }
  }
  recordPure(op) {
    if (this._isSchema) {
      throw new Error("ChangeTree (Schema): pure operations are not supported");
    }
    (this.collPureOps ??= []).push([this.collDirty.size, op]);
  }
  operationAt(index) {
    if (this._isSchema) {
      const op = this._opAt(index);
      return op === 0 ? void 0 : op;
    }
    return this.collDirty.get(index);
  }
  setOperationAt(index, op) {
    if (this._isSchema) {
      this._opPut(index, op);
    } else {
      const dirty = this.collDirty;
      if (dirty.has(index))
        dirty.set(index, op);
    }
  }
  // Cold-path delegate: all `forEach` callers are debug/dump utilities
  // (Schema.ts debug output, utils.ts change dump, discardAll in tests).
  // The hot encode loop uses `forEachWithCtx` directly. See ChangeRecorder.ts
  // for the same adapter pattern.
  forEach(cb) {
    this.forEachWithCtx(cb, _invokeNoCtx);
  }
  forEachWithCtx(ctx, cb) {
    if (this._isSchema) {
      let low = this.dirtyLow;
      let high = this.dirtyHigh;
      const ops = this.ops;
      if (ops !== void 0) {
        while (low !== 0) {
          const bit = low & -low;
          const fieldIndex = 31 - Math.clz32(bit);
          low ^= bit;
          cb(ctx, fieldIndex, ops[fieldIndex]);
        }
        while (high !== 0) {
          const bit = high & -high;
          const fieldIndex = 31 - Math.clz32(bit) + 32;
          high ^= bit;
          cb(ctx, fieldIndex, ops[fieldIndex]);
        }
      } else {
        const ol = this.opsLow;
        const oh = this.opsHigh;
        while (low !== 0) {
          const bit = low & -low;
          const fieldIndex = 31 - Math.clz32(bit);
          low ^= bit;
          cb(ctx, fieldIndex, readInlineOpByte(ol, oh, fieldIndex));
        }
      }
      return;
    }
    const dirty = this.collDirty;
    const pure = this.collPureOps;
    if (pure !== void 0 && pure.length > 0) {
      let pureIdx = 0, i = 0;
      for (const [index, op] of dirty) {
        while (pureIdx < pure.length && pure[pureIdx][0] <= i) {
          const pureOp = pure[pureIdx++][1];
          cb(ctx, -pureOp, pureOp);
        }
        cb(ctx, index, op);
        i++;
      }
      while (pureIdx < pure.length) {
        const pureOp = pure[pureIdx++][1];
        cb(ctx, -pureOp, pureOp);
      }
    } else {
      for (const [index, op] of dirty)
        cb(ctx, index, op);
    }
  }
  size() {
    if (this._isSchema)
      return popcount32(this.dirtyLow) + popcount32(this.dirtyHigh);
    return this.collDirty.size + (this.collPureOps?.length ?? 0);
  }
  has() {
    if (this._isSchema)
      return (this.dirtyLow | this.dirtyHigh) !== 0;
    return this.collDirty.size > 0 || this.collPureOps !== void 0 && this.collPureOps.length > 0;
  }
  reset() {
    if (this._isSchema) {
      this.dirtyLow = 0;
      this.dirtyHigh = 0;
      if (this.ops !== void 0)
        this.ops.fill(0);
      else {
        this.opsLow = 0;
        this.opsHigh = 0;
      }
      return;
    }
    this.collDirty.clear();
    if (this.collPureOps !== void 0)
      this.collPureOps.length = 0;
    this.flags &= ~PENDING_SHIPPED_BY_FULL_SYNC;
  }
  /**
   * Full reset to construction defaults so the owning ref can be returned to
   * a pool and reused for a different logical entity (see encoder/Pool.ts +
   * Schema.reset). Unlike `reset()` / `endEncode()` (which only clear the
   * dirty bucket for the next encode), this also drops parent links, queue
   * nodes and per-view bitmaps, and re-arms IS_NEW.
   *
   * Precondition: the tree must already be detached from the encoder
   * (`root === undefined`) — i.e. the ref was removed from its parent
   * collection/field, which `Root.remove` does before this runs.
   */
  recycle() {
    if (this.root !== void 0) {
      throw new Error(`@colyseus/schema: cannot recycle an attached ChangeTree (${this.ref?.constructor?.name}). Remove the instance from its parent collection before releasing it to a pool.`);
    }
    this.reset();
    this.unreliableRecorder?.reset();
    this.flags = IS_NEW | NEEDS_RESTAGE;
    this._fullSyncGen = 0;
    this.parentRef = void 0;
    this._parentIndex = void 0;
    this.extraParents = void 0;
    this.changesNode = void 0;
    this.unreliableChangesNode = void 0;
    this.paused = false;
    this.visibleViews = void 0;
    this.tagViews = void 0;
    this.subscribedViews = void 0;
  }
  /**
   * ArraySchema insert (unshift / splice with more inserts than deletes):
   * re-key pending ops at or above `at` by `+count`, then record ADDs for
   * the new items at indexes `at..at+count-1`.
   *
   * The rebuilt map's insertion order IS the wire order:
   *   1. ops below `at` — the insert doesn't move them, and an insert of
   *      their own must still be applied before this one (ascending);
   *   2. the new ADDs, ascending — the decoder splice-inserts each one,
   *      which only works lowest-index-first;
   *   3. the re-keyed ops, in their original relative order — their
   *      indexes now address the post-insert layout.
   * See ArraySchema#$setAt.
   */
  insertAt(at, count) {
    if (this._isSchema)
      throw new Error("ChangeTree (Schema): insertAt is not supported");
    const src = this.collDirty;
    const dst = /* @__PURE__ */ new Map();
    const track = !this.paused && !this.isFullStateOnly;
    if (at > 0) {
      for (const [idx, val] of src)
        if (idx < at)
          dst.set(idx, val);
    }
    if (track) {
      for (let i = 0; i < count; i++)
        dst.set(at + i, OPERATION.ADD);
    }
    for (const [idx, val] of src)
      if (idx >= at)
        dst.set(idx + count, val);
    this.collDirty = dst;
    if (track)
      this.root?.enqueueChangeTree(this);
  }
  /**
   * Inverse of `insertAt`: the wire slots in `[at, at+count)` never existed.
   * Drop their pending ops and re-key everything above them down by `count`,
   * preserving relative order exactly as `insertAt` does for the entries it
   * shifts up.
   *
   * Reached only through `ArraySchema.$cancelAdd`, after `ChangeTree.delete`
   * has already enqueued this tree and released the element's refCount — so
   * no enqueue here, and no `paused`/`isFullStateOnly` handling: neither can
   * have put an ADD in `collDirty` (`_routeAndRecord` returns early), and
   * the caller only cancels a pending ADD. `collPureOps` is left alone for
   * the same reason `insertAt` leaves it: a CLEAR/REVERSE resets the bucket
   * first (`ArraySchema.clear` → `discard()`).
   */
  removeAt(at, count) {
    if (this._isSchema)
      throw new Error("ChangeTree (Schema): removeAt is not supported");
    const src = this.collDirty;
    const end = at + count;
    let needsShift = false;
    for (const idx of src.keys()) {
      if (idx >= end) {
        needsShift = true;
        break;
      }
    }
    if (!needsShift) {
      for (let i = at; i < end; i++)
        src.delete(i);
      return;
    }
    const dst = /* @__PURE__ */ new Map();
    for (const [idx, val] of src) {
      if (idx < at)
        dst.set(idx, val);
      else if (idx >= end)
        dst.set(idx - count, val);
    }
    this.collDirty = dst;
  }
  /** ArraySchema#unshift(): insert `count` items at the head. */
  unshift(count) {
    this.insertAt(0, count);
  }
  // Tree attachment + child iteration — see ./changeTree/treeAttachment.ts.
  setRoot(root) {
    setRoot(this, root);
  }
  setParent(parent, root, parentIndex) {
    setParent(this, parent, root, parentIndex);
  }
  forEachChild(cb) {
    forEachChild(this, cb);
  }
  forEachChildWithCtx(ctx, cb) {
    forEachChildWithCtx(this, ctx, cb);
  }
  forEachLive(cb) {
    forEachLive(this, cb);
  }
  forEachLiveWithCtx(ctx, cb) {
    forEachLiveWithCtx(this, ctx, cb);
  }
  operation(op) {
    if (this.paused || this.isFullStateOnly)
      return;
    this.recordPure(op);
    this.root?.enqueueChangeTree(this);
  }
  /**
   * Route a field-level mutation to the reliable or unreliable channel
   * and enqueue into the matching queue. Shared by `change` and
   * `indexedOperation`; `raw=true` bypasses DELETE→ADD merge
   * (ArraySchema positional writes), `raw=false` merges inside `record`.
   *
   * Note: record() on both channels handles DELETE→ADD merge internally,
   * so callers do not need to pre-compute the merged op.
   *
   * `@unreliable` is decoration-time-validated to apply only to primitive
   * fields (see annotations.ts), so the per-field unreliable flag here
   * always means "primitive value updates" — the structural-ADD-routes-
   * reliable footgun for ref-type fields can't reach this code path.
   *
   * `!isNew` holds an `@unreliable` field on the RELIABLE channel until this
   * tree's own ADD has shipped there. A decoder can only apply a field write
   * to a ref it already knows, so a value emitted before the ADD is dropped —
   * permanently, if the field is never written again. `isNew` clears in
   * `endEncode()`, i.e. after a reliable pass, and recording reliably is
   * itself what enqueues the tree for that pass; the state is self-clearing
   * and no tree can be stranded on the wrong channel. Mirrors `encodeAll`,
   * which has always seeded these fields for late joiners.
   *
   * Ordering matters: `isFieldUnreliable` short-circuits on the class-level
   * `hasAnyUnreliable`, so schemas without the modifier never read `flags`.
   */
  _routeAndRecord(index, op, raw) {
    if (this.paused || this.isFieldFullStateOnly(index))
      return;
    if (this.isFieldUnreliable(index) && !this.isNew) {
      const r = this.ensureUnreliableRecorder();
      if (raw)
        r.recordRaw(index, op);
      else
        r.record(index, op);
      this.root?.enqueueUnreliable(this);
      return;
    }
    if (raw)
      this.recordRaw(index, op);
    else
      this.record(index, op);
    this.root?.enqueueChangeTree(this);
  }
  change(index, operation = OPERATION.ADD) {
    this._routeAndRecord(index, operation, false);
  }
  indexedOperation(index, operation) {
    this._routeAndRecord(index, operation, true);
  }
  getChange(index) {
    return this.operationAt(index);
  }
  // ────────────────────────────────────────────────────────────────────
  // Change-tracking control API
  // ────────────────────────────────────────────────────────────────────
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
  untracked(fn) {
    const wasPaused = this.paused;
    this.paused = true;
    try {
      return fn();
    } finally {
      this.paused = wasPaused;
    }
  }
  // Manually mark a field dirty for the next encode(). Useful after a
  // paused mutation or a nested mutation that bypassed the setter.
  markDirty(index, operation = OPERATION.ADD) {
    const wasPaused = this.paused;
    this.paused = false;
    try {
      this.change(index, operation);
    } finally {
      this.paused = wasPaused;
    }
  }
  // used during `.encode()` — `isEncodeAll` is only consumed by ArraySchema.
  // Reads via `refTarget` so ArraySchema's Proxy trap is bypassed on the
  // hot per-field encode path.
  getValue(index, isEncodeAll = false) {
    return this.refTarget[$getByIndex](index, isEncodeAll);
  }
  delete(index, operation) {
    if (index === void 0) {
      try {
        throw new Error(`@colyseus/schema ${this.ref.constructor.name}: trying to delete non-existing index '${index}'`);
      } catch (e) {
        console.warn(e);
      }
      return;
    }
    if (this.paused || this.isFieldFullStateOnly(index))
      return this.getValue(index);
    const unreliable2 = this.isFieldUnreliable(index) && !this.isNew;
    if (unreliable2)
      this.ensureUnreliableRecorder().recordDelete(index, operation ?? OPERATION.DELETE);
    else
      this.recordDelete(index, operation ?? OPERATION.DELETE);
    const previousValue = this.getValue(index);
    if (previousValue && previousValue[$changes])
      this.root?.remove(previousValue[$changes]);
    if (unreliable2)
      this.root?.enqueueUnreliable(this);
    else
      this.root?.enqueueChangeTree(this);
    return previousValue;
  }
  // Clear the reliable dirty bucket after a reliable encode pass.
  endEncode() {
    this.reset();
    this.changesNode = void 0;
    if (!this._isSchema)
      this.refTarget[$onEncodeEnd]?.();
    this.isNew = false;
  }
  // Clear the unreliable dirty bucket after an unreliable encode pass.
  endEncodeUnreliable() {
    this.unreliableRecorder?.reset();
    this.unreliableChangesNode = void 0;
    if (!this._isSchema)
      this.refTarget[$onEncodeEnd]?.();
  }
  discard() {
    if (!this._isSchema)
      this.refTarget[$onEncodeEnd]?.();
    this.reset();
    this.unreliableRecorder?.reset();
  }
  // Recursively discard all changes on this + child structures. Tests only.
  discardAll() {
    const discardChild = (index) => {
      if (index < 0)
        return;
      const value = this.getValue(index);
      if (value && value[$changes])
        value[$changes].discardAll();
    };
    this.forEach(discardChild);
    this.unreliableRecorder?.forEach(discardChild);
    this.discard();
  }
  get changed() {
    return this.has() || (this.unreliableRecorder?.has() ?? false);
  }
  // ────────────────────────────────────────────────────────────────────
  // Parent chain — implementations in ./changeTree/parentChain.ts.
  // ────────────────────────────────────────────────────────────────────
  /** Immediate parent (primary). See `extraParents` for the 2nd+ chain. */
  get parent() {
    return this.parentRef;
  }
  get parentIndex() {
    return this._parentIndex;
  }
  addParent(parent, index) {
    addParent(this, parent, index);
  }
  /** Re-point an existing parent's cached index after the parent reindexed. */
  setParentIndex(parent, index) {
    setParentIndex(this, parent, index);
  }
  /** @returns true if parent was found and removed */
  removeParent(parent = this.parent) {
    return removeParent(this, parent);
  }
  findParent(predicate) {
    return findParent(this, predicate);
  }
  hasParent(predicate) {
    return hasParent(this, predicate);
  }
  /** Wire index this tree holds inside `parent`, or undefined if not a parent. */
  indexInParent(parent) {
    return indexInParent(this, parent);
  }
  getAllParents() {
    return getAllParents(this);
  }
};
var UntrackedChangeTree = class {
  ref;
  // Mirror the subset of ChangeTree state that decoder-path readers touch.
  // Everything else is deliberately undefined (matches the shape of a
  // freshly-constructed tree that never participated in a Root).
  root = void 0;
  parentRef = void 0;
  paused = false;
  isNew = false;
  flags = 0;
  constructor(ref) {
    this.ref = ref;
  }
  // Mutation surface — all no-ops.
  change() {
  }
  delete() {
  }
  indexedOperation() {
  }
  operation() {
  }
  setParent() {
  }
  addParent() {
  }
  setParentIndex() {
  }
  removeParent() {
    return false;
  }
  getChange() {
    return 0;
  }
  discard() {
  }
  discardAll() {
  }
  pause() {
  }
  resume() {
  }
  untracked(fn) {
    return fn();
  }
  markDirty() {
  }
  // Tree-walk surface. Mirrors `treeAttachment.forEachChild` so debug tools
  // and `ArraySchema.clear()` can still descend from a tracked root into
  // decoder-built subtrees and read each child's `$changes` (which is
  // itself an UntrackedChangeTree carrying the right `ref`).
  forEachChild(callback) {
    const ref = this.ref;
    if (ref[$childType]) {
      if (typeof ref[$childType] !== "string") {
        for (const [key, value] of ref.entries()) {
          if (!value)
            continue;
          callback(value[$changes], ref._collectionIndexes?.[key] ?? key);
        }
      }
      return;
    }
    const ctor = ref.constructor;
    const metadata = ctor?.[Symbol.metadata];
    if (!metadata)
      return;
    const refFieldIndexes = metadata[$refTypeFieldIndexes] ?? [];
    for (let i = 0; i < refFieldIndexes.length; i++) {
      const index = refFieldIndexes[i];
      const value = ref[metadata[index].name];
      if (!value)
        continue;
      callback(value[$changes], index);
    }
  }
  forEachChildWithCtx(ctx, callback) {
    this.forEachChild((change, at) => callback(ctx, change, at));
  }
  forEachLive() {
  }
  forEachLiveWithCtx() {
  }
  forEach() {
  }
};
function createUntrackedChangeTree(ref) {
  return new UntrackedChangeTree(ref);
}
function installUntrackedChangeTree(target, publicRef = target) {
  Object.defineProperty(target, $changes, {
    value: createUntrackedChangeTree(publicRef),
    enumerable: false,
    writable: true
  });
}
function encodeValue(encoder, bytes, type, value, operation, it, encoderFn) {
  if (encoderFn !== void 0) {
    encoderFn(bytes, value, it);
  } else if (typeof type === "string") {
    encode[type]?.(bytes, value, it);
  } else if (type[Symbol.metadata] != null) {
    encode.number(bytes, value[$refId], it);
    if ((operation & OPERATION.ADD) === OPERATION.ADD) {
      encoder.tryEncodeTypeId(bytes, type, value.constructor, it);
    }
  } else {
    encode.number(bytes, value[$refId], it);
  }
}
var encodeSchemaOperation = function(encoder, bytes, changeTree, index, operation, it, _, __) {
  bytes[it.offset++] = (index | operation) & 255;
  if (operation === OPERATION.DELETE) {
    return;
  }
  const desc = changeTree.encDescriptor;
  const ref = changeTree.ref;
  const value = ref[$values][index] ?? ref[desc.names[index]];
  encodeValue(encoder, bytes, desc.types[index], value, operation, it, desc.encoders[index]);
};
var encodeMapEntry = function(encoder, bytes, changeTree, index, operation, it) {
  bytes[it.offset++] = operation & 255;
  encode.number(bytes, index, it);
  if (operation === OPERATION.DELETE)
    return;
  const ref = changeTree.ref;
  if ((operation & OPERATION.ADD) === OPERATION.ADD) {
    const dynamicIndex = ref["$indexes"].get(index);
    encode.string(bytes, dynamicIndex, it);
  }
  encodeValue(encoder, bytes, ref[$childType], ref[$getByIndex](index), operation, it);
};
var encodeIndexedEntry = function(encoder, bytes, changeTree, index, operation, it) {
  bytes[it.offset++] = operation & 255;
  encode.number(bytes, index, it);
  if (operation === OPERATION.DELETE)
    return;
  const ref = changeTree.ref;
  encodeValue(encoder, bytes, ref[$childType], ref[$getByIndex](index), operation, it);
};
var encodeArray = function(encoder, bytes, changeTree, field, operation, it, isEncodeAll, hasView) {
  const ref = changeTree.refTarget;
  const type = ref[$childType];
  const isSchemaChild = typeof type !== "string";
  const useOperationByRefId = hasView && changeTree.isFiltered && isSchemaChild;
  let refOrIndex;
  if (useOperationByRefId) {
    const item = ref.tmpItems[field];
    if (!item) {
      return;
    }
    refOrIndex = item[$refId];
    if (operation === OPERATION.DELETE) {
      operation = OPERATION.DELETE_BY_REFID;
    } else if ((operation & OPERATION.ADD) === OPERATION.ADD) {
      operation = OPERATION.ADD_BY_REFID;
    } else if ((operation & OPERATION.MOVE) === OPERATION.MOVE) {
      return;
    }
  } else if (operation === OPERATION.DELETE && isSchemaChild) {
    const item = ref.tmpItems[field];
    if (!item) {
      return;
    }
    refOrIndex = item[$refId];
    operation = OPERATION.DELETE_BY_REFID;
  } else {
    refOrIndex = field;
  }
  bytes[it.offset++] = operation & 255;
  encode.number(bytes, refOrIndex, it);
  if (operation === OPERATION.DELETE || operation === OPERATION.DELETE_BY_REFID) {
    return;
  }
  const value = ref[$getByIndex](field, isEncodeAll);
  encodeValue(encoder, bytes, type, value, operation, it);
};
function resyncTouchEntry(decoder, ref, operation, identity, previousValue, value, allChanges) {
  const visited = decoder.resyncVisited;
  let set = visited.get(decoder.currentRefId);
  if (set === void 0) {
    visited.set(decoder.currentRefId, set = /* @__PURE__ */ new Set());
  }
  set.add(identity);
  if (previousValue !== void 0 && operation === OPERATION.ADD && previousValue !== value) {
    const previousRefId = previousValue[$refId];
    if (previousRefId !== void 0) {
      decoder.root.removeRef(previousRefId);
      allChanges?.push({
        ref,
        refId: decoder.currentRefId,
        op: OPERATION.DELETE,
        dynamicIndex: identity,
        value: void 0,
        previousValue
      });
    }
  }
}
function resyncMarkPresent(decoder, refId) {
  const visited = decoder.resyncVisited;
  if (!visited.has(refId)) {
    visited.set(refId, /* @__PURE__ */ new Set());
  }
}
function resyncSweep(decoder, allChanges) {
  if (decoder.resyncDamaged) {
    console.warn("@colyseus/schema: resync sweep skipped \u2014 parts of the payload could not be decoded. Stale entries may persist until the next resync.");
    return;
  }
  sweepSchema(decoder, decoder.state, /* @__PURE__ */ new Set(), allChanges);
}
function sweepSchema(decoder, ref, seen, allChanges) {
  const refId = ref[$refId];
  if (refId === void 0 || seen.has(refId)) {
    return;
  }
  seen.add(refId);
  const metadata = ref.constructor[Symbol.metadata];
  const refIndexes = metadata?.[$refTypeFieldIndexes];
  if (refIndexes === void 0) {
    return;
  }
  const patchOnly2 = metadata[$patchOnlyFieldIndexes];
  for (let i = 0; i < refIndexes.length; i++) {
    const fieldIndex = refIndexes[i];
    if (patchOnly2 !== void 0 && patchOnly2.includes(fieldIndex)) {
      continue;
    }
    const field = metadata[fieldIndex];
    const value = ref[field.name];
    if (!value) {
      continue;
    }
    if (Schema.is(field.type)) {
      sweepSchema(decoder, value, seen, allChanges);
    } else {
      sweepCollection(decoder, value, seen, allChanges);
    }
  }
}
function sweepCollection(decoder, coll, seen, allChanges) {
  const tgt = coll[$proxyTarget] ?? coll;
  const refId = tgt[$refId];
  if (refId === void 0 || seen.has(refId)) {
    return;
  }
  seen.add(refId);
  const visited = decoder.resyncVisited.get(refId);
  if (visited === void 0) {
    return;
  }
  const $root = decoder.root;
  tgt[$resyncPrune](visited, (value, identity) => {
    allChanges?.push({
      ref: coll,
      refId,
      op: OPERATION.DELETE,
      dynamicIndex: identity,
      value: void 0,
      previousValue: value
    });
    const childRefId = value?.[$refId];
    if (childRefId !== void 0) {
      $root.removeRef(childRefId);
    }
  }, (value) => {
    if (Schema.isSchema(value)) {
      sweepSchema(decoder, value, seen, allChanges);
    }
  });
}
var DEFINITION_MISMATCH = -1;
var CollectionKind = {
  Map: 1,
  Array: 2,
  Set: 3,
  Collection: 4,
  Stream: 5
};
function decodeValue(decoder, operation, ref, index, previousValue, type, bytes, it, allChanges) {
  const $root = decoder.root;
  let value;
  if ((operation & OPERATION.DELETE) === OPERATION.DELETE) {
    const previousRefId = previousValue?.[$refId];
    if (previousRefId !== void 0) {
      $root.removeRef(previousRefId);
    }
    if (operation !== OPERATION.DELETE_AND_ADD) {
      ref[$deleteByIndex](index);
    }
    value = void 0;
  }
  if (operation === OPERATION.DELETE) ;
  else if (typeof type === "string") {
    value = decode[type](bytes, it);
  } else if (isQuantizedType(type)) {
    value = decodeQuantized(type.quantized, bytes, it);
  } else if (Schema.is(type)) {
    const refId = decode.number(bytes, it);
    value = $root.refs.get(refId);
    if ((operation & OPERATION.ADD) === OPERATION.ADD) {
      const childType = decoder.getInstanceType(bytes, it, type);
      if (!value) {
        value = decoder.createInstanceOfType(childType);
      }
      $root.addRef(refId, value, value !== previousValue || // increment ref count if value has changed
      operation === OPERATION.DELETE_AND_ADD && value === previousValue);
    }
  } else {
    const typeDef = getType(Object.keys(type)[0]);
    const refId = decode.number(bytes, it);
    if (decoder.resyncVisited !== null) {
      resyncMarkPresent(decoder, refId);
    }
    const valueRef = $root.refs.has(refId) ? previousValue || $root.refs.get(refId) : typeDef.constructor.initializeForDecoder();
    value = valueRef.clone(true);
    value[$childType] = Object.values(type)[0];
    if (previousValue) {
      let previousRefId = previousValue[$refId];
      if (previousRefId !== void 0 && refId !== previousRefId) {
        if ((operation & OPERATION.DELETE) !== OPERATION.DELETE) {
          $root.removeRef(previousRefId);
        }
        const entries = previousValue.entries();
        let iter;
        while ((iter = entries.next()) && !iter.done) {
          const [key, value2] = iter.value;
          if (typeof value2 === "object") {
            previousRefId = value2[$refId];
          }
          allChanges?.push({
            ref: previousValue,
            refId: previousRefId,
            op: OPERATION.DELETE,
            field: key,
            value: void 0,
            previousValue: value2
          });
        }
      }
    }
    $root.addRef(refId, value, valueRef !== previousValue || operation === OPERATION.DELETE_AND_ADD && valueRef === previousValue);
  }
  return value;
}
var decodeSchemaOperation = function(decoder, bytes, it, ref, allChanges) {
  const first_byte = bytes[it.offset++];
  const metadata = ref.constructor[Symbol.metadata];
  const operation = first_byte >> 6 << 6;
  const index = first_byte % (operation || 255);
  const field = metadata[index];
  if (field === void 0) {
    console.warn("@colyseus/schema: field not defined at", { index, ref: ref.constructor.name, metadata });
    return DEFINITION_MISMATCH;
  }
  const isDeprecated = field.deprecated === true;
  const previousValue = isDeprecated ? void 0 : ref[$getByIndex](index);
  const value = decodeValue(decoder, operation, ref, index, previousValue, field.type, bytes, it, allChanges);
  if (isDeprecated) {
    return;
  }
  if (value !== null && value !== void 0) {
    ref[field.name] = value;
  }
  if (previousValue !== value) {
    allChanges?.push({
      ref,
      refId: decoder.currentRefId,
      op: operation,
      field: field.name,
      value,
      previousValue
    });
  }
};
var decodeKeyValueOperation = function(decoder, bytes, it, ref, allChanges) {
  const tgt = ref[$proxyTarget] ?? ref;
  const operation = bytes[it.offset++];
  if (operation === OPERATION.CLEAR) {
    decoder.removeChildRefs(tgt, allChanges);
    tgt.clear();
    return;
  }
  const index = decode.number(bytes, it);
  const type = tgt[$childType];
  const kind = tgt.constructor.COLLECTION_KIND;
  let dynamicIndex;
  if ((operation & OPERATION.ADD) === OPERATION.ADD) {
    if (kind === CollectionKind.Map) {
      dynamicIndex = decode.string(bytes, it);
      tgt.setIndex(index, dynamicIndex);
    } else {
      dynamicIndex = index;
    }
  } else {
    dynamicIndex = tgt.getIndex(index);
  }
  const previousValue = tgt[$getByIndex](index);
  const value = decodeValue(decoder, operation, ref, index, previousValue, type, bytes, it, allChanges);
  if (decoder.resyncVisited !== null) {
    resyncTouchEntry(decoder, ref, operation, dynamicIndex, previousValue, value, allChanges);
  }
  if (value !== null && value !== void 0) {
    switch (kind) {
      case CollectionKind.Map:
        tgt.$items.set(dynamicIndex, value);
        break;
      case CollectionKind.Array:
        tgt.$setAt(index, value, decoder.resyncVisited !== null && operation === OPERATION.ADD ? OPERATION.REPLACE : operation);
        break;
      // SetSchema / CollectionSchema / StreamSchema — use the wire-
      // index we decoded above so server/client `$items` stay in sync
      // regardless of duplicate emission (e.g. a bootstrap that walks
      // both `encodeAll` and the shared recorder emits the same ADD
      // op twice). Previous implementation called `ref.add(value)`
      // and let the decoder-side `$refId++` allocate a new index per
      // call — which for CollectionSchema (no value-dedup) turned
      // duplicate wire ADDs into duplicate client-side entries.
      case CollectionKind.Set:
      case CollectionKind.Collection:
      case CollectionKind.Stream:
        if (!tgt.$items.has(index)) {
          tgt.$items.set(index, value);
          if (typeof tgt.$refId === "number" && index >= tgt.$refId) {
            tgt.$refId = index + 1;
          }
        }
        break;
      default:
        console.warn(`@colyseus/schema: missing COLLECTION_KIND on ${tgt.constructor?.name} \u2014 item at index ${index} was not stored.`);
        break;
    }
  }
  if (previousValue !== value) {
    allChanges?.push({
      ref,
      refId: decoder.currentRefId,
      op: operation,
      dynamicIndex,
      value,
      previousValue
    });
  }
};
var decodeArray = function(decoder, bytes, it, ref, allChanges) {
  const tgt = ref[$proxyTarget] ?? ref;
  let operation = bytes[it.offset++];
  let index;
  if (operation === OPERATION.CLEAR) {
    decoder.removeChildRefs(tgt, allChanges);
    tgt.clear();
    return;
  } else if (operation === OPERATION.REVERSE) {
    tgt.items.reverse();
    return;
  } else if (operation === OPERATION.DELETE_BY_REFID) {
    const refId = decode.number(bytes, it);
    const previousValue2 = decoder.root.refs.get(refId);
    if (previousValue2 === void 0) {
      return;
    }
    decoder.root.removeRef(refId);
    index = tgt.findIndex((value2) => value2 === previousValue2);
    if (index === -1) {
      return;
    }
    tgt[$deleteByIndex](index);
    allChanges?.push({
      ref,
      refId: decoder.currentRefId,
      op: OPERATION.DELETE,
      dynamicIndex: index,
      value: void 0,
      previousValue: previousValue2
    });
    return;
  } else if (operation === OPERATION.ADD_BY_REFID) {
    const refId = decode.number(bytes, it);
    const itemByRefId = decoder.root.refs.get(refId);
    if (itemByRefId) {
      index = tgt.findIndex((value2) => value2 === itemByRefId);
    }
    if (index === -1 || index === void 0) {
      index = tgt.length;
    }
  } else {
    index = decode.number(bytes, it);
  }
  const type = tgt[$childType];
  let dynamicIndex = index;
  const previousValue = tgt.items[index];
  const value = decodeValue(decoder, operation, ref, index, previousValue, type, bytes, it, allChanges);
  if (decoder.resyncVisited !== null) {
    resyncTouchEntry(decoder, ref, operation, index, previousValue, value, allChanges);
  }
  if (value !== null && value !== void 0 && value !== previousValue) {
    tgt.$setAt(index, value, decoder.resyncVisited !== null && operation === OPERATION.ADD ? OPERATION.REPLACE : operation);
  }
  if (previousValue !== value) {
    allChanges?.push({
      ref,
      refId: decoder.currentRefId,
      op: operation,
      dynamicIndex,
      value,
      previousValue
    });
  }
};
var EncodeSchemaError = class extends Error {
};
function assertInstanceType(value, type, instance, field) {
  if (!(value instanceof type)) {
    throw new EncodeSchemaError(`a '${type.name}' was expected, but '${value && value.constructor.name}' was provided in ${instance.constructor.name}#${field}`);
  }
}
var DEFAULT_SORT = (a, b) => {
  const A = a.toString();
  const B = b.toString();
  if (A < B)
    return -1;
  else if (A > B)
    return 1;
  else
    return 0;
};
var ARRAY_PROXY_HANDLER = {
  get: (obj, prop) => {
    if (typeof prop !== "symbol" && // FIXME: d8 accuses this as low performance
    !isNaN(prop)) {
      return obj.items[prop];
    }
    return Reflect.get(obj, prop);
  },
  set: (obj, key, setValue) => {
    if (typeof key !== "symbol" && !isNaN(key)) {
      if (setValue === void 0 || setValue === null) {
        obj.$deleteAt(key);
      } else {
        let wireIndex;
        if (setValue[$changes]) {
          assertInstanceType(setValue, obj[$childType], obj, key);
          const previousValue = obj.items[key];
          if (!obj.isMovingItems) {
            wireIndex = obj.$changeAt(Number(key), setValue);
          } else {
            wireIndex = obj.$wireIndex(Number(key));
            if (previousValue !== void 0) {
              if (setValue[$changes].isNew) {
                obj[$changes].indexedOperation(wireIndex, OPERATION.MOVE_AND_ADD);
              } else {
                if ((obj[$changes].getChange(wireIndex) & OPERATION.DELETE) === OPERATION.DELETE) {
                  obj[$changes].indexedOperation(wireIndex, OPERATION.DELETE_AND_MOVE);
                } else {
                  obj[$changes].indexedOperation(wireIndex, OPERATION.MOVE);
                }
              }
            } else if (setValue[$changes].isNew) {
              obj[$changes].indexedOperation(wireIndex, OPERATION.ADD);
            }
            setValue[$changes].setParent(obj, obj[$changes].root, wireIndex);
          }
          if (previousValue !== void 0) {
            previousValue[$changes].root?.remove(previousValue[$changes]);
          }
        } else {
          wireIndex = obj.$changeAt(Number(key), setValue);
        }
        obj.items[key] = setValue;
        if (wireIndex !== void 0) {
          obj.tmpItems[wireIndex] = setValue;
        }
      }
      return true;
    }
    return Reflect.set(obj, key, setValue);
  },
  deleteProperty: (obj, prop) => {
    if (typeof prop === "number") {
      obj.$deleteAt(prop);
    } else {
      delete obj[prop];
    }
    return true;
  },
  has: (obj, key) => {
    if (typeof key !== "symbol" && !isNaN(Number(key))) {
      return Reflect.has(obj.items, key);
    }
    return Reflect.has(obj, key);
  }
};
var ArraySchema = class _ArraySchema {
  [$changes];
  [$refId];
  [$proxyTarget];
  [$childType];
  items = [];
  tmpItems = [];
  deletedIndexes = [];
  isMovingItems = false;
  /** Decode-side: `items` has holes (delete or gap-write) — `$onDecodeEnd` must compact. */
  _needsCompaction = false;
  static [$encoder] = encodeArray;
  static [$decoder] = decodeArray;
  /** Integer tag read by `decodeKeyValueOperation` — see `CollectionKind`. */
  static COLLECTION_KIND = CollectionKind.Array;
  /**
   * Determine if a property must be filtered.
   * - If returns false, the property is NOT going to be encoded.
   * - If returns true, the property is going to be encoded.
   *
   * Encoding with "filters" happens in two steps:
   * - First, the encoder iterates over all "not owned" properties and encodes them.
   * - Then, the encoder iterates over all "owned" properties per instance and encodes them.
   */
  static [$filter](ref, index, view2) {
    if (!view2)
      return true;
    const self2 = ref[$proxyTarget] ?? ref;
    return typeof self2[$childType] === "string" || view2.isChangeTreeVisible(self2["tmpItems"][index]?.[$changes]);
  }
  static is(type) {
    return (
      // type format: ["string"]
      Array.isArray(type) || // type format: { array: "string" }
      type["array"] !== void 0
    );
  }
  static from(iterable) {
    return new _ArraySchema(...Array.from(iterable));
  }
  constructor(...items) {
    this[$childType] = void 0;
    this[$proxyTarget] = this;
    const proxy = new Proxy(this, ARRAY_PROXY_HANDLER);
    Object.defineProperty(this, $changes, {
      value: new ChangeTree(proxy, this),
      enumerable: false,
      writable: true
    });
    if (items.length > 0) {
      this.push(...items);
    }
    return proxy;
  }
  /**
   * Decoder-side factory. Skips the `ChangeTree` allocation and
   * replicates the class-field initializers by hand (since `Object.create`
   * bypasses them). Must stay in sync with the class-field declarations
   * and the constructor body above.
   *
   * Pass the Proxy to `installUntrackedChangeTree` as the public identity
   * so children set their parent to the Proxy, not the raw target.
   */
  static initializeForDecoder() {
    const self2 = Object.create(_ArraySchema.prototype);
    self2.items = [];
    self2.isMovingItems = false;
    self2._needsCompaction = false;
    self2[$childType] = void 0;
    self2[$proxyTarget] = self2;
    const proxy = new Proxy(self2, ARRAY_PROXY_HANDLER);
    installUntrackedChangeTree(self2, proxy);
    return proxy;
  }
  set length(newLength) {
    if (newLength === 0) {
      this.clear();
    } else if (newLength < this.items.length) {
      this.splice(newLength, this.length - newLength);
    } else {
      console.warn("ArraySchema: can't set .length to a higher value than its length.");
    }
  }
  get length() {
    return this.items.length;
  }
  // ────── Change tracking control (same API as Schema) ──────
  pauseTracking() {
    this[$changes].pause();
  }
  resumeTracking() {
    this[$changes].resume();
  }
  untracked(fn) {
    return this[$changes].untracked(fn);
  }
  get isTrackingPaused() {
    return this[$changes].paused;
  }
  push(...values) {
    const self2 = this[$proxyTarget];
    const items = self2.items;
    const tmpItems = self2.tmpItems;
    const changeTree = self2[$changes];
    const childType = self2[$childType];
    let length = tmpItems.length;
    for (let i = 0, l = values.length; i < l; i++, length++) {
      const value = values[i];
      if (value === void 0 || value === null) {
        return;
      } else if (typeof value === "object" && childType) {
        assertInstanceType(value, childType, self2, i);
      }
      changeTree.indexedOperation(length, OPERATION.ADD);
      items.push(value);
      tmpItems.push(value);
      value[$changes]?.setParent(this, changeTree.root, length);
    }
    return length;
  }
  /**
   * Removes the last element from an array and returns it.
   */
  pop() {
    const self2 = this[$proxyTarget];
    const tmpItems = self2.tmpItems;
    const deletedIndexes = self2.deletedIndexes;
    let index = -1;
    for (let i = tmpItems.length - 1; i >= 0; i--) {
      if (deletedIndexes[i] !== true) {
        index = i;
        break;
      }
    }
    if (index < 0) {
      return void 0;
    }
    const cancel = self2.$isUnsentAdd(index);
    self2[$changes].delete(index);
    if (cancel) {
      self2.$cancelAdd(index);
    } else {
      deletedIndexes[index] = true;
    }
    return self2.items.pop();
  }
  at(index) {
    if (index < 0)
      index += this.length;
    return this.items[index];
  }
  /**
   * items-index → wire (tmpItems) index. Identity while no deletions are
   * staged this tick; otherwise maps to the index-th live (non-deleted)
   * tmpItems slot — the same live-index walk `splice()` uses. Without the
   * translation, index writes recorded after a same-tick `shift()`/`splice()`
   * land on the wrong wire slots.
   */
  $wireIndex(index) {
    const deletedIndexes = this.deletedIndexes;
    if (deletedIndexes.length === 0) {
      return index;
    }
    const tmpItems = this.tmpItems;
    let live = 0;
    for (let i = 0; i < tmpItems.length; i++) {
      if (deletedIndexes[i] !== true) {
        if (live === index) {
          return i;
        }
        live++;
      }
    }
    return tmpItems.length + (index - live);
  }
  /**
   * True when wire slot `at` holds an ADD recorded this tick that no client
   * has seen, so the slot can be erased outright instead of shipping a
   * DELETE for something nobody has. Only Schema children matter: their
   * DELETE goes out as DELETE_BY_REFID, which the decoder resolves against
   * every reference to the instance — a phantom one decrements a refCount
   * owned by whichever other collection still holds it.
   *
   * Call BEFORE `ChangeTree.delete()`, which overwrites the ADD. One mask
   * test rules out both hazards (a same-tick full sync made the pending
   * indexes load-bearing; a stream journal owns the positions).
   */
  $isUnsentAdd(at) {
    const changeTree = this[$changes];
    return (changeTree.flags & (PENDING_SHIPPED_BY_FULL_SYNC | IS_STREAM_COLLECTION)) === 0 && !changeTree.paused && typeof this[$childType] !== "string" && changeTree.operationAt(at) === OPERATION.ADD;
  }
  /**
   * Erase a wire slot whose ADD never reached a client. The staged layout
   * closes over it, so no emitter — shared pass, view drain, snapshot or
   * stream — can address it: the add never happened.
   *
   * Caller must have run `changeTree.delete(at)` FIRST: it resolves
   * `$getByIndex(at)` against the still-intact snapshot (splicing first
   * would resolve the next element) and releases the element's refCount.
   */
  $cancelAdd(at, reindex = true) {
    const changeTree = this[$changes];
    const removed = this.tmpItems[at];
    this.tmpItems.splice(at, 1);
    if (this.deletedIndexes.length > 0) {
      this.deletedIndexes.splice(at, 1);
    }
    changeTree.removeAt(at, 1);
    const removedTree = removed?.[$changes];
    if (removedTree !== void 0 && removedTree.root === void 0) {
      removedTree.removeParent(this);
    }
    if (reindex) {
      this.$reindexChildren(at);
    }
  }
  /**
   * Re-point children at their wire slot. `ChangeTree._parentIndex` caches
   * the slot a child holds in `tmpItems`, and StateView addresses per-view
   * ADD/DELETE with it — so a reorder that leaves it behind aims those ops
   * at whichever element inherited the slot (issue #231).
   *
   * The filter check is a correctness boundary, not a tunable: StateView is
   * the only reader and reaches the index only through a filtered array
   * (`addParentOf` bails on `hasFilteredFields`, `remove` on the child's
   * `isFiltered`). Everything else stops at the flag read instead of walking
   * its children every tick.
   *
   * Callers name the lowest slot that moved as `from`. Compaction cannot, so
   * it hands over the pre-compaction layout as `staged` and the unchanged
   * prefix is skipped instead. Either way tail churn walks nothing.
   */
  $reindexChildren(from, staged) {
    if (!this[$changes].hasFilteredFields) {
      return;
    }
    if (typeof this[$childType] === "string") {
      return;
    }
    const tmpItems = this.tmpItems;
    const length = tmpItems.length;
    if (staged !== void 0) {
      while (from < length && tmpItems[from] === staged[from]) {
        from++;
      }
    }
    for (let i = from; i < length; i++) {
      tmpItems[i]?.[$changes]?.setParentIndex(this, i);
    }
  }
  // encoding only. Returns the wire index the change was recorded at
  // (undefined when nothing was recorded).
  $changeAt(index, value) {
    if (value === void 0 || value === null) {
      console.error("ArraySchema items cannot be null nor undefined; Use `splice(index, 1)` instead.");
      return void 0;
    }
    if (this.items[index] === value) {
      return void 0;
    }
    const operation = this.items[index] !== void 0 ? typeof value === "object" ? OPERATION.DELETE_AND_ADD : OPERATION.REPLACE : OPERATION.ADD;
    const wireIndex = this.$wireIndex(index);
    const changeTree = this[$changes];
    changeTree.change(wireIndex, operation);
    value[$changes]?.setParent(this, changeTree.root, wireIndex);
    return wireIndex;
  }
  // encoding only
  $deleteAt(index, operation) {
    this[$changes].delete(this.$wireIndex(index), operation);
  }
  // decoding only
  $setAt(index, value, operation) {
    if (operation === OPERATION.ADD && this.items[index] !== void 0) {
      this.items.splice(index, 0, value);
    } else if (operation === OPERATION.DELETE_AND_MOVE) {
      this.items.splice(index, 1);
      this.items[index] = value;
    } else {
      if (index > this.items.length) {
        this._needsCompaction = true;
      }
      this.items[index] = value;
    }
  }
  clear() {
    const self2 = this[$proxyTarget];
    if (self2.items.length === 0) {
      return;
    }
    const changeTree = self2[$changes];
    changeTree.forEachChild((childChangeTree, _) => {
      changeTree.root?.remove(childChangeTree);
    });
    changeTree.discard();
    changeTree.operation(OPERATION.CLEAR);
    self2.items.length = 0;
    self2.tmpItems.length = 0;
  }
  /**
   * Pool reset: empty this array and recycle its ChangeTree WITHOUT recording
   * any wire op (the parent field's ADD/DELETE owns the wire). Recurses into
   * ref-type children. Called by Schema.reset when a pooled entity has an
   * array field. The instance must already be detached from the encoder.
   */
  [$reset]() {
    const self2 = this[$proxyTarget] ?? this;
    const changeTree = self2[$changes];
    if (changeTree.isStreamCollection) {
      throw new Error(`@colyseus/schema: cannot reset a streamed ArraySchema (pooling not supported).`);
    }
    const items = self2.items;
    for (let i = 0; i < items.length; i++)
      items[i]?.[$reset]?.();
    self2.items.length = 0;
    self2.tmpItems.length = 0;
    self2.deletedIndexes.length = 0;
    changeTree.recycle();
    self2[$refId] = void 0;
  }
  /**
   * Combines two or more arrays.
   * @param items Additional items to add to the end of array1.
   */
  // @ts-ignore
  concat(...items) {
    return new _ArraySchema(...this.items.concat(...items));
  }
  /**
   * Adds all the elements of an array separated by the specified separator string.
   * @param separator A string used to separate one element of an array from the next in the resulting String. If omitted, the array elements are separated with a comma.
   */
  join(separator) {
    return this.items.join(separator);
  }
  /**
   * Reverses the elements in an Array.
   */
  // @ts-ignore
  reverse() {
    const self2 = this[$proxyTarget];
    const changeTree = self2[$changes];
    if (changeTree.has() || self2.deletedIndexes.length > 0) {
      const reversed = self2.items.slice().reverse();
      this.clear();
      this.push(...reversed);
      return this;
    }
    changeTree.operation(OPERATION.REVERSE);
    self2.items.reverse();
    self2.tmpItems.reverse();
    self2.$reindexChildren(0);
    return this;
  }
  /**
   * Removes the first element from an array and returns it.
   */
  shift() {
    const self2 = this[$proxyTarget];
    const items = self2.items;
    if (items.length === 0) {
      return void 0;
    }
    const changeTree = self2[$changes];
    const deletedIndexes = self2.deletedIndexes;
    let index = 0;
    while (deletedIndexes[index] === true) {
      index++;
    }
    const cancel = self2.$isUnsentAdd(index);
    changeTree.delete(index, OPERATION.DELETE);
    if (cancel) {
      self2.$cancelAdd(index);
    } else {
      deletedIndexes[index] = true;
    }
    return items.shift();
  }
  /**
   * Returns a section of an array.
   * @param start The beginning of the specified portion of the array.
   * @param end The end of the specified portion of the array. This is exclusive of the element at the index 'end'.
   */
  slice(start, end) {
    const sliced = new _ArraySchema();
    sliced.push(...this.items.slice(start, end));
    return sliced;
  }
  /**
   * Sorts an array.
   * @param compareFn Function used to determine the order of the elements. It is expected to return
   * a negative value if first argument is less than second argument, zero if they're equal and a positive
   * value otherwise. If omitted, the elements are sorted in ascending, ASCII character order.
   * ```ts
   * [11,2,22,1].sort((a, b) => a - b)
   * ```
   */
  sort(compareFn = DEFAULT_SORT) {
    const self2 = this[$proxyTarget];
    self2.isMovingItems = true;
    const changeTree = self2[$changes];
    const sortedItems = self2.items.sort(compareFn);
    sortedItems.forEach((_, i) => changeTree.change(i, OPERATION.REPLACE));
    self2.tmpItems.sort(compareFn);
    self2.$reindexChildren(0);
    self2.isMovingItems = false;
    return this;
  }
  /**
   * Removes elements from an array and, if necessary, inserts new elements in their place, returning the deleted elements.
   * @param start The zero-based location in the array from which to start removing elements.
   * @param deleteCount The number of elements to remove.
   * @param insertItems Elements to insert into the array in place of the deleted elements.
   */
  splice(start, deleteCount, ...insertItems) {
    const self2 = this[$proxyTarget];
    const changeTree = self2[$changes];
    const items = self2.items;
    const tmpItems = self2.tmpItems;
    const deletedIndexes = self2.deletedIndexes;
    const itemsLength = items.length;
    const tmpItemsLength = tmpItems.length;
    const insertCount = insertItems.length;
    const indexes = [];
    for (let i = 0; i < tmpItemsLength; i++) {
      if (deletedIndexes[i] !== true) {
        indexes.push(i);
      }
    }
    let unsent;
    if (itemsLength > start) {
      if (deleteCount === void 0) {
        deleteCount = itemsLength - start;
      }
      for (let i = start; i < start + deleteCount; i++) {
        const index = indexes[i];
        const isUnsent = self2.$isUnsentAdd(index);
        changeTree.delete(index, OPERATION.DELETE);
        if (isUnsent) {
          (unsent ??= []).push(index);
        } else {
          deletedIndexes[index] = true;
        }
      }
    } else {
      deleteCount = 0;
    }
    if (insertCount > 0) {
      const base = indexes[start] ?? itemsLength;
      const reuse = Math.min(insertCount, deleteCount);
      for (let i = 0; i < reuse; i++) {
        const addIndex = base + i;
        let op;
        const u = unsent !== void 0 ? unsent.indexOf(addIndex) : -1;
        if (u !== -1) {
          unsent.splice(u, 1);
          op = OPERATION.ADD;
        } else {
          op = deletedIndexes[addIndex] ? OPERATION.DELETE_AND_ADD : OPERATION.ADD;
        }
        changeTree.indexedOperation(addIndex, op);
        tmpItems[addIndex] = insertItems[i];
        deletedIndexes[addIndex] = false;
        insertItems[i][$changes]?.setParent(this, changeTree.root, addIndex);
      }
      const extra = insertCount - reuse;
      if (extra > 0) {
        const at = base + reuse;
        changeTree.insertAt(at, extra);
        for (let i = 0; i < extra; i++) {
          insertItems[reuse + i][$changes]?.setParent(this, changeTree.root, at + i);
        }
        if (deletedIndexes.length > 0) {
          deletedIndexes.splice(at, 0, ...new Array(extra).fill(false));
        }
        tmpItems.splice(at, 0, ...insertItems.slice(reuse));
        self2.$reindexChildren(at + extra);
      }
    }
    if (unsent !== void 0 && unsent.length > 0) {
      for (let i = unsent.length - 1; i >= 0; i--) {
        self2.$cancelAdd(unsent[i], false);
      }
      self2.$reindexChildren(unsent[0]);
    }
    changeTree.root?.enqueueChangeTree(changeTree);
    return items.splice(start, deleteCount, ...insertItems);
  }
  /**
   * Inserts new elements at the start of an array.
   * @param items  Elements to insert at the start of the Array.
   */
  unshift(...items) {
    const self2 = this[$proxyTarget];
    const changeTree = self2[$changes];
    changeTree.unshift(items.length);
    for (let i = 0; i < items.length; i++) {
      items[i]?.[$changes]?.setParent(this, changeTree.root, i);
    }
    const deletedIndexes = self2.deletedIndexes;
    if (deletedIndexes.length > 0) {
      deletedIndexes.unshift(...new Array(items.length).fill(false));
    }
    self2.tmpItems.unshift(...items);
    self2.$reindexChildren(items.length);
    return self2.items.unshift(...items);
  }
  /**
   * Returns the index of the first occurrence of a value in an array.
   * @param searchElement The value to locate in the array.
   * @param fromIndex The array index at which to begin the search. If fromIndex is omitted, the search starts at index 0.
   */
  indexOf(searchElement, fromIndex) {
    return this.items.indexOf(searchElement, fromIndex);
  }
  /**
   * Returns the index of the last occurrence of a specified value in an array.
   * @param searchElement The value to locate in the array.
   * @param fromIndex The array index at which to begin the search. If fromIndex is omitted, the search starts at the last index in the array.
   */
  lastIndexOf(searchElement, fromIndex = this.length - 1) {
    return this.items.lastIndexOf(searchElement, fromIndex);
  }
  every(callbackfn, thisArg) {
    return this.items.every(callbackfn, thisArg);
  }
  /**
   * Determines whether the specified callback function returns true for any element of an array.
   * @param callbackfn A function that accepts up to three arguments. The some method calls
   * the callbackfn function for each element in the array until the callbackfn returns a value
   * which is coercible to the Boolean value true, or until the end of the array.
   * @param thisArg An object to which the this keyword can refer in the callbackfn function.
   * If thisArg is omitted, undefined is used as the this value.
   */
  some(callbackfn, thisArg) {
    return this.items.some(callbackfn, thisArg);
  }
  /**
   * Performs the specified action for each element in an array.
   * @param callbackfn  A function that accepts up to three arguments. forEach calls the callbackfn function one time for each element in the array.
   * @param thisArg  An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
   */
  forEach(callbackfn, thisArg) {
    return this.items.forEach(callbackfn, thisArg);
  }
  /**
   * Calls a defined callback function on each element of an array, and returns an array that contains the results.
   * @param callbackfn A function that accepts up to three arguments. The map method calls the callbackfn function one time for each element in the array.
   * @param thisArg An object to which the this keyword can refer in the callbackfn function. If thisArg is omitted, undefined is used as the this value.
   */
  map(callbackfn, thisArg) {
    return this.items.map(callbackfn, thisArg);
  }
  filter(callbackfn, thisArg) {
    return this.items.filter(callbackfn, thisArg);
  }
  /**
   * Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
   * @param callbackfn A function that accepts up to four arguments. The reduce method calls the callbackfn function one time for each element in the array.
   * @param initialValue If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.
   */
  reduce(callbackfn, initialValue) {
    return this.items.reduce.apply(this.items, arguments);
  }
  /**
   * Calls the specified callback function for all the elements in an array, in descending order. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
   * @param callbackfn A function that accepts up to four arguments. The reduceRight method calls the callbackfn function one time for each element in the array.
   * @param initialValue If initialValue is specified, it is used as the initial value to start the accumulation. The first call to the callbackfn function provides this value as an argument instead of an array value.
   */
  reduceRight(callbackfn, initialValue) {
    return this.items.reduceRight.apply(this.items, arguments);
  }
  /**
   * Returns the value of the first element in the array where predicate is true, and undefined
   * otherwise.
   * @param predicate find calls predicate once for each element of the array, in ascending
   * order, until it finds one where predicate returns true. If such an element is found, find
   * immediately returns that element value. Otherwise, find returns undefined.
   * @param thisArg If provided, it will be used as the this value for each invocation of
   * predicate. If it is not provided, undefined is used instead.
   */
  find(predicate, thisArg) {
    return this.items.find(predicate, thisArg);
  }
  /**
   * Returns the index of the first element in the array where predicate is true, and -1
   * otherwise.
   * @param predicate find calls predicate once for each element of the array, in ascending
   * order, until it finds one where predicate returns true. If such an element is found,
   * findIndex immediately returns that element index. Otherwise, findIndex returns -1.
   * @param thisArg If provided, it will be used as the this value for each invocation of
   * predicate. If it is not provided, undefined is used instead.
   */
  findIndex(predicate, thisArg) {
    return this.items.findIndex(predicate, thisArg);
  }
  /**
   * Returns the this object after filling the section identified by start and end with value
   * @param value value to fill array section with
   * @param start index to start filling the array at. If start is negative, it is treated as
   * length+start where length is the length of the array.
   * @param end index to stop filling the array at. If end is negative, it is treated as
   * length+end.
   */
  fill(value, start, end) {
    throw new Error("ArraySchema#fill() not implemented");
  }
  /**
   * Returns the this object after copying a section of the array identified by start and end
   * to the same array starting at position target
   * @param target If target is negative, it is treated as length+target where length is the
   * length of the array.
   * @param start If start is negative, it is treated as length+start. If end is negative, it
   * is treated as length+end.
   * @param end If not specified, length of the this object is used as its default value.
   */
  copyWithin(target, start, end) {
    throw new Error("ArraySchema#copyWithin() not implemented");
  }
  /**
   * Returns a string representation of an array.
   */
  toString() {
    return this.items.toString();
  }
  /**
   * Returns a string representation of an array. The elements are converted to string using their toLocalString methods.
   */
  toLocaleString() {
    return this.items.toLocaleString();
  }
  /** Iterator */
  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }
  static get [Symbol.species]() {
    return _ArraySchema;
  }
  // WORKAROUND for compatibility
  // - TypeScript 4 defines @@unscopables as a function
  // - TypeScript 5 defines @@unscopables as an object
  [Symbol.unscopables];
  /**
   * Returns an iterable of key, value pairs for every entry in the array
   */
  entries() {
    return this.items.entries();
  }
  /**
   * Returns an iterable of keys in the array
   */
  keys() {
    return this.items.keys();
  }
  /**
   * Returns an iterable of values in the array
   */
  values() {
    return this.items.values();
  }
  /**
   * Determines whether an array includes a certain element, returning true or false as appropriate.
   * @param searchElement The element to search for.
   * @param fromIndex The position in this array at which to begin searching for searchElement.
   */
  includes(searchElement, fromIndex) {
    return this.items.includes(searchElement, fromIndex);
  }
  //
  // ES2022
  //
  /**
   * Calls a defined callback function on each element of an array. Then, flattens the result into
   * a new array.
   * This is identical to a map followed by flat with depth 1.
   *
   * @param callback A function that accepts up to three arguments. The flatMap method calls the
   * callback function one time for each element in the array.
   * @param thisArg An object to which the this keyword can refer in the callback function. If
   * thisArg is omitted, undefined is used as the this value.
   */
  // @ts-ignore
  flatMap(callback, thisArg) {
    throw new Error("ArraySchema#flatMap() is not supported.");
  }
  /**
   * Returns a new array with all sub-array elements concatenated into it recursively up to the
   * specified depth.
   *
   * @param depth The maximum recursion depth
   */
  // @ts-ignore
  flat(depth) {
    throw new Error("ArraySchema#flat() is not supported.");
  }
  findLast() {
    return this.items.findLast.apply(this.items, arguments);
  }
  findLastIndex(...args) {
    return this.items.findLastIndex.apply(this.items, arguments);
  }
  //
  // ES2023
  //
  with(index, value) {
    const copy = this.items.slice();
    if (index < 0)
      index += this.length;
    copy[index] = value;
    return new _ArraySchema(...copy);
  }
  toReversed() {
    return this.items.slice().reverse();
  }
  toSorted(compareFn) {
    return this.items.slice().sort(compareFn);
  }
  // @ts-ignore
  toSpliced(start, deleteCount, ...items) {
    const copy = this.items.slice();
    copy.splice.apply(copy, arguments);
    return copy;
  }
  shuffle() {
    return this.move((_) => {
      let currentIndex = this.items.length;
      while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [this[currentIndex], this[randomIndex]] = [this[randomIndex], this[currentIndex]];
      }
    });
  }
  /**
   * Allows to move items around in the array.
   *
   * Example:
   *     state.cards.move((cards) => {
   *         [cards[4], cards[3]] = [cards[3], cards[4]];
   *         [cards[3], cards[2]] = [cards[2], cards[3]];
   *         [cards[2], cards[0]] = [cards[0], cards[2]];
   *         [cards[1], cards[1]] = [cards[1], cards[1]];
   *         [cards[0], cards[0]] = [cards[0], cards[0]];
   *     })
   *
   * @param cb
   * @returns
   */
  move(cb) {
    this.isMovingItems = true;
    cb(this);
    this.isMovingItems = false;
    return this;
  }
  /**
   * Encoder-only. Reads the staged-snapshot (`tmpItems`) so the encoder can
   * resolve a wire-index even after the user has mutated `items` mid-tick.
   * The decoder reads `items[index]` directly — see `decodeArray` and
   * `$deleteByIndex` below.
   */
  [$getByIndex](index, isEncodeAll = false) {
    const self2 = this[$proxyTarget] ?? this;
    return isEncodeAll ? self2.items[index] : self2.deletedIndexes[index] ? self2.items[index] : self2.tmpItems[index] || self2.items[index];
  }
  [$deleteByIndex](index) {
    const self2 = this[$proxyTarget] ?? this;
    self2.items[index] = void 0;
    self2._needsCompaction = true;
  }
  [$onEncodeEnd]() {
    const staged = this.tmpItems;
    this.tmpItems = this.items.slice();
    if (this.deletedIndexes.length > 0) {
      this.$reindexChildren(0, staged);
      this.deletedIndexes.length = 0;
    }
  }
  [$onDecodeEnd]() {
    const self2 = this[$proxyTarget] ?? this;
    if (self2._needsCompaction) {
      self2._needsCompaction = false;
      self2.items = self2.items.filter((item) => item !== void 0);
    }
  }
  [$resyncPrune](visited, prune, keep) {
    const self2 = this[$proxyTarget] ?? this;
    const items = self2.items;
    let removed = false;
    for (let i = 0; i < items.length; i++) {
      const value = items[i];
      if (visited.has(i)) {
        keep(value);
        continue;
      }
      removed = true;
      prune(value, i);
      self2[$deleteByIndex](i);
    }
    if (removed) {
      self2[$onDecodeEnd]();
    }
  }
  toArray() {
    return this.items.slice(0);
  }
  toJSON() {
    return this.toArray().map((value) => {
      return typeof value["toJSON"] === "function" ? value["toJSON"]() : value;
    });
  }
  //
  // Decoding utilities
  //
  clone(isDecoding) {
    let cloned;
    if (isDecoding) {
      cloned = new _ArraySchema();
      cloned.push(...this.items);
    } else {
      cloned = new _ArraySchema(...this.map((item) => item[$changes] ? item.clone() : item));
    }
    return cloned;
  }
};
registerType("array", { constructor: ArraySchema });
var MapJournal = class {
  /** index → key (was MapSchema.$indexes). Used by encoder and decoder. */
  keyByIndex = /* @__PURE__ */ new Map();
  /**
   * key → index (was MapSchema._collectionIndexes — forward direction).
   * Server-only. Plain object so MapSchema can expose it via a getter
   * for backwards-compatible `_collectionIndexes?.[key]` access from
   * ChangeTree.forEachChild and similar polymorphic call sites. Null
   * prototype, so keys like `"constructor"` or `"__proto__"` never resolve
   * to an inherited `Object.prototype` member.
   */
  indexByKey = /* @__PURE__ */ Object.create(null);
  /** Monotonic counter for assigning new indexes. Server-only. */
  nextIndex = 0;
  /**
   * Snapshot of values at the moment they were deleted. Lazy — only
   * allocated on first delete, since most maps are pure-grow and never
   * touch this. Used by `MapSchema[$filter]` to check view visibility
   * of a value that's already been removed from `$items` but whose
   * DELETE op is still in the encode queue.
   */
  snapshots;
  // ──────────────────────────────────────────────────────────────────
  // Server-side: recording mutations
  // ──────────────────────────────────────────────────────────────────
  /** Get the index assigned to a key, or undefined if never assigned. */
  indexOf(key) {
    const idx = this.indexByKey[key];
    return idx === void 0 ? void 0 : idx;
  }
  /** Assign and return a new wire index for an unseen key. */
  assign(key) {
    const index = this.nextIndex++;
    this.indexByKey[key] = index;
    this.keyByIndex.set(index, key);
    return index;
  }
  /** Stash a value at the moment it's deleted (for filter visibility checks). */
  snapshot(index, value) {
    (this.snapshots ??= /* @__PURE__ */ new Map()).set(index, value);
  }
  /** Discard a snapshot — called when a deleted slot is being re-set. */
  forgetSnapshot(index) {
    this.snapshots?.delete(index);
  }
  /** Look up a snapshot. Returns undefined if no DELETE is pending for this index. */
  snapshotAt(index) {
    return this.snapshots?.get(index);
  }
  // ──────────────────────────────────────────────────────────────────
  // Client-side (decoder): index↔key sync from the wire
  // ──────────────────────────────────────────────────────────────────
  /** Decoder calls this when it sees an ADD/DELETE_AND_ADD on the wire. */
  setIndex(index, key) {
    this.keyByIndex.set(index, key);
    this.indexByKey[key] = index;
  }
  // ──────────────────────────────────────────────────────────────────
  // Lookups (both sides)
  // ──────────────────────────────────────────────────────────────────
  /** Reverse lookup: wire index → key. */
  keyOf(index) {
    return this.keyByIndex.get(index);
  }
  // ──────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────
  /**
   * Called from MapSchema's $onEncodeEnd hook.
   * Cleans up index/key mappings for entries that were deleted in this tick.
   */
  cleanupAfterEncode() {
    if (this.snapshots === void 0)
      return;
    for (const [index] of this.snapshots) {
      const key = this.keyByIndex.get(index);
      if (key !== void 0) {
        delete this.indexByKey[key];
        this.keyByIndex.delete(index);
      }
    }
    this.snapshots.clear();
  }
  /** Reset everything (called on .clear()). */
  reset() {
    this.indexByKey = /* @__PURE__ */ Object.create(null);
    this.keyByIndex.clear();
    this.snapshots?.clear();
    this.nextIndex = 0;
  }
};
var MapSchema = class _MapSchema {
  [$changes];
  [$refId];
  childType;
  [$childType];
  $items = /* @__PURE__ */ new Map();
  /**
   * Wire-protocol identity + change-tracking metadata for this map.
   *
   * Owns: index↔key mapping, monotonic index counter, snapshots of removed
   * values for filter visibility checks. Replaces what used to live as three
   * separate fields on this class ($indexes, _collectionIndexes, deletedItems).
   */
  journal = new MapJournal();
  /**
   * Streamable state — lazily allocated by `inheritedFlags` (or the
   * `maxPerTick` setter) when streaming actually activates. `undefined`
   * on every non-streaming MapSchema so the common case pays zero
   * Map/Set allocation. Single slot → hidden-class shape stays stable
   * across streaming and non-streaming instances.
   */
  _stream;
  /** Max ADD ops emitted per tick per view. Ignored outside streaming mode. */
  get maxPerTick() {
    return this._stream?.maxPerTick ?? 32;
  }
  set maxPerTick(n) {
    (this._stream ??= createStreamableState()).maxPerTick = n;
  }
  /**
   * Per-view priority callback for `.stream()` maps. Initialized from the
   * schema declaration (`t.map(X).stream().priority(fn)` or `@type({ map,
   * priority })`); assigning here overrides for this instance. Only fires
   * during `encodeView` — broadcast mode drains FIFO.
   */
  get priority() {
    return this._stream?.priority;
  }
  set priority(fn) {
    (this._stream ??= createStreamableState()).priority = fn;
  }
  /** Backwards-compat alias for `journal.keyByIndex`. */
  get $indexes() {
    return this.journal.keyByIndex;
  }
  /**
   * Backwards-compat alias for `journal.indexByKey`. Plain object so
   * polymorphic call sites like `ref._collectionIndexes?.[key]` keep working.
   */
  get _collectionIndexes() {
    return this.journal.indexByKey;
  }
  static [$encoder] = encodeMapEntry;
  static [$decoder] = decodeKeyValueOperation;
  /** Integer tag read by `decodeKeyValueOperation` — see `CollectionKind`. */
  static COLLECTION_KIND = CollectionKind.Map;
  /**
   * Determine if a property must be filtered.
   * - If returns false, the property is NOT going to be encoded.
   * - If returns true, the property is going to be encoded.
   *
   * Encoding with "filters" happens in two steps:
   * - First, the encoder iterates over all "not owned" properties and encodes them.
   * - Then, the encoder iterates over all "owned" properties per instance and encodes them.
   */
  static [$filter](ref, index, view2) {
    if (!view2 || typeof ref[$childType] === "string")
      return true;
    const value = ref[$getByIndex](index) ?? ref.journal.snapshotAt(index);
    return view2.isChangeTreeVisible(value[$changes]);
  }
  static is(type) {
    return type["map"] !== void 0;
  }
  constructor(initialValues) {
    Object.defineProperty(this, $changes, {
      value: new ChangeTree(this),
      enumerable: false,
      writable: true
    });
    this[$childType] = void 0;
    if (initialValues) {
      if (initialValues instanceof Map || initialValues instanceof _MapSchema) {
        initialValues.forEach((v, k) => this.set(k, v));
      } else {
        for (const k in initialValues) {
          this.set(k, initialValues[k]);
        }
      }
    }
  }
  /**
   * Decoder-side factory. Skips the tracking `ChangeTree` allocation;
   * `Object.create` also bypasses the class-field initializers, so we
   * replicate the minimum slot init here. Must stay in sync with the
   * class-field declarations above and with the constructor body.
   */
  static initializeForDecoder() {
    const self2 = Object.create(_MapSchema.prototype);
    self2.$items = /* @__PURE__ */ new Map();
    self2.journal = new MapJournal();
    self2[$childType] = void 0;
    installUntrackedChangeTree(self2);
    return self2;
  }
  /** Iterator */
  [Symbol.iterator]() {
    return this.$items[Symbol.iterator]();
  }
  get [Symbol.toStringTag]() {
    return this.$items[Symbol.toStringTag];
  }
  static get [Symbol.species]() {
    return _MapSchema;
  }
  set(key, value) {
    if (value === void 0 || value === null) {
      throw new Error(`MapSchema#set('${key}', ${value}): trying to set ${value} value on '${key}'.`);
    } else if (typeof value === "object" && this[$childType]) {
      assertInstanceType(value, this[$childType], this, key);
    }
    key = key.toString();
    const changeTree = this[$changes];
    const isRef = value[$changes] !== void 0;
    const journal = this.journal;
    let index = journal.indexOf(key);
    let operation;
    if (index !== void 0) {
      operation = OPERATION.REPLACE;
      const previousValue = this.$items.get(key);
      if (previousValue === value) {
        return;
      } else if (isRef) {
        operation = OPERATION.DELETE_AND_ADD;
        if (previousValue !== void 0) {
          previousValue[$changes].root?.remove(previousValue[$changes]);
        }
      }
      if (journal.snapshotAt(index) !== void 0) {
        journal.forgetSnapshot(index);
      }
    } else {
      index = journal.assign(key);
      operation = OPERATION.ADD;
    }
    this.$items.set(key, value);
    if (operation === OPERATION.ADD && changeTree.isStreamCollection) {
      if (changeTree.root !== void 0) {
        streamRouteAdd(this, changeTree.root, index);
      }
    } else {
      changeTree.change(index, operation);
    }
    if (isRef) {
      value[$changes].setParent(this, changeTree.root, index);
    }
    return this;
  }
  get(key) {
    return this.$items.get(key);
  }
  /**
   * Returns the value for `key` if present. Otherwise inserts `defaultValue`
   * (tracked as an ADD change, like `set()`) and returns it.
   *
   * Mirrors `Map.prototype.getOrInsert` (TC39 "upsert" proposal, typed in
   * TypeScript 6's standard library).
   */
  getOrInsert(key, defaultValue) {
    if (this.$items.has(key)) {
      return this.$items.get(key);
    }
    this.set(key, defaultValue);
    return defaultValue;
  }
  /**
   * Returns the value for `key` if present. Otherwise computes a value via
   * `callbackfn(key)`, inserts it (tracked as an ADD change, like `set()`)
   * and returns it. The callback is only invoked when the key is missing.
   *
   * Mirrors `Map.prototype.getOrInsertComputed` (TC39 "upsert" proposal,
   * typed in TypeScript 6's standard library).
   */
  getOrInsertComputed(key, callbackfn) {
    if (this.$items.has(key)) {
      return this.$items.get(key);
    }
    const value = callbackfn(key);
    this.set(key, value);
    return value;
  }
  delete(key) {
    if (!this.$items.has(key)) {
      return false;
    }
    const index = this.journal.indexOf(key);
    const previousValue = this.$items.get(key);
    const changeTree = this[$changes];
    if (changeTree.isStreamCollection) {
      const root = changeTree.root;
      let neverSent = false;
      if (root !== void 0) {
        neverSent = streamRouteRemove(this, root, this[$refId], index);
      }
      if (previousValue?.[$changes] !== void 0) {
        root?.remove(previousValue[$changes]);
      }
      this.$items.delete(key);
      if (!neverSent)
        this.journal.snapshot(index, previousValue);
      return true;
    }
    this.journal.snapshot(index, previousValue);
    changeTree.delete(index);
    return this.$items.delete(key);
  }
  clear() {
    const changeTree = this[$changes];
    changeTree.discard();
    changeTree.forEachChild((childChangeTree, _) => {
      changeTree.root?.remove(childChangeTree);
    });
    this.journal.reset();
    this.$items.clear();
    changeTree.operation(OPERATION.CLEAR);
  }
  /**
   * Pool reset: empty this map and recycle its ChangeTree WITHOUT recording
   * any wire op (the parent field's ADD/DELETE owns the wire). Recurses into
   * ref-type children. Called by Schema.reset when a pooled entity has a
   * map field. The instance must already be detached from the encoder.
   */
  [$reset]() {
    const changeTree = this[$changes];
    if (changeTree.isStreamCollection) {
      throw new Error(`@colyseus/schema: cannot reset a streamed MapSchema (pooling not supported).`);
    }
    this.$items.forEach((value) => value?.[$reset]?.());
    this.$items.clear();
    this.journal.reset();
    changeTree.recycle();
    this[$refId] = void 0;
  }
  has(key) {
    return this.$items.has(key);
  }
  forEach(callbackfn) {
    this.$items.forEach(callbackfn);
  }
  entries() {
    return this.$items.entries();
  }
  keys() {
    return this.$items.keys();
  }
  values() {
    return this.$items.values();
  }
  get size() {
    return this.$items.size;
  }
  // ────── Change tracking control (same API as Schema) ──────
  pauseTracking() {
    this[$changes].pause();
  }
  resumeTracking() {
    this[$changes].resume();
  }
  untracked(fn) {
    return this[$changes].untracked(fn);
  }
  get isTrackingPaused() {
    return this[$changes].paused;
  }
  setIndex(index, key) {
    this.journal.setIndex(index, key);
  }
  getIndex(index) {
    return this.journal.keyOf(index);
  }
  [$getByIndex](index) {
    const key = this.journal.keyOf(index);
    return key !== void 0 ? this.$items.get(key) : void 0;
  }
  [$deleteByIndex](index) {
    const key = this.journal.keyOf(index);
    if (key !== void 0) {
      this.$items.delete(key);
      this.journal.keyByIndex.delete(index);
    }
  }
  [$resyncPrune](visited, prune, keep) {
    let deletedKeys = null;
    this.$items.forEach((value, key) => {
      if (visited.has(key)) {
        keep(value);
        return;
      }
      (deletedKeys ??= /* @__PURE__ */ new Set()).add(key);
      prune(value, key);
    });
    if (deletedKeys !== null) {
      deletedKeys.forEach((key) => {
        this.$items.delete(key);
        delete this.journal.indexByKey[key];
      });
      const staleIndexes = [];
      this.journal.keyByIndex.forEach((key, index) => {
        if (deletedKeys.has(key)) {
          staleIndexes.push(index);
        }
      });
      for (let i = 0; i < staleIndexes.length; i++) {
        this.journal.keyByIndex.delete(staleIndexes[i]);
      }
    }
  }
  [$onEncodeEnd]() {
    this.journal.cleanupAfterEncode();
  }
  // ─── Streamable interface (Encoder priority / broadcast pass) ──────
  _dropView(viewId) {
    streamDropView(this, viewId);
  }
  _unregister() {
  }
  toJSON() {
    const map = Object.fromEntries(Array.from(this, ([key, value]) => [
      key,
      typeof value["toJSON"] === "function" ? value["toJSON"]() : value
    ]));
    return map;
  }
  //
  // Decoding utilities
  //
  // @ts-ignore
  clone(isDecoding) {
    let cloned;
    if (isDecoding) {
      cloned = Object.assign(new _MapSchema(), this);
    } else {
      cloned = new _MapSchema();
      this.forEach((value, key) => {
        if (value[$changes]) {
          cloned.set(key, value["clone"]());
        } else {
          cloned.set(key, value);
        }
      });
    }
    return cloned;
  }
};
registerType("map", { constructor: MapSchema });
var CollectionSchema = class _CollectionSchema {
  [$changes];
  [$refId];
  [$childType];
  /** The user-visible data, keyed directly by the wire-protocol index. */
  $items = /* @__PURE__ */ new Map();
  /** Snapshots of values that were deleted this tick (for filter visibility). */
  deletedItems = {};
  /** Monotonic counter for assigning indexes to newly-added items. */
  $refId = 0;
  /**
   * Streamable state — lazily allocated when the field is opted into
   * streaming via `t.collection(X).stream()`. See MapSchema for the
   * same pattern / rationale.
   */
  _stream;
  get maxPerTick() {
    return this._stream?.maxPerTick ?? 32;
  }
  set maxPerTick(n) {
    (this._stream ??= createStreamableState()).maxPerTick = n;
  }
  get priority() {
    return this._stream?.priority;
  }
  set priority(fn) {
    (this._stream ??= createStreamableState()).priority = fn;
  }
  static [$encoder] = encodeIndexedEntry;
  static [$decoder] = decodeKeyValueOperation;
  /** Integer tag read by `decodeKeyValueOperation` — see `CollectionKind`. */
  static COLLECTION_KIND = CollectionKind.Collection;
  /**
   * Determine if a property must be filtered.
   * - If returns false, the property is NOT going to be encoded.
   * - If returns true, the property is going to be encoded.
   *
   * Encoding with "filters" happens in two steps:
   * - First, the encoder iterates over all "not owned" properties and encodes them.
   * - Then, the encoder iterates over all "owned" properties per instance and encodes them.
   */
  static [$filter](ref, index, view2) {
    return !view2 || typeof ref[$childType] === "string" || view2.isChangeTreeVisible((ref[$getByIndex](index) ?? ref.deletedItems[index])[$changes]);
  }
  static is(type) {
    return type["collection"] !== void 0;
  }
  constructor(initialValues) {
    Object.defineProperty(this, $changes, {
      value: new ChangeTree(this),
      enumerable: false,
      writable: true
    });
    this[$childType] = void 0;
    if (initialValues) {
      initialValues.forEach((v) => this.add(v));
    }
  }
  /**
   * Decoder-side factory. Skips the tracking `ChangeTree` allocation;
   * `Object.create` also bypasses the class-field initializers, so we
   * replicate the minimum slot init here. Must stay in sync with the
   * class-field declarations above.
   */
  static initializeForDecoder() {
    const self2 = Object.create(_CollectionSchema.prototype);
    self2.$items = /* @__PURE__ */ new Map();
    self2.deletedItems = {};
    self2.$refId = 0;
    self2[$childType] = void 0;
    installUntrackedChangeTree(self2);
    return self2;
  }
  add(value) {
    const index = this.$refId++;
    const changeTree = this[$changes];
    this.$items.set(index, value);
    if (changeTree.isStreamCollection) {
      if (changeTree.root !== void 0) {
        streamRouteAdd(this, changeTree.root, index);
      }
    } else {
      changeTree.change(index);
    }
    if (value[$changes] !== void 0) {
      value[$changes].setParent(this, changeTree.root, index);
    }
    return index;
  }
  at(index) {
    const key = Array.from(this.$items.keys())[index];
    return this.$items.get(key);
  }
  entries() {
    return this.$items.entries();
  }
  delete(item) {
    const entries = this.$items.entries();
    let index;
    let entry;
    while (entry = entries.next()) {
      if (entry.done) {
        break;
      }
      if (item === entry.value[1]) {
        index = entry.value[0];
        break;
      }
    }
    if (index === void 0) {
      return false;
    }
    const changeTree = this[$changes];
    if (changeTree.isStreamCollection) {
      const root = changeTree.root;
      const previousValue = this.$items.get(index);
      if (root !== void 0) {
        streamRouteRemove(this, root, this[$refId], index);
      }
      if (previousValue?.[$changes] !== void 0) {
        root?.remove(previousValue[$changes]);
      }
      this.deletedItems[index] = previousValue;
      return this.$items.delete(index);
    }
    this.deletedItems[index] = changeTree.delete(index);
    return this.$items.delete(index);
  }
  clear() {
    const changeTree = this[$changes];
    changeTree.discard();
    changeTree.forEachChild((childChangeTree, _) => {
      changeTree.root?.remove(childChangeTree);
    });
    this.$items.clear();
    changeTree.operation(OPERATION.CLEAR);
  }
  /**
   * Pool reset: empty this collection and recycle its ChangeTree WITHOUT
   * recording any wire op (the parent field's ADD/DELETE owns the wire).
   * Recurses into ref-type children. Called by Schema.reset when a pooled
   * entity has a collection field. Must already be detached from the encoder.
   */
  [$reset]() {
    const changeTree = this[$changes];
    if (changeTree.isStreamCollection) {
      throw new Error(`@colyseus/schema: cannot reset a streamed CollectionSchema (pooling not supported).`);
    }
    this.$items.forEach((value) => value?.[$reset]?.());
    this.$items.clear();
    this.deletedItems = {};
    this.$refId = 0;
    changeTree.recycle();
    this[$refId] = void 0;
  }
  has(value) {
    return Array.from(this.$items.values()).some((v) => v === value);
  }
  forEach(callbackfn) {
    this.$items.forEach((value, key, _) => callbackfn(value, key, this));
  }
  values() {
    return this.$items.values();
  }
  get size() {
    return this.$items.size;
  }
  // ────── Change tracking control (same API as Schema) ──────
  pauseTracking() {
    this[$changes].pause();
  }
  resumeTracking() {
    this[$changes].resume();
  }
  untracked(fn) {
    return this[$changes].untracked(fn);
  }
  get isTrackingPaused() {
    return this[$changes].paused;
  }
  /** Iterator */
  [Symbol.iterator]() {
    return this.$items.values();
  }
  // ────────────────────────────────────────────────────────────────────
  // Decoder-side index hooks. CollectionSchema's "key" IS the wire index,
  // so these are identity operations. Kept for protocol symmetry with
  // MapSchema (decoder calls them polymorphically).
  // ────────────────────────────────────────────────────────────────────
  setIndex(_index, _key) {
  }
  getIndex(index) {
    return index;
  }
  [$getByIndex](index) {
    return this.$items.get(index);
  }
  [$deleteByIndex](index) {
    this.$items.delete(index);
  }
  [$resyncPrune](visited, prune, keep) {
    let toDelete = null;
    this.$items.forEach((value, index) => {
      if (visited.has(index)) {
        keep(value);
        return;
      }
      (toDelete ??= []).push(index);
      prune(value, index);
    });
    if (toDelete !== null) {
      for (let i = 0; i < toDelete.length; i++) {
        this[$deleteByIndex](toDelete[i]);
      }
    }
  }
  [$onEncodeEnd]() {
    for (const key in this.deletedItems) {
      delete this.deletedItems[key];
    }
  }
  // ─── Streamable interface (Encoder priority / broadcast pass) ──────
  _dropView(viewId) {
    streamDropView(this, viewId);
  }
  _unregister() {
  }
  toArray() {
    return Array.from(this.$items.values());
  }
  toJSON() {
    const values = [];
    this.forEach((value, key) => {
      values.push(typeof value["toJSON"] === "function" ? value["toJSON"]() : value);
    });
    return values;
  }
  //
  // Decoding utilities
  //
  clone(isDecoding) {
    let cloned;
    if (isDecoding) {
      cloned = Object.assign(new _CollectionSchema(), this);
    } else {
      cloned = new _CollectionSchema();
      this.forEach((value) => {
        if (value[$changes]) {
          cloned.add(value["clone"]());
        } else {
          cloned.add(value);
        }
      });
    }
    return cloned;
  }
};
registerType("collection", { constructor: CollectionSchema });
var SetSchema = class _SetSchema {
  [$changes];
  [$refId];
  [$childType];
  /** The user-visible data, keyed directly by the wire-protocol index. */
  $items = /* @__PURE__ */ new Map();
  /** Snapshots of values that were deleted this tick (for filter visibility). */
  deletedItems = {};
  /** Monotonic counter for assigning indexes to newly-added items. */
  $refId = 0;
  /**
   * Streamable state — lazily allocated when the field is opted into
   * streaming via `t.set(X).stream()`. See MapSchema for the same
   * pattern / rationale.
   */
  _stream;
  /** Max ADD ops emitted per tick per view. Ignored outside streaming mode. */
  get maxPerTick() {
    return this._stream?.maxPerTick ?? 32;
  }
  set maxPerTick(n) {
    (this._stream ??= createStreamableState()).maxPerTick = n;
  }
  /** Per-view priority callback — see StreamSchema / MapSchema. */
  get priority() {
    return this._stream?.priority;
  }
  set priority(fn) {
    (this._stream ??= createStreamableState()).priority = fn;
  }
  static [$encoder] = encodeIndexedEntry;
  static [$decoder] = decodeKeyValueOperation;
  /** Integer tag read by `decodeKeyValueOperation` — see `CollectionKind`. */
  static COLLECTION_KIND = CollectionKind.Set;
  /**
   * Determine if a property must be filtered.
   * - If returns false, the property is NOT going to be encoded.
   * - If returns true, the property is going to be encoded.
   *
   * Encoding with "filters" happens in two steps:
   * - First, the encoder iterates over all "not owned" properties and encodes them.
   * - Then, the encoder iterates over all "owned" properties per instance and encodes them.
   */
  static [$filter](ref, index, view2) {
    return !view2 || typeof ref[$childType] === "string" || view2.isVisible((ref[$getByIndex](index) ?? ref.deletedItems[index])[$changes]);
  }
  static is(type) {
    return type["set"] !== void 0;
  }
  constructor(initialValues) {
    Object.defineProperty(this, $changes, {
      value: new ChangeTree(this),
      enumerable: false,
      writable: true
    });
    this[$childType] = void 0;
    if (initialValues) {
      initialValues.forEach((v) => this.add(v));
    }
  }
  /**
   * Decoder-side factory. Skips the tracking `ChangeTree` allocation;
   * `Object.create` also bypasses the class-field initializers, so we
   * replicate the minimum slot init here. Must stay in sync with the
   * class-field declarations above.
   */
  static initializeForDecoder() {
    const self2 = Object.create(_SetSchema.prototype);
    self2.$items = /* @__PURE__ */ new Map();
    self2.deletedItems = {};
    self2.$refId = 0;
    self2[$childType] = void 0;
    installUntrackedChangeTree(self2);
    return self2;
  }
  add(value) {
    if (this.has(value)) {
      return false;
    }
    const index = this.$refId++;
    const changeTree = this[$changes];
    this.$items.set(index, value);
    if (changeTree.isStreamCollection) {
      if (changeTree.root !== void 0) {
        streamRouteAdd(this, changeTree.root, index);
      }
    } else {
      changeTree.change(index, OPERATION.ADD);
    }
    if (value[$changes] !== void 0) {
      value[$changes].setParent(this, changeTree.root, index);
    }
    return index;
  }
  entries() {
    return this.$items.entries();
  }
  delete(item) {
    const entries = this.$items.entries();
    let index;
    let entry;
    while (entry = entries.next()) {
      if (entry.done) {
        break;
      }
      if (item === entry.value[1]) {
        index = entry.value[0];
        break;
      }
    }
    if (index === void 0) {
      return false;
    }
    const changeTree = this[$changes];
    if (changeTree.isStreamCollection) {
      const root = changeTree.root;
      const previousValue = this.$items.get(index);
      if (root !== void 0) {
        streamRouteRemove(this, root, this[$refId], index);
      }
      if (previousValue?.[$changes] !== void 0) {
        root?.remove(previousValue[$changes]);
      }
      this.deletedItems[index] = previousValue;
      return this.$items.delete(index);
    }
    this.deletedItems[index] = changeTree.delete(index);
    return this.$items.delete(index);
  }
  clear() {
    const changeTree = this[$changes];
    changeTree.discard();
    this.$items.clear();
    changeTree.operation(OPERATION.CLEAR);
  }
  /**
   * Pool reset: empty this set and recycle its ChangeTree WITHOUT recording
   * any wire op (the parent field's ADD/DELETE owns the wire). Recurses into
   * ref-type children. Called by Schema.reset when a pooled entity has a set
   * field. The instance must already be detached from the encoder.
   */
  [$reset]() {
    const changeTree = this[$changes];
    if (changeTree.isStreamCollection) {
      throw new Error(`@colyseus/schema: cannot reset a streamed SetSchema (pooling not supported).`);
    }
    this.$items.forEach((value) => value?.[$reset]?.());
    this.$items.clear();
    this.deletedItems = {};
    this.$refId = 0;
    changeTree.recycle();
    this[$refId] = void 0;
  }
  has(value) {
    const values = this.$items.values();
    let has = false;
    let entry;
    while (entry = values.next()) {
      if (entry.done) {
        break;
      }
      if (value === entry.value) {
        has = true;
        break;
      }
    }
    return has;
  }
  forEach(callbackfn) {
    this.$items.forEach((value, key, _) => callbackfn(value, key, this));
  }
  values() {
    return this.$items.values();
  }
  get size() {
    return this.$items.size;
  }
  // ────── Change tracking control (same API as Schema) ──────
  pauseTracking() {
    this[$changes].pause();
  }
  resumeTracking() {
    this[$changes].resume();
  }
  untracked(fn) {
    return this[$changes].untracked(fn);
  }
  get isTrackingPaused() {
    return this[$changes].paused;
  }
  /** Iterator */
  [Symbol.iterator]() {
    return this.$items.values();
  }
  // ────────────────────────────────────────────────────────────────────
  // Decoder-side index hooks. SetSchema's "key" IS the wire index, so
  // these are identity operations. Kept for protocol symmetry with
  // MapSchema (decoder calls them polymorphically).
  // ────────────────────────────────────────────────────────────────────
  setIndex(_index, _key) {
  }
  getIndex(index) {
    return index;
  }
  [$getByIndex](index) {
    return this.$items.get(index);
  }
  [$deleteByIndex](index) {
    this.$items.delete(index);
  }
  [$resyncPrune](visited, prune, keep) {
    let toDelete = null;
    this.$items.forEach((value, index) => {
      if (visited.has(index)) {
        keep(value);
        return;
      }
      (toDelete ??= []).push(index);
      prune(value, index);
    });
    if (toDelete !== null) {
      for (let i = 0; i < toDelete.length; i++) {
        this[$deleteByIndex](toDelete[i]);
      }
    }
  }
  [$onEncodeEnd]() {
    for (const key in this.deletedItems) {
      delete this.deletedItems[key];
    }
  }
  // ─── Streamable interface (Encoder priority / broadcast pass) ──────
  _dropView(viewId) {
    streamDropView(this, viewId);
  }
  _unregister() {
  }
  toArray() {
    return Array.from(this.$items.values());
  }
  toJSON() {
    const values = [];
    this.forEach((value, key) => {
      values.push(typeof value["toJSON"] === "function" ? value["toJSON"]() : value);
    });
    return values;
  }
  //
  // Decoding utilities
  //
  clone(isDecoding) {
    let cloned;
    if (isDecoding) {
      cloned = Object.assign(new _SetSchema(), this);
    } else {
      cloned = new _SetSchema();
      this.forEach((value) => {
        if (value[$changes]) {
          cloned.add(value["clone"]());
        } else {
          cloned.add(value);
        }
      });
    }
    return cloned;
  }
};
registerType("set", { constructor: SetSchema });
var StreamSchema = class _StreamSchema {
  [$changes];
  [$refId];
  [$childType];
  /**
   * Wire-keyed storage: `position → element`. Position is a monotonic
   * counter assigned by `add()` — stable identity even when elements
   * are removed, so pending/sent view state can keep using the same
   * keys across ticks. Map (not Array) so `$items.keys()` / `.values()`
   * skip removed positions without a sparse-slot check.
   */
  $items = /* @__PURE__ */ new Map();
  /** Monotonic position counter. Incremented on every `add()`. */
  $nextPosition = 0;
  /** Reverse lookup for O(1) `remove(el)`. */
  _itemIndex = /* @__PURE__ */ new Map();
  /**
   * Streamable state — holds per-view and broadcast bookkeeping. Lazily
   * allocated when the stream is attached to a Root (or when the user
   * touches `maxPerTick`). `undefined` on detached streams so
   * construction is cheap.
   */
  _stream;
  /** Max element ADDs emitted per encode tick (per view, or broadcast). */
  get maxPerTick() {
    return this._stream?.maxPerTick ?? 32;
  }
  set maxPerTick(n) {
    (this._stream ??= createStreamableState()).maxPerTick = n;
  }
  /**
   * Per-view priority callback. Initialized from the schema declaration
   * (`.priority(fn)` or `@type({ stream, priority })`); assigning here
   * overrides the class-level default for this instance. Only fires
   * during `encodeView` — broadcast mode drains FIFO.
   */
  get priority() {
    return this._stream?.priority;
  }
  set priority(fn) {
    (this._stream ??= createStreamableState()).priority = fn;
  }
  /**
   * Brand used by Root / StateView to detect stream trees without
   * importing this class (avoids circular deps). The `isStreamCollection`
   * ChangeTree flag (set via `inheritedFlags`) is the preferred runtime
   * check — this brand is kept for back-compat.
   */
  static $isStream = true;
  static [$encoder] = encodeIndexedEntry;
  static [$decoder] = decodeKeyValueOperation;
  /** Integer tag read by `decodeKeyValueOperation` — see `CollectionKind`. */
  static COLLECTION_KIND = CollectionKind.Stream;
  /**
   * Element-level visibility. Identical to SetSchema's filter: stream
   * elements are always per-view, the filter just defers to the view's
   * per-tree visibility bitmap.
   */
  static [$filter](ref, index, view2) {
    if (!view2)
      return true;
    const value = ref[$getByIndex](index);
    if (value === void 0)
      return false;
    return view2.isVisible(value[$changes]);
  }
  static is(type) {
    return type && type["stream"] !== void 0;
  }
  constructor() {
    Object.defineProperty(this, $changes, {
      value: new ChangeTree(this),
      enumerable: false,
      writable: true
    });
    this[$childType] = void 0;
  }
  /**
   * Decoder-side factory. Skips the tracking `ChangeTree` allocation;
   * `Object.create` also bypasses the class-field initializers, so we
   * replicate the minimum slot init here. Must stay in sync with the
   * class-field declarations above.
   */
  static initializeForDecoder() {
    const self2 = Object.create(_StreamSchema.prototype);
    self2.$items = /* @__PURE__ */ new Map();
    self2.$nextPosition = 0;
    self2._itemIndex = /* @__PURE__ */ new Map();
    self2[$childType] = void 0;
    installUntrackedChangeTree(self2);
    return self2;
  }
  /**
   * Append an element to the stream. Returns the assigned position,
   * or -1 if the element was already in the stream.
   */
  add(value) {
    if (this._itemIndex.has(value))
      return -1;
    const position = this.$nextPosition++;
    this.$items.set(position, value);
    this._itemIndex.set(value, position);
    const tree = this[$changes];
    const root = tree.root;
    if (value[$changes] !== void 0) {
      value[$changes].setParent(this, root, position);
    }
    if (root !== void 0)
      streamRouteAdd(this, root, position);
    return position;
  }
  /**
   * Remove an element by reference. If the element was pending (never sent
   * to a view), the pending entry is dropped silently. If already sent,
   * a DELETE op is forced on next `encodeView` for that view.
   */
  remove(value) {
    const position = this._itemIndex.get(value);
    if (position === void 0)
      return false;
    this._itemIndex.delete(value);
    this.$items.delete(position);
    const root = this[$changes].root;
    if (root !== void 0) {
      streamRouteRemove(this, root, this[$refId], position);
      if (value[$changes] !== void 0) {
        root.remove(value[$changes]);
      }
    }
    return true;
  }
  has(value) {
    return this._itemIndex.has(value);
  }
  /** Remove every element; queue DELETE wire ops for already-sent items. */
  clear() {
    const root = this[$changes].root;
    if (root !== void 0) {
      streamRouteClear(this, root, this[$refId]);
      for (const el of this.$items.values()) {
        if (el[$changes] !== void 0) {
          root.remove(el[$changes]);
        }
      }
    }
    this.$items.clear();
    this._itemIndex.clear();
  }
  forEach(callback) {
    for (const [index, value] of this.$items)
      callback(value, index, this);
  }
  values() {
    return this.$items.values();
  }
  /**
   * Iterate `[position, value]` pairs in insertion order. Used by
   * `setParent` recursion when the stream is reassigned to a new parent.
   */
  entries() {
    return this.$items.entries();
  }
  [Symbol.iterator]() {
    return this.$items.values();
  }
  /** Live element count. */
  get size() {
    return this.$items.size;
  }
  /** Alias for `size`. */
  get length() {
    return this.$items.size;
  }
  // ────────────────────────────────────────────────────────────────────
  // Decoder / encoder plumbing — same shape as SetSchema so
  // {encode,decode}KeyValueOperation can route uniformly. StreamSchema
  // keys are identity (wire index === position), so `setIndex`/`getIndex`
  // are no-ops / identity like SetSchema.
  // ────────────────────────────────────────────────────────────────────
  setIndex(_index, _key) {
  }
  getIndex(index) {
    return index;
  }
  [$getByIndex](index) {
    return this.$items.get(index);
  }
  [$deleteByIndex](index) {
    const value = this.$items.get(index);
    if (value !== void 0) {
      this._itemIndex.delete(value);
      this.$items.delete(index);
    }
  }
  [$resyncPrune]() {
  }
  [$onEncodeEnd]() {
  }
  toArray() {
    return Array.from(this.$items.values());
  }
  toJSON() {
    const out = [];
    this.forEach((v) => {
      out.push(typeof v?.toJSON === "function" ? v.toJSON() : v);
    });
    return out;
  }
  clone(isDecoding) {
    if (isDecoding) {
      const cloned2 = Object.assign(new _StreamSchema(), this);
      return cloned2;
    }
    const cloned = new _StreamSchema();
    cloned.maxPerTick = this.maxPerTick;
    this.forEach((v) => {
      cloned.add(typeof v?.clone === "function" ? v.clone() : v);
    });
    return cloned;
  }
  // ─── Streamable interface (Encoder priority / broadcast pass) ──────
  _dropView(viewId) {
    streamDropView(this, viewId);
  }
  /** Called by Root.remove when the stream's refcount hits zero. */
  _unregister() {
  }
};
registerType("stream", { constructor: StreamSchema });
var FieldBuilder = class {
  [$builder] = true;
  // Internal configuration. Declared `private` (soft-private): hidden from
  // editor autocomplete and from normal external `.field` access, but still
  // reachable at runtime via element access (e.g. `builder['_noSync']`) for
  // internal tooling/tests. Not meant to be mutated by end users.
  _type;
  _default = void 0;
  _hasDefault = false;
  _view = void 0;
  _unreliable = false;
  _patchOnly = false;
  _deprecated = false;
  _deprecatedThrows = true;
  _fullStateOnly = false;
  _stream = false;
  _optional = false;
  _noSync = false;
  _streamPriority = void 0;
  constructor(type) {
    this._type = type;
  }
  /**
   * Provide a default value for this field.
   *
   * Pass a **factory function** `() => T` to build a FRESH value per instance
   * (invoked once per construction) instead of sharing a single default — the
   * clean way to default a ref to a plain custom class, or any field that must
   * not share a mutable default across instances:
   *
   * ```ts
   * acc: t.ref(GunAccuracy).noSync().default(() => new GunAccuracy()),
   * ```
   *
   * Schema fields are never function-typed, so a function is always treated as a
   * factory. A non-function value is shared (and cloned per instance if it is
   * clone-able, e.g. a Schema/collection).
   */
  default(value) {
    this._default = value;
    this._hasDefault = true;
    return this;
  }
  /** Tag this field with a view tag (DEFAULT_VIEW_TAG when called without arg). */
  view(tag) {
    this._view = tag ?? -1;
    return this;
  }
  /**
   * Mark this field as unreliable — tick patches emit it on the unreliable
   * transport channel. Still persisted to full-sync snapshots unless also
   * tagged with `.patchOnly()`. Primitive fields only.
   *
   * The field's FIRST value still travels the reliable channel, as part of
   * the owning instance's ADD; only later mutations become unreliable. A
   * decoder cannot apply a write to a ref it has not been told about, so a
   * value emitted ahead of that ADD would be dropped — and lost for good if
   * the field is never written again.
   */
  unreliable() {
    this._unreliable = true;
    return this;
  }
  /**
   * Deliver this field on tick patches ONLY — it is never written to a
   * full-state sync (`encodeAll` / `encodeAllView`). Late-joining clients
   * see the field only after its next mutation is emitted on a patch.
   * The mirror of `.fullStateOnly()`, and orthogonal to `.unreliable()`.
   */
  patchOnly() {
    this._patchOnly = true;
    return this;
  }
  /**
   * Deliver this field in the full state sync ONLY (`encodeAll` /
   * `encodeAllView`) — it never enters a tick patch. A client receives it
   * on join (and again on a resync); writes after that are not tracked.
   * The mirror of `.patchOnly()`.
   *
   * The field itself is NOT frozen — it stays mutable server-side, only
   * its propagation stops. On a stream field (`t.stream(X).fullStateOnly()`)
   * the same rule applies per element: post-add mutations are no-ops.
   */
  fullStateOnly() {
    this._fullStateOnly = true;
    return this;
  }
  /**
   * Mark this field as **local-only** — it is typed and initialized on the
   * instance (so `.default()` and the inferred instance type still apply),
   * but is never registered for synchronization: it never enters change
   * tracking, never goes over the wire, and decoders never receive it.
   *
   * Useful for server-side scratch state, per-peer UI state, or values you
   * want on the class for typing convenience without paying any sync cost.
   *
   * Mutually exclusive with the sync-only modifiers (`.view()`,
   * `.unreliable()`, `.patchOnly()`, `.fullStateOnly()`, `.stream()`) — combining
   * them throws at `schema()` time.
   *
   * ```ts
   * const Player = schema({
   *     hp: t.uint8().default(100),          // synchronized
   *     lastInputTick: t.number().noSync(),  // local-only
   * }, 'Player');
   * ```
   */
  noSync() {
    this._noSync = true;
    return this;
  }
  /**
   * Opt a collection field into priority-batched streaming delivery —
   * ADDs drain at most `maxPerTick` per tick per view (or per broadcast
   * tick without a view). Applies to `t.map(X)` / `t.set(X)` /
   * `t.collection(X)`. Redundant on `t.stream(X)` (the factory already
   * sets this flag).
   *
   * **Not supported on `t.array(X)`.** Array positional operations
   * (`splice`, `unshift`, `reverse`) shift every subsequent index —
   * holding some ADDs back for a later tick while indexes mutate
   * underneath would produce a decoder-side state that doesn't match
   * the server. Use `t.stream(X)` (stable monotonic positions) or
   * `t.map(X).stream()` (keys never shift) instead.
   */
  stream() {
    const t2 = this._type;
    if (t2 && typeof t2 === "object" && t2.array !== void 0) {
      throw new Error(ARRAY_STREAM_NOT_SUPPORTED);
    }
    this._stream = true;
    return this;
  }
  /**
   * Attach a priority callback for per-view `encodeView` delivery. The
   * callback receives the client's StateView and the candidate element;
   * higher return values emit first. Does nothing in broadcast mode
   * (shared `encode()` drains FIFO). Only meaningful on stream fields.
   *
   * `StateView` carries no position of its own — attach whatever the
   * callback needs to sort by (`view` is loosely typed for this).
   *
   * ```ts
   * t.stream(Enemy).priority((view, enemy) =>
   *     -((enemy.x - view.x) ** 2 + (enemy.y - view.y) ** 2)
   * )
   * ```
   */
  priority(fn) {
    this._streamPriority = fn;
    return this;
  }
  /** Mark this field as deprecated. Pass `false` to silence the access error. */
  deprecated(throws = true) {
    this._deprecated = true;
    this._deprecatedThrows = throws;
    return this;
  }
  /**
   * Mark this field as optional — inferred instance type becomes
   * `T | undefined` and the property becomes omittable in initialization
   * props. Skips the auto-instantiation of collection / Schema-ref
   * defaults, so the field starts as `undefined` at runtime.
   */
  optional() {
    this._optional = true;
    return this;
  }
  /**
   * @internal — snapshot of the builder's configuration consumed by
   * `schema()`. `private` keeps it out of autocomplete; internal callers
   * reach it via element access (`builder['toDefinition']()`).
   */
  toDefinition() {
    return {
      type: this._type,
      default: this._default,
      hasDefault: this._hasDefault,
      view: this._view,
      unreliable: this._unreliable,
      patchOnly: this._patchOnly,
      deprecated: this._deprecated,
      deprecatedThrows: this._deprecatedThrows,
      fullStateOnly: this._fullStateOnly,
      stream: this._stream,
      optional: this._optional,
      noSync: this._noSync,
      streamPriority: this._streamPriority
    };
  }
};
function isBuilder(value) {
  return value != null && value[$builder] === true;
}
function primitive(name) {
  return (() => new FieldBuilder(name));
}
function resolveChild(child) {
  if (isBuilder(child)) {
    const inner = child["_type"];
    const hint = typeof inner === "string" ? `use the type name instead: t.array("${inner}")` : `collections accept a Schema class or a primitive type name ("string", "number", \u2026)`;
    throw new Error(`t.array/map/set/collection(): a t.* builder is not a valid element type \u2014 ${hint}.`);
  }
  return child;
}
var arrayFactory = ((child) => new FieldBuilder({ array: resolveChild(child) }));
var mapFactory = ((child) => new FieldBuilder({ map: resolveChild(child) }));
var setFactory = ((child) => new FieldBuilder({ set: resolveChild(child) }));
var collectionFactory = ((child) => new FieldBuilder({ collection: resolveChild(child) }));
var streamFactory = ((child) => {
  const b = new FieldBuilder({ stream: resolveChild(child) });
  b["_stream"] = true;
  return b;
});
var refFactory = ((ctor) => new FieldBuilder(ctor));
function quantizedFactory(opts) {
  return new FieldBuilder({ quantized: resolveQuantize(opts) });
}
var t = Object.freeze({
  // Primitives
  string: primitive("string"),
  number: primitive("number"),
  boolean: primitive("boolean"),
  int8: primitive("int8"),
  uint8: primitive("uint8"),
  int16: primitive("int16"),
  uint16: primitive("uint16"),
  int32: primitive("int32"),
  uint32: primitive("uint32"),
  int64: primitive("int64"),
  uint64: primitive("uint64"),
  float32: primitive("float32"),
  float64: primitive("float64"),
  bigint64: primitive("bigint64"),
  biguint64: primitive("biguint64"),
  /**
   * Reference to a Schema subtype — `t.array(Item)` usually reads better, but
   * this is available when a plain ref is needed.
   *
   * The target may also be a **non-Schema custom class**. A synced ref still
   * requires it to be encodable — a `Schema` subclass, or a class retrofitted
   * with `Metadata.setFields(...)` (both carry `[Symbol.metadata]`); a bare
   * custom class is rejected at `schema()` time. A `.noSync()` (local-only)
   * field accepts ANY zero-arg class and auto-instantiates one per parent.
   */
  ref: refFactory,
  array: arrayFactory,
  map: mapFactory,
  set: setFactory,
  collection: collectionFactory,
  stream: streamFactory,
  /**
   * A bounded float quantized to a fixed-width unsigned int on the wire — half
   * (or a quarter) the bytes of a `float32` at a precision you pick. The field
   * reads/writes the float and only ever yields `dequant(q)`. {@see QuantizeOptions}
   */
  quantized: quantizedFactory,
  /**
   * Sugar for a full-circle wrapping angle in radians:
   * `t.quantized({ min: 0, max: 2π, mode: "wrap", bits })` (default 16-bit,
   * ~0.0055°/step). Any input angle is range-reduced into `[0, 2π)`. Render note:
   * lerp interpolated remotes shortest-arc (`attach({ angle: true })`) — the
   * wrap fixes the WIRE seam, not interpolation (see {@link QuantizeOptions.mode}).
   */
  angle: (opts) => quantizedFactory({ min: 0, max: Math.PI * 2, mode: "wrap", bits: opts?.bits ?? 16 })
});
var DEFAULT_VIEW_TAG = -1;
function view(tag = DEFAULT_VIEW_TAG) {
  return function(target, fieldName) {
    const metadata = Metadata.initialize(target.constructor);
    Metadata.setTag(metadata, fieldName, tag);
  };
}
function unreliable(target, field) {
  const metadata = Metadata.initialize(target.constructor);
  Metadata.setUnreliable(metadata, field);
}
function patchOnly(target, field) {
  const metadata = Metadata.initialize(target.constructor);
  Metadata.setPatchOnly(metadata, field);
}
var PRIMITIVE_TYPEOF = {
  number: "number",
  int8: "number",
  uint8: "number",
  int16: "number",
  uint16: "number",
  int32: "number",
  uint32: "number",
  int64: "number",
  uint64: "number",
  float32: "number",
  float64: "number",
  bigint64: "bigint",
  biguint64: "bigint",
  string: "string",
  boolean: "boolean"
};
function makePrimitiveSetter(fieldName, fieldIndex, type) {
  const typeofTarget = PRIMITIVE_TYPEOF[type];
  const allowNull = type === "string";
  const isBool = type === "boolean";
  return function(value) {
    const values = this[$values];
    const previousValue = values[fieldIndex];
    if (value === previousValue)
      return;
    if (value !== void 0 && value !== null) {
      if (!isBool && typeofTarget !== void 0 && typeof value !== typeofTarget && !(allowNull && value === null)) {
        const ctorSuffix = value && value.constructor ? ` (${value.constructor.name})` : "";
        throw new EncodeSchemaError(`a '${typeofTarget}' was expected, but '${JSON.stringify(value)}'${ctorSuffix} was provided in ${this.constructor.name}#${fieldName}`);
      }
      this.constructor[$track](this[$changes], fieldIndex, OPERATION.ADD);
    } else if (previousValue !== void 0 && previousValue !== null) {
      this[$changes].delete(fieldIndex);
    }
    values[fieldIndex] = value;
  };
}
function makeSchemaRefSetter(fieldName, fieldIndex, type) {
  return function(value) {
    const values = this[$values];
    const previousValue = values[fieldIndex];
    if (value === previousValue)
      return;
    if (value !== void 0 && value !== null) {
      assertInstanceType(value, type, this, fieldName);
      const changeTree = this[$changes];
      const ctor = this.constructor;
      if (previousValue !== void 0 && previousValue !== null && previousValue[$changes]) {
        changeTree.root?.remove(previousValue[$changes]);
        ctor[$track](changeTree, fieldIndex, OPERATION.DELETE_AND_ADD);
      } else {
        ctor[$track](changeTree, fieldIndex, OPERATION.ADD);
      }
      value[$changes]?.setParent(this, changeTree.root, fieldIndex);
    } else if (previousValue !== void 0 && previousValue !== null) {
      this[$changes].delete(fieldIndex);
    }
    values[fieldIndex] = value;
  };
}
function makeCollectionSetter(_fieldName, fieldIndex, type, complexTypeKlass) {
  const isArrayKlass = complexTypeKlass.constructor === ArraySchema;
  const isMapKlass = complexTypeKlass.constructor === MapSchema;
  return function(value) {
    const values = this[$values];
    const previousValue = values[fieldIndex];
    if (value === previousValue)
      return;
    if (value !== void 0 && value !== null) {
      if (isArrayKlass && !(value instanceof ArraySchema)) {
        const array = new ArraySchema();
        array[$childType] = type;
        array.push(...value);
        value = array;
      } else if (isMapKlass && !(value instanceof MapSchema)) {
        const map = new MapSchema();
        map[$childType] = type;
        if (value instanceof Map) {
          value.forEach((v, k) => map.set(k, v));
        } else {
          for (const k in value) {
            map.set(k, value[k]);
          }
        }
        value = map;
      } else {
        value[$childType] = type;
      }
      const changeTree = this[$changes];
      const ctor = this.constructor;
      if (previousValue !== void 0 && previousValue !== null && previousValue[$changes]) {
        changeTree.root?.remove(previousValue[$changes]);
        ctor[$track](changeTree, fieldIndex, OPERATION.DELETE_AND_ADD);
      } else {
        ctor[$track](changeTree, fieldIndex, OPERATION.ADD);
      }
      value[$changes]?.setParent(this, changeTree.root, fieldIndex);
    } else if (previousValue !== void 0 && previousValue !== null) {
      this[$changes].delete(fieldIndex);
    }
    values[fieldIndex] = value;
  };
}
function makeQuantizedSetter(fieldName, fieldIndex, desc) {
  return function(value) {
    const values = this[$values];
    const previousValue = values[fieldIndex];
    if (value !== void 0 && value !== null) {
      if (typeof value !== "number") {
        throw new EncodeSchemaError(`a 'number' was expected, but '${JSON.stringify(value)}' was provided in ${this.constructor.name}#${fieldName}`);
      }
      value = dequantize(desc, quantize(desc, value));
      if (value === previousValue)
        return;
      this.constructor[$track](this[$changes], fieldIndex, OPERATION.ADD);
    } else {
      if (value === previousValue)
        return;
      if (previousValue !== void 0 && previousValue !== null) {
        this[$changes].delete(fieldIndex);
      }
    }
    values[fieldIndex] = value;
  };
}
function getPropertyDescriptor(fieldName, fieldIndex, type, complexTypeKlass) {
  let setter;
  if (complexTypeKlass) {
    setter = makeCollectionSetter(fieldName, fieldIndex, type, complexTypeKlass);
  } else if (typeof type === "string") {
    setter = makePrimitiveSetter(fieldName, fieldIndex, type);
  } else if (isQuantizedType(type)) {
    setter = makeQuantizedSetter(fieldName, fieldIndex, type.quantized);
  } else {
    setter = makeSchemaRefSetter(fieldName, fieldIndex, type);
  }
  return {
    // Quantized stores the already-snapped float, so the getter is the plain
    // $values read — the field yields dequant(q) with no per-read math.
    get: function() {
      return this[$values][fieldIndex];
    },
    set: setter,
    enumerable: true,
    configurable: true
  };
}
function deprecated(throws = true) {
  return function(klass, field) {
    const metadata = Metadata.initialize(klass.constructor);
    Metadata.setDeprecated(metadata, field);
    if (throws) {
      metadata[$descriptors] ??= {};
      metadata[$descriptors][field] = {
        get: function() {
          throw new Error(`${field} is deprecated.`);
        },
        set: function(_value) {
        },
        enumerable: false,
        configurable: true
      };
      Object.defineProperty(klass, field, metadata[$descriptors][field]);
    }
  };
}
function makeAutoDefaultFactory(rawType) {
  if (rawType && typeof rawType === "object") {
    if (rawType.array !== void 0) {
      return () => new ArraySchema();
    }
    if (rawType.map !== void 0) {
      return () => new MapSchema();
    }
    if (rawType.set !== void 0) {
      return () => new SetSchema();
    }
    if (rawType.collection !== void 0) {
      return () => new CollectionSchema();
    }
    if (rawType.stream !== void 0) {
      return () => new StreamSchema();
    }
  } else if (typeof rawType === "function" && Schema.is(rawType)) {
    if (!rawType.prototype.initialize || rawType.prototype.initialize.length === 0) {
      return () => new rawType();
    }
  }
  return void 0;
}
function schema(fieldsAndMethods, name, inherits = Schema) {
  if (fieldsAndMethods == null || typeof fieldsAndMethods !== "object") {
    throw new Error(`schema(): first argument must be a fields object (got ${typeof fieldsAndMethods}).`);
  }
  const fields = {};
  const methods = {};
  const defaultValues = {};
  const defaultFactories = {};
  const assignDefault = (field, value) => {
    if (typeof value === "function") {
      defaultFactories[field] = value;
    } else if (value && typeof value.clone === "function") {
      defaultFactories[field] = () => value.clone();
    } else {
      defaultValues[field] = value;
    }
  };
  const seedDefault = (field, def) => {
    if (def.hasDefault) {
      assignDefault(field, def.default);
    } else if (!def.optional) {
      const factory = makeAutoDefaultFactory(def.type);
      if (factory) {
        defaultFactories[field] = factory;
      }
    }
  };
  const viewTagFields = {};
  const unreliableFields = [];
  const patchOnlyFields = [];
  const deprecatedFields = {};
  const fullStateOnlyFields = [];
  const streamFields = [];
  const streamPriorityFields = {};
  const optionalFields = [];
  for (const fieldName in fieldsAndMethods) {
    const value = fieldsAndMethods[fieldName];
    if (isBuilder(value)) {
      const def = value["toDefinition"]();
      if (def.noSync) {
        if (def.view !== void 0 || def.unreliable || def.patchOnly || def.fullStateOnly || def.stream) {
          throw new Error(`schema(${name ? `'${name}'` : ""}): field '${fieldName}' uses .noSync() together with a sync-only modifier (.view/.unreliable/.patchOnly/.fullStateOnly/.stream). A local-only field cannot be synchronized.`);
        }
        seedDefault(fieldName, def);
        continue;
      }
      if (def.patchOnly && def.fullStateOnly) {
        throw new Error(`schema(${name ? `'${name}'` : ""}): field '${fieldName}' uses .patchOnly() together with .fullStateOnly(). Those are the only two delivery channels, so the field would never reach a client \u2014 use .noSync() if that is intended.`);
      }
      const normalizedType = getNormalizedType(def.type);
      if (typeof normalizedType === "function" && !Schema.is(normalizedType)) {
        throw new Error(`schema(${name ? `'${name}'` : ""}): field '${fieldName}' is a synced ref to non-Schema class '${normalizedType.name || "(anonymous)"}' \u2014 use .noSync(), or Metadata.setFields().`);
      }
      fields[fieldName] = normalizedType;
      if (def.view !== void 0) {
        viewTagFields[fieldName] = def.view;
      }
      if (def.unreliable) {
        unreliableFields.push(fieldName);
      }
      if (def.patchOnly) {
        patchOnlyFields.push(fieldName);
      }
      if (def.deprecated) {
        deprecatedFields[fieldName] = def.deprecatedThrows;
      }
      if (def.fullStateOnly) {
        fullStateOnlyFields.push(fieldName);
      }
      if (def.stream) {
        streamFields.push(fieldName);
      }
      if (def.streamPriority !== void 0) {
        streamPriorityFields[fieldName] = def.streamPriority;
      }
      if (def.optional) {
        optionalFields.push(fieldName);
      }
      seedDefault(fieldName, def);
    } else if (typeof value === "function") {
      if (Schema.is(value)) {
        fields[fieldName] = getNormalizedType(value);
        if (!value.prototype.initialize || value.prototype.initialize.length === 0) {
          defaultFactories[fieldName] = () => new value();
        }
      } else {
        methods[fieldName] = value;
      }
    } else {
      throw new Error(`schema(${name ? `'${name}'` : ""}): field '${fieldName}' must be a t.* builder, Schema subclass, or method (got ${typeof value}).`);
    }
  }
  const applyDefaults = (target) => {
    for (const fieldName in defaultValues) {
      target[fieldName] = defaultValues[fieldName];
    }
    for (const fieldName in defaultFactories) {
      target[fieldName] = defaultFactories[fieldName]();
    }
  };
  const getDefaultValues = () => {
    const defaults = {};
    applyDefaults(defaults);
    return defaults;
  };
  const getParentProps = (props) => {
    const fieldNames = Object.keys(fields);
    const parentProps = {};
    for (const key in props) {
      if (!fieldNames.includes(key)) {
        parentProps[key] = props[key];
      }
    }
    return parentProps;
  };
  const hasInitialize = typeof methods.initialize === "function";
  const initialize = methods.initialize ?? inherits._initialize;
  const klass = class extends inherits {
    constructor(...args) {
      const props = args[0];
      if (props === void 0) {
        super();
        applyDefaults(this);
      } else {
        super(Object.assign(getDefaultValues(), hasInitialize ? getParentProps(props) : props));
      }
      if (initialize && new.target === klass) {
        initialize.apply(this, args);
      }
    }
  };
  if (name) {
    Object.defineProperty(klass, "name", { value: name });
  }
  Metadata.setFields(klass, fields);
  klass._getDefaultValues = getDefaultValues;
  klass._initialize = initialize;
  Object.assign(klass.prototype, methods);
  for (const fieldName in viewTagFields) {
    view(viewTagFields[fieldName])(klass.prototype, fieldName);
  }
  for (const fieldName of unreliableFields) {
    unreliable(klass.prototype, fieldName);
  }
  for (const fieldName of patchOnlyFields) {
    patchOnly(klass.prototype, fieldName);
  }
  for (const fieldName in deprecatedFields) {
    deprecated(deprecatedFields[fieldName])(klass.prototype, fieldName);
  }
  if (fullStateOnlyFields.length > 0 || streamFields.length > 0) {
    const metadata = klass[Symbol.metadata];
    for (const fieldName of fullStateOnlyFields) {
      Metadata.setFullStateOnly(metadata, fieldName);
    }
    for (const fieldName of streamFields) {
      Metadata.setStream(metadata, fieldName);
    }
    for (const fieldName in streamPriorityFields) {
      Metadata.setStreamPriority(metadata, fieldName, streamPriorityFields[fieldName]);
    }
  }
  if (optionalFields.length > 0) {
    const metadata = klass[Symbol.metadata];
    for (const fieldName of optionalFields) {
      metadata[metadata[fieldName]].optional = true;
    }
  }
  klass.extend = (childFields, childName) => schema(childFields, childName, klass);
  return klass;
}
function getIndent(level) {
  return new Array(level).fill(0).map((_, i) => i === level - 1 ? `\u2514\u2500 ` : `   `).join("");
}
var Schema = class _Schema {
  static [$encoder] = encodeSchemaOperation;
  static [$decoder] = decodeSchemaOperation;
  [$refId];
  [$values];
  /**
   * Initialize change tracking on this instance.
   * Field accessor descriptors (getter/setter) live on the prototype,
   * installed once at class-definition time. Per-instance work is limited
   * to allocating a ChangeTree and a values array.
   */
  static initialize(instance) {
    Object.defineProperty(instance, $changes, {
      value: new ChangeTree(instance),
      enumerable: false,
      writable: true
    });
    instance[$values] = [];
  }
  /**
   * Decoder-side factory. Skips the user subclass ctor entirely —
   * decoder-built instances are passive mirrors of server state, so any
   * field initializer / ctor body work would be overwritten by the
   * decoded ADDs immediately after. Assignment order matches
   * {@link Schema.initialize} so V8 assigns the same hidden class
   * ($changes, then $values), keeping decode-path ICs monomorphic even
   * when tracked and untracked instances coexist.
   *
   * The `this:` constraint pins the return type to the concrete subclass
   * when called as `Player.initializeForDecoder()`, not the base Schema.
   */
  static initializeForDecoder() {
    const inst = Object.create(this.prototype);
    installUntrackedChangeTree(inst);
    inst[$values] = [];
    return inst;
  }
  /**
   * Reset a DETACHED instance to construction defaults so it can be returned
   * to a {@link SchemaPool} and reused, avoiding the cost of `new`. Recurses
   * into ref-type fields (child Schemas / collections).
   *
   * Preconditions (enforced):
   * - The instance must be tracked (encoder-side), not a decoder mirror.
   * - The instance must NOT be shared across multiple parents.
   * - The instance must already be removed from its parent collection/field
   *   (so the encoder detached it: `root === undefined`).
   *
   * NOTE: primitive field values are NOT reset to class defaults — re-assign
   * the fields you care about when you reuse the instance (standard
   * object-pool discipline).
   */
  static reset(instance) {
    const changeTree = instance?.[$changes];
    if (changeTree === void 0 || typeof changeTree.recycle !== "function") {
      throw new Error(`@colyseus/schema: Schema.reset() requires a tracked (encoder-side) instance.`);
    }
    if (changeTree.extraParents !== void 0) {
      throw new Error(`@colyseus/schema: cannot reset a shared instance (${instance.constructor.name}) with multiple parents.`);
    }
    instance[$reset]();
  }
  /**
   * Per-instance reset primitive (the recursive worker behind
   * {@link Schema.reset}). Resets ref-type children first (depth-first),
   * then recycles this instance's ChangeTree and drops its `$refId` so a
   * re-add is assigned a fresh refId exactly like a freshly constructed
   * instance. Dropping `$refId` is what makes instance reuse
   * wire-format-identical to `new T()`.
   */
  [$reset]() {
    const metadata = this.constructor[Symbol.metadata];
    const refIndexes = metadata?.[$refTypeFieldIndexes] ?? [];
    const values = this[$values];
    for (let i = 0; i < refIndexes.length; i++) {
      const child = values[refIndexes[i]];
      child?.[$reset]?.();
    }
    this[$changes].recycle();
    this[$refId] = void 0;
  }
  /**
   * Check whether `type` describes a Schema *class* (a subclass
   * constructor carrying `Symbol.metadata`, as installed by `@type`).
   * Returns false for primitive type strings like `"number"`, descriptor
   * objects like `{ map: Player }`, and Schema *instances*.
   *
   * For the instance-level check — "is this value a Schema instance?" —
   * see {@link Schema.isSchema}.
   */
  static is(type) {
    const m = type[Symbol.metadata];
    return typeof m === "object" && m !== null;
  }
  /**
   * Check if a value is an *instance* of Schema. Uses duck-typing on
   * `.assign` to work across multiple `@colyseus/schema` versions that
   * may be loaded in the same process (e.g. bundled server types vs.
   * client types in a p2p setup).
   *
   * For the class-level check — "is this type a Schema subclass?" —
   * see {@link Schema.is}.
   *
   * @param obj Value to check
   * @returns true if the value is a Schema instance
   */
  static isSchema(obj) {
    return typeof obj?.assign === "function";
  }
  /**
   * Track property changes. Exposed as an override point so downstream
   * tools (debuggers, transparent proxies, custom instrumentation) can
   * intercept per-field writes. Hot-path code in `annotations.ts` calls
   * `(this.constructor as typeof Schema)[$track](...)` rather than
   * `changeTree.change(...)` directly so any subclass override wins.
   */
  static [$track](changeTree, index, operation = OPERATION.ADD) {
    changeTree.change(index, operation);
  }
  /**
   * Determine if a property must be filtered.
   * - If returns false, the property is NOT going to be encoded.
   * - If returns true, the property is going to be encoded.
   *
   * Encoding with "filters" happens in two steps:
   * - First, the encoder iterates over all "not owned" properties and encodes them.
   * - Then, the encoder iterates over all "owned" properties per instance and encodes them.
   */
  static [$filter](ref, index, view2) {
    const metadata = ref.constructor[Symbol.metadata];
    const tag = metadata[index]?.tag;
    if (view2 === void 0) {
      return tag === void 0;
    } else if (tag === void 0) {
      return true;
    } else if (tag === DEFAULT_VIEW_TAG) {
      return view2.isChangeTreeVisible(ref[$changes]);
    } else {
      return view2.hasTagOnTree(ref[$changes], tag);
    }
  }
  // allow inherited classes to have a constructor
  constructor(arg) {
    _Schema.initialize(this);
    if (arg) {
      _Schema.assignProps(this, arg);
    }
  }
  /**
   * Assign properties to the instance.
   * @param props Properties to assign to the instance
   * @returns
   */
  assign(props) {
    _Schema.assignProps(this, props);
    return this;
  }
  /**
   * Metadata-driven property assignment.
   * Reads tracked fields via property access (works with prototype accessors),
   * then copies any remaining own properties for non-tracked fields.
   */
  static assignProps(target, source) {
    const metadata = target.constructor[Symbol.metadata];
    if (metadata && metadata[$numFields] !== void 0) {
      for (let i = 0; i <= metadata[$numFields]; i++) {
        const field = metadata[i];
        if (!field) {
          continue;
        }
        const value = source[field.name];
        if (value !== void 0) {
          target[field.name] = value;
        }
      }
    }
    const keys = Object.keys(source);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (metadata && metadata[key] !== void 0) {
        continue;
      }
      target[key] = source[key];
    }
  }
  /**
   * Restore the instance from JSON data.
   * @param jsonData JSON data to restore the instance from
   * @returns
   */
  restore(jsonData) {
    const metadata = this.constructor[Symbol.metadata];
    for (const fieldIndex in metadata) {
      const field = metadata[fieldIndex];
      const fieldName = field.name;
      const fieldType = field.type;
      const value = jsonData[fieldName];
      if (value === void 0 || value === null) {
        continue;
      }
      if (typeof fieldType === "string") {
        this[fieldName] = value;
      } else if (_Schema.is(fieldType)) {
        const instance = new fieldType();
        instance.restore(value);
        this[fieldName] = instance;
      } else if (typeof fieldType === "object") {
        const collectionType = Object.keys(fieldType)[0];
        const childType = fieldType[collectionType];
        if (collectionType === "map") {
          const mapSchema = this[fieldName];
          for (const key in value) {
            if (_Schema.is(childType)) {
              const childInstance = new childType();
              childInstance.restore(value[key]);
              mapSchema.set(key, childInstance);
            } else {
              mapSchema.set(key, value[key]);
            }
          }
        } else if (collectionType === "array") {
          const arraySchema = this[fieldName];
          for (let i = 0; i < value.length; i++) {
            if (_Schema.is(childType)) {
              const childInstance = new childType();
              childInstance.restore(value[i]);
              arraySchema.push(childInstance);
            } else {
              arraySchema.push(value[i]);
            }
          }
        }
      }
    }
    return this;
  }
  /**
   * (Server-side): Flag a property to be encoded for the next patch.
   * @param instance Schema instance
   * @param property string representing the property name, or number representing the index of the property.
   * @param operation OPERATION to perform (detected automatically)
   */
  setDirty(property, operation) {
    const metadata = this.constructor[Symbol.metadata];
    this[$changes].change(metadata[metadata[property]].index, operation);
  }
  // ────────────────────────────────────────────────────────────────────
  // Change-tracking control API
  //
  // By default, every mutation to a @type() property is automatically
  // recorded as a change. These methods let you opt out for bulk-load
  // scenarios or custom batching.
  //
  // @example
  //   // Bulk-load without emitting changes:
  //   player.untracked(() => {
  //     player.hp = 100;
  //     player.name = "alice";
  //   });
  //
  //   // Pause / resume pattern:
  //   player.pauseTracking();
  //   player.hp = 100;   // not tracked
  //   player.resumeTracking();
  //   player.hp = 50;    // tracked
  // ────────────────────────────────────────────────────────────────────
  /** Stop recording mutations until resumeTracking() is called. */
  pauseTracking() {
    this[$changes].pause();
  }
  /** Re-enable automatic change tracking. */
  resumeTracking() {
    this[$changes].resume();
  }
  /**
   * Run `fn` with change tracking paused, then resume.
   * Returns the function's return value. Safe to nest.
   */
  untracked(fn) {
    return this[$changes].untracked(fn);
  }
  /** True while tracking is paused. */
  get isTrackingPaused() {
    return this[$changes].paused;
  }
  clone() {
    const cloned = Object.create(this.constructor.prototype);
    _Schema.initialize(cloned);
    const metadata = this.constructor[Symbol.metadata];
    for (const fieldIndex in metadata) {
      const field = metadata[fieldIndex].name;
      if (typeof this[field] === "object" && typeof this[field]?.clone === "function") {
        cloned[field] = this[field].clone();
      } else {
        cloned[field] = this[field];
      }
    }
    return cloned;
  }
  toJSON() {
    const obj = {};
    const metadata = this.constructor[Symbol.metadata];
    for (const index in metadata) {
      const field = metadata[index];
      const fieldName = field.name;
      if (!field.deprecated && this[fieldName] !== null && typeof this[fieldName] !== "undefined") {
        obj[fieldName] = typeof this[fieldName]["toJSON"] === "function" ? this[fieldName]["toJSON"]() : this[fieldName];
      }
    }
    return obj;
  }
  /**
   * Used in tests only
   * @internal
   */
  discardAllChanges() {
    this[$changes].discardAll();
  }
  [$getByIndex](index) {
    const metadata = this.constructor[Symbol.metadata];
    return this[metadata[index].name];
  }
  [$deleteByIndex](index) {
    const metadata = this.constructor[Symbol.metadata];
    this[metadata[index].name] = void 0;
  }
  /**
   * Inspect the `refId` of all Schema instances in the tree. Optionally display the contents of the instance.
   *
   * @param ref Schema instance
   * @param showContents display JSON contents of the instance
   * @returns
   */
  static debugRefIds(ref, showContents = false, level = 0, decoder, keyPrefix = "") {
    const contents = showContents ? ` - ${JSON.stringify(ref.toJSON())}` : "";
    const changeTree = ref[$changes];
    const refId = ref[$refId];
    const root = decoder ? decoder.root : changeTree.root;
    const refCount = root?.refCount?.[refId] > 1 ? ` [\xD7${root.refCount[refId]}]` : "";
    let output = `${getIndent(level)}${keyPrefix}${ref.constructor.name} (refId: ${refId})${refCount}${contents}
`;
    changeTree.forEachChild((childChangeTree, indexOrKey) => {
      let key = indexOrKey;
      if (typeof indexOrKey === "number" && ref["$indexes"]) {
        key = ref["$indexes"].get(indexOrKey) ?? indexOrKey;
      }
      const keyPrefix2 = ref["forEach"] !== void 0 && key !== void 0 ? `["${key}"]: ` : "";
      output += this.debugRefIds(childChangeTree.ref, showContents, level + 1, decoder, keyPrefix2);
    });
    return output;
  }
  /**
   * @param changeSet
   *  - "changes": iterate the current-tick dirty queue (per-tick encode order)
   *  - "allChanges" / "allFilteredChanges" (legacy): structurally walk the
   *    tree in DFS preorder (matches the order in which full-sync emits
   *    trees). The two legacy modes differ by which side of the filter
   *    split they include.
   */
  static debugRefIdEncodingOrder(ref, changeSet = "allChanges") {
    const encodeOrder = [];
    const rootChangeTree = ref[$changes];
    if (changeSet === "changes") {
      let current = rootChangeTree.root.changes?.next;
      while (current) {
        if (current.changeTree) {
          encodeOrder.push(current.changeTree.ref[$refId]);
        }
        current = current.next;
      }
      return encodeOrder;
    }
    const wantFiltered = changeSet === "allFilteredChanges";
    const visited = /* @__PURE__ */ new Set();
    const walk = (changeTree) => {
      if (visited.has(changeTree))
        return;
      visited.add(changeTree);
      if (changeTree.isFiltered === wantFiltered) {
        encodeOrder.push(changeTree.ref[$refId]);
      }
      changeTree.forEachChild((child, _) => walk(child));
    };
    walk(rootChangeTree);
    return encodeOrder;
  }
  static debugRefIdsFromDecoder(decoder) {
    return this.debugRefIds(decoder.state, false, 0, decoder);
  }
  /**
   * Return a string representation of the changes on a Schema instance.
   * The list of changes is cleared after each encode.
   *
   * @param instance Schema instance
   * @param isEncodeAll Return "full encode" instead of current change set.
   * @returns
   */
  static debugChanges(instance, isEncodeAll = false) {
    const changeTree = instance[$changes];
    const label = isEncodeAll ? "allChanges" : "changes";
    let output = `${instance.constructor.name} (${instance[$refId]}) -> .${label}:
`;
    if (isEncodeAll) {
      changeTree.forEachLive((index) => {
        output += `- [${index}]: ADD (${JSON.stringify(changeTree.getValue(Number(index), true))})
`;
      });
    } else {
      changeTree.forEach((index, op) => {
        if (index < 0 || !op)
          return;
        output += `- [${index}]: ${OPERATION[op]} (${JSON.stringify(changeTree.getValue(Number(index), false))})
`;
      });
    }
    return output;
  }
};
shadowMetadata(Schema);
var $refIdDescriptor$1 = { value: 0, enumerable: false, writable: true };
var Root = class {
  types;
  /**
   * Monotonic refId counter. RefIds are never recycled — a refId is a
   * stable identity for the lifetime of the room, so a client that
   * missed DELETEs (reconnect) can never see an old id rebound to a
   * different instance. DevMode reads/writes this across HMR cycles.
   */
  nextUniqueId = 0;
  refCount = {};
  changeTrees = {};
  /**
   * Queue of all ChangeTrees with reliable dirty state. Per-tick encode()
   * walks this queue; per-view encodeView() walks it too (filtering at
   * emission time via tree.isFiltered + per-field @view tag).
   */
  changes = createChangeTreeList();
  /**
   * Queue of all ChangeTrees with unreliable dirty state. Walked by
   * `Encoder.encodeUnreliable` / `encodeUnreliableView`. A tree may live
   * in both queues when the Schema has both reliable and unreliable
   * fields dirty at the same time.
   */
  unreliableChanges = createChangeTreeList();
  /**
   * Trees whose parent-edge set changed this tick (instance sharing
   * gained or lost an edge). The encoder drains this before emission —
   * `inheritedFlags.drainFilterRefresh` re-derives each tree's filter
   * state against the then-settled containers. Only populated when the
   * TypeContext has any @view/@stream field.
   */
  pendingFilterRefresh = [];
  enqueueFilterRefresh(tree) {
    if (!this.types.hasFilters)
      return;
    if (tree.flags & PENDING_FILTER_REFRESH)
      return;
    tree.flags |= PENDING_FILTER_REFRESH;
    this.pendingFilterRefresh.push(tree);
  }
  /**
   * Free-list of ChangeTreeNode objects. Both queues share this pool —
   * a node carries no queue affinity, only `{ changeTree, prev, next, position }`.
   * Reusing nodes turns ~1,250 per-tick allocations (in bench) into 0.
   */
  _nodePool = [];
  /**
   * View ID allocator for StateView visibility bitmaps on ChangeTree.
   * Each new StateView claims the lowest free ID; releaseViewId() puts
   * the ID back. Avoids unbounded bitmap growth across long-running rooms
   * with view churn (clients joining/leaving).
   */
  _nextViewId = 0;
  _freeViewIds = [];
  /** Allocate a fresh view ID (lowest available). */
  acquireViewId() {
    return this._freeViewIds.length > 0 ? this._freeViewIds.pop() : this._nextViewId++;
  }
  /** Return a view ID to the freelist for reuse. */
  releaseViewId(id) {
    this._freeViewIds.push(id);
  }
  /**
   * Currently-bound StateViews, keyed by view ID and held via `WeakRef`
   * so the FinalizationRegistry backstop in StateView still works when
   * the user forgets `dispose()`. Callers must iterate via
   * `forEachActiveView`, which prunes dead entries.
   */
  activeViews = /* @__PURE__ */ new Map();
  /**
   * Streamable collections attached under this Root — `StreamSchema`
   * plus any collection opted into streaming via `.stream()` on the
   * builder. Encoder.encodeView / broadcast pass iterates this set to
   * dispatch per-view / per-tick budget gates.
   */
  streamTrees = /* @__PURE__ */ new Set();
  registerView(view2) {
    this.activeViews.set(view2.id, new WeakRef(view2));
  }
  unregisterView(view2) {
    this.activeViews.delete(view2.id);
    const id = view2.id;
    for (const stream of this.streamTrees) {
      stream._dropView(id);
    }
  }
  /**
   * Iterate all live StateViews bound to this Root. Prunes entries
   * whose underlying view has been garbage collected without an
   * explicit `dispose()`.
   */
  forEachActiveView(cb) {
    for (const [id, ref] of this.activeViews) {
      const view2 = ref.deref();
      if (view2 === void 0) {
        this.activeViews.delete(id);
        for (const stream of this.streamTrees)
          stream._dropView(id);
        continue;
      }
      cb(view2);
    }
  }
  registerStream(stream) {
    this.streamTrees.add(stream);
  }
  unregisterStream(stream) {
    this.streamTrees.delete(stream);
  }
  constructor(types, startRefId = 0) {
    this.types = types;
    this.nextUniqueId = startRefId;
  }
  add(changeTree) {
    const ref = changeTree.ref;
    if (ref[$refId] === void 0) {
      $refIdDescriptor$1.value = this.nextUniqueId++;
      Object.defineProperty(ref, $refId, $refIdDescriptor$1);
    }
    const refId = ref[$refId];
    const isNewChangeTree = this.changeTrees[refId] === void 0;
    if (isNewChangeTree) {
      this.changeTrees[refId] = changeTree;
    }
    const previousRefCount = this.refCount[refId];
    if (previousRefCount === 0 || changeTree.needsRestage) {
      changeTree.needsRestage = false;
      changeTree.forEachLiveWithCtx(changeTree, restageLiveCb);
    }
    this.refCount[refId] = (previousRefCount || 0) + 1;
    if (previousRefCount > 0)
      this.enqueueFilterRefresh(changeTree);
    return isNewChangeTree;
  }
  remove(changeTree) {
    const refId = changeTree.ref[$refId];
    const refCount = this.refCount[refId] - 1;
    if (refCount <= 0) {
      changeTree.root = void 0;
      delete this.changeTrees[refId];
      if (changeTree.isStreamCollection) {
        const streamable = changeTree.ref;
        streamable._unregister?.();
        this.unregisterStream(streamable);
      }
      this.removeFromQueue(changeTree);
      this.removeFromUnreliableQueue(changeTree);
      this.refCount[refId] = 0;
      changeTree.forEachChild((child, _) => {
        if (child.removeParent(changeTree.ref)) {
          if (child.parentRef === void 0 || // no parent, remove it
          child.parentRef && this.refCount[child.ref[$refId]] > 0) {
            this.remove(child);
          } else if (child.parentRef) {
            this.moveNextToParent(child);
          }
        }
      });
    } else {
      this.refCount[refId] = refCount;
      this.enqueueFilterRefresh(changeTree);
      this.recursivelyMoveNextToParent(changeTree);
    }
    return refCount;
  }
  recursivelyMoveNextToParent(changeTree) {
    this.moveNextToParent(changeTree);
    changeTree.forEachChild((child, _) => this.recursivelyMoveNextToParent(child));
  }
  moveNextToParent(changeTree) {
    if (changeTree.changesNode) {
      this._moveNextToParentInList(this.changes, changeTree, changeTree.changesNode, "changesNode");
    }
    if (changeTree.unreliableChangesNode) {
      this._moveNextToParentInList(this.unreliableChanges, changeTree, changeTree.unreliableChangesNode, "unreliableChangesNode");
    }
  }
  _moveNextToParentInList(changeSet, changeTree, node, nodeField) {
    const parent = changeTree.parent;
    if (!parent || !parent[$changes])
      return;
    const parentNode = parent[$changes][nodeField];
    if (!parentNode || parentNode === node)
      return;
    if (node.position > parentNode.position)
      return;
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      changeSet.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      changeSet.tail = node.prev;
    }
    node.prev = changeSet.tail;
    node.next = void 0;
    changeSet.tail.next = node;
    changeSet.tail = node;
    node.position = changeSet.nextPosition++;
  }
  enqueueChangeTree(changeTree, existingNode = changeTree.changesNode) {
    if (existingNode) {
      return;
    }
    changeTree.changesNode = this._appendToList(this.changes, changeTree);
  }
  enqueueUnreliable(changeTree, existingNode = changeTree.unreliableChangesNode) {
    if (existingNode) {
      return;
    }
    changeTree.unreliableChangesNode = this._appendToList(this.unreliableChanges, changeTree);
  }
  _appendToList(list, changeTree) {
    const pool = this._nodePool;
    let node;
    if (pool.length > 0) {
      node = pool.pop();
      node.changeTree = changeTree;
      node.next = void 0;
      node.prev = void 0;
    } else {
      node = { changeTree, next: void 0, prev: void 0, position: 0 };
    }
    if (!list.next) {
      list.nextPosition = 0;
      list.next = node;
      list.tail = node;
    } else {
      node.prev = list.tail;
      list.tail.next = node;
      list.tail = node;
    }
    node.position = list.nextPosition++;
    return node;
  }
  /**
   * Release a detached node back to the free-list. Caller must have
   * already unlinked it from any list and cleared the changeTree's
   * pointer to it. Clears `changeTree`/`prev`/`next` so the pool
   * doesn't retain references through the GC root.
   */
  releaseNode(node) {
    node.changeTree = void 0;
    node.prev = void 0;
    node.next = void 0;
    this._nodePool.push(node);
  }
  removeFromQueue(changeTree) {
    return this._removeNode(this.changes, changeTree, changeTree.changesNode, "changesNode");
  }
  removeFromUnreliableQueue(changeTree) {
    return this._removeNode(this.unreliableChanges, changeTree, changeTree.unreliableChangesNode, "unreliableChangesNode");
  }
  _removeNode(changeSet, changeTree, node, nodeField) {
    if (!node || node.changeTree !== changeTree)
      return false;
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      changeSet.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      changeSet.tail = node.prev;
    }
    changeTree[nodeField] = void 0;
    this.releaseNode(node);
    return true;
  }
};
function spliceOne(arr, index) {
  if (index === -1 || index >= arr.length) {
    return false;
  }
  const len = arr.length - 1;
  for (let i = index; i < len; i++) {
    arr[i] = arr[i + 1];
  }
  arr.length = len;
  return true;
}
function _clearViewBitFromAllTrees(root, slot, bit) {
  const clearMask = ~bit;
  const trees = root.changeTrees;
  for (const refId in trees) {
    const tree = trees[refId];
    const v = tree.visibleViews;
    if (v !== void 0 && slot < v.length)
      v[slot] &= clearMask;
    const s = tree.subscribedViews;
    if (s !== void 0 && slot < s.length)
      s[slot] &= clearMask;
    const t2 = tree.tagViews;
    if (t2 !== void 0) {
      t2.forEach((bitmap) => {
        if (slot < bitmap.length)
          bitmap[slot] &= clearMask;
      });
    }
  }
}
var _disposeRegistry = new FinalizationRegistry(({ root, id, slot, bit }) => {
  _clearViewBitFromAllTrees(root, slot, bit);
  root.activeViews.delete(id);
  for (const stream of root.streamTrees)
    stream._dropView(id);
  root.releaseViewId(id);
});
var ARRAY_SNAPSHOT = -1;
function ensureStructSwitch(ctx) {
  if (ctx.structSwitchEmitted)
    return;
  if (ctx.shouldEmitSwitch) {
    ctx.buffer[ctx.it.offset++] = SWITCH_TO_STRUCTURE & 255;
    encode.number(ctx.buffer, ctx.ref[$refId], ctx.it);
  }
  ctx.structSwitchEmitted = true;
}
function encodeFullSyncCb(ctx, fieldIndex) {
  encodeChangeCb(ctx, fieldIndex, OPERATION.ADD);
}
function _fullSyncWalk(ctx, changeTree) {
  if (changeTree._fullSyncGen === ctx.gen)
    return;
  changeTree._fullSyncGen = ctx.gen;
  const visibleHere = !ctx.hasView || ctx.view.isChangeTreeVisible(changeTree);
  if (visibleHere) {
    const desc = changeTree.encDescriptor;
    ctx.changeTree = changeTree;
    ctx.ref = changeTree.ref;
    ctx.encoder = desc.encoder;
    ctx.filter = desc.filter;
    ctx.metadata = desc.metadata;
    ctx.treeIsFiltered = changeTree.isFiltered;
    ctx.isSchema = desc.isSchema;
    ctx.filterBitmask = desc.filterBitmask;
    ctx.tags = desc.tags;
    ctx.structSwitchEmitted = false;
    ctx.shouldEmitSwitch = ctx.hasView || ctx.it.offset > ctx.initialOffset || changeTree !== ctx.rootChangeTree;
    if (changeTree.isArray && changeTree.collDirty.size > 0) {
      changeTree.flags |= PENDING_SHIPPED_BY_FULL_SYNC;
    }
    forEachLiveWithCtx(changeTree, ctx, encodeFullSyncCb);
  }
  forEachChildWithCtx(changeTree, ctx, _fullSyncWalkChildCb);
}
function _fullSyncWalkChildCb(ctx, child, _index) {
  _fullSyncWalk(ctx, child);
}
function encodeChangeCb(ctx, fieldIndex, op) {
  if (fieldIndex < 0) {
    if (ctx.treeIsFiltered !== ctx.emitFiltered)
      return;
    ensureStructSwitch(ctx);
    ctx.buffer[ctx.it.offset++] = Math.abs(fieldIndex) & 255;
    return;
  }
  const fieldFiltered = ctx.isSchema ? ctx.treeIsFiltered || (fieldIndex < 32 ? (ctx.filterBitmask & 1 << fieldIndex) !== 0 : ctx.tags[fieldIndex] !== void 0) : ctx.treeIsFiltered;
  if (fieldFiltered !== ctx.emitFiltered)
    return;
  const operation = ctx.isEncodeAll ? OPERATION.ADD : op;
  if (operation === void 0)
    return;
  if (ctx.filter !== void 0 && !ctx.filter(ctx.ref, fieldIndex, ctx.view))
    return;
  ensureStructSwitch(ctx);
  ctx.encoder(ctx.self, ctx.buffer, ctx.changeTree, fieldIndex, operation, ctx.it, ctx.isEncodeAll, ctx.hasView, ctx.metadata);
}
function concatBytes(a, b) {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}
var Encoder = class _Encoder {
  /**
   * Per-encoder shared output buffer size. The encoder auto-grows on
   * overflow and logs a one-time warning suggesting a higher value, so
   * the default just needs to comfortably cover typical room state.
   *
   * Sized to fit ~100 items in a `MapSchema<{x,y,z}>` keyed by
   * `nanoid(9)` (~4.5 KB worst-case full encode, float64-heavy) with
   * ~3-4× headroom for surrounding state (player list, world refs,
   * etc.). Raise per app via `Encoder.BUFFER_SIZE = N * 1024` before
   * constructing any Encoder.
   */
  static BUFFER_SIZE = 16 * 1024;
  sharedBuffer = new Uint8Array(_Encoder.BUFFER_SIZE);
  context;
  state;
  root;
  constructor(state, root) {
    this.context = TypeContext.cache(state.constructor);
    this.root = root ?? new Root(this.context);
    this.setState(state);
  }
  setState(state) {
    this.state = state;
    this.state[$changes].setRoot(this.root);
  }
  _encodeCtx = {
    self: void 0,
    buffer: void 0,
    it: void 0,
    changeTree: void 0,
    ref: void 0,
    encoder: void 0,
    filter: void 0,
    metadata: void 0,
    view: void 0,
    isEncodeAll: false,
    hasView: false,
    treeIsFiltered: false,
    isSchema: false,
    emitFiltered: false,
    filterBitmask: 0,
    tags: void 0,
    structSwitchEmitted: false,
    isRootTree: false,
    shouldEmitSwitch: false,
    gen: 0,
    initialOffset: 0,
    rootChangeTree: void 0
  };
  /**
   * Monotonic counter bumped at the start of every `encodeFullSync`
   * call. The new value is copied to `ctx.gen` and stamped into every
   * tree the walk touches (`tree._fullSyncGen = ctx.gen`); subsequent
   * revisits of the same tree detect the equality and return early.
   */
  _fullSyncGen = 0;
  encode(it = { offset: 0 }, view2, buffer = this.sharedBuffer, initialOffset = it.offset) {
    return this._encodeChannel(
      it,
      view2,
      buffer,
      initialOffset,
      /* unreliable */
      false
    );
  }
  /**
   * Per-tick encode of the UNRELIABLE channel. Walks `root.unreliableChanges`
   * and emits each tree's `unreliableRecorder`. Safe to call at a different
   * cadence than `encode()` (e.g. 60Hz vs 20Hz) — the two channels are
   * fully independent.
   */
  encodeUnreliable(it = { offset: 0 }, view2, buffer = this.sharedBuffer, initialOffset = it.offset) {
    return this._encodeChannel(
      it,
      view2,
      buffer,
      initialOffset,
      /* unreliable */
      true
    );
  }
  _encodeChannel(it, view2, buffer, initialOffset, unreliable2) {
    if (this.root.pendingFilterRefresh.length > 0)
      drainFilterRefresh(this.root);
    const hasView = view2 !== void 0;
    const rootChangeTree = this.state[$changes];
    const ctx = this._encodeCtx;
    ctx.self = this;
    ctx.buffer = buffer;
    ctx.it = it;
    ctx.view = view2;
    ctx.isEncodeAll = false;
    ctx.hasView = hasView;
    ctx.emitFiltered = hasView;
    const queue = unreliable2 ? this.root.unreliableChanges : this.root.changes;
    let current = queue;
    while (current = current.next) {
      const changeTree = current.changeTree;
      if (hasView && !view2.isChangeTreeVisible(changeTree)) {
        continue;
      }
      const recorder = unreliable2 ? changeTree.unreliableRecorder : changeTree;
      if (!recorder || !recorder.has()) {
        continue;
      }
      const desc = changeTree.encDescriptor;
      ctx.changeTree = changeTree;
      ctx.ref = changeTree.ref;
      ctx.encoder = desc.encoder;
      ctx.filter = desc.filter;
      ctx.metadata = desc.metadata;
      ctx.treeIsFiltered = changeTree.isFiltered;
      ctx.isSchema = desc.isSchema;
      ctx.filterBitmask = desc.filterBitmask;
      ctx.tags = desc.tags;
      ctx.structSwitchEmitted = false;
      ctx.isRootTree = changeTree === rootChangeTree;
      ctx.shouldEmitSwitch = hasView || it.offset > initialOffset || !ctx.isRootTree;
      recorder.forEachWithCtx(ctx, encodeChangeCb);
    }
    if (!unreliable2 && !hasView && this._isStreamBroadcastMode) {
      this._emitStreamBroadcast(buffer, it);
    }
    if (it.offset > buffer.byteLength) {
      buffer = this._resizeBuffer(buffer, it.offset);
      it.offset = initialOffset;
      return this._encodeChannel(it, view2, buffer, initialOffset, unreliable2);
    }
    return buffer.subarray(0, it.offset);
  }
  /**
   * Structural DFS walker for full-sync (encodeAll / encodeAllView).
   * Visits each ChangeTree in DFS preorder starting from the state root,
   * emitting ADD operations for every currently-populated index via
   * {@link ChangeTree.forEachLive}.
   */
  encodeFullSync(it, buffer, emitFiltered, view2, initialOffset = it.offset) {
    if (this.root.pendingFilterRefresh.length > 0)
      drainFilterRefresh(this.root);
    const hasView = view2 !== void 0;
    const rootChangeTree = this.state[$changes];
    const ctx = this._encodeCtx;
    ctx.self = this;
    ctx.buffer = buffer;
    ctx.it = it;
    ctx.view = view2;
    ctx.isEncodeAll = true;
    ctx.hasView = hasView;
    ctx.emitFiltered = emitFiltered;
    ctx.gen = ++this._fullSyncGen;
    ctx.initialOffset = initialOffset;
    ctx.rootChangeTree = rootChangeTree;
    _fullSyncWalk(ctx, rootChangeTree);
    if (it.offset > buffer.byteLength) {
      buffer = this._resizeBuffer(buffer, it.offset);
      it.offset = initialOffset;
      return this.encodeFullSync(it, buffer, emitFiltered, view2, initialOffset);
    }
    return buffer.subarray(0, it.offset);
  }
  _resizeBuffer(buffer, usedOffset) {
    const newSize = Math.ceil(usedOffset / _Encoder.BUFFER_SIZE) * _Encoder.BUFFER_SIZE;
    console.warn(`@colyseus/schema buffer overflow. Encoded state is higher than default BUFFER_SIZE. Use the following to increase default BUFFER_SIZE:

    import { Encoder } from "@colyseus/schema";
    Encoder.BUFFER_SIZE = ${Math.round(newSize / 1024)} * 1024; // ${Math.round(newSize / 1024)} KB
`);
    const newBuffer = new Uint8Array(newSize);
    newBuffer.set(buffer);
    if (buffer === this.sharedBuffer) {
      this.sharedBuffer = newBuffer;
    }
    return newBuffer;
  }
  encodeAll(it = { offset: 0 }, buffer = this.sharedBuffer) {
    return this.encodeFullSync(
      it,
      buffer,
      /* emitFiltered */
      false
    );
  }
  encodeAllView(view2, sharedOffset, it, bytes = this.sharedBuffer) {
    const viewOffset = it.offset;
    bytes = this.encodeFullSync(
      it,
      bytes,
      /* emitFiltered */
      true,
      view2,
      viewOffset
    );
    return concatBytes(bytes.subarray(0, sharedOffset), bytes.subarray(viewOffset, it.offset));
  }
  /** Grow `buffer` to keep BUFFER_SIZE free bytes past `offset`, preserving `[0, offset)`. */
  ensureCapacity(buffer, offset) {
    if (offset + _Encoder.BUFFER_SIZE <= buffer.byteLength) {
      return buffer;
    }
    const size = Math.ceil((offset + _Encoder.BUFFER_SIZE) / _Encoder.BUFFER_SIZE) * _Encoder.BUFFER_SIZE;
    const grown = new Uint8Array(size);
    grown.set(buffer.subarray(0, offset));
    if (buffer === this.sharedBuffer) {
      this.sharedBuffer = grown;
    }
    return grown;
  }
  encodeView(view2, sharedOffset, it, bytes = this.sharedBuffer) {
    const viewOffset = it.offset;
    this._emitStreamPriority(view2);
    for (const refId of view2.changes.keys()) {
      const changes = view2.changes.get(refId);
      const changeTree = this.root.changeTrees[refId];
      if (changeTree === void 0) {
        view2.changes.delete(refId);
        continue;
      }
      if (changes.size === 0) {
        continue;
      }
      const desc = changeTree.encDescriptor;
      const encoder = desc.encoder;
      const metadata = desc.metadata;
      const ref = changeTree.ref;
      const refTarget = changeTree.refTarget;
      bytes = this.ensureCapacity(bytes, it.offset);
      bytes[it.offset++] = SWITCH_TO_STRUCTURE & 255;
      encode.number(bytes, ref[$refId], it);
      for (const [key, op] of changes) {
        let index;
        if (key === ARRAY_SNAPSHOT) {
          const tmpItems = refTarget.tmpItems;
          const deletedIndexes = refTarget.deletedIndexes;
          for (let slot = 0; slot < tmpItems.length; slot++) {
            if (tmpItems[slot] === void 0 || deletedIndexes[slot] === true) {
              continue;
            }
            encoder(this, bytes, changeTree, slot, OPERATION.ADD, it, false, true, metadata);
          }
          continue;
        }
        if (typeof key === "number") {
          index = key;
        } else {
          const resolved = key.indexInParent(ref);
          if (resolved === void 0) {
            continue;
          }
          index = resolved;
          if (op === OPERATION.ADD && changeTree.getChange(index) === OPERATION.DELETE) {
            view2.changes.delete(key.ref[$refId]);
            continue;
          }
        }
        const value = refTarget[$getByIndex](index);
        const operation = value !== void 0 && op || OPERATION.DELETE;
        encoder(this, bytes, changeTree, index, operation, it, false, true, metadata);
      }
    }
    view2.changes.clear();
    bytes = this.encode(it, view2, bytes);
    return concatBytes(bytes.subarray(0, sharedOffset), bytes.subarray(viewOffset, it.offset));
  }
  /**
   * Per-view unreliable encode. Walks `root.unreliableChanges` and emits
   * only filtered fields visible to this view. Unlike `encodeView`, this
   * doesn't emit `view.changes` entries — those are used only for
   * reliable view bootstrap (membership ADDs) and are consumed by
   * `encodeView` on the reliable channel.
   */
  encodeUnreliableView(view2, sharedOffset, it, bytes = this.sharedBuffer) {
    const viewOffset = it.offset;
    bytes = this.encodeUnreliable(it, view2, bytes, viewOffset);
    return concatBytes(bytes.subarray(0, sharedOffset), bytes.subarray(viewOffset, it.offset));
  }
  /**
   * Broadcast-mode counterpart to `_emitStreamPriority`. Runs when NO
   * StateViews are registered — streams fall back to broadcast mode
   * where up to `maxPerTick` pending ADDs per stream emit to ALL clients
   * each shared tick. DELETEs always flush (no cap).
   *
   * Emits directly to the shared-encode buffer: stream & element trees
   * are `isFiltered=true` so the main loop would otherwise skip them.
   * Runs AFTER the main loop so state / parent refs are already encoded
   * — stream ADD ops reference element refIds, which must be decodable.
   */
  _emitStreamBroadcast(buffer, it) {
    const streams = this.root.streamTrees;
    for (const stream of streams) {
      const s = stream;
      const tree = s[$changes];
      const streamRefId = s[$refId];
      if (streamRefId === void 0)
        continue;
      const st = s._stream;
      const deletes = st.broadcastDeletes;
      const pending = st.broadcastPending;
      const sent = st.sentBroadcast;
      const hasDeletes = deletes.size > 0;
      const hasAdds = pending.size > 0;
      const desc = tree.encDescriptor;
      const streamEncoder = desc.encoder;
      const streamMetadata = desc.metadata;
      if (hasDeletes || hasAdds) {
        buffer[it.offset++] = SWITCH_TO_STRUCTURE & 255;
        encode.number(buffer, streamRefId, it);
        if (hasDeletes) {
          for (const pos of deletes) {
            streamEncoder(this, buffer, tree, pos, OPERATION.DELETE, it, false, false, streamMetadata);
          }
          deletes.clear();
        }
        const max = st.maxPerTick;
        const emittedElements = [];
        let count = 0;
        const toDelete = [];
        for (const pos of pending) {
          if (count >= max)
            break;
          const element = s[$getByIndex](pos);
          if (element === void 0) {
            toDelete.push(pos);
            continue;
          }
          streamEncoder(this, buffer, tree, pos, OPERATION.ADD, it, false, false, streamMetadata);
          sent.add(pos);
          emittedElements.push(element);
          toDelete.push(pos);
          count++;
        }
        for (const pos of toDelete)
          pending.delete(pos);
        for (const element of emittedElements) {
          const elTree = element[$changes];
          if (elTree === void 0)
            continue;
          const elRefId = element[$refId];
          if (elRefId === void 0)
            continue;
          buffer[it.offset++] = SWITCH_TO_STRUCTURE & 255;
          encode.number(buffer, elRefId, it);
          const elDesc = elTree.encDescriptor;
          const elEncoder = elDesc.encoder;
          const elMetadata = elDesc.metadata;
          elTree.forEachLive((idx) => {
            if (Metadata.hasUnreliableAtIndex(elMetadata, idx))
              return;
            elEncoder(this, buffer, elTree, idx, OPERATION.ADD, it, false, false, elMetadata);
          });
        }
      }
      for (const pos of sent) {
        const element = s[$getByIndex](pos);
        if (element === void 0)
          continue;
        const elTree = element[$changes];
        if (elTree === void 0 || !elTree.has())
          continue;
        const elRefId = element[$refId];
        if (elRefId === void 0)
          continue;
        buffer[it.offset++] = SWITCH_TO_STRUCTURE & 255;
        encode.number(buffer, elRefId, it);
        const elDesc = elTree.encDescriptor;
        const elEncoder = elDesc.encoder;
        const elMetadata = elDesc.metadata;
        elTree.forEach((idx, op) => {
          if (idx < 0)
            return;
          if (Metadata.hasUnreliableAtIndex(elMetadata, idx))
            return;
          elEncoder(this, buffer, elTree, idx, op, it, false, false, elMetadata);
        });
      }
    }
  }
  /**
   * Walk every registered stream, pick up to `maxPerTick` positions from
   * this view's pending backlog (priority-sorted when the view supplies a
   * `streamPriority` callback), and hand each element to `view.add()`.
   * `view.add()` seeds `view.changes` so the subsequent drain emits both
   * the stream-link (position → refId) and the element's field data.
   *
   * Designed to run at the very top of `encodeView`, BEFORE the
   * view.changes drain loop.
   */
  _emitStreamPriority(view2) {
    const streams = this.root.streamTrees;
    if (streams.size === 0)
      return;
    const viewId = view2.id;
    for (const stream of streams) {
      const s = stream;
      const st = s._stream;
      const pending = st.pendingByView.get(viewId);
      if (pending === void 0 || pending.size === 0)
        continue;
      const perView = st.priorityByView?.get(viewId);
      const usePerView = perView !== void 0;
      const priority = st.priority;
      const max = st.maxPerTick;
      const positions = [];
      const stale = [];
      if (usePerView || priority !== void 0) {
        const bestPos = [];
        const bestScore = [];
        let filled = 0;
        for (const pos of pending) {
          const element = s[$getByIndex](pos);
          if (element === void 0) {
            stale.push(pos);
            continue;
          }
          const score = usePerView ? perView(element) : priority(view2, element);
          if (filled < max) {
            let j = filled++;
            while (j > 0 && bestScore[j - 1] < score) {
              bestScore[j] = bestScore[j - 1];
              bestPos[j] = bestPos[j - 1];
              j--;
            }
            bestScore[j] = score;
            bestPos[j] = pos;
          } else if (score > bestScore[max - 1]) {
            let j = max - 1;
            while (j > 0 && bestScore[j - 1] < score) {
              bestScore[j] = bestScore[j - 1];
              bestPos[j] = bestPos[j - 1];
              j--;
            }
            bestScore[j] = score;
            bestPos[j] = pos;
          }
        }
        for (let i = 0; i < filled; i++)
          positions.push(bestPos[i]);
      } else {
        for (const pos of pending) {
          if (positions.length >= max)
            break;
          positions.push(pos);
        }
      }
      for (const pos of stale)
        pending.delete(pos);
      const count = positions.length;
      let sent = st.sentByView.get(viewId);
      if (sent === void 0) {
        sent = /* @__PURE__ */ new Set();
        st.sentByView.set(viewId, sent);
      }
      for (let i = 0; i < count; i++) {
        const pos = positions[i];
        const element = s[$getByIndex](pos);
        if (element === void 0) {
          pending.delete(pos);
          continue;
        }
        view2._addImmediate(element);
        const elTree = element[$changes];
        if (elTree !== void 0) {
          const elRefId = element[$refId];
          let elChanges = view2.changes.get(elRefId);
          if (elChanges === void 0) {
            elChanges = /* @__PURE__ */ new Map();
            view2.changes.set(elRefId, elChanges);
          }
          const elMetadata = elTree.metadata;
          elTree.forEachLive((index) => {
            if (Metadata.hasUnreliableAtIndex(elMetadata, index))
              return;
            elChanges.set(index, OPERATION.ADD);
          });
        }
        pending.delete(pos);
        sent.add(pos);
      }
    }
  }
  discardChanges() {
    const list = this.root.changes;
    let current = list.next;
    const root = this.root;
    while (current) {
      const next = current.next;
      current.changeTree.endEncode();
      root.releaseNode(current);
      current = next;
    }
    list.next = void 0;
    list.tail = void 0;
  }
  discardUnreliableChanges() {
    const list = this.root.unreliableChanges;
    let current = list.next;
    const root = this.root;
    while (current) {
      const next = current.next;
      current.changeTree.endEncodeUnreliable();
      root.releaseNode(current);
      current = next;
    }
    list.next = void 0;
    list.tail = void 0;
  }
  tryEncodeTypeId(bytes, baseType, targetType, it) {
    const baseTypeId = this.context.getTypeId(baseType);
    const targetTypeId = this.context.getTypeId(targetType);
    if (targetTypeId === void 0) {
      console.warn(`@colyseus/schema WARNING: Class "${targetType.name}" is not registered on TypeRegistry - Please either tag the class with @entity or define a @type() field.`);
      return;
    }
    if (baseTypeId !== targetTypeId) {
      bytes[it.offset++] = TYPE_ID & 255;
      encode.number(bytes, targetTypeId, it);
    }
  }
  /**
   * True when the next `encode()` / `encodeView()` has something to send,
   * including a stream backlog still draining under `maxPerTick` while
   * the rest of the state is idle.
   */
  get hasChanges() {
    return this.root.changes.next !== void 0 || this._hasStreamBacklog();
  }
  // No StateView registered: streams drain through the shared encode().
  get _isStreamBroadcastMode() {
    return this.root.activeViews.size === 0 && this.root.streamTrees.size > 0;
  }
  _hasStreamBacklog() {
    const root = this.root;
    if (root.streamTrees.size === 0)
      return false;
    const broadcast = root.activeViews.size === 0;
    for (const stream of root.streamTrees) {
      if (broadcast ? streamHasBroadcastBacklog(stream) : streamHasViewBacklog(stream, root))
        return true;
    }
    return false;
  }
  get hasUnreliableChanges() {
    return this.root.unreliableChanges.next !== void 0;
  }
};
var DecodingWarning = class extends Error {
  constructor(message) {
    super(message);
    this.name = "DecodingWarning";
  }
};
var $refIdDescriptor = { value: 0, enumerable: false, writable: true };
var ReferenceTracker = class {
  //
  // Relation of refId => Schema structure
  // For direct access of structures during decoding time.
  //
  refs = /* @__PURE__ */ new Map();
  refCount = {};
  deletedRefs = /* @__PURE__ */ new Set();
  callbacks = {};
  nextUniqueId = 0;
  getNextUniqueId() {
    return this.nextUniqueId++;
  }
  // for decoding
  addRef(refId, ref, incrementCount = true) {
    this.refs.set(refId, ref);
    if (ref[$refId] === void 0) {
      $refIdDescriptor.value = refId;
      Object.defineProperty(ref, $refId, $refIdDescriptor);
    } else if (ref[$refId] !== refId) {
      ref[$refId] = refId;
    }
    if (incrementCount) {
      this.refCount[refId] = (this.refCount[refId] || 0) + 1;
    }
    if (this.deletedRefs.has(refId)) {
      this.deletedRefs.delete(refId);
    }
  }
  // for decoding
  removeRef(refId) {
    const refCount = this.refCount[refId];
    if (refCount === void 0) {
      try {
        throw new DecodingWarning("trying to remove refId that doesn't exist: " + refId);
      } catch (e) {
        console.warn(e);
      }
      return;
    }
    if (refCount === 0) {
      try {
        const ref = this.refs.get(refId);
        throw new DecodingWarning(`trying to remove refId '${refId}' with 0 refCount (${ref.constructor.name}: ${JSON.stringify(ref)})`);
      } catch (e) {
        console.warn(e);
      }
      return;
    }
    if ((this.refCount[refId] = refCount - 1) <= 0) {
      this.deletedRefs.add(refId);
    }
  }
  clearRefs() {
    this.refs.clear();
    this.deletedRefs.clear();
    this.callbacks = {};
    this.refCount = {};
  }
  // for decoding
  garbageCollectDeletedRefs() {
    this.deletedRefs.forEach((refId) => {
      if (this.refCount[refId] > 0) {
        return;
      }
      const ref = this.refs.get(refId);
      const metadata = ref.constructor[Symbol.metadata];
      if (metadata != null) {
        for (const index in metadata) {
          const field = metadata[index].name;
          const child = ref[field];
          if (typeof child === "object" && child) {
            const childRefId = child[$refId];
            if (childRefId !== void 0 && !this.deletedRefs.has(childRefId)) {
              this.removeRef(childRefId);
            }
          }
        }
      } else {
        if (typeof ref[$childType] === "function") {
          Array.from(ref.values()).forEach((child) => {
            const childRefId = child[$refId];
            if (childRefId !== void 0 && !this.deletedRefs.has(childRefId)) {
              this.removeRef(childRefId);
            }
          });
        }
      }
      this.refs.delete(refId);
      delete this.refCount[refId];
      delete this.callbacks[refId];
    });
    this.deletedRefs.clear();
  }
  addCallback(refId, fieldOrOperation, callback) {
    if (refId === void 0) {
      const name = typeof fieldOrOperation === "number" ? OPERATION[fieldOrOperation] : fieldOrOperation;
      throw new Error(`Can't addCallback on '${name}' (refId is undefined)`);
    }
    if (!this.callbacks[refId]) {
      this.callbacks[refId] = {};
    }
    if (!this.callbacks[refId][fieldOrOperation]) {
      this.callbacks[refId][fieldOrOperation] = [];
    }
    this.callbacks[refId][fieldOrOperation].push(callback);
    return () => this.removeCallback(refId, fieldOrOperation, callback);
  }
  removeCallback(refId, field, callback) {
    const index = this.callbacks?.[refId]?.[field]?.indexOf(callback);
    if (index !== void 0 && index !== -1) {
      spliceOne(this.callbacks[refId][field], index);
    }
  }
};
var Decoder = class {
  context;
  state;
  root;
  currentRefId = 0;
  triggerChanges;
  /**
   * @internal Non-null only while a `decodeResync()` walk is in progress:
   * collection refId → entry identities the payload visited (map string
   * keys; array/set/collection/stream indexes). Written by the collection
   * DecodeOperation functions, read by the post-decode sweep.
   */
  resyncVisited = null;
  /**
   * @internal Set when a structure had to be skipped during a resync
   * decode — visited data is incomplete, so the sweep must not delete.
   */
  resyncDamaged = false;
  constructor(root, context) {
    this.setState(root);
    this.context = context || new TypeContext(root.constructor);
  }
  setState(root) {
    this.state = root;
    this.root = new ReferenceTracker();
    this.root.addRef(0, root);
  }
  decode(bytes, it = { offset: 0 }, ref = this.state) {
    const allChanges = this.triggerChanges !== void 0 ? [] : null;
    const $root = this.root;
    const totalBytes = bytes.byteLength;
    let decoder = ref["constructor"][$decoder];
    this.currentRefId = 0;
    while (it.offset < totalBytes) {
      if (bytes[it.offset] == SWITCH_TO_STRUCTURE) {
        it.offset++;
        ref[$onDecodeEnd]?.();
        const nextRefId = decode.number(bytes, it);
        const nextRef = $root.refs.get(nextRefId);
        if (!nextRef) {
          console.error(`"refId" not found: ${nextRefId}`, { previousRef: ref, previousRefId: this.currentRefId });
          console.warn("Please report this issue to the developers.");
          this.skipCurrentStructure(bytes, it, totalBytes);
        } else {
          ref = nextRef;
          decoder = ref.constructor[$decoder];
          this.currentRefId = nextRefId;
        }
        continue;
      }
      const result = decoder(this, bytes, it, ref, allChanges);
      if (result === DEFINITION_MISMATCH) {
        console.warn("@colyseus/schema: definition mismatch");
        this.skipCurrentStructure(bytes, it, totalBytes);
        continue;
      }
    }
    ref[$onDecodeEnd]?.();
    if (this.resyncVisited !== null) {
      resyncSweep(this, allChanges);
    }
    if (allChanges !== null)
      this.triggerChanges?.(allChanges);
    $root.garbageCollectDeletedRefs();
    return allChanges;
  }
  /**
   * Full-snapshot reconciliation ("resync") decode.
   *
   * Behaves exactly like {@link decode}, plus: every collection entry the
   * payload does NOT mention is removed through the regular DELETE path —
   * `onRemove` callbacks fire with the real previous value and released
   * refs are garbage-collected. Use it to apply a rejoin/reconnect full
   * state over an existing decoded tree: DELETEs that happened while the
   * client was off the wire are reconciled as if they had been received,
   * while surviving entries keep their instance identity and callbacks.
   *
   * ONLY valid for full-snapshot payloads (`encodeAll` / `encodeAllView`
   * output). Calling it on an incremental patch would prune everything
   * the patch doesn't touch.
   */
  decodeResync(bytes, it = { offset: 0 }) {
    this.resyncVisited = /* @__PURE__ */ new Map();
    this.resyncDamaged = false;
    try {
      return this.decode(bytes, it);
    } finally {
      this.resyncVisited = null;
    }
  }
  skipCurrentStructure(bytes, it, totalBytes) {
    if (this.resyncVisited !== null) {
      this.resyncDamaged = true;
    }
    const nextIterator = { offset: it.offset };
    while (it.offset < totalBytes) {
      if (bytes[it.offset] === SWITCH_TO_STRUCTURE) {
        nextIterator.offset = it.offset + 1;
        if (this.root.refs.has(decode.number(bytes, nextIterator))) {
          break;
        }
      }
      it.offset++;
    }
  }
  getInstanceType(bytes, it, defaultType) {
    let type;
    if (bytes[it.offset] === TYPE_ID) {
      it.offset++;
      const type_id = decode.number(bytes, it);
      type = this.context.get(type_id);
    }
    return type || defaultType;
  }
  createInstanceOfType(type) {
    return type.initializeForDecoder();
  }
  removeChildRefs(ref, allChanges) {
    const needRemoveRef = typeof ref[$childType] !== "string";
    const refId = ref[$refId];
    ref.forEach((value, key) => {
      allChanges?.push({
        ref,
        refId,
        op: OPERATION.DELETE,
        field: key,
        value: void 0,
        previousValue: value
      });
      if (needRemoveRef) {
        this.root.removeRef(value[$refId]);
      }
    });
  }
};
var QuantizedDescriptor = schema({
  min: t.float64(),
  max: t.float64(),
  bits: t.uint8(),
  mode: t.uint8()
  // 0 = clamp, 1 = wrap
}, "QuantizedDescriptor");
var ReflectionField = schema({
  name: t.string(),
  type: t.string(),
  referencedType: t.number(),
  /** Primitive child of a collection (`array`/`map`/... of "string" etc.) —
   *  its own slot, replacing the legacy `"array:string"` colon packing. */
  childPrimitive: t.string(),
  /** Set only on `t.quantized()` fields (`.optional()` — no auto-instantiated
   *  default; its absence is the "not quantized" signal on decode). */
  quantized: t.ref(QuantizedDescriptor).optional()
}, "ReflectionField");
var ReflectionType = schema({
  id: t.number(),
  extendsId: t.number(),
  fields: t.array(ReflectionField)
}, "ReflectionType");
var Reflection = schema({
  types: t.array(ReflectionType),
  rootType: t.number()
}, "Reflection");
Reflection.encode = function(encoder, it = { offset: 0 }) {
  const context = encoder.context;
  const reflection = new Reflection();
  const reflectionEncoder = new Encoder(reflection);
  const rootType = context.schemas.get(encoder.state.constructor);
  if (rootType > 0) {
    reflection.rootType = rootType;
  }
  const includedTypeIds = /* @__PURE__ */ new Set();
  const pendingReflectionTypes = {};
  const addType = (type) => {
    if (type.extendsId === void 0 || includedTypeIds.has(type.extendsId)) {
      includedTypeIds.add(type.id);
      reflection.types.push(type);
      const deps = pendingReflectionTypes[type.id];
      if (deps !== void 0) {
        delete pendingReflectionTypes[type.id];
        deps.forEach((childType) => addType(childType));
      }
    } else {
      if (pendingReflectionTypes[type.extendsId] === void 0) {
        pendingReflectionTypes[type.extendsId] = [];
      }
      pendingReflectionTypes[type.extendsId].push(type);
    }
  };
  context.schemas.forEach((typeid, klass) => {
    const type = new ReflectionType();
    type.id = Number(typeid);
    const inheritFrom = Object.getPrototypeOf(klass);
    if (inheritFrom !== Schema) {
      type.extendsId = context.schemas.get(inheritFrom);
    }
    const metadata = klass[Symbol.metadata];
    if (metadata !== inheritFrom[Symbol.metadata]) {
      const numFields = metadata[$numFields] ?? -1;
      for (let index = 0; index <= numFields; index++) {
        const field = metadata[index];
        if (field === void 0) {
          continue;
        }
        const fieldName = field.name;
        if (!Object.prototype.hasOwnProperty.call(metadata, fieldName)) {
          continue;
        }
        const reflectionField = new ReflectionField();
        reflectionField.name = fieldName;
        let fieldType;
        if (typeof field.type === "string") {
          fieldType = field.type;
        } else if (isQuantizedType(field.type)) {
          const d = field.type.quantized;
          fieldType = "quantized";
          const desc = new QuantizedDescriptor();
          desc.min = d.min;
          desc.max = d.max;
          desc.bits = d.bits;
          desc.mode = d.wrap ? 1 : 0;
          reflectionField.quantized = desc;
        } else {
          let childTypeSchema;
          if (Schema.is(field.type)) {
            fieldType = "ref";
            childTypeSchema = field.type;
          } else {
            fieldType = Object.keys(field.type)[0];
            if (typeof field.type[fieldType] === "string") {
              reflectionField.childPrimitive = field.type[fieldType];
            } else {
              childTypeSchema = field.type[fieldType];
            }
          }
          reflectionField.referencedType = childTypeSchema ? context.getTypeId(childTypeSchema) : -1;
        }
        reflectionField.type = fieldType;
        type.fields.push(reflectionField);
      }
    }
    addType(type);
  });
  for (const typeid in pendingReflectionTypes) {
    pendingReflectionTypes[typeid].forEach((type) => reflection.types.push(type));
  }
  const buf = reflectionEncoder.encodeAll(it);
  return buf.slice(0, it.offset);
};
Reflection.decode = function(bytes, it) {
  const reflection = new Reflection();
  const reflectionDecoder = new Decoder(reflection);
  reflectionDecoder.decode(bytes, it);
  const typeContext = new TypeContext();
  reflection.types.forEach((reflectionType) => {
    const parentClass = typeContext.get(reflectionType.extendsId) ?? Schema;
    const schema2 = class _ extends parentClass {
    };
    TypeContext.register(schema2);
    typeContext.add(schema2, reflectionType.id);
  }, {});
  const addFields = (metadata, reflectionType, parentFieldIndex) => {
    reflectionType.fields.forEach((field, i) => {
      const fieldIndex = parentFieldIndex + i;
      if (field.quantized !== void 0) {
        const q = field.quantized;
        Metadata.addField(metadata, fieldIndex, field.name, {
          quantized: resolveQuantize({ min: q.min, max: q.max, bits: q.bits, mode: q.mode === 1 ? "wrap" : "clamp" })
        });
      } else if (field.referencedType !== void 0) {
        const fieldType = field.type;
        const refType = typeContext.get(field.referencedType) ?? field.childPrimitive;
        if (fieldType === "ref") {
          Metadata.addField(metadata, fieldIndex, field.name, refType);
        } else {
          Metadata.addField(metadata, fieldIndex, field.name, { [fieldType]: refType });
        }
      } else {
        Metadata.addField(metadata, fieldIndex, field.name, field.type);
      }
    });
  };
  reflection.types.forEach((reflectionType) => {
    const schema2 = typeContext.get(reflectionType.id);
    const metadata = Metadata.initialize(schema2);
    const inheritedTypes = [];
    let parentType = reflectionType;
    do {
      inheritedTypes.push(parentType);
      parentType = reflection.types.find((t2) => t2.id === parentType.extendsId);
    } while (parentType);
    let parentFieldIndex = 0;
    inheritedTypes.reverse().forEach((reflectionType2) => {
      addFields(metadata, reflectionType2, parentFieldIndex);
      parentFieldIndex += reflectionType2.fields.length;
    });
  });
  const state = new (typeContext.get(reflection.rootType || 0))();
  return new Decoder(state, typeContext);
};
Reflection.makeEncodable = function(ctor) {
  const metadata = ctor[Symbol.metadata];
  if (!metadata)
    return ctor;
  const numFields = metadata[$numFields];
  if (numFields === void 0)
    return ctor;
  for (let i = 0; i <= numFields; i++) {
    const field = metadata[i];
    if (!field)
      continue;
    Metadata.defineField(ctor, metadata, i, field.name, field.type);
  }
  if (Object.prototype.hasOwnProperty.call(ctor, $encodeDescriptor)) {
    delete ctor[$encodeDescriptor];
  }
  return ctor;
};
function getDecoderStateCallbacks(decoder) {
  const $root = decoder.root;
  const callbacks = $root.callbacks;
  const onAddCalls = /* @__PURE__ */ new WeakMap();
  let currentOnAddCallback;
  decoder.triggerChanges = function(allChanges) {
    const uniqueRefIds = /* @__PURE__ */ new Set();
    for (let i = 0, l = allChanges.length; i < l; i++) {
      const change = allChanges[i];
      const refId = change.refId;
      const ref = change.ref;
      const $callbacks = callbacks[refId];
      if (!$callbacks) {
        continue;
      }
      if ((change.op & OPERATION.DELETE) === OPERATION.DELETE && Schema.isSchema(change.previousValue)) {
        const deleteCallbacks = callbacks[change.previousValue[$refId]]?.[OPERATION.DELETE];
        for (let i2 = deleteCallbacks?.length - 1; i2 >= 0; i2--) {
          deleteCallbacks[i2]();
        }
      }
      if (Schema.isSchema(ref)) {
        if (!uniqueRefIds.has(refId)) {
          const replaceCallbacks = $callbacks?.[OPERATION.REPLACE];
          for (let i2 = replaceCallbacks?.length - 1; i2 >= 0; i2--) {
            replaceCallbacks[i2]();
          }
        }
        if ($callbacks.hasOwnProperty(change.field)) {
          const fieldCallbacks = $callbacks[change.field];
          for (let i2 = fieldCallbacks?.length - 1; i2 >= 0; i2--) {
            fieldCallbacks[i2](change.value, change.previousValue);
          }
        }
      } else {
        if ((change.op & OPERATION.DELETE) === OPERATION.DELETE) {
          if (change.previousValue !== void 0) {
            const deleteCallbacks = $callbacks[OPERATION.DELETE];
            for (let i2 = deleteCallbacks?.length - 1; i2 >= 0; i2--) {
              deleteCallbacks[i2](change.previousValue, change.dynamicIndex ?? change.field);
            }
          }
          if ((change.op & OPERATION.ADD) === OPERATION.ADD) {
            const addCallbacks = $callbacks[OPERATION.ADD];
            for (let i2 = addCallbacks?.length - 1; i2 >= 0; i2--) {
              addCallbacks[i2](change.value, change.dynamicIndex ?? change.field);
            }
          }
        } else if ((change.op & OPERATION.ADD) === OPERATION.ADD && change.previousValue !== change.value) {
          const addCallbacks = $callbacks[OPERATION.ADD];
          for (let i2 = addCallbacks?.length - 1; i2 >= 0; i2--) {
            addCallbacks[i2](change.value, change.dynamicIndex ?? change.field);
          }
        }
        if (change.value !== change.previousValue && (change.value !== void 0 || change.previousValue !== void 0)) {
          const replaceCallbacks = $callbacks[OPERATION.REPLACE];
          for (let i2 = replaceCallbacks?.length - 1; i2 >= 0; i2--) {
            replaceCallbacks[i2](change.value, change.dynamicIndex ?? change.field);
          }
        }
      }
      uniqueRefIds.add(refId);
    }
  };
  function getProxy(metadataOrType, context) {
    let metadata = context.instance?.constructor[Symbol.metadata] || metadataOrType;
    let isCollection = context.instance && typeof context.instance["forEach"] === "function" || metadataOrType && !Schema.is(metadataOrType);
    if (metadata && !isCollection) {
      const onAddListen = function(ref, prop, callback, immediate) {
        if (immediate && context.instance[prop] !== void 0 && !onAddCalls.has(currentOnAddCallback)) {
          callback(context.instance[prop], void 0);
        }
        return $root.addCallback(ref[$refId], prop, callback);
      };
      return new Proxy({
        listen: function listen(prop, callback, immediate = true) {
          if (context.instance) {
            return onAddListen(context.instance, prop, callback, immediate);
          } else {
            let detachCallback = () => {
            };
            context.onInstanceAvailable((ref, existing) => {
              detachCallback = onAddListen(ref, prop, callback, immediate && existing && !onAddCalls.has(currentOnAddCallback));
            });
            return () => detachCallback();
          }
        },
        onChange: function onChange(callback) {
          return $root.addCallback(context.instance[$refId], OPERATION.REPLACE, callback);
        },
        //
        // TODO: refactor `bindTo()` implementation.
        // There is room for improvement.
        //
        bindTo: function bindTo(targetObject, properties) {
          if (!properties) {
            properties = Object.keys(metadata).map((index) => metadata[index].name);
          }
          return $root.addCallback(context.instance[$refId], OPERATION.REPLACE, () => {
            properties.forEach((prop) => targetObject[prop] = context.instance[prop]);
          });
        }
      }, {
        get(target, prop) {
          const metadataField = metadata[metadata[prop]];
          if (metadataField) {
            const instance = context.instance?.[prop];
            const onInstanceAvailable = ((callback) => {
              const unbind = $(context.instance).listen(prop, (value, _) => {
                callback(value, false);
                unbind?.();
              }, false);
              if (instance?.[$refId] !== void 0) {
                callback(instance, true);
              }
            });
            return getProxy(metadataField.type, {
              // make sure refId is available, otherwise need to wait for the instance to be available.
              instance: instance?.[$refId] !== void 0 && instance,
              parentInstance: context.instance,
              onInstanceAvailable
            });
          } else {
            return target[prop];
          }
        },
        has(target, prop) {
          return metadata[prop] !== void 0;
        },
        set(_, _1, _2) {
          throw new Error("not allowed");
        },
        deleteProperty(_, _1) {
          throw new Error("not allowed");
        }
      });
    } else {
      const onAdd = function(ref, callback, immediate) {
        if (immediate) {
          ref.forEach((v, k) => callback(v, k));
        }
        return $root.addCallback(ref[$refId], OPERATION.ADD, (value, key) => {
          onAddCalls.set(callback, true);
          currentOnAddCallback = callback;
          callback(value, key);
          onAddCalls.delete(callback);
          currentOnAddCallback = void 0;
        });
      };
      const onRemove = function(ref, callback) {
        return $root.addCallback(ref[$refId], OPERATION.DELETE, callback);
      };
      const onChange = function(ref, callback) {
        return $root.addCallback(ref[$refId], OPERATION.REPLACE, callback);
      };
      return new Proxy({
        onAdd: function(callback, immediate = true) {
          if (context.instance) {
            return onAdd(context.instance, callback, immediate && !onAddCalls.has(currentOnAddCallback));
          } else if (context.onInstanceAvailable) {
            let detachCallback = () => {
            };
            context.onInstanceAvailable((ref, existing) => {
              detachCallback = onAdd(ref, callback, immediate && existing && !onAddCalls.has(currentOnAddCallback));
            });
            return () => detachCallback();
          }
        },
        onRemove: function(callback) {
          if (context.instance) {
            return onRemove(context.instance, callback);
          } else if (context.onInstanceAvailable) {
            let detachCallback = () => {
            };
            context.onInstanceAvailable((ref) => {
              detachCallback = onRemove(ref, callback);
            });
            return () => detachCallback();
          }
        },
        onChange: function(callback) {
          if (context.instance) {
            return onChange(context.instance, callback);
          } else if (context.onInstanceAvailable) {
            let detachCallback = () => {
            };
            context.onInstanceAvailable((ref) => {
              detachCallback = onChange(ref, callback);
            });
            return () => detachCallback();
          }
        }
      }, {
        get(target, prop) {
          if (!target[prop]) {
            throw new Error(`Can't access '${prop}' through callback proxy. access the instance directly.`);
          }
          return target[prop];
        },
        has(target, prop) {
          return target[prop] !== void 0;
        },
        set(_, _1, _2) {
          throw new Error("not allowed");
        },
        deleteProperty(_, _1) {
          throw new Error("not allowed");
        }
      });
    }
  }
  function $(instance) {
    return getProxy(void 0, { instance });
  }
  return $;
}
function getRawChangesCallback(decoder, callback) {
  decoder.triggerChanges = callback;
}
var StateCallbackStrategy = class {
  decoder;
  uniqueRefIds = /* @__PURE__ */ new Set();
  isTriggering = false;
  constructor(decoder) {
    this.decoder = decoder;
    this.decoder.triggerChanges = this.triggerChanges.bind(this);
  }
  get callbacks() {
    return this.decoder.root.callbacks;
  }
  get state() {
    return this.decoder.state;
  }
  addCallback(refId, operationOrProperty, handler) {
    const $root = this.decoder.root;
    return $root.addCallback(refId, operationOrProperty, handler);
  }
  addCallbackOrWaitCollectionAvailable(instance, propertyName, operation, handler, immediate = true) {
    let removeHandler = () => {
    };
    const removeOnAdd = () => removeHandler();
    const collection = instance[propertyName];
    if (!collection || collection[$refId] === void 0) {
      let removePropertyCallback;
      removePropertyCallback = this.addCallback(instance[$refId], propertyName, (value, _) => {
        if (value !== null && value !== void 0) {
          removePropertyCallback();
          removeHandler = this.addCallback(value[$refId], operation, handler);
        }
      });
      removeHandler = removePropertyCallback;
      return removeOnAdd;
    } else {
      immediate = immediate && this.isTriggering === false;
      if (operation === OPERATION.ADD && immediate) {
        collection.forEach((value, key) => {
          handler(value, key);
        });
      }
      return this.addCallback(collection[$refId], operation, handler);
    }
  }
  listen(...args) {
    if (typeof args[0] === "string") {
      return this.listenInstance(this.state, args[0], args[1], args[2]);
    } else {
      return this.listenInstance(args[0], args[1], args[2], args[3]);
    }
  }
  listenInstance(instance, propertyName, handler, immediate = true) {
    immediate = immediate && this.isTriggering === false;
    const currentValue = instance[propertyName];
    if (immediate && currentValue !== null && currentValue !== void 0) {
      handler(currentValue, void 0);
    }
    return this.addCallback(instance[$refId], propertyName, handler);
  }
  onChange(...args) {
    if (args.length === 2 && typeof args[0] !== "string") {
      const instance = args[0];
      const handler = args[1];
      return this.addCallback(instance[$refId], OPERATION.REPLACE, handler);
    }
    if (typeof args[0] === "string") {
      return this.addCallbackOrWaitCollectionAvailable(this.state, args[0], OPERATION.REPLACE, args[1]);
    } else {
      return this.addCallbackOrWaitCollectionAvailable(args[0], args[1], OPERATION.REPLACE, args[2]);
    }
  }
  onAdd(...args) {
    if (typeof args[0] === "string") {
      return this.addCallbackOrWaitCollectionAvailable(this.state, args[0], OPERATION.ADD, args[1], args[2] !== false);
    } else {
      return this.addCallbackOrWaitCollectionAvailable(args[0], args[1], OPERATION.ADD, args[2], args[3] !== false);
    }
  }
  onRemove(...args) {
    if (typeof args[0] === "string") {
      return this.addCallbackOrWaitCollectionAvailable(this.state, args[0], OPERATION.DELETE, args[1]);
    } else {
      return this.addCallbackOrWaitCollectionAvailable(args[0], args[1], OPERATION.DELETE, args[2]);
    }
  }
  /**
   * Bind properties from a Schema instance to a target object.
   * Changes will be automatically reflected on the target object.
   */
  bindTo(from, to, properties, immediate = true) {
    const metadata = from.constructor[Symbol.metadata];
    if (!properties) {
      properties = Object.keys(metadata).filter((key) => !isNaN(Number(key))).map((index) => metadata[index].name);
    }
    const action = () => {
      for (const prop of properties) {
        const fromValue = from[prop];
        if (fromValue !== void 0) {
          to[prop] = fromValue;
        }
      }
    };
    if (immediate) {
      action();
    }
    return this.addCallback(from[$refId], OPERATION.REPLACE, action);
  }
  triggerChanges(allChanges) {
    this.uniqueRefIds.clear();
    this.isTriggering = true;
    for (let i = 0, l = allChanges.length; i < l; i++) {
      const change = allChanges[i];
      const refId = change.refId;
      const ref = change.ref;
      const $callbacks = this.callbacks[refId];
      if (!$callbacks) {
        continue;
      }
      if ((change.op & OPERATION.DELETE) === OPERATION.DELETE && Schema.isSchema(change.previousValue)) {
        const childRefId = change.previousValue[$refId];
        const deleteCallbacks = this.callbacks[childRefId]?.[OPERATION.DELETE];
        if (deleteCallbacks) {
          for (let j = deleteCallbacks.length - 1; j >= 0; j--) {
            try {
              deleteCallbacks[j]();
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
      if (Schema.isSchema(ref)) {
        if (!this.uniqueRefIds.has(refId)) {
          const replaceCallbacks = $callbacks[OPERATION.REPLACE];
          if (replaceCallbacks) {
            for (let j = replaceCallbacks.length - 1; j >= 0; j--) {
              try {
                replaceCallbacks[j]();
              } catch (e) {
                console.error(e);
              }
            }
          }
        }
        const fieldCallbacks = $callbacks[change.field];
        if (fieldCallbacks) {
          for (let j = fieldCallbacks.length - 1; j >= 0; j--) {
            try {
              fieldCallbacks[j](change.value, change.previousValue);
            } catch (e) {
              console.error(e);
            }
          }
        }
      } else {
        const dynamicIndex = change.dynamicIndex ?? change.field;
        if ((change.op & OPERATION.DELETE) === OPERATION.DELETE) {
          if (change.previousValue !== void 0) {
            const deleteCallbacks = $callbacks[OPERATION.DELETE];
            if (deleteCallbacks) {
              for (let j = deleteCallbacks.length - 1; j >= 0; j--) {
                try {
                  deleteCallbacks[j](change.previousValue, dynamicIndex);
                } catch (e) {
                  console.error(e);
                }
              }
            }
          }
          if ((change.op & OPERATION.ADD) === OPERATION.ADD) {
            const addCallbacks = $callbacks[OPERATION.ADD];
            if (addCallbacks) {
              for (let j = addCallbacks.length - 1; j >= 0; j--) {
                try {
                  addCallbacks[j](change.value, dynamicIndex);
                } catch (e) {
                  console.error(e);
                }
              }
            }
          }
        } else if ((change.op & OPERATION.ADD) === OPERATION.ADD && change.previousValue !== change.value) {
          const addCallbacks = $callbacks[OPERATION.ADD];
          if (addCallbacks) {
            for (let j = addCallbacks.length - 1; j >= 0; j--) {
              try {
                addCallbacks[j](change.value, dynamicIndex);
              } catch (e) {
                console.error(e);
              }
            }
          }
        }
        if (change.value !== change.previousValue) {
          const replaceCallbacks = $callbacks[OPERATION.REPLACE];
          if (replaceCallbacks) {
            for (let j = replaceCallbacks.length - 1; j >= 0; j--) {
              try {
                replaceCallbacks[j](dynamicIndex, change.value);
              } catch (e) {
                console.error(e);
              }
            }
          }
        }
      }
      this.uniqueRefIds.add(refId);
    }
    this.isTriggering = false;
  }
};
var Callbacks = {
  /**
   * Get the new callbacks standard API.
   *
   * Usage:
   * ```ts
   * const callbacks = Callbacks.get(roomOrDecoder);
   *
   * // Listen to property changes
   * callbacks.listen("currentTurn", (currentValue, previousValue) => { ... });
   *
   * // Listen to collection additions
   * callbacks.onAdd("entities", (entity, sessionId) => {
   *     // Nested property listening
   *     callbacks.listen(entity, "hp", (currentHp, previousHp) => { ... });
   * });
   *
   * // Listen to collection removals
   * callbacks.onRemove("entities", (entity, sessionId) => { ... });
   *
   * // Listen to any property change on an instance
   * callbacks.onChange(entity, () => { ... });
   *
   * // Bind properties to another object
   * callbacks.bindTo(player, playerVisual);
   * ```
   *
   * @param roomOrDecoder - Room or Decoder instance to get the callbacks for.
   * @returns the new callbacks standard API.
   */
  get(roomOrDecoder) {
    if (roomOrDecoder instanceof Decoder) {
      return new StateCallbackStrategy(roomOrDecoder);
    } else if ("decoder" in roomOrDecoder.serializer) {
      return new StateCallbackStrategy(roomOrDecoder.serializer.decoder);
    } else {
      throw new Error("Invalid room or decoder");
    }
  },
  /**
   * Get the legacy callbacks API.
   *
   * We aim to deprecate this API on 1.0, and iterate on improving Callbacks.get() API.
   *
   * @param roomOrDecoder - Room or Decoder instance to get the legacy callbacks for.
   * @returns the legacy callbacks API.
   */
  getLegacy(roomOrDecoder) {
    if (roomOrDecoder instanceof Decoder) {
      return getDecoderStateCallbacks(roomOrDecoder);
    } else if ("decoder" in roomOrDecoder.serializer) {
      return getDecoderStateCallbacks(roomOrDecoder.serializer.decoder);
    }
    throw new Error("Invalid room or decoder");
  },
  getRawChanges(decoder, callback) {
    return getRawChangesCallback(decoder, callback);
  }
};
registerType("map", { constructor: MapSchema });
registerType("array", { constructor: ArraySchema });
registerType("set", { constructor: SetSchema });
registerType("collection", { constructor: CollectionSchema });

export {
  __commonJS,
  __toESM,
  $refId,
  $changes,
  $values,
  $numFields,
  encode,
  decode,
  getEncodeDescriptor,
  t,
  schema,
  Encoder,
  Decoder,
  Reflection,
  getDecoderStateCallbacks,
  Callbacks
};

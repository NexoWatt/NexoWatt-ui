'use strict';

/**
 * NexoLogic – Node/Graph runtime engine.
 *
 * Eigenschaften:
 * - Event-driven: reagiert sofort auf stateChange (DP Eingang).
 * - Timer-assistiert: Zeit-/Schedule-Bausteine triggern sich selbst (setTimeout),
 *   damit Ausgänge auch ohne weitere Eingangsänderung sauber umschalten können.
 *
 * Hinweis:
 * - Bewusst schlank gehalten (ohne externe Dependencies).
 */

class NexoLogicEngine {
  constructor(adapter) {
    this.adapter = adapter;
    this.runners = [];
    this._subscribed = new Set();
    this._dpToInputs = new Map(); // dpId -> array of { runner, nodeId }
    this._stopped = false;
  }

  async stop() {
    this._stopped = true;
    try {
      for (const r of this.runners) {
        try { if (r && typeof r.stop === 'function') r.stop(); } catch (_e) {}
      }
    } catch (_e0) {}

    // best-effort unsubscribe
    try {
      for (const id of this._subscribed) {
        try { await this.adapter.unsubscribeForeignStatesAsync(id); } catch (_e) {}
      }
    } catch (_e2) {}

    this._subscribed.clear();
    this._dpToInputs.clear();
    this.runners = [];
  }

  async init(config) {
    // Reload
    await this.stop();
    this._stopped = false;

    const cfg = (config && typeof config === 'object') ? config : {};
    const graphs = Array.isArray(cfg.graphs) ? cfg.graphs : [];

    this.runners = graphs
      .filter(g => g && typeof g === 'object' && (g.enabled !== false))
      .map(g => new GraphRunner(this.adapter, g));

    // Build dp subscriptions and prime initial values
    for (const runner of this.runners) {
      const dpInputs = runner.getDpInputs();
      for (const it of dpInputs) {
        const dpId = String(it.dpId || '').trim();
        if (!dpId) continue;

        if (!this._dpToInputs.has(dpId)) this._dpToInputs.set(dpId, []);
        this._dpToInputs.get(dpId).push({ runner, nodeId: it.nodeId });

        if (!this._subscribed.has(dpId)) {
          this._subscribed.add(dpId);
          try { await this.adapter.subscribeForeignStatesAsync(dpId); } catch (_e) {}
        }

        // Prime initial value
        try {
          const st = await this.adapter.getForeignStateAsync(dpId);
          if (st && st.val !== undefined) {
            runner.setDpInputValue(it.nodeId, st.val);
          }
        } catch (_ePrime) {
          // ignore
        }
      }

      // One initial evaluation pass so constants propagate + timer nodes arm themselves.
      try { runner.evaluateAll(); } catch (_eEval) {}
    }
  }

  handleStateChange(id, state) {
    if (this._stopped) return;
    const dpId = String(id || '').trim();
    if (!dpId) return;

    const mappings = this._dpToInputs.get(dpId);
    if (!mappings || !mappings.length) return;

    const val = state ? state.val : undefined;

    for (const m of mappings) {
      try {
        m.runner.setDpInputValue(m.nodeId, val);
      } catch (_e) {
        // ignore
      }
    }
  }
}


// -----------------------------
// Graph Runner (single graph)
// -----------------------------

class GraphRunner {
  constructor(adapter, graph) {
    this.adapter = adapter;
    this.graph = graph;
    this.id = String(graph.id || 'main');
    this.nodes = new Map(); // nodeId -> node
    this.links = Array.isArray(graph.links) ? graph.links : [];
    this.adj = new Map(); // fromKey -> array of { nodeId, port }

    this._nodeInternal = new Map(); // nodeId -> internal state
    this._dpInputNodes = []; // { nodeId, dpId }

    this._build();
  }

  stop() {
    // Clear any running timers/intervals
    try {
      for (const st of this._nodeInternal.values()) {
        if (!st || typeof st !== 'object') continue;
        if (st.t) { try { clearTimeout(st.t); } catch (_e) {} st.t = null; }
        if (st.t2) { try { clearTimeout(st.t2); } catch (_e2) {} st.t2 = null; }
        if (st.i) { try { clearInterval(st.i); } catch (_e3) {} st.i = null; }
        // edge-pulse timers etc.
        if (st.pulseTimers && typeof st.pulseTimers === 'object') {
          try {
            for (const k of Object.keys(st.pulseTimers)) {
              try { clearTimeout(st.pulseTimers[k]); } catch (_ePT) {}
            }
          } catch (_ePT2) {}
          st.pulseTimers = null;
        }
      }
    } catch (_e4) {}
  }

  _build() {
    const nodesArr = Array.isArray(this.graph.nodes) ? this.graph.nodes : [];
    for (const n of nodesArr) {
      if (!n || typeof n !== 'object') continue;
      const id = String(n.id || '').trim();
      const type = String(n.type || '').trim();
      if (!id || !type) continue;

      const def = NODE_TYPES[type] || NODE_TYPES_ALIASES[type];
      if (!def) continue;

      const node = {
        id,
        type,
        enabled: n.enabled !== false,
        params: (n.params && typeof n.params === 'object') ? n.params : {},
        // runtime values
        in: {},
        out: {},
      };

      // init ports
      for (const p of def.inputs) node.in[p] = undefined;
      for (const p of def.outputs) node.out[p] = undefined;

      this.nodes.set(id, node);

      if (type === 'dp_in') {
        const dpId = String(node.params.dpId || '').trim();
        if (dpId) this._dpInputNodes.push({ nodeId: id, dpId });
      }
    }

    // Build adjacency from links
    for (const l of this.links) {
      if (!l || typeof l !== 'object') continue;
      const from = l.from || {};
      const to = l.to || {};
      const fromNode = String(from.node || '').trim();
      const fromPort = String(from.port || '').trim();
      const toNode = String(to.node || '').trim();
      const toPort = String(to.port || '').trim();
      if (!fromNode || !fromPort || !toNode || !toPort) continue;
      if (!this.nodes.has(fromNode) || !this.nodes.has(toNode)) continue;

      const key = `${fromNode}:${fromPort}`;
      if (!this.adj.has(key)) this.adj.set(key, []);
      this.adj.get(key).push({ nodeId: toNode, port: toPort });
    }
  }

  getDpInputs() {
    return this._dpInputNodes.slice();
  }

  setDpInputValue(nodeId, value) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // dp_in: value comes from subscription -> write directly to out.out
    const cast = String(node.params && node.params.cast ? node.params.cast : 'auto').toLowerCase();
    const v = castValue(value, cast);

    const prev = node.out.out;
    node.out.out = v;
    if (!isEqual(prev, v)) {
      this._propagateFrom(nodeId, 'out');
    }
  }

  evaluateAll() {
    // Evaluate all nodes once so constants propagate + timer nodes arm themselves.
    for (const [id, node] of this.nodes.entries()) {
      if (!node.enabled) continue;
      const def = NODE_TYPES[node.type] || NODE_TYPES_ALIASES[node.type];
      if (!def) continue;
      if (node.type === 'dp_in') continue; // values come from subscriptions
      this._evalNode(id);
    }
  }

  _propagateFrom(fromNodeId, fromPort) {
    const q = [];
    const seen = new Set();

    // start from this output
    q.push({ fromNodeId, fromPort });

    let guard = 0;
    while (q.length) {
      if (++guard > 8000) {
        // guard against accidental loops
        break;
      }
      const it = q.shift();
      const outKey = `${it.fromNodeId}:${it.fromPort}`;
      const targets = this.adj.get(outKey) || [];
      const fromNode = this.nodes.get(it.fromNodeId);
      if (!fromNode) continue;
      const outVal = fromNode.out[it.fromPort];

      for (const t of targets) {
        const toNode = this.nodes.get(t.nodeId);
        if (!toNode || !toNode.enabled) continue;

        const prevIn = toNode.in[t.port];
        toNode.in[t.port] = outVal;
        if (!isEqual(prevIn, outVal)) {
          const key = `${t.nodeId}`;
          // schedule re-eval
          if (!seen.has(key)) {
            seen.add(key);
            this._evalNode(t.nodeId, q);
          } else {
            // even if already seen, still evaluate if input changed multiple times in chain
            this._evalNode(t.nodeId, q);
          }
        }
      }
    }
  }

  _evalNode(nodeId, queue /* optional */) {
    const node = this.nodes.get(nodeId);
    if (!node || !node.enabled) return;

    const def = NODE_TYPES[node.type] || NODE_TYPES_ALIASES[node.type];
    if (!def) return;

    const internal = this._nodeInternal.get(nodeId) || {};
    const res = def.compute({
      in: node.in,
      params: node.params,
      out: node.out,
      internal,
      adapter: this.adapter,
      nodeId,
      runner: this,
    });

    this._nodeInternal.set(nodeId, (res && res.internal) ? res.internal : internal);

    // If outputs changed: propagate
    if (res && res.out && typeof res.out === 'object') {
      for (const p of def.outputs) {
        if (!(p in res.out)) continue;
        const prev = node.out[p];
        const next = res.out[p];
        node.out[p] = next;
        if (!isEqual(prev, next)) {
          if (queue) queue.push({ fromNodeId: nodeId, fromPort: p });
          else this._propagateFrom(nodeId, p);
        }
      }
    }

    // side-effects (DP write etc.)
    if (res && typeof res.sideEffect === 'function') {
      try { res.sideEffect(); } catch (_e) {}
    }
  }
}


// -----------------------------
// Helpers (conversion, parsing)
// -----------------------------

const toBool = (v) => {
  if (v === true) return true;
  if (v === false) return false;
  if (v === 1 || v === '1') return true;
  if (v === 0 || v === '0') return false;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (!s) return false;
    if (['true','on','ein','yes','y','ja','an'].includes(s)) return true;
    if (['false','off','aus','no','n','nein'].includes(s)) return false;
    // numeric
    const n = Number(s.replace(',', '.'));
    if (Number.isFinite(n)) return n !== 0;
  }
  if (typeof v === 'number') return v !== 0;
  return !!v;
};

const toNum = (v, def = 0) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return def;
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : def;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const isEqual = (a, b) => {
  // primitives + NaN handling
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return a === b;
};

const castValue = (value, cast) => {
  const c = String(cast || 'auto').toLowerCase();
  if (c === 'bool' || c === 'boolean') return toBool(value);
  if (c === 'number' || c === 'num') return toNum(value, 0);
  if (c === 'string' || c === 'text') return (value === undefined || value === null) ? '' : String(value);

  // auto:
  // - preserve booleans
  // - numeric strings -> number
  // - keep everything else as-is
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const s = value.trim();
    const n = Number(s.replace(',', '.'));
    if (s && Number.isFinite(n)) return n;
    // true/false strings
    const sl = s.toLowerCase();
    if (['true','on','ein','yes','y','ja','an'].includes(sl)) return true;
    if (['false','off','aus','no','n','nein'].includes(sl)) return false;
    return value;
  }
  return value;
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const parseTimeToMin = (s) => {
  if (s === null || s === undefined) return null;
  const str = String(s).trim();
  if (!str) return null;
  const m = str.match(/^(\d{1,2})[:.](\d{1,2})$/);
  if (!m) return null;
  const hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return (hh * 60) + mm;
};

const parseDays = (s) => {
  // returns Set of 1..7 (Mo=1..So=7)
  const out = new Set();
  if (s === null || s === undefined) return out;
  const str = String(s).trim();
  if (!str) return out;

  const map = {
    mo: 1, montag: 1,
    di: 2, dienstag: 2,
    mi: 3, mittwoch: 3,
    do: 4, donnerstag: 4,
    fr: 5, freitag: 5,
    sa: 6, samstag: 6,
    so: 7, sonntag: 7,
  };

  const parts = str
    .split(/[,; ]+/)
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);

  for (const p of parts) {
    if (map[p]) { out.add(map[p]); continue; }
    const n = parseInt(p, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 7) out.add(n);
  }
  return out;
};

const nowLocal = () => new Date();

const getIsoDay = (d) => {
  // JS: 0=So..6=Sa -> ISO: 1=Mo..7=So
  const dow = d.getDay();
  return (dow === 0) ? 7 : dow;
};

const scheduleNextMinuteTick = ({ internal, runner, nodeId }) => {
  const now = Date.now();
  const msToNextMinute = 60_000 - (now % 60_000);
  const delay = Math.max(250, Math.min(60_000, msToNextMinute + 10));
  if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} }
  internal.t = setTimeout(() => {
    try { runner._evalNode(nodeId); } catch (_e2) {}
  }, delay);
};

const triggerShortPulse = ({ internal, key, widthMs, runner, nodeId }) => {
  const w = Math.max(10, Math.min(2000, Math.round(toNum(widthMs, 60))));
  // store pulses under internal.pulses map
  internal.pulses = (internal.pulses && typeof internal.pulses === 'object') ? internal.pulses : {};
  internal.pulses[key] = true;

  // per-key timer
  internal.pulseTimers = (internal.pulseTimers && typeof internal.pulseTimers === 'object') ? internal.pulseTimers : {};
  if (internal.pulseTimers[key]) {
    try { clearTimeout(internal.pulseTimers[key]); } catch (_e) {}
  }
  internal.pulseTimers[key] = setTimeout(() => {
    try {
      if (internal.pulses) internal.pulses[key] = false;
      runner._evalNode(nodeId);
    } catch (_e2) {}
  }, w);
};


// -----------------------------
// Node type library (runtime)
// -----------------------------

const NODE_TYPES = {
  // ----- IO
  dp_in: {
    inputs: [],
    outputs: ['out'],
    compute: ({ out }) => ({ out: { out: out.out } }),
  },

  dp_out: {
    inputs: ['in'],
    outputs: [],
    compute: ({ in: inp, params, internal, adapter }) => {
      const dpId = String(params.dpId || '').trim();
      if (!dpId) return { out: {}, internal };

      const ack = toBool(params.ack);
      const minIntervalMs = Math.max(0, Math.min(60_000, Math.round(toNum(params.minIntervalMs, 100))));
      const val = inp.in;

      const now = Date.now();
      const lastWrittenVal = internal.lastWrittenVal;
      const lastWriteTs = Number.isFinite(internal.lastWriteTs) ? internal.lastWriteTs : 0;

      const changed = !isEqual(lastWrittenVal, val);
      const intervalOk = (minIntervalMs <= 0) ? true : ((now - lastWriteTs) >= minIntervalMs);

      // If the value is back to the already-written one: cancel any pending write.
      if (!changed && internal.t) {
        try { clearTimeout(internal.t); } catch (_e) {}
        internal.t = null;
        internal.pendingVal = undefined;
        internal.pendingAck = undefined;
      }

      const schedulePending = () => {
        if (minIntervalMs <= 0) return;

        internal.pendingVal = val;
        internal.pendingAck = ack;

        const dueIn = Math.max(5, (lastWriteTs + minIntervalMs) - now);

        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} }
        internal.t = setTimeout(() => {
          try {
            const pv = internal.pendingVal;
            const pa = internal.pendingAck;
            internal.pendingVal = undefined;
            internal.pendingAck = undefined;
            internal.t = null;

            internal.lastWrittenVal = pv;
            internal.lastWriteTs = Date.now();
            adapter.setForeignStateAsync(dpId, { val: pv, ack: pa }).catch(() => {});
          } catch (_e2) {}
        }, dueIn);
      };

      const sideEffect = () => {
        if (!changed) return;

        if (intervalOk) {
          // cancel pending
          if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} internal.t = null; }
          internal.pendingVal = undefined;
          internal.pendingAck = undefined;

          internal.lastWrittenVal = val;
          internal.lastWriteTs = now;
          try {
            adapter.setForeignStateAsync(dpId, { val, ack }).catch(() => {});
          } catch (_e) {}
        } else {
          // throttle: remember latest value and write when allowed
          schedulePending();
        }
      };

      return { out: {}, internal, sideEffect };
    },
  },

  // ----- Konstanten / einfache Logik
  const: {
    inputs: [],
    outputs: ['out'],
    compute: ({ params }) => {
      const vt = String(params.valueType || 'number').toLowerCase();
      const raw = params.value;
      let v;
      if (vt === 'bool' || vt === 'boolean') v = toBool(raw);
      else if (vt === 'string' || vt === 'text') v = (raw === undefined || raw === null) ? '' : String(raw);
      else v = toNum(raw, 0);
      return { out: { out: v } };
    },
  },

  not: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp }) => ({ out: { out: !toBool(inp.in) } }),
  },

  and: {
    inputs: ['a','b'],
    outputs: ['out'],
    compute: ({ in: inp }) => ({ out: { out: toBool(inp.a) && toBool(inp.b) } }),
  },

  or: {
    inputs: ['a','b'],
    outputs: ['out'],
    compute: ({ in: inp }) => ({ out: { out: toBool(inp.a) || toBool(inp.b) } }),
  },

  xor: {
    inputs: ['a','b'],
    outputs: ['out'],
    compute: ({ in: inp }) => {
      const a = toBool(inp.a);
      const b = toBool(inp.b);
      return { out: { out: (a && !b) || (!a && b) } };
    },
  },

  toggle: {
    inputs: ['trig'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal }) => {
      const edge = String(params.edge || 'rising').toLowerCase();
      const init = toBool(params.init);
      if (internal.state === undefined) internal.state = init;

      const prev = toBool(internal.prev || false);
      const now = toBool(inp.trig);

      const rising = (!prev && now);
      const falling = (prev && !now);
      const any = (prev !== now);

      const trig = (edge === 'falling') ? falling : (edge === 'both') ? any : rising;
      if (trig) internal.state = !toBool(internal.state);

      internal.prev = now;
      return { out: { out: toBool(internal.state) }, internal };
    },
  },

  rs: {
    inputs: ['r','s'],
    outputs: ['q'],
    compute: ({ in: inp, params, internal }) => {
      const prio = String(params.priority || 'r').toLowerCase();
      const init = toBool(params.init);
      if (internal.q === undefined) internal.q = init;

      const r = toBool(inp.r);
      const s = toBool(inp.s);

      // if both true: priority decides
      if (r && s) {
        internal.q = (prio === 's') ? true : false;
      } else if (r) {
        internal.q = false;
      } else if (s) {
        internal.q = true;
      }
      return { out: { q: toBool(internal.q) }, internal };
    },
  },

  // ----- Flanken
  edge: {
    inputs: ['in'],
    outputs: ['rising','falling'],
    compute: ({ in: inp, internal, runner, nodeId }) => {
      const prev = toBool(internal.prev || false);
      const now = toBool(inp.in);

      const rising = (!prev && now);
      const falling = (prev && !now);

      if (!internal.pulses) internal.pulses = { rising: false, falling: false };

      if (rising) triggerShortPulse({ internal, key: 'rising', widthMs: 80, runner, nodeId });
      if (falling) triggerShortPulse({ internal, key: 'falling', widthMs: 80, runner, nodeId });

      internal.prev = now;
      return { out: { rising: !!(internal.pulses && internal.pulses.rising), falling: !!(internal.pulses && internal.pulses.falling) }, internal };
    },
  },

  edge_rising: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, internal, runner, nodeId }) => {
      const prev = toBool(internal.prev || false);
      const now = toBool(inp.in);
      const rising = (!prev && now);
      if (!internal.pulses) internal.pulses = { out: false };
      if (rising) triggerShortPulse({ internal, key: 'out', widthMs: 80, runner, nodeId });
      internal.prev = now;
      return { out: { out: !!(internal.pulses && internal.pulses.out) }, internal };
    },
  },

  edge_falling: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, internal, runner, nodeId }) => {
      const prev = toBool(internal.prev || false);
      const now = toBool(inp.in);
      const falling = (prev && !now);
      if (!internal.pulses) internal.pulses = { out: false };
      if (falling) triggerShortPulse({ internal, key: 'out', widthMs: 80, runner, nodeId });
      internal.prev = now;
      return { out: { out: !!(internal.pulses && internal.pulses.out) }, internal };
    },
  },

  edge_both: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, internal, runner, nodeId }) => {
      const prev = toBool(internal.prev || false);
      const now = toBool(inp.in);
      const any = (prev !== now);
      if (!internal.pulses) internal.pulses = { out: false };
      if (any) triggerShortPulse({ internal, key: 'out', widthMs: 80, runner, nodeId });
      internal.prev = now;
      return { out: { out: !!(internal.pulses && internal.pulses.out) }, internal };
    },
  },

  // ----- Vergleich
  cmp: {
    inputs: ['a','b'],
    outputs: ['out'],
    compute: ({ in: inp, params }) => {
      const op = String(params.op || '==');
      const mode = String(params.mode || 'auto').toLowerCase();

      const aRaw = inp.a;
      const bRaw = inp.b;

      let a = aRaw;
      let b = bRaw;

      if (mode === 'number') {
        a = toNum(aRaw, 0);
        b = toNum(bRaw, 0);
      } else if (mode === 'bool') {
        a = toBool(aRaw);
        b = toBool(bRaw);
      } else if (mode === 'string' || mode === 'text') {
        a = (aRaw === undefined || aRaw === null) ? '' : String(aRaw);
        b = (bRaw === undefined || bRaw === null) ? '' : String(bRaw);
      } else {
        // auto
        const an = toNum(aRaw, NaN);
        const bn = toNum(bRaw, NaN);
        if (Number.isFinite(an) && Number.isFinite(bn)) {
          a = an; b = bn;
        } else {
          a = (aRaw === undefined || aRaw === null) ? '' : String(aRaw);
          b = (bRaw === undefined || bRaw === null) ? '' : String(bRaw);
        }
      }

      let r = false;
      switch (op) {
        case '==': r = (a === b); break;
        case '!=': r = (a !== b); break;
        case '>': r = (a > b); break;
        case '>=': r = (a >= b); break;
        case '<': r = (a < b); break;
        case '<=': r = (a <= b); break;
        default: r = (a === b); break;
      }
      return { out: { out: !!r } };
    },
  },

  hyst: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal }) => {
      const on = toNum(params.on, 60);
      const off = toNum(params.off, 55);
      const init = toBool(params.init);

      if (internal.state === undefined) internal.state = init;

      const v = toNum(inp.in, 0);
      let out = toBool(internal.state);

      // EIN ab 'on', AUS ab 'off'
      if (v >= on) out = true;
      if (v <= off) out = false;

      internal.state = out;
      return { out: { out }, internal };
    },
  },

  // ----- Mathe
  add: {
    inputs: ['a','b'],
    outputs: ['out'],
    compute: ({ in: inp }) => ({ out: { out: toNum(inp.a, 0) + toNum(inp.b, 0) } }),
  },

  sub: {
    inputs: ['a','b'],
    outputs: ['out'],
    compute: ({ in: inp }) => ({ out: { out: toNum(inp.a, 0) - toNum(inp.b, 0) } }),
  },

  mul: {
    inputs: ['a','b'],
    outputs: ['out'],
    compute: ({ in: inp }) => ({ out: { out: toNum(inp.a, 0) * toNum(inp.b, 0) } }),
  },

  div: {
    inputs: ['a','b'],
    outputs: ['out'],
    compute: ({ in: inp, params }) => {
      const a = toNum(inp.a, 0);
      const b = toNum(inp.b, 0);
      const div0 = toNum(params.div0, 0);
      return { out: { out: (b === 0) ? div0 : (a / b) } };
    },
  },

  minmax: {
    inputs: ['a','b'],
    outputs: ['min','max'],
    compute: ({ in: inp }) => {
      const a = toNum(inp.a, 0);
      const b = toNum(inp.b, 0);
      return { out: { min: Math.min(a, b), max: Math.max(a, b) } };
    },
  },

  clamp: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, params }) => {
      const v = toNum(inp.in, 0);
      const lo = toNum(params.min, 0);
      const hi = toNum(params.max, 100);
      return { out: { out: clamp(v, lo, hi) } };
    },
  },

  scale: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, params }) => {
      const preset = String(params.preset || 'custom').toLowerCase();
      let inMin = toNum(params.inMin, 0);
      let inMax = toNum(params.inMax, 100);
      let outMin = toNum(params.outMin, 0);
      let outMax = toNum(params.outMax, 100);
      const doClamp = toBool(params.clamp);

      if (preset === '255_to_100') { inMin = 0; inMax = 255; outMin = 0; outMax = 100; }
      else if (preset === '100_to_255') { inMin = 0; inMax = 100; outMin = 0; outMax = 255; }
      else if (preset === '10v_to_100') { inMin = 0; inMax = 10; outMin = 0; outMax = 100; }
      else if (preset === '100_to_10v') { inMin = 0; inMax = 100; outMin = 0; outMax = 10; }

      const x = toNum(inp.in, 0);
      let y = outMin;

      if (inMax === inMin) {
        y = outMin;
      } else {
        const t = (x - inMin) / (inMax - inMin);
        y = outMin + t * (outMax - outMin);
      }

      if (doClamp) {
        const lo = Math.min(outMin, outMax);
        const hi = Math.max(outMin, outMax);
        y = clamp(y, lo, hi);
      }

      const prec = Math.max(0, Math.min(6, Math.round(toNum(params.precision, 2))));
      const f = Math.pow(10, prec);
      y = Math.round(y * f) / f;

      return { out: { out: y } };
    },
  },

  // ----- Regelung / Klima
  rt_2p: {
    // Raumtemperaturregler (2-Punkt) mit Hysterese
    inputs: ['enable', 'ist', 'soll'],
    outputs: ['out', 'delta'],
    compute: ({ in: inp, params, internal }) => {
      const enabled = (inp.enable === undefined) ? true : toBool(inp.enable);
      const mode = String(params.mode || 'heat').toLowerCase(); // heat|cool
      const band = Math.max(0, Math.min(20, toNum(params.band, 0.3)));
      const minOnMs = Math.max(0, Math.min(3600_000, Math.round(toNum(params.minOnMs, 0))));
      const minOffMs = Math.max(0, Math.min(3600_000, Math.round(toNum(params.minOffMs, 0))));
      const init = toBool(params.init);

      if (internal.state === undefined) internal.state = init;
      if (!Number.isFinite(internal.lastChangeTs)) internal.lastChangeTs = 0;

      const ist = toNum(inp.ist, NaN);
      const soll = toNum(inp.soll, NaN);
      const delta = (Number.isFinite(soll) && Number.isFinite(ist)) ? (soll - ist) : 0;

      let state = toBool(internal.state);

      // Safety: when disabled/invalid -> AUS
      if (!enabled || !Number.isFinite(ist) || !Number.isFinite(soll)) {
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} internal.t = null; }
        internal.state = false;
        return { out: { out: false, delta }, internal };
      }

      const nowTs = Date.now();
      const lastTs = Number.isFinite(internal.lastChangeTs) ? internal.lastChangeTs : 0;
      const since = Math.max(0, nowTs - lastTs);

      // Hysterese: ON / OFF Schwellen
      const onTh = (mode === 'cool') ? (soll + band) : (soll - band);
      const offTh = (mode === 'cool') ? (soll - band) : (soll + band);

      let want = state;
      if (!state) {
        if (mode === 'cool') {
          if (ist >= onTh) want = true;
        } else {
          if (ist <= onTh) want = true;
        }
      } else {
        if (mode === 'cool') {
          if (ist <= offTh) want = false;
        } else {
          if (ist >= offTh) want = false;
        }
      }

      if (want !== state) {
        const allow = (want === true) ? (since >= minOffMs) : (since >= minOnMs);
        if (allow) {
          state = want;
          internal.state = state;
          internal.lastChangeTs = nowTs;
        }
      }

      return { out: { out: toBool(state), delta }, internal };
    },
  },

  rt_p: {
    // Raumtemperaturregler (P) -> Stellwert 0..100%
    inputs: ['enable', 'ist', 'soll'],
    outputs: ['out', 'delta'],
    compute: ({ in: inp, params }) => {
      const enabled = (inp.enable === undefined) ? true : toBool(inp.enable);
      const mode = String(params.mode || 'heat').toLowerCase();
      const kp = Math.max(0, Math.min(1000, toNum(params.kp, 30))); // % pro K
      const deadband = Math.max(0, Math.min(10, toNum(params.deadband, 0.2)));
      const outMinRaw = toNum(params.outMin, 0);
      const outMaxRaw = toNum(params.outMax, 100);
      const outMin = Math.min(outMinRaw, outMaxRaw);
      const outMax = Math.max(outMinRaw, outMaxRaw);
      const prec = Math.max(0, Math.min(3, Math.round(toNum(params.precision, 1))));

      const ist = toNum(inp.ist, NaN);
      const soll = toNum(inp.soll, NaN);
      const delta = (Number.isFinite(soll) && Number.isFinite(ist)) ? (soll - ist) : 0;

      if (!enabled || !Number.isFinite(ist) || !Number.isFinite(soll)) {
        return { out: { out: outMin, delta } };
      }

      let err = (soll - ist);
      if (Math.abs(err) < deadband) err = 0;

      // Kühlen: Vorzeichen umdrehen (Stellwert >0 bei ist > soll)
      if (mode === 'cool') err = -err;

      let y = err * kp;
      y = clamp(y, outMin, outMax);
      const f = Math.pow(10, prec);
      y = Math.round(y * f) / f;
      return { out: { out: y, delta } };
    },
  },

  rt_pi: {
    // Raumtemperaturregler (PI) -> Stellwert 0..100% (mit Anti-Windup)
    inputs: ['enable', 'ist', 'soll', 'reset'],
    outputs: ['out', 'delta', 'p', 'i'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const enabled = (inp.enable === undefined) ? true : toBool(inp.enable);
      const reset = toBool(inp.reset);

      const mode = String(params.mode || 'heat').toLowerCase();
      const kp = Math.max(0, Math.min(1000, toNum(params.kp, 30))); // % pro K
      const ti = Math.max(1, Math.min(24*3600, toNum(params.ti, 600))); // s
      const cycleMs = Math.max(250, Math.min(3600_000, Math.round(toNum(params.cycleMs, 10_000))));
      const deadband = Math.max(0, Math.min(10, toNum(params.deadband, 0.2)));
      const outMinRaw = toNum(params.outMin, 0);
      const outMaxRaw = toNum(params.outMax, 100);
      const outMin = Math.min(outMinRaw, outMaxRaw);
      const outMax = Math.max(outMinRaw, outMaxRaw);
      const antiWindup = (params.antiWindup === undefined) ? true : toBool(params.antiWindup);
      const resetOnDisable = (params.resetOnDisable === undefined) ? true : toBool(params.resetOnDisable);
      const prec = Math.max(0, Math.min(3, Math.round(toNum(params.precision, 1))));

      const ist = toNum(inp.ist, NaN);
      const soll = toNum(inp.soll, NaN);
      const delta = (Number.isFinite(soll) && Number.isFinite(ist)) ? (soll - ist) : 0;

      // Init internal
      if (!Number.isFinite(internal.lastTs)) internal.lastTs = Date.now();
      if (!Number.isFinite(internal.iTerm)) internal.iTerm = 0;

      const clearIntervalSafe = () => {
        if (internal.i) { try { clearInterval(internal.i); } catch (_e) {} internal.i = null; }
        internal.iMs = null;
      };

      // reset input
      if (reset) internal.iTerm = 0;

      // If disabled/invalid -> output min, stop timer
      if (!enabled || !Number.isFinite(ist) || !Number.isFinite(soll)) {
        clearIntervalSafe();
        internal.lastTs = Date.now();
        if (resetOnDisable) internal.iTerm = 0;
        return { out: { out: outMin, delta, p: 0, i: internal.iTerm }, internal };
      }

      // periodic evaluation (so I-term can build up even without DP changes)
      if (!internal.i || internal.iMs !== cycleMs) {
        clearIntervalSafe();
        internal.iMs = cycleMs;
        internal.i = setInterval(() => {
          try { runner._evalNode(nodeId); } catch (_e2) {}
        }, cycleMs);
      }

      const nowTs = Date.now();
      const dtSec = Math.max(0, Math.min(3600, (nowTs - internal.lastTs) / 1000));
      internal.lastTs = nowTs;

      // Error
      let err = (soll - ist);
      if (Math.abs(err) < deadband) err = 0;
      // Cooling: invert error direction
      if (mode === 'cool') err = -err;

      const p = err * kp;

      // Integrator (Ki = Kp / Ti)
      const ki = (ti > 0) ? (kp / ti) : 0;
      const iPrev = toNum(internal.iTerm, 0);
      let iNext = iPrev + (ki * err * dtSec);

      // prevent runaway
      iNext = clamp(iNext, -10000, 10000);

      let uCand = p + iNext;
      let u = clamp(uCand, outMin, outMax);

      // Anti-windup: if saturated and error pushes further -> do not integrate this step
      if (antiWindup && u !== uCand) {
        const pushingUp = (uCand > outMax) && (err > 0);
        const pushingDown = (uCand < outMin) && (err < 0);
        if (pushingUp || pushingDown) {
          iNext = iPrev;
          uCand = p + iNext;
          u = clamp(uCand, outMin, outMax);
        }
      }

      internal.iTerm = iNext;

      const f = Math.pow(10, prec);
      const round = (x) => Math.round(x * f) / f;

      return { out: { out: round(u), delta: round(delta), p: round(p), i: round(iNext) }, internal };
    },
  },

  season_switch: {
    // Sommer/Winter Umschalter (Auto per Außentemperatur oder manuell per Input)
    inputs: ['enable', 'tOut', 'summerIn', 'winterVal', 'summerVal'],
    outputs: ['out', 'summer', 'winter'],
    compute: ({ in: inp, params, internal }) => {
      const enabled = (inp.enable === undefined) ? true : toBool(inp.enable);
      const mode = String(params.mode || 'auto').toLowerCase(); // auto|manual
      const summerOn = toNum(params.summerOn, 18);
      const winterOn = toNum(params.winterOn, 15);
      const init = String(params.init || 'winter').toLowerCase();

      if (internal.isSummer === undefined) internal.isSummer = (init === 'summer');

      let isSummer = toBool(internal.isSummer);

      if (!enabled) {
        // disabled: keep last state (output still provided)
      } else if (mode === 'manual') {
        isSummer = toBool(inp.summerIn);
      } else {
        const tOut = toNum(inp.tOut, NaN);
        if (Number.isFinite(tOut)) {
          if (tOut >= summerOn) isSummer = true;
          else if (tOut <= winterOn) isSummer = false;
        }
      }

      internal.isSummer = isSummer;
      const outVal = isSummer ? inp.summerVal : inp.winterVal;

      return { out: { out: outVal, summer: isSummer, winter: !isSummer }, internal };
    },
  },

  window_lock: {
    // Fensterkontakt-Sperre (mit Verzögerung beim Öffnen/Schließen)
    inputs: ['enable', 'in', 'window'],
    outputs: ['out', 'blocked'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const enabled = (inp.enable === undefined) ? true : toBool(inp.enable);
      const invertWindow = toBool(params.invertWindow);
      const openDelayMs = Math.max(0, Math.min(24*3600_000, Math.round(toNum(params.openDelayMs, 0))));
      const closeDelayMs = Math.max(0, Math.min(24*3600_000, Math.round(toNum(params.closeDelayMs, 0))));
      const blockOut = toBool(params.blockOut);

      const inVal = toBool(inp.in);
      const winRaw = toBool(inp.window);
      const winOpen = invertWindow ? !winRaw : winRaw;

      if (internal.blocked === undefined) internal.blocked = false;

      const clearTimers = () => {
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} internal.t = null; }
        if (internal.t2) { try { clearTimeout(internal.t2); } catch (_e2) {} internal.t2 = null; }
      };

      if (!enabled) {
        clearTimers();
        internal.blocked = false;
        return { out: { out: inVal, blocked: false }, internal };
      }

      // Window open: schedule/activate block
      if (winOpen) {
        if (internal.t2) { try { clearTimeout(internal.t2); } catch (_e3) {} internal.t2 = null; }

        if (openDelayMs <= 0) {
          if (internal.t) { try { clearTimeout(internal.t); } catch (_e4) {} internal.t = null; }
          internal.blocked = true;
        } else if (!internal.blocked && !internal.t) {
          internal.t = setTimeout(() => {
            try {
              internal.t = null;
              internal.blocked = true;
              runner._evalNode(nodeId);
            } catch (_e5) {}
          }, openDelayMs);
        }
      } else {
        // Window closed: schedule/activate release
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e6) {} internal.t = null; }

        if (closeDelayMs <= 0) {
          if (internal.t2) { try { clearTimeout(internal.t2); } catch (_e7) {} internal.t2 = null; }
          internal.blocked = false;
        } else if (internal.blocked && !internal.t2) {
          internal.t2 = setTimeout(() => {
            try {
              internal.t2 = null;
              internal.blocked = false;
              runner._evalNode(nodeId);
            } catch (_e8) {}
          }, closeDelayMs);
        }
      }

      const blocked = toBool(internal.blocked);
      const outVal = blocked ? blockOut : inVal;

      return { out: { out: toBool(outVal), blocked }, internal };
    },
  },

  heating_curve: {
    // Heizkurve: Außentemperatur -> Vorlauf-Soll (°C)
    inputs: ['enable', 'tOut', 'room'],
    outputs: ['out', 'active'],
    compute: ({ in: inp, params }) => {
      const enabled = (inp.enable === undefined) ? true : toBool(inp.enable);

      const model = String(params.model || '2point').toLowerCase(); // 2point|slope

      const tOutWarm = toNum(params.tOutWarm, 20);
      const tFlowWarm = toNum(params.tFlowWarm, 25);
      const tOutCold = toNum(params.tOutCold, -10);
      const tFlowCold = toNum(params.tFlowCold, 50);

      const slope = toNum(params.slope, 1.2);
      const level = toNum(params.level, 20);

      let shift = toNum(params.shift, 0);
      const roomRef = toNum(params.roomRef, 20);
      const roomGain = toNum(params.roomGain, 0);

      const minFlowRaw = toNum(params.minFlow, 20);
      const maxFlowRaw = toNum(params.maxFlow, 60);
      const minFlow = Math.min(minFlowRaw, maxFlowRaw);
      const maxFlow = Math.max(minFlowRaw, maxFlowRaw);

      const prec = Math.max(0, Math.min(2, Math.round(toNum(params.precision, 1))));
      const f = Math.pow(10, prec);

      const tOut = toNum(inp.tOut, NaN);
      const room = toNum(inp.room, NaN);

      if (Number.isFinite(room) && roomGain !== 0) {
        shift += (room - roomRef) * roomGain;
      }

      if (!enabled || !Number.isFinite(tOut)) {
        const y0 = clamp(minFlow, minFlow, maxFlow);
        return { out: { out: Math.round(y0 * f) / f, active: false } };
      }

      let y = minFlow;

      if (model === 'slope') {
        // einfache Kennlinie: Niveau + Steigung * (ReferenzRaum - Außen)
        y = level + slope * (roomRef - tOut);
      } else {
        // 2-Punkt linear
        if (tOutWarm === tOutCold) {
          y = tFlowWarm;
        } else if (tOut >= tOutWarm) {
          y = tFlowWarm;
        } else if (tOut <= tOutCold) {
          y = tFlowCold;
        } else {
          const t = (tOut - tOutWarm) / (tOutCold - tOutWarm);
          y = tFlowWarm + t * (tFlowCold - tFlowWarm);
        }
      }

      y += shift;
      y = clamp(y, minFlow, maxFlow);
      y = Math.round(y * f) / f;

      return { out: { out: y, active: true } };
    },
  },

  mixer_2p: {
    // Mischer-Regler (2-Punkt): erzeugt kurze AUF/ZU-Impulse abhängig von Soll/Ist
    inputs: ['enable', 'ist', 'soll'],
    outputs: ['open', 'close', 'delta'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const enabled = (inp.enable === undefined) ? true : toBool(inp.enable);
      const band = Math.max(0, Math.min(20, toNum(params.band, 0.5)));
      const pulseMs = Math.max(50, Math.min(60_000, Math.round(toNum(params.pulseMs, 1500))));
      const pauseMs = Math.max(0, Math.min(60_000, Math.round(toNum(params.pauseMs, 3000))));
      const invert = toBool(params.invert);

      const ist = toNum(inp.ist, NaN);
      const soll = toNum(inp.soll, NaN);
      const delta = (Number.isFinite(soll) && Number.isFinite(ist)) ? (soll - ist) : 0;

      // internal init
      if (!Number.isFinite(internal.lastActionTs)) internal.lastActionTs = 0;
      internal.pulses = (internal.pulses && typeof internal.pulses === 'object') ? internal.pulses : { open: false, close: false };

      const clearPulses = () => {
        try {
          if (internal.pulseTimers && typeof internal.pulseTimers === 'object') {
            for (const k of Object.keys(internal.pulseTimers)) {
              try { clearTimeout(internal.pulseTimers[k]); } catch (_e) {}
            }
          }
        } catch (_e2) {}
        internal.pulseTimers = null;
        if (internal.pulses) {
          internal.pulses.open = false;
          internal.pulses.close = false;
        }
      };

      if (!enabled || !Number.isFinite(ist) || !Number.isFinite(soll)) {
        clearPulses();
        return { out: { open: false, close: false, delta }, internal };
      }

      let want = null; // 'open' | 'close'
      if (delta > band) want = 'open';
      else if (delta < -band) want = 'close';

      const nowTs = Date.now();
      const since = Math.max(0, nowTs - (Number.isFinite(internal.lastActionTs) ? internal.lastActionTs : 0));

      if (want && !(internal.pulses && internal.pulses[want]) && (since >= pauseMs)) {
        triggerShortPulse({ internal, key: want, widthMs: pulseMs, runner, nodeId });
        internal.lastActionTs = nowTs;
      }

      let open = !!(internal.pulses && internal.pulses.open);
      let close = !!(internal.pulses && internal.pulses.close);

      if (invert) {
        const tmp = open; open = close; close = tmp;
      }

      return { out: { open, close, delta }, internal };
    },
  },


  pwm: {
    // Zeitproportionaler PWM-Generator: 0..100% -> Bool-Ausgang
    inputs: ['enable', 'in'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const enabled = (inp.enable === undefined) ? true : toBool(inp.enable);
      const periodMs = Math.max(1000, Math.min(24*3600_000, Math.round(toNum(params.periodMs, 600_000))));
      const minPulseMs = Math.max(0, Math.min(periodMs, Math.round(toNum(params.minPulseMs, 2000))));

      let duty = toNum(inp.in, 0);
      if (!Number.isFinite(duty)) duty = 0;
      duty = clamp(duty, 0, 100);

      const clearTimers = () => {
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} internal.t = null; }
        if (internal.t2) { try { clearTimeout(internal.t2); } catch (_e2) {} internal.t2 = null; }
        internal.nextDueTs = null;
      };

      if (!enabled || duty <= 0) {
        clearTimers();
        internal.state = false;
        internal.cfg = { enabled: false, duty, periodMs, minPulseMs };
        return { out: { out: false }, internal };
      }
      if (duty >= 100) {
        clearTimers();
        internal.state = true;
        internal.cfg = { enabled: true, duty, periodMs, minPulseMs };
        return { out: { out: true }, internal };
      }

      // Compute on/off times (optional min. pulse)
      let onMs = (periodMs * duty) / 100;
      let offMs = periodMs - onMs;
      if (minPulseMs > 0) {
        if (onMs > 0 && onMs < minPulseMs) { onMs = minPulseMs; offMs = Math.max(0, periodMs - onMs); }
        if (offMs > 0 && offMs < minPulseMs) { offMs = minPulseMs; onMs = Math.max(0, periodMs - offMs); }
      }

      // Restart cycle when config changed
      const prevCfg = internal.cfg || {};
      const cfgChanged = (prevCfg.enabled !== true) || (prevCfg.duty !== duty) || (prevCfg.periodMs !== periodMs) || (prevCfg.minPulseMs !== minPulseMs);
      if (cfgChanged) {
        internal.cycleStart = Date.now();
        internal.cfg = { enabled: true, duty, periodMs, minPulseMs };
      }

      const nowTs = Date.now();
      let cs = Number.isFinite(internal.cycleStart) ? internal.cycleStart : nowTs;
      let phase = nowTs - cs;
      if (phase >= periodMs) {
        // keep modulo so the cycle doesn't drift too much
        cs = nowTs - (phase % periodMs);
        internal.cycleStart = cs;
        phase = nowTs - cs;
      }

      const state = (phase < onMs);
      internal.state = state;

      // schedule next toggle
      const nextIn = state ? Math.max(5, Math.round(onMs - phase)) : Math.max(5, Math.round(periodMs - phase));
      const dueTs = nowTs + nextIn;
      const needsResched = (!Number.isFinite(internal.nextDueTs)) || (Math.abs(dueTs - internal.nextDueTs) > 50) || cfgChanged;

      if (needsResched) {
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e3) {} internal.t = null; }
        internal.nextDueTs = dueTs;
        internal.t = setTimeout(() => {
          try { runner._evalNode(nodeId); } catch (_e4) {}
        }, nextIn + 5);
      }

      return { out: { out: !!state }, internal };
    },
  },

  // ----- Zeit
  delay_on: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const delayMs = Math.max(0, Math.min(3600_000, Math.round(toNum((params.ms ?? params.pulseMs ?? params.delayMs), 1000))));
      const now = toBool(inp.in);
      const prev = toBool(internal.prev || false);

      // init
      if (internal.out === undefined) internal.out = false;

      if (now && !prev) {
        // start timer
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} }
        internal.out = false;
        internal.t = setTimeout(() => {
          try {
            internal.out = true;
            runner._evalNode(nodeId);
          } catch (_e2) {}
        }, delayMs);
      }

      if (!now) {
        // cancel
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} internal.t = null; }
        internal.out = false;
      }

      // If input is still true and timer elapsed, internal.out is already true.
      internal.prev = now;
      return { out: { out: toBool(internal.out) }, internal };
    },
  },

  delay_off: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const delayMs = Math.max(0, Math.min(3600_000, Math.round(toNum((params.ms ?? params.pulseMs ?? params.delayMs), 1000))));
      const now = toBool(inp.in);
      const prev = toBool(internal.prev || false);

      if (internal.out === undefined) internal.out = false;

      if (!now && prev) {
        // start off-timer
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} }
        internal.t = setTimeout(() => {
          try {
            internal.out = false;
            runner._evalNode(nodeId);
          } catch (_e2) {}
        }, delayMs);
      }

      if (now) {
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} internal.t = null; }
        internal.out = true;
      }

      internal.prev = now;
      return { out: { out: toBool(internal.out) }, internal };
    },
  },

  after_run: {
    // Nachlauf (Alias zu delay_off)
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      // Reuse delay_off logic
      const delayMs = Math.max(0, Math.min(3600_000, Math.round(toNum((params.ms ?? params.pulseMs ?? params.delayMs), 1000))));
      const now = toBool(inp.in);
      const prev = toBool(internal.prev || false);

      if (internal.out === undefined) internal.out = false;

      if (!now && prev) {
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} }
        internal.t = setTimeout(() => {
          try {
            internal.out = false;
            runner._evalNode(nodeId);
          } catch (_e2) {}
        }, delayMs);
      }

      if (now) {
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} internal.t = null; }
        internal.out = true;
      }

      internal.prev = now;
      return { out: { out: toBool(internal.out) }, internal };
    },
  },

  pulse: {
    inputs: ['trig'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const durMs = Math.max(10, Math.min(3600_000, Math.round(toNum((params.ms ?? params.pulseMs ?? params.delayMs), 500))));
      const edge = String(params.edge || 'rising').toLowerCase();

      const now = toBool(inp.trig);
      const prev = toBool(internal.prev || false);

      const rising = (!prev && now);
      const falling = (prev && !now);
      const any = (prev !== now);

      const fire = (edge === 'falling') ? falling : (edge === 'both') ? any : rising;

      if (internal.out === undefined) internal.out = false;

      if (fire) {
        internal.out = true;
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} }
        internal.t = setTimeout(() => {
          try {
            internal.out = false;
            runner._evalNode(nodeId);
          } catch (_e2) {}
        }, durMs);
      }

      internal.prev = now;
      return { out: { out: toBool(internal.out) }, internal };
    },
  },

  staircase: {
    // Treppenlicht: Trigger -> Ausgang = EIN für X ms (retriggerbar)
    inputs: ['trig'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const durMs = Math.max(10, Math.min(24*3600_000, Math.round(toNum((params.ms ?? params.pulseMs ?? params.delayMs), 60_000))));
      const edge = String(params.edge || 'rising').toLowerCase();

      const now = toBool(inp.trig);
      const prev = toBool(internal.prev || false);

      const rising = (!prev && now);
      const falling = (prev && !now);
      const any = (prev !== now);

      const fire = (edge === 'falling') ? falling : (edge === 'both') ? any : rising;

      if (internal.out === undefined) internal.out = false;

      if (fire) {
        internal.out = true;
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} }
        internal.t = setTimeout(() => {
          try {
            internal.out = false;
            runner._evalNode(nodeId);
          } catch (_e2) {}
        }, durMs);
      }

      internal.prev = now;
      return { out: { out: toBool(internal.out) }, internal };
    },
  },

  pulse_extend: {
    // Impulsverlängerer: Eingang EIN -> Ausgang EIN; nach AUS noch X ms EIN
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const holdMs = Math.max(0, Math.min(24*3600_000, Math.round(toNum((params.ms ?? params.pulseMs ?? params.delayMs), 1000))));
      const now = toBool(inp.in);
      const prev = toBool(internal.prev || false);

      if (internal.out === undefined) internal.out = false;

      if (!now && prev) {
        // start off-timer
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} }
        internal.t = setTimeout(() => {
          try {
            internal.out = false;
            runner._evalNode(nodeId);
          } catch (_e2) {}
        }, holdMs);
      }

      if (now) {
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} internal.t = null; }
        internal.out = true;
      }

      internal.prev = now;
      return { out: { out: toBool(internal.out) }, internal };
    },
  },

  schedule: {
    // Zeitprogramm: Wochen-Schedule + Zeitfenster, optional Feiertag-Eingang
    inputs: ['enable', 'holiday'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const enabled = (inp.enable === undefined) ? true : toBool(inp.enable);
      const holiday = toBool(inp.holiday);

      const holidayMode = String(params.holidayMode || 'asSunday').toLowerCase();
      const daysStr = String(params.days || 'Mo,Di,Mi,Do,Fr,Sa,So');
      const fromMin = parseTimeToMin(params.from ?? params.fromTime ?? params.start ?? '00:00');
      const toMin = parseTimeToMin(params.to ?? params.toTime ?? params.end ?? '23:59');

      const days = parseDays(daysStr);

      let out = false;

      if (enabled && days.size && (fromMin !== null) && (toMin !== null)) {
        const d = nowLocal();
        let day = getIsoDay(d);

        // Feiertag-Behandlung
        if (holiday) {
          if (holidayMode === 'off') {
            out = false;
          } else if (holidayMode === 'assunday' || holidayMode === 'as_sunday') {
            day = 7;
          } // ignore -> keep day
        }

        if (holiday && holidayMode === 'off') {
          out = false;
        } else {
          const nowMin = d.getHours() * 60 + d.getMinutes();

          if (fromMin <= toMin) {
            // normal window (same day)
            out = days.has(day) && (nowMin >= fromMin) && (nowMin < toMin);
          } else {
            // window crosses midnight:
            // - late evening: needs current day
            // - early morning: needs previous day
            const prevDay = (day === 1) ? 7 : (day - 1);
            const inLate = (nowMin >= fromMin) && days.has(day);
            const inEarly = (nowMin < toMin) && days.has(prevDay);
            out = inLate || inEarly;
          }
        }
      }

      // Arm minute-tick so output can flip even without input changes
      scheduleNextMinuteTick({ internal, runner, nodeId });

      internal.out = !!out;
      return { out: { out: !!out }, internal };
    },
  },

  // ----- Zähler / Betriebsstunden
  impulse_counter: {
    // Impulszähler: zählt auf Flanke (Trig)
    inputs: ['trig', 'reset'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal }) => {
      const step = toNum(params.step, 1);
      const init = toNum(params.init, 0);

      if (internal.count === undefined) internal.count = init;

      const trig = toBool(inp.trig);
      const reset = toBool(inp.reset);

      const prevTrig = toBool(internal.prevTrig || false);
      const prevReset = toBool(internal.prevReset || false);

      const risingTrig = (!prevTrig && trig);
      const risingReset = (!prevReset && reset);

      if (risingReset) internal.count = init;
      if (risingTrig) internal.count = toNum(internal.count, init) + step;

      // clamp if configured
      if (params.min !== undefined && params.max !== undefined && toBool(params.clamp)) {
        const lo = toNum(params.min, -1e9);
        const hi = toNum(params.max, 1e9);
        internal.count = clamp(toNum(internal.count, init), lo, hi);
      }

      internal.prevTrig = trig;
      internal.prevReset = reset;

      return { out: { out: toNum(internal.count, init) }, internal };
    },
  },

  counter: {
    // Zähler: UP/DOWN auf Flanke
    inputs: ['up', 'down', 'reset'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal }) => {
      const step = toNum(params.step, 1);
      const init = toNum(params.init, 0);

      if (internal.count === undefined) internal.count = init;

      const up = toBool(inp.up);
      const down = toBool(inp.down);
      const reset = toBool(inp.reset);

      const prevUp = toBool(internal.prevUp || false);
      const prevDown = toBool(internal.prevDown || false);
      const prevReset = toBool(internal.prevReset || false);

      const risingUp = (!prevUp && up);
      const risingDown = (!prevDown && down);
      const risingReset = (!prevReset && reset);

      if (risingReset) internal.count = init;
      if (risingUp) internal.count = toNum(internal.count, init) + step;
      if (risingDown) internal.count = toNum(internal.count, init) - step;

      if (params.min !== undefined && params.max !== undefined && toBool(params.clamp)) {
        const lo = toNum(params.min, -1e9);
        const hi = toNum(params.max, 1e9);
        internal.count = clamp(toNum(internal.count, init), lo, hi);
      }

      internal.prevUp = up;
      internal.prevDown = down;
      internal.prevReset = reset;

      return { out: { out: toNum(internal.count, init) }, internal };
    },
  },

  runtime_hours: {
    // Betriebsstunden: summiert Laufzeit, optional minütliche Aktualisierung während RUN=true
    inputs: ['run', 'reset'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const run = toBool(inp.run);
      const reset = toBool(inp.reset);

      const initH = toNum(params.initHours, 0);
      const prec = Math.max(0, Math.min(4, Math.round(toNum(params.precision, 2))));
      const initMs = initH * 3600_000;

      if (internal.totalMs === undefined) internal.totalMs = initMs;

      const prevRun = toBool(internal.prevRun || false);
      const prevReset = toBool(internal.prevReset || false);

      const risingReset = (!prevReset && reset);

      const nowTs = Date.now();

      if (risingReset) {
        internal.totalMs = initMs;
        internal.startTs = run ? nowTs : null;
      }

      // Start
      if (run && !prevRun) {
        internal.startTs = nowTs;
      }

      // Stop
      if (!run && prevRun) {
        const st = Number.isFinite(internal.startTs) ? internal.startTs : nowTs;
        internal.totalMs = toNum(internal.totalMs, initMs) + Math.max(0, nowTs - st);
        internal.startTs = null;
      }

      let total = toNum(internal.totalMs, initMs);
      if (run) {
        const st = Number.isFinite(internal.startTs) ? internal.startTs : nowTs;
        total += Math.max(0, nowTs - st);
        // while running: update roughly every minute so output is "live"
        scheduleNextMinuteTick({ internal, runner, nodeId });
      } else {
        // not running -> no need for minute tick
        if (internal.t) { try { clearTimeout(internal.t); } catch (_e) {} internal.t = null; }
      }

      const hours = total / 3600_000;
      const f = Math.pow(10, prec);
      const outH = Math.round(hours * f) / f;

      internal.prevRun = run;
      internal.prevReset = reset;

      return { out: { out: outH }, internal };
    },
  },

  // ----- SmartHome Szene
  scene_trigger: {
    inputs: ['trig'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, adapter }) => {
      const trig = toBool(inp.trig);
      const prev = toBool(internal.prev || false);
      const edge = String(params.edge || 'rising').toLowerCase();

      const rising = (!prev && trig);
      const falling = (prev && !trig);
      const any = (prev !== trig);

      const fire = (edge === 'falling') ? falling : (edge === 'both') ? any : rising;

      const sceneId = String(params.sceneId || '').trim();
      const fallbackDp = String(params.dpId || '').trim();
      const pulseMs = Math.max(0, Math.min(10_000, Math.round(toNum(params.pulseMs, 0))));
      const payload = String(params.payload || 'true').toLowerCase();

      const resolveSceneDpId = () => {
        // 1) SmartHomeConfig devices
        try {
          if (sceneId && typeof adapter.getSmartHomeConfig === 'function') {
            const shc = adapter.getSmartHomeConfig();
            const devs = Array.isArray(shc && shc.devices) ? shc.devices : [];
            const dev = devs.find(d => d && d.type === 'scene' && d.id === sceneId);
            if (dev && dev.io && dev.io.switch) {
              const sw = dev.io.switch || {};
              return String(sw.writeId || sw.readId || '').trim();
            }
          }
        } catch (_e) {}

        // 2) Legacy smartHome.datapoints.scene*
        try {
          if (sceneId && adapter.config && adapter.config.smartHome && adapter.config.smartHome.datapoints) {
            const dps = adapter.config.smartHome.datapoints;
            if (dps[sceneId]) return String(dps[sceneId] || '').trim();
          }
        } catch (_e2) {}

        // 3) fallback dpId param
        return fallbackDp;
      };

      const dpId = resolveSceneDpId();

      const sideEffect = () => {
        if (!fire) return;
        if (!dpId) return;

        let val = true;
        if (payload === '1') val = 1;
        else if (payload === '0') val = 0;
        else if (payload === 'false') val = false;
        else val = true;

        try {
          adapter.setForeignStateAsync(dpId, { val, ack: false }).catch(() => {});
          if (pulseMs > 0) {
            setTimeout(() => {
              try {
                adapter.setForeignStateAsync(dpId, { val: (val === true ? false : 0), ack: false }).catch(() => {});
              } catch (_e2) {}
            }, pulseMs);
          }
        } catch (_e) {}
      };

      internal.prev = trig;
      return { out: { out: trig }, internal, sideEffect };
    },
  },
};


// Aliases for backward-compat (older configs)
const NODE_TYPES_ALIASES = {
  compare: NODE_TYPES.cmp,
  hysteresis: NODE_TYPES.hyst,
  min: {
    inputs: ['a','b'],
    outputs: ['out'],
    compute: ({ in: inp }) => ({ out: { out: Math.min(toNum(inp.a, 0), toNum(inp.b, 0)) } }),
  },
  max: {
    inputs: ['a','b'],
    outputs: ['out'],
    compute: ({ in: inp }) => ({ out: { out: Math.max(toNum(inp.a, 0), toNum(inp.b, 0)) } }),
  },
  // legacy pulseMs/delayMs keys will still be accepted because we read params.ms only in new blocks
};


module.exports = { NexoLogicEngine };

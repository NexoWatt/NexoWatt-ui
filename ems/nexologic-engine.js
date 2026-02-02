'use strict';

/**
 * NexoLogic – Node/Graph runtime engine (Basis).
 *
 * Goal:
 * - Provide a modular node/graph logic editor in the VIS.
 * - Execute the configured graph in an event-driven way (stateChange-based) so it reacts fast.
 *
 * Notes:
 * - This implementation is intentionally lightweight and dependency-free.
 * - The frontend can add many block-types; the runtime supports a core set and can be extended.
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
    try {
      // best-effort unsubscribe
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

      // One initial evaluation pass so constants propagate
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
    // clear any running timers
    try {
      for (const st of this._nodeInternal.values()) {
        if (st && st.t) {
          try { clearTimeout(st.t); } catch (_e) {}
          st.t = null;
        }
      }
    } catch (_e2) {}
  }

  _build() {
    const nodesArr = Array.isArray(this.graph.nodes) ? this.graph.nodes : [];
    for (const n of nodesArr) {
      if (!n || typeof n !== 'object') continue;
      const id = String(n.id || '').trim();
      const type = String(n.type || '').trim();
      if (!id || !type) continue;
      const def = NODE_TYPES[type];
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
    // dp_in: write directly to out.out
    const prev = node.out.out;
    node.out.out = value;
    if (!isEqual(prev, value)) {
      this._propagateFrom(nodeId, 'out');
    }
  }

  evaluateAll() {
    // Evaluate constants etc.
    for (const [id, node] of this.nodes.entries()) {
      if (!node.enabled) continue;
      const def = NODE_TYPES[node.type];
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
      if (++guard > 5000) {
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
    const def = NODE_TYPES[node.type];
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
    this._nodeInternal.set(nodeId, res.internal || internal);

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

    // side-effects (DP write)
    if (typeof res.sideEffect === 'function') {
      try { res.sideEffect(); } catch (_e) {}
    }
  }
}


// -----------------------------
// Node type library (runtime)
// -----------------------------

const toBool = (v) => {
  if (v === true) return true;
  if (v === false) return false;
  if (v === 1 || v === '1') return true;
  if (v === 0 || v === '0') return false;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true','on','ein','yes','y'].includes(s)) return true;
    if (['false','off','aus','no','n'].includes(s)) return false;
  }
  return !!v;
};

const toNum = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const isEqual = (a, b) => {
  // primitives + NaN handling
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return a === b;
};

const NODE_TYPES = {
  dp_in: {
    inputs: [],
    outputs: ['out'],
    compute: ({ out }) => ({ out: { out: out.out } }),
  },

  const: {
    inputs: [],
    outputs: ['out'],
    compute: ({ params }) => {
      const vt = String(params.valueType || 'number');
      const raw = params.value;
      let v;
      if (vt === 'bool') v = toBool(raw);
      else if (vt === 'text') v = String(raw ?? '');
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

  compare: {
    inputs: ['a','b'],
    outputs: ['out'],
    compute: ({ in: inp, params }) => {
      const op = String(params.op || '>');
      const aRaw = inp.a;
      const bRaw = inp.b;
      const aNum = Number(aRaw);
      const bNum = Number(bRaw);
      const numeric = Number.isFinite(aNum) && Number.isFinite(bNum);
      const a = numeric ? aNum : aRaw;
      const b = numeric ? bNum : bRaw;

      let r = false;
      switch (op) {
        case '>': r = a > b; break;
        case '>=': r = a >= b; break;
        case '<': r = a < b; break;
        case '<=': r = a <= b; break;
        case '==': r = numeric ? (a === b) : (String(a) === String(b)); break;
        case '!=': r = numeric ? (a !== b) : (String(a) !== String(b)); break;
        default: r = a > b; break;
      }
      return { out: { out: r } };
    },
  },

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
    compute: ({ in: inp }) => {
      const a = toNum(inp.a, 0);
      const b = toNum(inp.b, 0);
      return { out: { out: (b === 0) ? 0 : (a / b) } };
    },
  },

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

  clamp: {
    inputs: ['in','min','max'],
    outputs: ['out'],
    compute: ({ in: inp }) => {
      const v = toNum(inp.in, 0);
      const lo = toNum(inp.min, 0);
      const hi = toNum(inp.max, 100);
      return { out: { out: Math.max(lo, Math.min(hi, v)) } };
    },
  },

  hysteresis: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal }) => {
      const lo = toNum(params.lo, 0);
      const hi = toNum(params.hi, 0);
      const v = toNum(inp.in, 0);
      let out = toBool(internal.state || false);
      if (v <= lo) out = false;
      if (v >= hi) out = true;
      return { out: { out }, internal: { ...internal, state: out } };
    },
  },

  toggle: {
    inputs: ['trig'],
    outputs: ['out'],
    compute: ({ in: inp, internal }) => {
      const prev = toBool(internal.prev || false);
      const now = toBool(inp.trig);
      let state = toBool(internal.state || false);
      if (!prev && now) state = !state;
      return { out: { out: state }, internal: { ...internal, prev: now, state } };
    },
  },

  delay_on: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const delayMs = Math.max(0, Math.min(3600_000, Math.round(toNum(params.delayMs, 1000))));
      const now = toBool(inp.in);
      const prev = toBool(internal.prev || false);
      let out = toBool(internal.out || false);

      if (now && !prev) {
        // start timer
        if (internal.t) clearTimeout(internal.t);
        internal.t = setTimeout(() => {
          internal.out = true;
          try { runner._evalNode(nodeId); } catch (_e) {}
        }, delayMs);
      }

      if (!now) {
        if (internal.t) { clearTimeout(internal.t); internal.t = null; }
        out = false;
      } else {
        // if timer already elapsed
        out = toBool(internal.out || false);
      }

      internal.prev = now;
      internal.out = out;
      return { out: { out }, internal };
    },
  },

  delay_off: {
    inputs: ['in'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const delayMs = Math.max(0, Math.min(3600_000, Math.round(toNum(params.delayMs, 1000))));
      const now = toBool(inp.in);
      const prev = toBool(internal.prev || false);
      let out = toBool(internal.out || false);

      if (!now && prev) {
        // start off-timer
        if (internal.t) clearTimeout(internal.t);
        internal.t = setTimeout(() => {
          internal.out = false;
          try { runner._evalNode(nodeId); } catch (_e) {}
        }, delayMs);
      }

      if (now) {
        if (internal.t) { clearTimeout(internal.t); internal.t = null; }
        out = true;
      } else {
        out = toBool(internal.out || false);
      }

      internal.prev = now;
      internal.out = out;
      return { out: { out }, internal };
    },
  },

  pulse: {
    inputs: ['trig'],
    outputs: ['out'],
    compute: ({ in: inp, params, internal, runner, nodeId }) => {
      const durMs = Math.max(10, Math.min(3600_000, Math.round(toNum(params.pulseMs, 500))));
      const now = toBool(inp.trig);
      const prev = toBool(internal.prev || false);
      let out = toBool(internal.out || false);

      if (!prev && now) {
        out = true;
        if (internal.t) clearTimeout(internal.t);
        internal.t = setTimeout(() => {
          internal.out = false;
          try { runner._evalNode(nodeId); } catch (_e) {}
        }, durMs);
      }

      // after timer
      out = toBool(internal.out || out);
      internal.prev = now;
      internal.out = out;
      return { out: { out }, internal };
    },
  },

  dp_out: {
    inputs: ['in'],
    outputs: [],
    compute: ({ in: inp, params, internal, adapter }) => {
      const dpId = String(params.dpId || '').trim();
      if (!dpId) return { out: {}, internal };

      const ack = params.ack === true;
      const writeOnChange = params.writeOnChange !== false;
      const val = inp.in;

      const prev = internal.last;
      const changed = !isEqual(prev, val);

      const doWrite = (!writeOnChange) || changed;

      const sideEffect = () => {
        if (!doWrite) return;
        internal.last = val;
        try {
          // setForeignStateAsync is safe for both own + foreign states
          adapter.setForeignStateAsync(dpId, { val, ack }).catch(() => {});
        } catch (_e) {}
      };

      return { out: {}, internal, sideEffect };
    },
  },
};


module.exports = { NexoLogicEngine };

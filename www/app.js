
// --- Precise donut placement (anchor angles like a reference UI) ---
function arcLenFromDeg(r, deg){ return 2 * Math.PI * r * (deg/360); }
function setArcAtAngle(selector, r, angleDeg, arcDeg){
  const C = 2 * Math.PI * r;
  const Ldeg = Math.max(0, Math.min(359.9, arcDeg));
  const dash = arcLenFromDeg(r, Ldeg);
  const offset = arcLenFromDeg(r, angleDeg) - dash/2; // center arc
  const el = document.querySelector(selector);
  if (!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1) + ' ' + (C - dash).toFixed(1));
  el.setAttribute('stroke-dashoffset', offset.toFixed(1));
}
function placeIconAtAngle(sel, angleDeg){
  const wrap = document.querySelector('.card.energy-donut .donut-wrap');
  const el = document.querySelector(sel);
  const svg = document.querySelector('.card.energy-donut .donut');
  if (!wrap || !el || !svg) return;
  const size = wrap.getBoundingClientRect().width;
  const R = size/2; 
  const nudge = Math.max(8, size/28);
  const a = (angleDeg - 90) * Math.PI / 180;
  const cx = size/2 + (R + nudge) * Math.cos(a);
  const cy = size/2 + (R + nudge) * Math.sin(a);
  el.style.left = cx + 'px';
  el.style.top  = cy + 'px';
  el.style.position='absolute';
  el.style.transform = 'translate(-50%, -50%)';
}

// Draw an arc inside a quadrant slot with small gaps between quadrants
function setArcInSlot(selector, r, slotIndex, slotFillPct){
  const C = 2 * Math.PI * r;
  const Q = C / 4;               // quarter length
  const gap = 4;                 // pixels gap in each slot
  const slotMax = Q - gap;       // usable track
  const fill = Math.max(0, Math.min(100, slotFillPct||0));
  const L = (fill/100) * slotMax;
  const start = slotIndex * Q + gap/2 + (slotMax - L)/2; // center arc in slot
  const el = document.querySelector(selector);
  if (!el) return;
  el.setAttribute('stroke-dasharray', L.toFixed(1) + ' ' + (C-L).toFixed(1));
  el.setAttribute('stroke-dashoffset', start.toFixed(1));
}

function setArc(selector, r, valuePct){
  const max = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, valuePct||0));
  const dash = (v/100)*max, rest = max-dash;
  const el=document.querySelector(selector);
  if(!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1)+' '+rest.toFixed(1));
}

function setDonut(cls, pct, inner=false) {
  const r = inner ? 34 : 42;
  const max = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, pct || 0));
  const dash = (v / 100) * max;
  const rest = max - dash;
  const q = '.donut .seg.' + cls;
  const el = document.querySelector(q);
  if (!el) return;
  el.setAttribute('stroke-dasharray', dash.toFixed(1) + ' ' + rest.toFixed(1));
}

// Format hours to "h:mm"
function formatHours(h) {
  if (!h || !isFinite(h) || h <= 0) return '--';
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  return hh + 'h ' + (mm<10?'0':'') + mm + 'm';
}

let state = {};
let units = { power: 'W', energy: 'kWh' };

// Energiefluss-Monitor: optionale Verbraucher/Erzeuger (Slots)
let flowSlotsCfg = null; // comes from /config
let flowExtras = { consumers: [], producers: [], special: [], meta: { evcsAvailable: true } };

let _renderScheduled = false;
let _renderTimer = null;
let _lastRenderTs = 0;

// UI performance: throttle expensive full-page renders a bit.
// (SSE/state updates can arrive very frequently and would otherwise make the UI feel laggy.)
const _RENDER_MIN_INTERVAL_MS = 120;

function scheduleRender(force = false){
  if (_renderScheduled && !force) return;
  _renderScheduled = true;

  const now = Date.now();
  const wait = force ? 0 : Math.max(0, _RENDER_MIN_INTERVAL_MS - (now - _lastRenderTs));

  if (_renderTimer) {
    try { clearTimeout(_renderTimer); } catch(_e) {}
    _renderTimer = null;
  }

  _renderTimer = setTimeout(() => {
    _renderScheduled = false;
    _lastRenderTs = Date.now();
    try{ render(); }catch(_e){}
  }, wait);
}


function formatPower(v) {
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  // If configured for kW, convert automatically from W
  if (units.power === 'kW') {
    return (n / 1000).toFixed(2) + ' kW';
  }
  return n.toFixed(0) + ' W';
}

function formatPowerSigned(v){
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  const sign = n>0?'+':(n<0?'-':'');
  const abs = Math.abs(n);
  if (units.power === 'kW') return sign + (abs/1000).toFixed(2) + ' kW';
  return sign + abs.toFixed(0) + ' W';
}

function formatFlowPower(v, decimals){
  // Energy-flow monitor: always show power values in kW (input is expected in W)
  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  const d = (decimals === undefined || decimals === null || isNaN(decimals)) ? 2 : Number(decimals);
  return (n / 1000).toFixed(d) + ' kW';
}

function formatNum(v, suffix='') {

  if (v === undefined || v === null || isNaN(v)) return '--';
  const n = Number(v);
  // If configured for kW, convert automatically from W
  if (units.power === 'kW') {
    return (n / 1000).toFixed(2) + ' kW';
  }
  return n.toFixed(0) + ' W';
}

function formatNum(v, suffix='') {

  if (v === undefined || v === null || isNaN(v)) return '--';
  return Number(v).toFixed(1) + (suffix || '');
}


function formatPricePerKwh(v){
  if (v===undefined || v===null || isNaN(v)) return '--';
  const n = Number(v);
  // assume €/kWh if v < 10, else probably ct/kWh
  if (n < 10) return n.toFixed(3) + ' €/kWh';
  return (n/100).toFixed(2) + ' €/kWh'; // if provided in ct
}

// ------------------------------
// Wetter (optional)
// ------------------------------
function _fmtTempC(v){
  if (v === undefined || v === null || isNaN(v)) return '-- °C';
  return Number(v).toFixed(1) + ' °C';
}
function _fmtPct(v){
  if (v === undefined || v === null || isNaN(v)) return '-- %';
  return Number(v).toFixed(0) + ' %';
}
function _fmtKmh(v){
  if (v === undefined || v === null || isNaN(v)) return '-- km/h';
  return Number(v).toFixed(0) + ' km/h';
}
function _fmtTimeHHmm(ts){
  if (!ts || isNaN(Number(ts))) return '—';
  const d = new Date(Number(ts));
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return hh + ':' + mm;
}
function _pickWeatherIcon(code, text){
  const t = (text == null ? '' : String(text)).toLowerCase();
  const c = (code == null || isNaN(Number(code))) ? null : Number(code);

  // Open‑Meteo/WMO style codes (optional)
  if (c != null) {
    if (c === 0) return '☀️';
    if (c >= 1 && c <= 3) return '⛅';
    if (c === 45 || c === 48) return '🌫️';
    if (c >= 51 && c <= 57) return '🌦️';
    if (c >= 61 && c <= 67) return '🌧️';
    if (c >= 71 && c <= 77) return '🌨️';
    if (c >= 80 && c <= 82) return '🌧️';
    if (c >= 95 && c <= 99) return '⛈️';
  }

  // Text heuristics (DE/EN)
  if (t.includes('sonn') || t.includes('sun') || t.includes('klar') || t.includes('clear')) return '☀️';
  if (t.includes('wol') || t.includes('cloud') || t.includes('overcast')) return '☁️';
  if (t.includes('regen') || t.includes('rain') || t.includes('shower')) return '🌧️';
  if (t.includes('schnee') || t.includes('snow')) return '🌨️';
  if (t.includes('nebel') || t.includes('fog') || t.includes('mist')) return '🌫️';
  if (t.includes('gewitter') || t.includes('thunder') || t.includes('storm')) return '⛈️';
  return '🌤️';
}
function setWidth(id, pct) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width = Math.max(0, Math.min(100, pct || 0)) + '%';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
}

// ------------------------------
// Energiefluss: dynamische Extra-Kreise (Verbraucher/Erzeuger)
// ------------------------------
function _svgEl(tag, attrs){
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) {
    for (const [k,v] of Object.entries(attrs)) {
      if (v === undefined || v === null) continue;
      el.setAttribute(k, String(v));
    }
  }
  return el;
}

function initEnergyWebExtras(flowSlots){
  // Optional additional producers/consumers for the Energy-Flow monitor.
  // They are configured in the App-Center (Energiefluss-Monitor -> Verbraucher/Erzeuger).
  // Only mapped items (a datapoint is selected) will be rendered.

  const maxConsumers = 9;
  const maxProducers = 5;

  // Backward compatible: older builds used flowOptionalConsumers/flowOptionalProducers
  const consumersAll = (flowSlots && (flowSlots.consumers || flowSlots.flowOptionalConsumers)) ? (flowSlots.consumers || flowSlots.flowOptionalConsumers) : [];
  const producersAll = (flowSlots && (flowSlots.producers || flowSlots.flowOptionalProducers)) ? (flowSlots.producers || flowSlots.flowOptionalProducers) : [];

  const consumers = consumersAll.filter(x => x && x.mapped).slice(0, maxConsumers);
  const producers = producersAll.filter(x => x && x.mapped).slice(0, maxProducers);

  // keep meta information (e.g. EVCS availability)
  // (newer builds expose this as flowSlots.meta.evcsAvailable)
  flowExtras = {
    consumers: [],
    producers: [],
    special: [],
    meta: {
      evcsAvailable: !!(flowSlots && ((flowSlots.meta && flowSlots.meta.evcsAvailable) || flowSlots.evcsAvailable))
    }
  };

  const gNodes = document.getElementById('flowExtraNodes');
  const gLines = document.getElementById('flowExtraLines');
  if (!gNodes || !gLines) return;

  // reset existing
  gNodes.innerHTML = '';
  gLines.innerHTML = '';

  // --- dynamic sizing to keep everything inside the tile ---
  const nCons = consumers.length;
  const nProd = producers.length;

  // --- dynamic tile height (more nodes => more vertical room for labels + status line) ---
  // Default height is responsive via CSS. Only if the user configures many optional nodes
  // we increase the minimum height a little so labels and the status line never feel cramped.
  try {
    const wrap = document.querySelector('.card.energy-web .web-wrap');
    if (wrap) {
      const extraCons = (nCons >= 9) ? 120 : (nCons >= 8) ? 80 : (nCons >= 7) ? 40 : 0;
      const extraProd = (nProd >= 5) ? 40 : (nProd >= 4) ? 20 : 0;
      const extra = extraCons + extraProd;

      if (extra > 0) {
        const base = 600;
        const minH = Math.min(780, base + extra);
        wrap.style.setProperty('--flowMinH', `${minH}px`);
      } else {
        wrap.style.removeProperty('--flowMinH');
      }
    }
  } catch(_e) {}

  // Circle sizing:
  // Keep optional nodes readable while reserving more whitespace for labels.
  // Producers in particular tend to have longer labels (e.g. "Erzeuger X").
  const rConsumer = (nCons >= 9) ? 26 : (nCons >= 7) ? 28 : (nCons >= 5) ? 30 : 32;
  const rProducer = rConsumer; // same size as consumers (optically consistent)

  // anchor points (must match SVG positions)
  const ANCHOR_BUILDING = { x: 300, y: 300 };
  const ANCHOR_PV = { x: 300, y: 160 };

  // Respect the SVG viewBox (the energy-flow tile can be widened without changing Y-space).
  // This keeps the placement logic robust if the viewBox is adjusted in the markup.
  const svg = document.getElementById('energyWebSvg');
  const vb = (svg && svg.viewBox && svg.viewBox.baseVal) ? svg.viewBox.baseVal : null;

  let VB_MIN_X = 0;
  let VB_MIN_Y = 0;
  let VB_W = 600;
  let VB_H = 600;

  // Prefer the parsed viewBox (fast path), but fall back to the raw attribute if needed.
  if (
    vb &&
    Number.isFinite(vb.x) &&
    Number.isFinite(vb.y) &&
    Number.isFinite(vb.width) &&
    Number.isFinite(vb.height) &&
    vb.width > 0 &&
    vb.height > 0
  ) {
    VB_MIN_X = vb.x;
    VB_MIN_Y = vb.y;
    VB_W = vb.width;
    VB_H = vb.height;
  } else if (svg) {
    const vbStr = svg.getAttribute('viewBox') || svg.getAttribute('viewbox') || '';
    const parts = vbStr.trim().split(/[ ,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      VB_MIN_X = parts[0];
      VB_MIN_Y = parts[1];
      VB_W = parts[2];
      VB_H = parts[3];
    }
  }
  const VB_MAX_X = VB_MIN_X + VB_W;
  const VB_MAX_Y = VB_MIN_Y + VB_H;

  const placeItem = (item, x, y, kind, idx, rNode) => {
    const isProducer = kind === 'producer';
    const idBase = `${kind}${idx + 1}`;
    const nodeId = `node_${idBase}`;
    const lineId = `line_${idBase}`;
    const valId = `val_${idBase}`;

    // stateKey is the key used in the /api/state payload
    // (e.g. 'consumer1Power', 'producer2Power', 'consumptionHeating' ...)
    const stateKey = (item && (item.stateKey || item.dpKey || item.key)) ? String(item.stateKey || item.dpKey || item.key) : '';

    const lineClass = isProducer ? 'flow pv extra' : 'flow consumer extra';

    // Flow direction:
    // - producers: from producer -> PV (incoming to PV)
    // - consumers: from building -> consumer (outgoing from building)
    const x1 = isProducer ? x : ANCHOR_BUILDING.x;
    const y1 = isProducer ? y : ANCHOR_BUILDING.y;
    const x2 = isProducer ? ANCHOR_PV.x : x;
    const y2 = isProducer ? ANCHOR_PV.y : y;

    // line (created with coordinates right away; updateEnergyWebExtras only updates opacity)
    const line = _svgEl('line', {
      id: lineId,
      class: lineClass,
      x1,
      y1,
      x2,
      y2
    });
    gLines.appendChild(line);

    // node
    const g = _svgEl('g', { id: nodeId, class: `node extra ${kind}` });
    g.setAttribute('transform', `translate(${x},${y})`);

    // Label (truncate very long names to avoid overlaps; full name on hover via <title>)
    const rawLabel = (item && item.name) ? String(item.name) : (isProducer ? `PV${idx + 1}` : `Verbrauch${idx + 1}`);
    const maxLabelLen = isProducer ? 14 : 14;
    const shortLabel = (rawLabel.length > maxLabelLen) ? (rawLabel.slice(0, Math.max(0, maxLabelLen - 1)) + '…') : rawLabel;
    if (shortLabel !== rawLabel) {
      const titleEl = _svgEl('title');
      titleEl.textContent = rawLabel;
      g.appendChild(titleEl);
    }

    const ring = _svgEl('circle', { class: `ring ${kind}`, r: rNode });
    g.appendChild(ring);

    // watermark icon (emoji)
    const icoVal = (item && item.icon) ? String(item.icon) : '';
    const ico = icoVal || (isProducer ? '⚡' : '🔌');
    const icoText = _svgEl('text', { class: 'ico', y: 6, 'text-anchor': 'middle' });
    const tspan = _svgEl('tspan', { class: 'icoTxt' });
    tspan.textContent = ico;
    icoText.appendChild(tspan);
    g.appendChild(icoText);

    // value above
    const valEl = _svgEl('text', { id: valId, class: 'val', y: -(rNode + 8), 'text-anchor': 'middle' });
    valEl.textContent = '0.00 kW';
    g.appendChild(valEl);

    // label below
    const lblEl = _svgEl('text', { class: 'lbl', y: (rNode + 16), 'text-anchor': 'middle' });
    lblEl.textContent = shortLabel;
    g.appendChild(lblEl);

    gNodes.appendChild(g);

    // Enable click-to-open control modal for steerable (QC-enabled) slots.
    // This matches the UX of the EVCS node and makes *all* steerable devices accessible
    // directly from the Energiefluss view.
    try {
      if (item && item.qc && item.qc.enabled) {
        g.classList.add('clickable');
        g.style.cursor = 'pointer';
        g.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const openKind = (kind === 'producers' || kind === 'producer') ? 'producer' : 'consumer';
      const openIdx = (item && item.idx != null) ? Number(item.idx) : (idx + 1);
      openFlowQc(openKind, openIdx);
        });
      }
    } catch(_e) {}

    const slot = {
      key: item && item.key != null ? item.key : undefined,
      stateKey,
      name: item && item.name != null ? item.name : undefined,
      icon: item && item.icon != null ? item.icon : undefined,
      nodeId,
      valId,
      lineId,
      kind
    };

    if (isProducer) flowExtras.producers.push(slot);
    else flowExtras.consumers.push(slot);
  };



// --- Special producers (BHKW / Generator) ---
// Reserved lower-left area between grid and battery.
const _readTranslate = (id, fallback) => {
  try {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const tr = el.getAttribute('transform') || '';
    const m = tr.match(/translate\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/);
    if (m) {
      const x = Number(m[1]);
      const y = Number(m[2]);
      if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    }
  } catch(_e) {}
  return fallback;
};

const placeSpecialProducer = (item, x, y, role, rNode) => {
  const safeRole = String(role || 'special').replace(/[^a-zA-Z0-9_-]/g, '');
  const nodeId = `node_special_${safeRole}`;
  const lineId = `line_special_${safeRole}`;
  const valId  = `val_special_${safeRole}`;

  // line: from special producer -> building
  const line = _svgEl('line', {
    id: lineId,
    class: 'flow battery extra',
    x1: x,
    y1: y,
    x2: ANCHOR_BUILDING.x,
    y2: ANCHOR_BUILDING.y
  });
  gLines.appendChild(line);

  const g = _svgEl('g', { id: nodeId, class: `node extra producer special ${safeRole}` });
  g.setAttribute('transform', `translate(${x},${y})`);

  // label (truncate very long names; full name on hover via <title>)
  const rawLabel = (item && item.name) ? String(item.name) : (safeRole === 'bhkw' ? 'BHKW' : (safeRole === 'generator' ? 'Generator' : 'Erzeuger'));
  const maxLabelLen = 14;
  const shortLabel = (rawLabel.length > maxLabelLen) ? (rawLabel.slice(0, Math.max(0, maxLabelLen - 1)) + '…') : rawLabel;
  if (shortLabel !== rawLabel) {
    const titleEl = _svgEl('title');
    titleEl.textContent = rawLabel;
    g.appendChild(titleEl);
  }

  const ring = _svgEl('circle', { class: 'ring battery', r: rNode });
  g.appendChild(ring);

  // watermark icon (emoji)
  const icoVal = (item && item.icon) ? String(item.icon) : '';
  const ico = icoVal || (safeRole === 'bhkw' ? '🏭' : (safeRole === 'generator' ? '⚙️' : '⚡'));
  const icoText = _svgEl('text', { class: 'ico', y: 6, 'text-anchor': 'middle' });
  const tspan = _svgEl('tspan', { class: 'icoTxt' });
  tspan.textContent = ico;
  icoText.appendChild(tspan);
  g.appendChild(icoText);

  // value above
  const valEl = _svgEl('text', { id: valId, class: 'val', y: -(rNode + 8), 'text-anchor': 'middle' });
  valEl.textContent = '0.00 kW';
  g.appendChild(valEl);

  // label below
  const lblEl = _svgEl('text', { class: 'lbl', y: (rNode + 16), 'text-anchor': 'middle' });
  lblEl.textContent = shortLabel;
  g.appendChild(lblEl);

  gNodes.appendChild(g);

  flowExtras.special.push({
    role: safeRole,
    devices: (item && Array.isArray(item.devices)) ? item.devices : [],
    nodeId,
    valId,
    lineId
  });
};

const placeSpecialLowerLeftArc = (items) => {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return;

  // Place specials (BHKW / Generator) on the lower-left arc of the same ellipse ring.
  // This keeps the outer circle "clean" and avoids crowding between grid and battery.
  const n = list.length;

  // Angles (deg) in SVG coordinates (0° = right, 90° = down).
  // Two nodes: one slightly more "left" (BHKW), one slightly more "down" (Generator).
  const preset = (n === 1)
    ? [150]
    : (n === 2)
      ? [155, 140]
      : null;

  const loDeg = 165; // closer to grid/left
  const hiDeg = 120; // closer to battery/down

  // Clamp so labels never clip the viewBox
  const pad = 14;
  const xMin = VB_MIN_X + pad + rConsumer;
  const xMax = VB_MAX_X - pad - rConsumer;
  const yMin = VB_MIN_Y + pad + rConsumer + 26;
  const yMax = VB_MAX_Y - pad - rConsumer - 34;

  for (let i = 0; i < n; i++) {
    const it = list[i] || {};
    const role = it.role || (i === 0 ? 'bhkw' : 'generator');

    const aDeg = preset
      ? preset[Math.min(preset.length - 1, i)]
      : (n <= 1 ? 150 : (loDeg + (hiDeg - loDeg) * (i / (n - 1))));

    const a = aDeg * Math.PI / 180;
    let x = ringCx + rx * Math.cos(a);
    let y = ringCy + ry * Math.sin(a);

    if (Number.isFinite(xMin) && Number.isFinite(xMax)) x = Math.max(xMin, Math.min(xMax, x));
    if (Number.isFinite(yMin) && Number.isFinite(yMax)) y = Math.max(yMin, Math.min(yMax, y));

    placeSpecialProducer(it, x, y, role, rProducer);
  }
};


  // --- optional ring placement (symmetrical) ---
  // User request: producers should mirror consumers in spacing.
  // If both sides are populated, the optional nodes form a clean circle/ellipse around the center.
  const margin = 14;
  const ringCx = ANCHOR_BUILDING.x;
  const ringCy = ANCHOR_BUILDING.y;

  // Use the largest node radius so *both* producers and consumers stay within the SVG viewBox.
  const rMaxNode = Math.max(rConsumer, rProducer);

  // Ellipse radii, clamped so every node stays inside the SVG viewBox.
  const rxMaxRight = (VB_MAX_X - margin - rMaxNode) - ringCx;
  const rxMaxLeft = ringCx - (VB_MIN_X + margin + rMaxNode);
  const rx = Math.max(0, Math.min(rxMaxRight, rxMaxLeft));

  const ryMaxTop = ringCy - (VB_MIN_Y + margin + rMaxNode);
  const ryMaxBottom = (VB_MAX_Y - margin - rMaxNode) - ringCy;
  const ry = Math.max(0, Math.min(ryMaxTop, ryMaxBottom));

  // Avoid the very top/bottom so the value/label texts never clip.
  const spanDeg = 80;

  // Consumers: right arc (top-right -> bottom-right)
  const placeConsumersRightArc = (items) => {
    const n = items.length;
    if (!n) return;

    const startDeg = -spanDeg;
    const endDeg = spanDeg;
    const stepDeg = (n <= 1) ? 0 : ((endDeg - startDeg) / (n - 1));

	    for (let i = 0; i < n; i++) {
	      // If there is only a single optional consumer, avoid placing it exactly on the
	      // EVCS horizontal axis (y=300) to prevent the visual impression that the
	      // consumer is "behind" the EVCS. A small upward offset keeps the diagram clear.
	      const aDeg = (n <= 1) ? -25 : (startDeg + stepDeg * i);
      const a = aDeg * Math.PI / 180;
      const x = ringCx + rx * Math.cos(a);
      const y = ringCy + ry * Math.sin(a);
      placeItem(items[i], x, y, 'consumer', i, rConsumer);
    }
  };

  // Producers: upper-left arc (top-left -> left-middle)
  // Lower-left is reserved for future Generator/BHKW nodes.
  const placeProducersLeftArc = (items) => {
    const n = items.length;
    if (!n) return;

    const startDeg = 180 + spanDeg; // top-left
    const endDeg = 180;             // left-middle (keep producers in upper area)
    const stepDeg = (n <= 1) ? 0 : ((endDeg - startDeg) / (n - 1));

    for (let i = 0; i < n; i++) {
      const aDeg = (n <= 1) ? (180 + spanDeg/2) : (startDeg + stepDeg * i);
      const a = aDeg * Math.PI / 180;
      const x = ringCx + rx * Math.cos(a);
      const y = ringCy + ry * Math.sin(a);
      placeItem(items[i], x, y, 'producer', i, rProducer);
    }
  };

  placeProducersLeftArc(producers);
  placeConsumersRightArc(consumers);


// --- BHKW / Generator (lower-left) ---
try {
  const bhkwAll = Array.isArray(window.__nwBhkwDevices) ? window.__nwBhkwDevices : [];
  const genAll  = Array.isArray(window.__nwGeneratorDevices) ? window.__nwGeneratorDevices : [];

  // For Energiefluss display we only require a valid power datapoint.
  // Start/Stop mappings are needed for control, but not for monitoring/visualization.
  const bhkwVisible = bhkwAll.filter(d => d && d.showInLive !== false && d.enabled !== false && d.hasPower);
  const genVisible  = genAll.filter(d => d && d.showInLive !== false && d.enabled !== false && d.hasPower);

  const specials = [];
  if (bhkwVisible.length) {
    specials.push({
      role: 'bhkw',
      name: (bhkwVisible.length === 1 && bhkwVisible[0] && bhkwVisible[0].name) ? String(bhkwVisible[0].name) : 'BHKW',
      icon: '🏭',
      devices: bhkwVisible
    });
  }
  if (genVisible.length) {
    specials.push({
      role: 'generator',
      name: (genVisible.length === 1 && genVisible[0] && genVisible[0].name) ? String(genVisible[0].name) : 'Generator',
      icon: '⚙️',
      devices: genVisible
    });
  }

  placeSpecialLowerLeftArc(specials);
} catch(_e) {}

  // Hide EVCS node if not available
  const nodeEvcs = document.getElementById('nodeEvcs');
  if (nodeEvcs) nodeEvcs.style.display = flowExtras.meta.evcsAvailable ? '' : 'none';
}

function updateEnergyWebExtras(d){
  let consumersSum = 0;
  const show = (id, abs) => {
    const el = document.getElementById(id);
    if (!el) return;
    const a = Math.max(0, Number(abs) || 0);
    // ähnliche Skala wie Hauptlinien, aber etwas feiner für kleine Verbraucher
    const v = Math.min(1, a / 2000);
    el.style.opacity = (a > 1) ? String(0.15 + 0.85 * v) : '0.15';
  };
  const setRev = (id, rev) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('rev', !!rev);
  };
  const setNodeActive = (nodeId, active) => {
    const el = document.getElementById(nodeId);
    if (!el) return;
    el.style.opacity = active ? '1' : '0.45';
  };

  // Produzenten
  if (flowExtras && Array.isArray(flowExtras.producers)) {
    for (const it of flowExtras.producers) {
      const val = Number(d(it.stateKey)) || 0;
      const abs = Math.abs(val);
      setText(it.valId, formatFlowPower(Math.round(abs)));
      show(it.lineId, abs);
      // Erzeugung soll optisch immer "zum Gebäude" laufen (keine Richtungsumschaltung).
      // Das verhindert Flackern durch Vorzeichen-Schwankungen um 0W oder uneinheitliche Vorzeichenkonventionen.
      setRev(it.lineId, false);
      setNodeActive(it.nodeId, abs > 1);
    }
  }



// BHKW / Generator (special producers)
const sumSpecialPower = (role, devices) => {
  const r = String(role || '').toLowerCase();
  const pre = (r === 'bhkw') ? 'bhkw.devices.b' : (r === 'generator') ? 'generator.devices.g' : '';
  if (!pre || !Array.isArray(devices)) return 0;
  let sum = 0;
  for (const dev of devices) {
    const idx = Number(dev && dev.idx);
    if (!idx) continue;
    const v0 = Number(d(`${pre}${idx}.powerW`));
    if (Number.isFinite(v0)) sum += v0;
  }
  return sum;
};

if (flowExtras && Array.isArray(flowExtras.special)) {
  for (const it of flowExtras.special) {
    const val = sumSpecialPower(it.role, it.devices);
    const abs = Math.abs(val);
    setText(it.valId, formatFlowPower(Math.round(abs)));
    show(it.lineId, abs);
    // BHKW/Generator: Erzeugung immer zum Gebäude (keine Richtungsumschaltung)
    setRev(it.lineId, false);
    setNodeActive(it.nodeId, abs > 1);
  }
}

  // Verbraucher
  if (flowExtras && Array.isArray(flowExtras.consumers)) {
    for (const it of flowExtras.consumers) {
      const val = Number(d(it.stateKey)) || 0;
      const abs = Math.abs(val);
      consumersSum += abs;
      setText(it.valId, formatFlowPower(Math.round(abs)));
      show(it.lineId, abs);
      setRev(it.lineId, val < 0);
      setNodeActive(it.nodeId, abs > 1);
    }
  }

  return consumersSum;
}

function setRingSegment(cls, pct) {
  const max = 2 * Math.PI * 42; // circumference
  const v = Math.max(0, Math.min(100, pct || 0));
  const dash = (v / 100) * max;
  const rest = max - dash;
  const el = document.querySelector?.('.ring .seg.' + cls);
  if (el) el.setAttribute('stroke-dasharray', `${dash} ${rest}`);
}

function computeDerived() {
  // derive some percentages if not provided
  const pv = pick('pvPower', 'productionTotal');
  const load = pick('consumptionTotal');
  const buy = pick('gridBuyPower');
  const sell = pick('gridSellPower');

  const autarky = get('autarky');
  const selfc = get('selfConsumption');

  const res = {};
  if (autarky == null && pv != null && load != null) {
    // simple heuristic: share of load supplied by PV + battery (ignore battery for simplicity)
    const suppliedByPv = Math.max(0, Math.min(100, (pv / Math.max(1, load)) * 100));
    res.autarky = Math.max(0, Math.min(100, suppliedByPv));
  }
  if (selfc == null && pv != null) {
    // share of production used locally (pv - sell)/pv
    const local = Math.max(0, pv - (sell || 0));
    const pct = pv > 0 ? (local / pv) * 100 : 0;
    res.selfConsumption = Math.max(0, Math.min(100, pct));
  }
  return res;

  function get(k){ return state[k]?.value; }
  function pick(...keys){
    for (const k of keys) { const v = get(k); if (v != null && !isNaN(v)) return Number(v); }
    return null;
  }
}


function coerceNumber(v){
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  // allow "19", "19.5", "19,5", "19 %"
  const cleaned = s.replace(/%/g, '').replace(/\s+/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}
function clamp01(v, lo, hi){
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  return Math.max(lo, Math.min(hi, v));
}

function render() {
  const s = state;

  const d = (k) => s[k]?.value;

  // Top ring values: map PV, Grid, Load, Bat flows to percent of max for visualization
  const sfEnabled = !!(s['storageFarm.enabled']?.value);
  const dpCfg = (window.__nwCfg && window.__nwCfg.datapoints) ? window.__nwCfg.datapoints : {};
  const pvMapped = !!(dpCfg && (dpCfg.pvPower || dpCfg.productionTotal));

  // PV (W): primary from mapped PV datapoint; fallback to productionTotal if used as power DP.
  let pv = d('pvPower') ?? d('productionTotal');
  pv = (pv == null || isNaN(Number(pv))) ? 0 : Number(pv);

  // Speicherfarm (DC‑PV): im Farm‑Modus zur PV‑Erzeugung addieren (oder ersetzen, wenn kein PV‑DP gemappt ist).
  if (sfEnabled) {
    const pvFarmRaw = d('storageFarm.totalPvPowerW');
    const pvFarm = (pvFarmRaw == null || isNaN(Number(pvFarmRaw))) ? 0 : Number(pvFarmRaw);
    if (pvFarm > 0) {
      if (!pvMapped || pv === 0) {
        pv = pvFarm;
      } else {
        const sign = pv < 0 ? -1 : 1;
        const pvAbs = Math.abs(pv);
        const relDiff = Math.abs(pvAbs - pvFarm) / Math.max(1, pvFarm);
        if (relDiff < 0.05) pv = sign * pvFarm;
        else pv = pv + (sign * pvFarm);
      }
    }
  }

  const load = d('consumptionTotal');
  const buy = d('gridBuyPower');
  const sell = d('gridSellPower');
  let charge = d('storageChargePower');
  let discharge = d('storageDischargePower');
  let soc = d('storageSoc');

  if (sfEnabled) {
    const c = d('storageFarm.totalChargePowerW');
    const dch = d('storageFarm.totalDischargePowerW');
    const socAvg = d('storageFarm.totalSoc');
    const socMedian = d('storageFarm.medianSoc');
    if (c != null && !isNaN(Number(c))) charge = c;
    if (dch != null && !isNaN(Number(dch))) discharge = dch;
    // Im Farm‑Modus bevorzugen wir den Durchschnitt (Ø), Median bleibt als Fallback.
    if (socAvg != null && !isNaN(Number(socAvg))) soc = socAvg;
    else if (socMedian != null && !isNaN(Number(socMedian))) soc = socMedian;
  }

  const maxVal = Math.max(1, ...[pv, load, buy, sell, charge, discharge].filter(x => typeof x === 'number').map(Math.abs));
  const pct = (v) => typeof v === 'number' ? (Math.abs(v) / maxVal) * 100 : 0;

  setRingSegment('pv', pct(pv));
  setRingSegment('grid', pct((buy||0)+(sell||0)));
  setRingSegment('load', pct(load));
  setRingSegment('bat', pct((charge||0)+(discharge||0)));

  setText('pvPower', formatPower(pv ?? 0));
  setText('gridBuyPower', formatPower(buy ?? 0));
  setText('gridSellPower', formatPower(sell ?? 0));
  const batPower = (charge||0) - (discharge||0);
  setText('storagePower', formatPower(batPower));
  setText('consumptionTotal', formatPower(load ?? 0));

  // Cards
  const derived = computeDerived();
  const autarky = d('autarky') ?? derived.autarky;
  const selfc = d('selfConsumption') ?? derived.selfConsumption;

  const autarkyN = clamp01(coerceNumber(autarky), 0, 100);
  const selfcN = clamp01(coerceNumber(selfc), 0, 100);
  const socN = clamp01(coerceNumber(soc), 0, 100);

  setWidth('autarkyBar', autarkyN ?? 0);
  setText('autarkyValue', (autarkyN != null ? autarkyN.toFixed(0) : '--') + ' %');

  setWidth('selfConsumptionBar', selfcN ?? 0);
  setWidth('selfVerbrauchBar', selfcN ?? 0);
  setText('selfConsumptionValue', (selfcN != null ? selfcN.toFixed(0) : '--') + ' %');
  setText('selfVerbrauchValue', (selfcN != null ? selfcN.toFixed(0) : '--') + ' %');

  setWidth('storageSocBar', socN ?? 0);
  setText('storageSocValue', (socN != null ? socN.toFixed(0) : '--') + ' %');

  setText('storageChargePower', formatPower(charge ?? 0));
  setText('storageLadenPower', formatPower(charge ?? 0));
  setText('storageDischargePower', formatPower(discharge ?? 0));
  setText('storageEntladenPower', formatPower(discharge ?? 0));

  setText('gridBuyPowerCard', formatPower(buy ?? 0));
  setText('gridSellPowerCard', formatPower(sell ?? 0));
  setText('gridEnergyKwh', (d('gridEnergyKwh')!=null? Number(d('gridEnergyKwh')).toFixed(2)+' kWh':'--'));
  setText('productionEnergyKwh', (d('productionEnergyKwh')!=null? Number(d('productionEnergyKwh')).toFixed(2)+' kWh':'--'));
  const pvEnergyKwh = coerceNumber(d('productionEnergyKwh'));
  const co2FromPvT = pvEnergyKwh != null ? (pvEnergyKwh * 0.0004) : null; // 0.4 kg CO₂ / kWh -> t CO₂
  const co2Dp = d('co2Savings');
  setText('co2Savings', (co2Dp != null ? (isNaN(Number(co2Dp)) ? String(co2Dp) : Number(co2Dp).toFixed(1) + ' t') : (co2FromPvT != null ? co2FromPvT.toFixed(1) + ' t' : '--')));


  setText('productionTotal', formatPower(d('productionTotal') ?? pv ?? 0));
  const gfN = coerceNumber(d('gridFrequency'));
  setText('gridFrequency', gfN != null ? gfN.toFixed(2) + ' Hz' : '--');

  setText('consumptionEvcs', formatPower(d('consumptionEvcs') ?? 0));
  setText('consumptionEnergyKwh', (d('consumptionEnergyKwh')!=null? Number(d('consumptionEnergyKwh')).toFixed(2)+' kWh':'--'));
  setText('consumptionBuilding', formatPower(d('consumptionTotal') ?? 0));

  // EVCS status: prefer per-connector status (single wallbox) and fall back to legacy dp
  const evcsSt = d('evcsStatus') ?? d('evcs.1.status') ?? d('chargingManagement.wallboxes.lp1.status') ?? '--';
  setText('evcsStatus', evcsSt);
  const lastChargeN = coerceNumber(d('evcsLastChargeKwh'));
  setText('evcsLastChargeKwh', lastChargeN != null ? lastChargeN.toFixed(2) + ' kWh' : '--');
  if (window.__evcsApply) window.__evcsApply(d, state);

  // Wetter (optional) – rein UI, frei mappbar im App‑Center
  try {
    const wTemp = coerceNumber(d('weatherTempC'));
    const wText = d('weatherText');
    const wCode = coerceNumber(d('weatherCode'));
    const wWind = coerceNumber(d('weatherWindKmh'));
    const wCloud = coerceNumber(d('weatherCloudPct'));
    const wLoc = d('weatherLocation');
    const hasWeather = (wTemp != null) || (wCode != null) || (wText != null && String(wText).trim() !== '');

    // Icon
    const iconEl = document.getElementById('weatherIconCircle');
    if (iconEl) iconEl.textContent = hasWeather ? _pickWeatherIcon(wCode, wText) : '🌡️';

    // Location
    setText('weatherLocation', (wLoc != null && String(wLoc).trim() ? String(wLoc) : 'Standort'));

    // Values
    setText('weatherTemp', _fmtTempC(wTemp));
    const cond = (wText != null && String(wText).trim() !== '') ? String(wText) : (wCode != null ? ('Code ' + Number(wCode)) : (hasWeather ? '—' : 'Nicht konfiguriert'));
    setText('weatherCondition', cond);
    setText('weatherWind', _fmtKmh(wWind));
    setText('weatherCloud', _fmtPct(wCloud));

    // Timestamp (prefer temperature, else any other weather dp)
    const wTs = s.weatherTempC?.ts || s.weatherText?.ts || s.weatherCode?.ts || s.weatherWindKmh?.ts || s.weatherCloudPct?.ts;
    setText('weatherUpdated', hasWeather && wTs ? ('aktualisiert ' + _fmtTimeHHmm(wTs)) : '—');

    // Hint only if not configured
    const hintEl = document.getElementById('weatherHint');
    if (hintEl) hintEl.style.display = hasWeather ? 'none' : '';
  } catch (_e) {}

  // Settings: RFID learning UI state (if present)
  try {
    if (typeof window.__nwApplyRfidLearningUi === 'function') window.__nwApplyRfidLearningUi();
  } catch (_e) {}

  // Speicherfarm Übersicht (read-only, Endnutzer)
  try { if (typeof storageFarmApply === 'function') storageFarmApply(); } catch (_e) {}
}

async function bootstrap() {
  let cfg = {};
  try {
    const cfgRes = await fetch('/config');
    cfg = await cfgRes.json();
    units = cfg.units || units;

    // Global config snapshot for UI helpers
    try { window.__nwCfg = cfg || {}; } catch(_e) { window.__nwCfg = {}; }
    // EMS-App Installations-/Aktiv-Status (nur Flags) – steuert dynamische Sichtbarkeit in der VIS
    try { window.__nwEmsApps = (cfg && cfg.emsApps && typeof cfg.emsApps === 'object') ? cfg.emsApps : { apps: {} }; } catch(_e) { window.__nwEmsApps = { apps: {} }; }
    try { window.__nwThresholdRules = (cfg && cfg.thresholdRules) ? cfg.thresholdRules : []; } catch(_e) { window.__nwThresholdRules = []; }
    try { window.__nwRelayControls = (cfg && cfg.relayControls) ? cfg.relayControls : []; } catch(_e) { window.__nwRelayControls = []; }
    try { window.__nwBhkwDevices = (cfg && cfg.bhkwDevices) ? cfg.bhkwDevices : []; } catch(_e) { window.__nwBhkwDevices = []; }
    try { window.__nwGeneratorDevices = (cfg && cfg.generatorDevices) ? cfg.generatorDevices : []; } catch(_e) { window.__nwGeneratorDevices = []; }

    // EMS UI flags (Phase 4.7)
    try { window.__nwEmsCfg = (cfg && cfg.ems) ? cfg.ems : {}; } catch(_e) { window.__nwEmsCfg = {}; }

    // Energiefluss: optionale Verbraucher/Erzeuger (Slots) initialisieren
    flowSlotsCfg = cfg.flowSlots || null;
    initEnergyWebExtras(flowSlotsCfg);
    try{
      const c = Number(cfg.settingsConfig && cfg.settingsConfig.evcsCount) || 1;
      window.__nwEvcsCount = c;
      const l = document.getElementById('menuEvcsLink');
      if (l) l.classList.toggle('hidden', c < 2);
      const t = document.getElementById('tabEvcs');
      if (t) t.classList.toggle('hidden', c < 2);
      const sh = !!(cfg.smartHome && cfg.smartHome.enabled);
      window.__nwSmartHomeEnabled = sh;
      const sl = document.getElementById('menuSmartHomeLink');
      if (sl) sl.classList.toggle('hidden', !sh);
      const st = document.getElementById('tabSmartHome');
      if (st) st.classList.toggle('hidden', !sh);

      // Speicherfarm Tab/Link
      const sf = !!(cfg.ems && cfg.ems.storageFarmEnabled);
      const sft = document.getElementById('tabStorageFarm');
      if (sft) sft.classList.toggle('hidden', !sf);
      const sfl = document.getElementById('menuStorageFarmLink');
      if (sfl) sfl.classList.toggle('hidden', !sf);
    }catch(_e){}
  } catch (e) {
    console.warn('[config]', e);
  }
// --- Config hot-reload ----------------------------------------------------
// If the App-Center changes "installed" flags, the backend updates installer.configJson.
// We refresh /config once so tiles + Energyflow slots update without a page reload.
let lastInstallerConfigJson = null;
let cfgReloadInFlight = false;
let cfgReloadPending = false;

const applyConfigSnapshot = (nextCfg) => {
  cfg = nextCfg || {};
  try { units = cfg.units || units; } catch (_e) {}

  // App-Center config
  window.__nwEmsApps = cfg.emsApps || { apps: {} };
  window.__nwThresholdRules = cfg.thresholdRules || [];
  window.__nwRelayControls = cfg.relayControls || [];
  window.__nwBhkwDevices = cfg.bhkwDevices || [];
  window.__nwGeneratorDevices = cfg.generatorDevices || [];

  // EMS config flags (used by tiles + menu visibility)
  try {
    window.__nwEmsCfg = (cfg && cfg.ems) ? cfg.ems : {};
  } catch (_e) {
    window.__nwEmsCfg = {};
  }

  // Energyflow slot mapping
  flowSlotsCfg = cfg.flowSlots || null;
  initEnergyWebExtras(flowSlotsCfg);

  // Dynamic menu/tab visibility
  try {
    const emsCfg = (cfg && cfg.ems) ? cfg.ems : {};

    // EVCS count lives in settingsConfig in /config (not in cfg.ems).
    // Keep __nwEvcsCount stable so the UI can reliably switch between
    // single-wallbox modal and multi-wallbox page.
    const evcsCountRaw = (cfg && cfg.settingsConfig && cfg.settingsConfig.evcsCount !== undefined && cfg.settingsConfig.evcsCount !== null)
      ? Number(cfg.settingsConfig.evcsCount)
      : Number(window.__nwEvcsCount);
    const evcsCount = Math.max(0, Math.round(Number.isFinite(evcsCountRaw) ? evcsCountRaw : 0));
    window.__nwEvcsCount = evcsCount;

    // EVCS page/tab is only relevant for multiple Ladepunkte.
    const showEvcsPage = evcsCount >= 2;
    const menuEvcsLink = document.getElementById('menuEvcsLink');
    const tabEvcs = document.getElementById('tabEvcs');
    if (menuEvcsLink) menuEvcsLink.classList.toggle('hidden', !showEvcsPage);
    if (tabEvcs) tabEvcs.classList.toggle('hidden', !showEvcsPage);

    // SmartHome enabled flag is part of cfg.smartHome
    window.__nwSmartHomeEnabled = !!(cfg && cfg.smartHome && cfg.smartHome.enabled);
    const menuSmartHomeLink = document.getElementById('menuSmartHomeLink');
    const tabSmartHome = document.getElementById('tabSmartHome');
    if (menuSmartHomeLink) menuSmartHomeLink.classList.toggle('hidden', !window.__nwSmartHomeEnabled);
    if (tabSmartHome) tabSmartHome.classList.toggle('hidden', !window.__nwSmartHomeEnabled);

    window.__nwStorageFarmEnabled = !!emsCfg.storageFarmEnabled;
    const menuStorageFarmLink = document.getElementById('menuStorageFarmLink');
    const tabStorageFarm = document.getElementById('tabStorageFarm');
    if (menuStorageFarmLink) menuStorageFarmLink.classList.toggle('hidden', !window.__nwStorageFarmEnabled);
    if (tabStorageFarm) tabStorageFarm.classList.toggle('hidden', !window.__nwStorageFarmEnabled);
  } catch (e) {
    console.warn('[config-apply]', e);
  }
};

const refreshConfig = async () => {
  if (cfgReloadInFlight) { cfgReloadPending = true; return; }
  cfgReloadInFlight = true;
  try {
    const nextCfg = await fetch('/config', { cache: 'no-store' }).then(r => r.json());
    applyConfigSnapshot(nextCfg);
    scheduleRender();
  } catch (e) {
    console.warn('[config-refresh]', e);
  } finally {
    cfgReloadInFlight = false;
    if (cfgReloadPending) {
      cfgReloadPending = false;
      refreshConfig();
    }
  }
};


  const snap = await fetch('/api/state').then(r => r.json());
  state = snap || {};
  try { lastInstallerConfigJson = (state && state['installer.configJson'] && state['installer.configJson'].value) || null; } catch (_e) {}
  // merge cfg.settings into state if missing (for initial checkbox values)
  try{
    if (cfg && cfg.settings){
      Object.keys(cfg.settings).forEach(k=>{
        const sk = 'settings.'+k;
        if (!state[sk]) state[sk] = { value: cfg.settings[k] };
      });
    }
  } catch(e){}

  window.latestState = state;
  scheduleRender();

  try { if (typeof setupSettings === 'function') setupSettings(); } catch (e) {}
  // Settings-UI muss nach dem Hydrate der Inputs erneut aktualisiert werden
  // (Labels/Sichtbarkeit reagieren nicht automatisch auf programmatic value changes)
  try { if (typeof initSettingsPanel === 'function') initSettingsPanel();
  try { bindToggleButtonGroups(); } catch(_e) {} } catch (e) {}

  // Optional modals (initialized once; visibility controlled by update*Ui)
  try { if (typeof initThresholdModal === 'function') initThresholdModal(); } catch (_e) {}
  try { if (typeof initRelayModal === 'function') initRelayModal(); } catch (_e) {}
  try { if (typeof initBhkwModal === 'function') initBhkwModal(); } catch (_e) {}
  try { if (typeof initGeneratorModal === 'function') initGeneratorModal(); } catch (_e) {}

  function startEvents(){
  try{
    const es = new EventSource('/events');
    const dot = document.getElementById('liveDot');
    if (dot) dot.classList.remove('live');
    es.onopen = () => { if (dot) dot.classList.add('live'); };
    es.onerror = () => { if (dot) dot.classList.remove('live'); try{ es.close(); }catch(_){ } setTimeout(startEvents, 3000); };
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'init' && msg.payload) { state = msg.payload; window.latestState = state; }
        else if (msg.type === 'update' && msg.payload) { Object.assign(state, msg.payload); window.latestState = state; }

        // App-Center config changed? Refresh /config so tiles + slot layout update without reload.
        try {
          const cfgJson = (state && state['installer.configJson'] && state['installer.configJson'].value);
          if (typeof cfgJson === 'string' && cfgJson !== lastInstallerConfigJson) {
            lastInstallerConfigJson = cfgJson;
            refreshConfig();
          }
        } catch (_e) {}

        scheduleRender();
      } catch (e) { console.warn(e); }
    };
  } catch(e){ console.warn('events', e); setTimeout(startEvents, 3000); }
}
startEvents();

}


// --- Menu & Settings ---
function initMenu(){
  const btn = document.getElementById('menuBtn');
  const menu = document.getElementById('menuDropdown');
  if (!btn || !menu) return;
  const open = ()=> menu.classList.toggle('hidden');
  const close = ()=> menu.classList.add('hidden');
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); open(); });
  menu.addEventListener('click', (e)=> e.stopPropagation());
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
  document.addEventListener('click', ()=> close());
  const settingsBtn = document.getElementById('menuOpenSettings');
  const installerBtn = document.getElementById('menuOpenInstaller');
  if (settingsBtn) settingsBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    close();
    // show settings section
    hideAllPanels();
    document.querySelector('.content').style.display = 'none';
    const sec = document.querySelector('[data-tab-content="settings"]');
    if (sec) sec.classList.remove('hidden');
      try{ if (typeof initSettingsPanel==='function') initSettingsPanel();
  try { bindToggleButtonGroups(); } catch(_e) {} }catch(_e){}
      try{ if (typeof setupSettings==='function') setupSettings(); }catch(_e){}
    // deactivate tab buttons
    document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
    // initialize settings UI
    // - First bind & load values
    // - Then normalize slider ranges + labels
    setupSettings();
    initSettingsPanel();
  try { bindToggleButtonGroups(); } catch(_e) {}
  try { initEmsControlModal(); } catch(_e) {}
  });
  }


function initSettingsPanel(){
  // Wichtig: diese Funktion wird an mehreren Stellen aufgerufen
  // (Menü, initial, ggf. nach State-Updates). Sie muss daher idempotent sein.

  // Force sliders to emit only discrete values.
  // - Tarif-Modus: 1..2 (Manuell/Automatisch)
  // - Priorität: 1..3 (Speicher/Auto/Ladestation)
  const p = document.getElementById('s_priority');
  const t = document.getElementById('s_tariffMode');

  const prLabel = document.getElementById('s_priority_label');
  const tmLabel = document.getElementById('s_tariffMode_label');

  const dynToggle = document.getElementById('s_dyn_toggle');
  const dynBlock = document.getElementById('dyn_settings_block');

  const updatePriorityLabel = ()=>{
    if (!p || !prLabel) return;
    const v = Number(p.value || 2);
    prLabel.textContent = (v === 1) ? 'Speicher' : (v === 3) ? 'Ladestation' : 'Auto';
  };
  const updateTariffModeLabel = ()=>{
    if (!t || !tmLabel) return;
    const v = Number(t.value || 1);
    tmLabel.textContent = (v === 2) ? 'Automatisch' : 'Manuell';
  };
  const updateDynVisibility = ()=>{
    if (!dynToggle || !dynBlock) return;
    dynBlock.hidden = !dynToggle.checked;
  };

  const normalizePriorityValue = ()=>{
    if (!p) return;
    let v = Number(p.value);
    if (!Number.isFinite(v)) v = 2;
    // Legacy: früher 0..100 (Slider-Mitte ~50). Wir mappen grob:
    //   >= 67 => Speicher, <= 33 => Ladestation, sonst => Auto.
    if (v > 3) {
      if (v >= 67) v = 1;
      else if (v <= 33) v = 3;
      else v = 2;
    }
    if (v < 1) v = 2;
    if (v > 3) v = 2;
    p.value = String(v);
  };
  const snapPriority = ()=>{
    if (!p) return;
    let v = Number(p.value);
    if (!Number.isFinite(v)) v = 2;
    if (v < 1.5) v = 1;
    else if (v < 2.5) v = 2;
    else v = 3;
    p.value = String(v);
    updatePriorityLabel();
  };
  const snapTariffMode = ()=>{
    if (!t) return;
    let v = Number(t.value);
    if (!Number.isFinite(v)) v = 1;
    t.value = String(v < 1.5 ? 1 : 2);
    updateTariffModeLabel();
  };

  // UI-Update immer ausführen (falls Werte programmgesteuert gesetzt wurden)
  updatePriorityLabel();
  updateTariffModeLabel();
  updateDynVisibility();

  // Listener nur einmal binden
  if (window.__nwSettingsPanelInit) return;
  window.__nwSettingsPanelInit = true;

  if (p) {
    p.min = 1; p.max = 3; p.step = 1;
    normalizePriorityValue();
    p.addEventListener('input', snapPriority);
    p.addEventListener('change', snapPriority);
  }
  if (t) {
    t.min = 1; t.max = 2; t.step = 1;
    t.addEventListener('input', snapTariffMode);
    t.addEventListener('change', snapTariffMode);
  }
  if (dynToggle) {
    dynToggle.addEventListener('change', updateDynVisibility);
  }

  // Test-Mail für Benachrichtigungen
  const notifyTestBtn = document.getElementById('notifyTestBtn');
  const notifyTestMsg = document.getElementById('notifyTestMsg');
  if (notifyTestBtn) {
    notifyTestBtn.addEventListener('click', async ()=>{
      try {
        notifyTestBtn.disabled = true;
        if (notifyTestMsg) notifyTestMsg.textContent = 'Sende Test-Mail...';
        const r = await fetch('/api/notify/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const j = await r.json().catch(()=>({ ok: false }));
        if (j && j.ok) {
          if (notifyTestMsg) notifyTestMsg.textContent = 'OK: Test-Mail wurde gesendet.';
        } else {
          const err = (j && j.error) ? j.error : (`HTTP ${r.status}`);
          if (notifyTestMsg) notifyTestMsg.textContent = 'Fehler: ' + err;
        }
      } catch (e) {
        if (notifyTestMsg) notifyTestMsg.textContent = 'Fehler: ' + (e && e.message ? e.message : String(e));
      } finally {
        try { notifyTestBtn.disabled = false; } catch (_e) {}
      }
    });
  }

  const LS_KEY = 'nexowatt.settings';
  let opts;
  try { opts = JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch(_) { opts = {}; }

  const elSoc = document.getElementById('optShowSocBadge');
  if (elSoc) {
    if (typeof opts.showSocBadge === 'undefined') opts.showSocBadge = true;
    elSoc.checked = !!opts.showSocBadge;
    const applySoc = ()=> {
      const t = document.getElementById('batterySocIn');
      if (t) t.style.display = elSoc.checked ? '' : 'none';
    };
    elSoc.addEventListener('change', ()=>{
      opts.showSocBadge = elSoc.checked;
      localStorage.setItem(LS_KEY, JSON.stringify(opts));
      applySoc();
    });
    applySoc();
  }

  const elRef = document.getElementById('optRefreshSec');
  if (elRef) {
    if (typeof opts.refreshSec === 'undefined') opts.refreshSec = 1;
    elRef.value = opts.refreshSec;
    elRef.addEventListener('change', ()=>{
      const v = Math.max(1, parseInt(elRef.value||'1', 10));
      opts.refreshSec = v;
      localStorage.setItem(LS_KEY, JSON.stringify(opts));
    });
  }
}



function applyInitialTabFromUrl(){
  try {
    const params = new URLSearchParams(window.location.search || '');
    const tab = String(params.get('tab') || '').trim().toLowerCase();
    if (!tab) return;

    let tries = 0;
    const maxTries = 20;
    const tryActivate = () => {
      tries++;
      const btn = document.querySelector(`.tabs .tab[data-tab="${tab}"]`);
      if (btn && !btn.classList.contains('hidden')) {
        try { btn.click(); } catch (_e) {}
        return;
      }
      if (tries < maxTries) {
        setTimeout(tryActivate, 200);
      }
    };
    tryActivate();
  } catch (_e) {}
}


function _nwCssEscapeIdent(s){
  try{
    if (window && typeof window.CSS !== 'undefined' && CSS && typeof CSS.escape === 'function') return CSS.escape(String(s));
  }catch(_e){}
  // minimal escape fallback
  return String(s).replace(/[^a-zA-Z0-9_\-]/g, '\\$&');
}

function syncToggleGroup(groupEl, checked){
  if (!groupEl) return;
  const btns = Array.from(groupEl.querySelectorAll('button[data-value]'));
  btns.forEach(b=>{
    const v = String(b.getAttribute('data-value')||'').toLowerCase();
    const isTrue = (v === '1' || v === 'true' || v === 'on' || v === 'yes' || v === 'ja');
    b.classList.toggle('active', checked ? isTrue : !isTrue);
  });
}

function syncToggleButtonsForInputId(inputId){
  if (!inputId) return;
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const sel = '.nw-toggle[data-toggle-for="' + _nwCssEscapeIdent(inputId) + '"]';
  document.querySelectorAll(sel).forEach(g => syncToggleGroup(g, !!inp.checked));
}

function syncAllToggleButtons(){
  document.querySelectorAll('.nw-toggle[data-toggle-for]').forEach(g=>{
    const id = g.getAttribute('data-toggle-for');
    const inp = id ? document.getElementById(id) : null;
    syncToggleGroup(g, !!(inp && inp.checked));
  });
}

/**
 * VIS UI: Toggle-Buttons (An/Aus) ersetzen Checkboxen.
 * Implementierung: Wir behalten die zugrunde liegenden Checkbox-Inputs (API-Bindings bleiben stabil),
 * blenden sie aber aus und steuern sie über Button-Gruppen.
 */
function bindToggleButtonGroups(){
  if (window.__nwToggleButtonsBound) {
    try{ syncAllToggleButtons(); }catch(_e){}
    return;
  }
  window.__nwToggleButtonsBound = true;

  // Expose helpers for programmatic UI updates (ohne change-Event → keine Writes).
  window.nwSyncToggleButtons = syncToggleButtonsForInputId;
  window.nwSyncAllToggleButtons = syncAllToggleButtons;

  document.addEventListener('click', (e)=>{
    const btn = e && e.target ? e.target.closest('.nw-toggle button[data-value]') : null;
    if (!btn) return;
    const grp = btn.closest('.nw-toggle');
    if (!grp) return;
    const targetId = grp.getAttribute('data-toggle-for');
    if (!targetId) return;
    const inp = document.getElementById(targetId);
    if (!inp) return;

    const raw = String(btn.getAttribute('data-value') || '').trim().toLowerCase();
    const desired = (raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes' || raw === 'ja');

    if (inp.disabled) return;

    // Update + trigger existing change bindings
    if (!!inp.checked !== desired) {
      inp.checked = desired;
      try{ inp.dispatchEvent(new Event('change', { bubbles: true })); }catch(_e){}
    }
    syncToggleGroup(grp, desired);
  }, true);

  // Initial sync
  try{ syncAllToggleButtons(); }catch(_e){}
}


window.addEventListener('DOMContentLoaded', ()=> {
  bootstrap();
  initMenu();
  initSettingsPanel();
  try { bindToggleButtonGroups(); } catch(_e) {}
  try { initStorageFarmPanel(); } catch(_e) {}
  initTabs();
  hideAllPanels();
  applyInitialTabFromUrl();

  // If opened directly as standalone Settings page, show settings panel by default
  try {
    const p = (location && location.pathname) ? String(location.pathname) : '';
    const isSettings = p.endsWith('/settings.html') || p.endsWith('settings.html');
    if (isSettings) {
      const live = document.querySelector('.content');
      if (live) live.style.display = 'none';
      const sec = document.querySelector('[data-tab-content="settings"]');
      if (sec) sec.classList.remove('hidden');
      try { setupSettings(); } catch(_e) {}
    }
  } catch(_e) {}
});


 // --- Settings & Installer logic ---

function hideAllPanels(){ document.querySelectorAll('[data-tab-content]').forEach(el=> el.classList.add('hidden')); document.querySelector('.content').style.display='block'; }
let SERVER_CFG = { adminUrl: null, installerLocked: false };

async function loadConfig() {
  try {
    const r = await fetch('/config');
    const j = await r.json();
    SERVER_CFG = j || {};
    try { window.__nwEmsCfg = (SERVER_CFG && SERVER_CFG.ems) ? SERVER_CFG.ems : (window.__nwEmsCfg || {}); } catch(_e) {}
  } catch(e) { console.warn('cfg', e); }
}

function bindInputValue(el, stateKey) {
  // Always refresh the input from the latest snapshot first
  const st = window.latestState || {};
  const info = st[stateKey] || st['settings.' + el.dataset.key] || st['installer.' + el.dataset.key];
  if (info && info.value !== undefined) {
    const v = info.value;
    if (el.type === 'checkbox') {
      // Be robust against boolean/number/string representations
      if (v === true) el.checked = true;
      else if (v === false) el.checked = false;
      else if (typeof v === 'number') el.checked = v !== 0;
      else if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        el.checked = (s === '1' || s === 'true' || s === 'on' || s === 'yes' || s === 'ja');
      } else {
        el.checked = !!v;
      }
    } else {
      el.value = v;
    }
  }

  // Derive API scope+key from stateKey ('settings.<key>' / 'installer.<key>' / 'evcs.<idx>.<prop>')
  const sk = String(stateKey || '');
  let scope = 'settings';
  let key = sk;
  if (sk.startsWith('settings.')) { scope = 'settings'; key = sk.slice(9); }
  else if (sk.startsWith('installer.')) { scope = 'installer'; key = sk.slice(10); }
  else if (sk.startsWith('evcs.rfid.')) { scope = 'rfid'; key = sk.slice(10); }
  else if (sk.startsWith('rfid.')) { scope = 'rfid'; key = sk.slice(5); }
  else if (sk.startsWith('storageFarm.')) { scope = 'storageFarm'; key = sk.slice(12); }
  else if (sk.startsWith('evcs.')) { scope = 'evcs'; key = sk; }

  // Prevent duplicate listeners when setupSettings() is called multiple times
  if (el.dataset.nwBound === '1') return;
  el.dataset.nwBound = '1';

  el.addEventListener('change', async () => {
    let val;
    if (el.type === 'checkbox') val = !!el.checked;
    else if (el.type === 'number' || el.type === 'range') {
      val = Number(el.value);
      if (!Number.isFinite(val)) val = 0;
    } else val = el.value;

    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope, key, value: val })
      });
    } catch (e) { /* ignore */ }
  });
}
function setupSettings(){
  document.querySelectorAll('[data-scope="settings"]').forEach(el=> bindInputValue(el, 'settings.'+el.dataset.key));
  document.querySelectorAll('[data-scope="rfid"]').forEach(el=> bindInputValue(el, 'evcs.rfid.'+el.dataset.key));
  try { setupRfidWhitelistUi(); } catch (e) {}
  try { setupRfidLearningUi(); } catch (e) {}
  try { setupRfidBillingUi(); } catch (e) {}
}

// --- Speicherfarm (VIS read-only) ---
//
// WICHTIG: Die Konfiguration der Speicherfarm (Speicher hinzufügen, DP-Zuordnung, Gruppen)
// erfolgt ausschließlich im Installateur-/Admin-Bereich.
// In der VIS zeigen wir nur Status/Übersicht für Endverbraucher an.

function parseJsonSafe(raw, fallback){
  try{
    if (raw === null || raw === undefined) return fallback;
    const s = typeof raw === 'string' ? raw : JSON.stringify(raw);
    return s ? JSON.parse(s) : fallback;
  } catch(_e){ return fallback; }
}

function storageFarmGetStatusList(){
  const st = window.latestState || {};
  const raw = st['storageFarm.storagesStatusJson'] && st['storageFarm.storagesStatusJson'].value;
  const list = parseJsonSafe(raw, []);
  return Array.isArray(list) ? list : [];
}

function storageFarmUpdateModeLabel(){
  const el = document.getElementById('sf_mode_label');
  if (!el) return;
  const st = window.latestState || {};
  const mode = st['storageFarm.mode'] && st['storageFarm.mode'].value;
  el.textContent = 'Modus: ' + (String(mode||'pool').toLowerCase() === 'groups' ? 'Gruppen' : 'Pool');
}

function storageFarmUpdateSummary(){
  const sum = document.getElementById('sf_summary');
  if (!sum) return;
  const st = window.latestState || {};
  const soc = st['storageFarm.totalSoc'] && st['storageFarm.totalSoc'].value;
  const chg = st['storageFarm.totalChargePowerW'] && st['storageFarm.totalChargePowerW'].value;
  const dchg = st['storageFarm.totalDischargePowerW'] && st['storageFarm.totalDischargePowerW'].value;
  const on = st['storageFarm.storagesOnline'] && st['storageFarm.storagesOnline'].value;
  const deg = st['storageFarm.storagesDegraded'] && st['storageFarm.storagesDegraded'].value;
  const tot = st['storageFarm.storagesTotal'] && st['storageFarm.storagesTotal'].value;
  sum.textContent = `SoC Ø: ${soc!==undefined?soc:'--'} % | Laden: ${chg!==undefined?formatPower(chg):'--'} | Entladen: ${dchg!==undefined?formatPower(dchg):'--'} | Online: ${on!==undefined?on:'--'}/${tot!==undefined?tot:'--'}${(deg!==undefined && Number(deg)>0) ? (' | Degraded: ' + deg) : ''}`;
}

function storageFarmRenderStatusRows(list){
  const wrap = document.getElementById('sf_status_rows');
  const msg = document.getElementById('sf_msg');
  if (!wrap) return;

  wrap.innerHTML = '';

  if (!Array.isArray(list) || list.length === 0){
    if (msg) msg.textContent = 'Keine Speicher konfiguriert.';
    return;
  }
  if (msg) msg.textContent = '';

  const mkCell = (txt, label) => {
    const d = document.createElement('div');
    d.className = 'sf-cell';
    if (label) d.setAttribute('data-label', String(label));
    d.textContent = (txt === undefined || txt === null || txt === '') ? '--' : String(txt);
    return d;
  };

  list.forEach((row) => {
    const r = document.createElement('div');
    r.className = 'rfid-whitelist-row';
    r.style.gridTemplateColumns = '1.6fr 1fr 1fr 1fr 0.8fr';

    const name = (row && row.name) ? String(row.name) : 'Speicher';
    const soc = (row && row.soc !== undefined && row.soc !== null && !isNaN(Number(row.soc))) ? (Number(row.soc).toFixed(1)) : '--';
    const chg = (row && row.chargePowerW !== undefined && row.chargePowerW !== null && !isNaN(Number(row.chargePowerW))) ? formatPower(Number(row.chargePowerW)) : '--';
    const dchg = (row && row.dischargePowerW !== undefined && row.dischargePowerW !== null && !isNaN(Number(row.dischargePowerW))) ? formatPower(Number(row.dischargePowerW)) : '--';
    let online = 'Offline';
    if (row && (row.degraded === true || row.state === 'degraded')) online = 'Degraded';
    else if (row && row.online) online = 'Online';

    r.appendChild(mkCell(name, 'Speicher'));
    
    r.appendChild(mkCell(soc, 'SoC (%)'));
    
    r.appendChild(mkCell(chg, 'Laden'));
    
    r.appendChild(mkCell(dchg, 'Entladen'));
    
    r.appendChild(mkCell(online, 'Status'));
    
    wrap.appendChild(r);
  });
}

function storageFarmApply(){
  try { storageFarmUpdateModeLabel(); } catch(_e) {}
  try { storageFarmUpdateSummary(); } catch(_e) {}
  try {
    const list = storageFarmGetStatusList();
    storageFarmRenderStatusRows(list);
  } catch(_e) {}
}

function initStorageFarmPanel(){
  const btnReload = document.getElementById('sf_reload');
  if (btnReload && !btnReload.dataset.bound){
    btnReload.dataset.bound='1';
    btnReload.addEventListener('click', (e)=>{ e.preventDefault(); storageFarmApply(); });
  }
  // Initial render
  storageFarmApply();
}



function setupRfidWhitelistUi(){
  const rowsEl = document.getElementById('rfidWhitelistRows');
  if (!rowsEl) return;
  const msgEl = document.getElementById('rfidWhitelistMsg');
  const btnAdd = document.getElementById('rfidAddRow');
  const btnSave = document.getElementById('rfidSaveWhitelist');
  const btnReload = document.getElementById('rfidReloadWhitelist');

  function normRfid(v){ return String(v||'').trim().replace(/\s+/g,'').toUpperCase(); }
  function safeText(v){ return String(v||'').trim(); }

  function readWhitelistFromState(){
    try {
      const st = window.latestState || {};
      const info = st['evcs.rfid.whitelistJson'];
      const raw = (info && info.value !== undefined) ? String(info.value || '') : '';
      const parsed = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      return arr.map(x => {
        if (typeof x === 'string') return { rfid: normRfid(x), name: '', comment: '' };
        const r = normRfid(x.rfid ?? x.id ?? x.uid ?? x.card ?? '');
        const n = safeText(x.name ?? x.user ?? x.label ?? '');
        const c = safeText(x.comment ?? x.note ?? '');
        return { rfid: r, name: n, comment: c };
      });
    } catch (e) {
      return [];
    }
  }

  let list = readWhitelistFromState();

  function setMsg(t){ if (msgEl) msgEl.textContent = t || ''; }

  function render(){
    rowsEl.innerHTML = '';
    (list || []).forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'rfid-whitelist-row';

      const inRfid = document.createElement('input');
      inRfid.type = 'text';
      inRfid.placeholder = 'z.B. 04A1B2C3';
      inRfid.value = it.rfid || '';
      inRfid.addEventListener('input', () => { it.rfid = normRfid(inRfid.value); });

      const inName = document.createElement('input');
      inName.type = 'text';
      inName.placeholder = 'Name / Person';
      inName.value = it.name || '';
      inName.addEventListener('input', () => { it.name = safeText(inName.value); });

      const inComment = document.createElement('input');
      inComment.type = 'text';
      inComment.placeholder = 'Kommentar (optional)';
      inComment.value = it.comment || '';
      inComment.addEventListener('input', () => { it.comment = safeText(inComment.value); });

      const del = document.createElement('button');
      del.className = 'rfid-del';
      del.type = 'button';
      del.textContent = '✕';
      del.title = 'Entfernen';
      del.addEventListener('click', () => { list.splice(idx, 1); render(); });

      row.appendChild(inRfid);
      row.appendChild(inName);
      row.appendChild(inComment);
      row.appendChild(del);
      rowsEl.appendChild(row);
    });

    setMsg((list && list.length ? (list.length + ' Einträge in der Whitelist') : 'Whitelist ist leer') );
  }

  async function save(){
    const cleaned = [];
    const seen = new Set();
    for (const it of (list || [])) {
      const r = normRfid(it.rfid);
      if (!r) continue;
      if (seen.has(r)) continue;
      seen.add(r);
      cleaned.push({ rfid: r, name: safeText(it.name), comment: safeText(it.comment) });
    }
    const json = JSON.stringify(cleaned);
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'rfid', key: 'whitelistJson', value: json })
      });
      // update local snapshot so other UI reads consistent data
      window.latestState = window.latestState || {};
      window.latestState['evcs.rfid.whitelistJson'] = { value: json };
      list = cleaned;
      render();
      setMsg('Whitelist gespeichert (' + cleaned.length + ' Einträge).');
    } catch (e) {
      setMsg('Fehler beim Speichern der Whitelist.');
    }
  }

  async function reload(){
    try {
      const snap = await fetch('/api/state', { cache: 'no-store' }).then(r => r.json());
      window.latestState = snap || {};
      list = readWhitelistFromState();
      render();
      setMsg('Whitelist neu geladen.');
    } catch (e) {
      setMsg('Fehler beim Neuladen der Whitelist.');
    }
  }

  if (btnAdd && btnAdd.dataset.nwBound !== '1') {
    btnAdd.dataset.nwBound = '1';
    btnAdd.addEventListener('click', () => {
      list.push({ rfid: '', name: '', comment: '' });
      render();
      try {
        const last = rowsEl.querySelector('.rfid-whitelist-row:last-child input');
        if (last) last.focus();
      } catch (e) {}
    });
  }
  if (btnSave && btnSave.dataset.nwBound !== '1') {
    btnSave.dataset.nwBound = '1';
    btnSave.addEventListener('click', save);
  }
  if (btnReload && btnReload.dataset.nwBound !== '1') {
    btnReload.dataset.nwBound = '1';
    btnReload.addEventListener('click', reload);
  }

  // Expose minimal API for other UI parts (e.g., RFID learning) to reuse the same list + save.
  window.__nwRfidWhitelist = window.__nwRfidWhitelist || {};
  window.__nwRfidWhitelist.get = () => (list || []).slice();
  window.__nwRfidWhitelist.addOrUpdate = (rfid, name, comment, { autoSave = true } = {}) => {
    const r = normRfid(rfid);
    if (!r) return false;
    const n = safeText(name);
    const c = safeText(comment);
    let found = false;
    for (const it of (list || [])) {
      if (normRfid(it.rfid) === r) {
        found = true;
        if (n) it.name = n;
        if (c) it.comment = c;
        break;
      }
    }
    if (!found) {
      list.push({ rfid: r, name: n, comment: c });
    }
    render();
    if (autoSave) {
      save();
    } else {
      setMsg('Eintrag übernommen. Bitte Whitelist speichern.');
    }
    return true;
  };
  window.__nwRfidWhitelist.reload = () => reload();
  window.__nwRfidWhitelist.save = () => save();

  render();
}

function setupRfidLearningUi(){
  const btnLearn = document.getElementById('rfidLearnBtn');
  if (!btnLearn) return;
  const lastText = document.getElementById('rfidLastCapturedText');
  const inName = document.getElementById('rfidLearnName');
  const inComment = document.getElementById('rfidLearnComment');
  const btnAdd = document.getElementById('rfidLearnAdd');
  const msgEl = document.getElementById('rfidLearnMsg');

  function setMsg(t){ if (msgEl) msgEl.textContent = t || ''; }

  async function setLearningActive(active){
    try{
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'rfid', key: 'learning.active', value: !!active })
      });
      window.latestState = window.latestState || {};
      window.latestState['evcs.rfid.learning.active'] = { value: !!active };
    }catch(_e){}
  }

  function readStateVal(key){
    const st = window.latestState || {};
    return st[key] ? st[key].value : undefined;
  }

  function applyUi(){
    const active = !!readStateVal('evcs.rfid.learning.active');
    const last = readStateVal('evcs.rfid.learning.lastCaptured');
    const ts = readStateVal('evcs.rfid.learning.lastCapturedTs');

    if (btnLearn) btnLearn.textContent = active ? 'Warte auf Karte… (Stop)' : 'Karte anlernen';
    if (lastText) {
      const t = (last != null && String(last).trim()) ? String(last).trim() : '--';
      lastText.textContent = t;
      if (t !== '--' && ts) {
        try{ lastText.title = new Date(Number(ts)).toLocaleString('de-DE'); }catch(_e){}
      }
    }
    if (active) {
      setMsg('Anlernen aktiv – halte eine RFID-Karte vor die Wallbox.');
    } else {
      // do not overwrite explicit messages unless empty
      if (msgEl && !msgEl.textContent) setMsg('');
    }
  }

  // Prevent duplicate listeners
  if (btnLearn && btnLearn.dataset.nwBound !== '1') {
    btnLearn.dataset.nwBound = '1';
    btnLearn.addEventListener('click', async () => {
      const active = !!readStateVal('evcs.rfid.learning.active');
      setMsg('');
      await setLearningActive(!active);
      // UI will update via SSE/render, but also apply immediately
      applyUi();
    });
  }

  if (btnAdd && btnAdd.dataset.nwBound !== '1') {
    btnAdd.dataset.nwBound = '1';
    btnAdd.addEventListener('click', () => {
      const last = readStateVal('evcs.rfid.learning.lastCaptured');
      const rfid = String(last || '').trim();
      if (!rfid) {
        setMsg('Keine Karte erkannt. Bitte zuerst „Karte anlernen“ starten.');
        return;
      }
      const api = window.__nwRfidWhitelist;
      if (!api || typeof api.addOrUpdate !== 'function') {
        setMsg('Whitelist-Editor nicht verfügbar. Seite neu laden.');
        return;
      }
      const name = inName ? inName.value : '';
      const comment = inComment ? inComment.value : '';
      api.addOrUpdate(rfid, name, comment, { autoSave: true });
      if (inName) inName.value = '';
      if (inComment) inComment.value = '';
      setMsg('Karte übernommen und gespeichert.');
    });
  }

  // Make applyUi accessible for render() updates
  window.__nwApplyRfidLearningUi = applyUi;

  applyUi();
}


function setupRfidBillingUi(){
  const btnOpen = document.getElementById('rfidBillingOpen');
  const sel = document.getElementById('rfidBillingCard');
  const modeWrap = document.getElementById('rfidBillingMode');
  const monthRow = document.getElementById('rfidBillingMonthRow');
  const yearRow = document.getElementById('rfidBillingYearRow');
  const inMonth = document.getElementById('rfidBillingMonth');
  const inYear = document.getElementById('rfidBillingYear');
  const msgEl = document.getElementById('rfidBillingMsg');

  if (!btnOpen || !sel) return;

  function pad2(n){ return String(Number(n)||0).padStart(2,'0'); }
  function setMsg(t){ if (msgEl) msgEl.textContent = t || ''; }

  function getWhitelist(){
    // Prefer the editor API (keeps same parsing logic)
    try{
      if (window.__nwRfidWhitelist && typeof window.__nwRfidWhitelist.get === 'function') {
        const a = window.__nwRfidWhitelist.get();
        if (Array.isArray(a)) return a;
      }
    }catch(_e){}

    // Fallback: parse state snapshot
    try{
      const st = window.latestState || {};
      const raw = st['evcs.rfid.whitelistJson'] && st['evcs.rfid.whitelistJson'].value;
      if (raw && typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    }catch(_e){}
    return [];
  }

  function renderOptions(){
    const list = getWhitelist();
    const prev = String(sel.value || '');

    sel.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = list && list.length ? 'Bitte wählen…' : 'Keine Karten in Whitelist';
    sel.appendChild(opt0);

    if (Array.isArray(list)) {
      for (const it of list) {
        let rfid = '';
        let name = '';
        let comment = '';

        if (typeof it === 'string') {
          rfid = it;
        } else if (it && typeof it === 'object') {
          rfid = it.rfid || it.id || it.uid || it.card || '';
          name = it.name || it.user || it.label || '';
          comment = it.comment || it.note || '';
        }

        rfid = String(rfid || '').trim();
        if (!rfid) continue;

        const o = document.createElement('option');
        o.value = rfid;

        const n = String(name || '').trim();
        const c = String(comment || '').trim();
        let label = n ? (n + ' (' + rfid + ')') : rfid;
        if (c) label += ' – ' + c;

        o.textContent = label;
        sel.appendChild(o);
      }
    }

    if (prev) sel.value = prev;
  }

  let mode = 'month';
  function applyMode(m){
    mode = (m === 'year') ? 'year' : 'month';

    if (modeWrap) {
      modeWrap.querySelectorAll('button[data-value]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === mode);
      });
    }

    if (monthRow) monthRow.classList.toggle('hidden', mode !== 'month');
    if (yearRow) yearRow.classList.toggle('hidden', mode !== 'year');

    setMsg('');
  }

  // Bind mode buttons
  if (modeWrap && modeWrap.dataset.nwBound !== '1') {
    modeWrap.dataset.nwBound = '1';
    modeWrap.querySelectorAll('button[data-value]').forEach(btn => {
      btn.addEventListener('click', () => applyMode(btn.dataset.value));
    });
  }

  // Default month/year
  const now = new Date();
  try{
    if (inMonth && !inMonth.value) inMonth.value = now.getFullYear() + '-' + pad2(now.getMonth() + 1);
    if (inYear && !inYear.value) inYear.value = String(now.getFullYear());
  }catch(_e){}

  renderOptions();
  applyMode('month');

  // Bind open button
  if (btnOpen && btnOpen.dataset.nwBound !== '1') {
    btnOpen.dataset.nwBound = '1';
    btnOpen.addEventListener('click', () => {
      try{ renderOptions(); } catch(_e){}
      const rfid = String(sel.value || '').trim();
      if (!rfid) {
        setMsg('Bitte eine Karte auswählen.');
        return;
      }

      let fromMs = 0;
      let toMs = Date.now();

      if (mode === 'year') {
        const y = Number(inYear && inYear.value) || now.getFullYear();
        const start = new Date(y, 0, 1, 0, 0, 0, 0);
        const end = new Date(y, 11, 31, 23, 59, 59, 999);
        fromMs = start.getTime();
        toMs = end.getTime();
      } else {
        const v = String((inMonth && inMonth.value) || '');
        const parts = v.split('-');
        const y = Number(parts[0]) || now.getFullYear();
        const m = (Number(parts[1]) || (now.getMonth() + 1)) - 1;
        const start = new Date(y, m, 1, 0, 0, 0, 0);
        const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
        fromMs = start.getTime();
        toMs = end.getTime();
      }

      const url = '/static/rfid-report.html'
        + '?rfid=' + encodeURIComponent(rfid)
        + '&from=' + encodeURIComponent(String(fromMs))
        + '&to=' + encodeURIComponent(String(toMs));

      try{
        window.open(url, '_blank', 'noopener');
        setMsg('');
      }catch(_e){
        // fallback
        window.location.href = url;
      }
    });
  }
}



function setupInstaller(){
  const loginBox = document.getElementById('installerLoginBox');
  const formBox  = document.getElementById('installerForm');
  const form     = document.getElementById('installerLoginForm');
  const btn      = document.getElementById('inst_login');
  const cancel   = document.getElementById('inst_cancel');
  const pw       = document.getElementById('inst_pw');

  async function refreshLock(){
    try {
      const r = await fetch('/config', { cache:'no-store', credentials:'same-origin' });
      const j = await r.json();
      const locked = !!j.installerLocked;
      if (loginBox) loginBox.classList.toggle('hidden', !locked);
      if (formBox)  formBox.classList.toggle('hidden',  locked);
      if (formBox) {
        formBox.querySelectorAll('input,select,button,textarea').forEach(el => {
          if (el.id !== 'inst_cancel') el.disabled = locked;
        });
      }
    } catch(_) {}
  }

  async function doLogin(){
    try{
      const pass = String((pw && pw.value) || '');
      if (!pass){ alert('Bitte Passwort eingeben'); return; }
      const r = await fetch('/api/installer/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body: JSON.stringify({ password: pass })
      });
      if (r.ok){
        if (pw) pw.value='';
        await refreshLock();
      } else {
        alert('Passwort falsch');
      }
    }catch(_){ alert('Login fehlgeschlagen'); }
  }

  if (btn && !btn.dataset.bound){ btn.dataset.bound='1'; btn.addEventListener('click', (e)=>{ e.preventDefault(); doLogin(); }); }
  if (form && !form.dataset.bound){ form.dataset.bound='1'; form.addEventListener('submit', (e)=>{ e.preventDefault(); doLogin(); }); }
  if (cancel && !cancel.dataset.bound){
    cancel.dataset.bound = '1';
    cancel.addEventListener('click', (e)=>{
      e.preventDefault();
      const installerSec = document.querySelector('[data-tab-content="installer"]');
      if (installerSec) installerSec.classList.add('hidden');
      const live = document.querySelector('.content');
      if (live) live.style.display = 'grid';
      document.querySelectorAll('.tabs .tab').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === 'live');
      });
    });
  }

  refreshLock();
}

function initInstallerPanel(){
  if (SERVER_CFG && SERVER_CFG.installerLocked && !null) return;
  document.querySelectorAll('#installerForm [data-scope="installer"]').forEach(el=>{
    const key = el.dataset.key; bindInputValue(el, 'installer.' + key);
  });
  const a = document.getElementById('openAdminBtn');
  if (a){ const url = (SERVER_CFG && SERVER_CFG.adminUrl) || '/'; a.href = url || '/'; }
}

// Simple tab switching
function initTabs(){
  const buttons = document.querySelectorAll('.tabs .tab');
  const sections = {
    live: document.querySelector('.content'),
    history: document.querySelector('[data-tab-content="history"]'),
    settings: document.querySelector('[data-tab-content="settings"]'),
    smarthome: document.querySelector('[data-tab-content="smarthome"]'),
    storagefarm: document.querySelector('[data-tab-content="storagefarm"]'),
  };
  buttons.forEach(btn => btn.addEventListener('click', () => {
    buttons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.getAttribute('data-tab');

    // Show/hide groups
    // main ".content" holds live top sections; other sections are siblings
    document.querySelector('.content').style.display = (tab==='live') ? 'grid' : 'none';
    for (const k of ['history','settings','smarthome','storagefarm']) {
      const el = sections[k];
      if (el) el.classList.toggle('hidden', tab !== k);
    }
  }));
}

function renderSmartHome(){
  const onTxt = (v)=> v ? 'AN' : 'AUS';
  const d = (k)=> state[k]?.value;
  const get = (path) => {
    // allow mapping from smartHome.datapoints.* in the future
    return d(path);
  };
  const hp = get('smartHome_heatPumpOn');
  const rt = get('smartHome_roomTemp');
  const wl = get('smartHome_wallboxLock');
  const hpEl = document.getElementById('smhHeatPump');
  const rtEl = document.getElementById('smhRoomTemp');
  const wlEl = document.getElementById('smhWallboxLock');
  if (hpEl) hpEl.textContent = (hp===undefined?'--':onTxt(!!hp));
  if (rtEl) rtEl.textContent = (rt===undefined?'--':Number(rt).toFixed(1)+' °C');
  if (wlEl) wlEl.textContent = (wl===undefined?'--':(wl?'Gesperrt':'Freigabe'));
}

const _renderOrig = render;
render = function(){

  // ---- Energy donut update ----
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const chg = +(d('storageChargePower') ?? 0);
    const dchg = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    const A = { pv: 330, load: 30, bat: 180, grid: 210 };
    const MAX = { pv: 110, load: 45, bat: 60, grid: 45 };
    const total = Math.max(1, pv + buy + load + (chg + dchg));
    const pctDeg = (val, maxDeg) => Math.max(2, Math.min(maxDeg, (val/total) * maxDeg));

    setArcAtAngle('.donut .arc.pv',   42, A.pv,   pctDeg(pv,   MAX.pv));
    setArcAtAngle('.donut .arc.load', 42, A.load, pctDeg(load, MAX.load));
    setArcAtAngle('.donut .arc.bat',  42, A.bat,  pctDeg(chg + dchg, MAX.bat));
    setArcAtAngle('.donut .arc.grid', 42, A.grid, pctDeg(buy,  MAX.grid));

    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvLbl', formatPower(pv));
    setText('gridLbl', formatPower(buy));
    setText('loadLbl', formatPower(load));
    setText('centerLbl', formatPower(0));

    if (soc !== undefined && !isNaN(Number(soc))) {
      setText('socLbl', Number(soc).toFixed(0)+' %');
      setText('batterySocIn', Number(soc).toFixed(0)+' %');
      setArc('.donut .arc.soc', 34, Math.max(0, Math.min(100, Number(soc))));
    }
    if (cap && soc !== undefined) {
      const socPct = Number(soc)/100;
      const tFull = chg>0 ? ((cap*(1-socPct))*1000)/chg : null;
      const tEmpty= dchg>0 ? ((cap*socPct)*1000)/dchg : null;
      setText('tFull', 'Voll '+(tFull?formatHours(tFull):'--'));
      setText('tEmpty','Leer '+(tEmpty?formatHours(tEmpty):'--'));
    }

    placeIconAtAngle('.energy-donut .icon-block.pv',   A.pv);
    placeIconAtAngle('.energy-donut .icon-block.grid', A.grid);
    placeIconAtAngle('.energy-donut .icon-block.load', A.load);
  } catch(e){ console.warn('donut update', e); }

  /* DONUT-HOOK */

  // --- Runde Energieanzeige ---
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const sell = +(d('gridSellPower') ?? 0);
    const charge = +(d('storageChargePower') ?? 0);
    const discharge = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    // Values
    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvVal', formatPower(pv));
    setText('gridBuyVal', formatPower(buy));
    setText('gridSellVal', formatPower(sell));
    setText('chargeVal', formatPower(charge));
    setText('dischargeVal', formatPower(discharge));
    setText('centerLoad', formatPower(load));
    if (soc !== undefined && !isNaN(Number(soc))) { setText('socText', 'SoC ' + Number(soc).toFixed(0) + ' %'); setText('batterySocIn', Number(soc).toFixed(0)+' %'); }

    // Times
    if (cap && soc !== undefined) {
      const socPct = Number(soc) / 100;
      const remToFull_kWh = cap * (1 - socPct);
      const remToEmpty_kWh = cap * (socPct);
      // using outer 'charge'/'discharge'
      // using outer 'charge'/'discharge'
      const tFull_h = charge > 0 ? (remToFull_kWh * 1000) / charge : null;
      const tEmpty_h = discharge > 0 ? (remToEmpty_kWh * 1000) / discharge : null;
      setText('tFull', 'Voll ' + (tFull_h?formatHours(tFull_h):'--'));
      setText('tEmpty', 'Leer ' + (tEmpty_h?formatHours(tEmpty_h):'--'));
      // SoC ring
      setDonut('soc', Math.max(0, Math.min(100, Number(soc))), true);
    }

    // Arcs relative to max flow
    const totalFlow = Math.max(1, pv + buy + load + (charge + discharge));
    const pct = (v) => Math.min(100, Math.max(0, (v / totalFlow) * 100));
    setDonut('pv', pct(pv));
    setDonut('gridbuy', pct(buy));
    setDonut('gridsell', pct(sell));
    setDonut('load', pct(load));
    setDonut('storage', pct(charge + discharge));
  } catch(e) { console.warn('donut render error', e); }

  _renderOrig();
  renderSmartHome();
}


// Zusätzliche Anzeige-Updates für Energiefluss
const _renderEF = render;
render = function(){

  // ---- Energy donut update ----
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const chg = +(d('storageChargePower') ?? 0);
    const dchg = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    const A = { pv: 330, load: 30, bat: 180, grid: 210 };
    const MAX = { pv: 110, load: 45, bat: 60, grid: 45 };
    const total = Math.max(1, pv + buy + load + (chg + dchg));
    const pctDeg = (val, maxDeg) => Math.max(2, Math.min(maxDeg, (val/total) * maxDeg));

    setArcAtAngle('.donut .arc.pv',   42, A.pv,   pctDeg(pv,   MAX.pv));
    setArcAtAngle('.donut .arc.load', 42, A.load, pctDeg(load, MAX.load));
    setArcAtAngle('.donut .arc.bat',  42, A.bat,  pctDeg(chg + dchg, MAX.bat));
    setArcAtAngle('.donut .arc.grid', 42, A.grid, pctDeg(buy,  MAX.grid));

    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvLbl', formatPower(pv));
    setText('gridLbl', formatPower(buy));
    setText('loadLbl', formatPower(load));
    setText('centerLbl', formatPower(0));

    if (soc !== undefined && !isNaN(Number(soc))) {
      setText('socLbl', Number(soc).toFixed(0)+' %');
      setText('batterySocIn', Number(soc).toFixed(0)+' %');
      setArc('.donut .arc.soc', 34, Math.max(0, Math.min(100, Number(soc))));
    }
    if (cap && soc !== undefined) {
      const socPct = Number(soc)/100;
      const tFull = chg>0 ? ((cap*(1-socPct))*1000)/chg : null;
      const tEmpty= dchg>0 ? ((cap*socPct)*1000)/dchg : null;
      setText('tFull', 'Voll '+(tFull?formatHours(tFull):'--'));
      setText('tEmpty','Leer '+(tEmpty?formatHours(tEmpty):'--'));
    }

    placeIconAtAngle('.energy-donut .icon-block.pv',   A.pv);
    placeIconAtAngle('.energy-donut .icon-block.grid', A.grid);
    placeIconAtAngle('.energy-donut .icon-block.load', A.load);
  } catch(e){ console.warn('donut update', e); }

  /* DONUT-HOOK */

  // --- Runde Energieanzeige ---
  try {
    const d = (k) => state[k]?.value;
    const pv = +(d('pvPower') ?? 0);
    const load = +(d('consumptionTotal') ?? 0);
    const buy = +(d('gridBuyPower') ?? 0);
    const sell = +(d('gridSellPower') ?? 0);
    const charge = +(d('storageChargePower') ?? 0);
    const discharge = +(d('storageDischargePower') ?? 0);
    const soc = d('storageSoc');
    const cap = +(d('storageCapacityKwh') ?? 0);

    // Values
    const setText = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
    setText('pvVal', formatPower(pv));
    setText('gridBuyVal', formatPower(buy));
    setText('gridSellVal', formatPower(sell));
    setText('chargeVal', formatPower(charge));
    setText('dischargeVal', formatPower(discharge));
    setText('centerLoad', formatPower(load));
    if (soc !== undefined && !isNaN(Number(soc))) { setText('socText', 'SoC ' + Number(soc).toFixed(0) + ' %'); setText('batterySocIn', Number(soc).toFixed(0)+' %'); }

    // Times
    if (cap && soc !== undefined) {
      const socPct = Number(soc) / 100;
      const remToFull_kWh = cap * (1 - socPct);
      const remToEmpty_kWh = cap * (socPct);
      // using outer 'charge'/'discharge'
      // using outer 'charge'/'discharge'
      const tFull_h = charge > 0 ? (remToFull_kWh * 1000) / charge : null;
      const tEmpty_h = discharge > 0 ? (remToEmpty_kWh * 1000) / discharge : null;
      setText('tFull', 'Voll ' + (tFull_h?formatHours(tFull_h):'--'));
      setText('tEmpty', 'Leer ' + (tEmpty_h?formatHours(tEmpty_h):'--'));
      // SoC ring
      setDonut('soc', Math.max(0, Math.min(100, Number(soc))), true);
    }

    // Arcs relative to max flow
    const totalFlow = Math.max(1, pv + buy + load + (charge + discharge));
    const pct = (v) => Math.min(100, Math.max(0, (v / totalFlow) * 100));
    setDonut('pv', pct(pv));
    setDonut('gridbuy', pct(buy));
    setDonut('gridsell', pct(sell));
    setDonut('load', pct(load));
    setDonut('storage', pct(charge + discharge));
  } catch(e) { console.warn('donut render error', e); }

  _renderEF();
  try {
    const s = state;
    const d = (k) => s[k]?.value;
    const pv = d('pvPower') ?? d('productionTotal');
    const load = d('consumptionTotal');
    function setText(id, txt){ const el = document.getElementById(id); if (el) el.textContent = txt; }
    setText('pvPowerBig', (pv===undefined?'--':formatPower(pv)));
    setText('consumptionTotalBig', (load===undefined?'--':formatPower(load)));
  } catch(e) { console.warn(e); }

  try { storageFarmUpdateSummary(); } catch(_e) {}
}

// SIDE-VALUES
function setSideValue(id, val){ const el=document.getElementById(id); if(el) el.textContent = val; }


// ---- EMS Control UI (Optimierung) ----
function updateEmsControlUi() {
  try {
    const st = window.latestState || {};
    const v = (k) => (st && st[k] && st[k].value !== undefined) ? st[k].value : null;

    const emsCfg = (window.__nwEmsCfg && typeof window.__nwEmsCfg === 'object') ? window.__nwEmsCfg : {};
    const peakInstalled = !!emsCfg.peakShavingEnabled;
    const para14aInstalled = !!emsCfg.para14aEnabled;

    const tariffOn = !!v('settings.dynamicTariff');

    // Card (Optimierung)
    const showCard = true; // Always show the entry point for end-customer control
    const card = document.getElementById('tariffCard');
    if (card) card.classList.toggle('hidden', !showCard);

    const priceNow = v('priceCurrent');
    const priceAvg = v('priceAverage');

    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    // Price display
    if (!tariffOn) {
      setText('priceCurrent', 'Aus');
      setText('priceAverage', '--');
    } else {
      setText('priceCurrent', formatPricePerKwh(priceNow));
      setText('priceAverage', formatPricePerKwh(priceAvg));
    }

    // Peak short status (Netzschutz – nur Installateur konfigurierbar)
    const peakStatus = String(v('peakShaving.control.status') || '').trim();

    let peakShort = '--';
    if (!peakInstalled) peakShort = '—';
    else {
      const s = peakStatus || 'inactive';
      if (s === 'active') peakShort = 'Aktiv';
      else if (s === 'pending_on') peakShort = 'Anlauf';
      else if (s === 'pending_off') peakShort = 'Abkling';
      else peakShort = 'Bereit';
    }
    setText('peakShort', peakShort);


    // §14a short status
    let p14Short = '--';
    if (!para14aInstalled) p14Short = '—';
    else {
      const active = !!v('ems.core.para14aActive');
      p14Short = active ? 'Aktiv' : 'Inaktiv';
    }
    setText('para14aShort', p14Short);

    // Modal
    const modal = document.getElementById('emsModal');
    const modalOpen = modal && !modal.classList.contains('hidden');
    if (modalOpen) {
      const tglTariff = document.getElementById('emsTariffToggle');
      if (tglTariff) tglTariff.checked = !!tariffOn;
      try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('emsTariffToggle'); } catch(_e) {}

      // Tariff status in modal
      const tariffMode = Number(v('settings.tariffMode') || 1);
      const tariffPriority = Number(v('settings.priority') || 2);

      const stTariff = document.getElementById('emsTariffStatus');
      const hintTariff = document.getElementById('emsTariffHint');
      if (stTariff) stTariff.textContent = tariffOn ? ((tariffMode === 2) ? 'Automatik' : 'Manuell') : 'Aus';
      if (hintTariff) hintTariff.textContent = tariffOn ? 'Optimierung aktiv' : 'Optimierung deaktiviert';

      setText('emsPriceCurrent', tariffOn ? formatPricePerKwh(priceNow) : '--');
      setText('emsPriceAvg', tariffOn ? formatPricePerKwh(priceAvg) : '--');

      // Priority buttons
      const prioWrap = document.getElementById('emsTariffPriorityButtons');
      if (prioWrap) {
        prioWrap.querySelectorAll('button').forEach(b => {
          const p = Number(b.getAttribute('data-prio') || 0);
          b.classList.toggle('active', p === tariffPriority);
        });
      }

      // Mode buttons
      const modeWrap = document.getElementById('emsTariffModeButtons');
      if (modeWrap) {
        modeWrap.querySelectorAll('button').forEach(b => {
          const m = Number(b.getAttribute('data-mode') || 0);
          b.classList.toggle('active', m === tariffMode);
        });
      }

      // Peak row visibility + details
      const peakRow = document.getElementById('emsPeakRow');
      const peakNums = document.getElementById('emsPeakNumbers');
      if (peakRow) peakRow.style.display = peakInstalled ? '' : 'none';
      if (peakNums) peakNums.style.display = peakInstalled ? '' : 'none';

      const stPeak = document.getElementById('emsPeakStatus');
      const hintPeak = document.getElementById('emsPeakHint');
      const peakLimitW = v('peakShaving.control.effectiveLimitW') ?? v('peakShaving.control.limitW');
      const peakOverW = v('peakShaving.control.overW');
      if (stPeak) stPeak.textContent = (!peakInstalled) ? '—' : (peakShort || 'Bereit');
      if (hintPeak) {
        if (!peakInstalled) hintPeak.textContent = 'Nicht aktiv';
        else {
          const rt = v('peakShaving.control.reasonText');
          hintPeak.textContent = (rt !== null && rt !== undefined && String(rt).trim())
            ? String(rt)
            : 'Automatisch (Netzschutz) – nur Installateur konfigurierbar.';
        }
      }
      setText('emsPeakLimit', (peakLimitW != null ? formatPower(Number(peakLimitW)) : '--'));
      setText('emsPeakOver', (peakOverW != null ? formatPower(Number(peakOverW)) : '--'));

      // §14a row visibility + details
      const row14 = document.getElementById('ems14aRow');
      if (row14) row14.style.display = para14aInstalled ? '' : 'none';

      const st14 = document.getElementById('ems14aStatus');
      const cap14 = document.getElementById('ems14aCap');
      const hint14 = document.getElementById('ems14aHint');

      if (para14aInstalled) {
        const a = !!v('ems.core.para14aActive');
        const cap = v('ems.core.para14aEvcsCapW') ?? v('ems.core.para14aCapW');
        if (st14) st14.textContent = a ? 'Aktiv' : 'Inaktiv';
        if (cap14) cap14.textContent = (cap != null && Number(cap) > 0) ? formatPower(Number(cap)) : '--';
        if (hint14) hint14.textContent = 'Wird automatisch berücksichtigt.';
      } else {
        if (st14) st14.textContent = '—';
        if (cap14) cap14.textContent = '--';
        if (hint14) hint14.textContent = 'Nicht konfiguriert.';
      }
    }
  } catch (_e) {}
}

function initEmsControlModal() {
  if (window.__nwEmsControlModalInit) return;
  const card = document.getElementById('tariffCard');
  const modal = document.getElementById('emsModal');
  if (!card || !modal) return;

  const closeBtn = document.getElementById('emsClose');
  const openSettingsBtn = document.getElementById('emsModalOpenSettings');

  const setSetting = async (key, value) => {
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ scope: 'settings', key, value })
      });
    } catch (_e) {}
  };

  const open = (e) => {
    try { if (e) e.preventDefault(); } catch(_e) {}
    modal.classList.remove('hidden');
    try { updateEmsControlUi(); } catch(_e) {}
  };
  const close = () => modal.classList.add('hidden');

  card.addEventListener('click', open);

  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });

  // Tariff toggle
  const tariffToggle = document.getElementById('emsTariffToggle');
  if (tariffToggle) {
    tariffToggle.addEventListener('change', () => setSetting('dynamicTariff', !!tariffToggle.checked));
  }

  
// Tariff priority buttons
  const prioWrap = document.getElementById('emsTariffPriorityButtons');
  if (prioWrap) {
    prioWrap.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = Number(btn.getAttribute('data-prio') || '');
        if (Number.isFinite(p) && p > 0) setSetting('priority', p);
      });
    });
  }

  // Tariff mode buttons
  const modeWrap = document.getElementById('emsTariffModeButtons');
  if (modeWrap) {
    modeWrap.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = Number(btn.getAttribute('data-mode') || '');
        if (Number.isFinite(m) && m > 0) setSetting('tariffMode', m);
      });
    });
  }

  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => { window.location.href = '/settings.html'; });
  }

  window.__nwEmsControlModalInit = true;
}


function initThresholdModal() {
  if (window.__nwThresholdModalInit) return;

  const card = document.getElementById('thresholdCard');
  const modal = document.getElementById('thresholdModal');
  const closeBtn = document.getElementById('thrClose');
  const listEl = document.getElementById('thrList');
  const hintEl = document.getElementById('thrHint');

  if (!card || !modal || !closeBtn || !listEl) return;

  const setHint = (msg, isError = false) => {
    if (!hintEl) return;
    hintEl.textContent = String(msg || '');
    hintEl.style.color = isError ? '#fca5a5' : '';
  };

  const apiSet = async (key, value) => {
    try {
      const resp = await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ scope: 'threshold', key, value })
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => null);
        throw new Error((j && j.error) ? j.error : ('HTTP ' + resp.status));
      }
      setHint('Gespeichert.', false);
      return true;
    } catch (e) {
      setHint('Schreiben fehlgeschlagen: ' + (e && e.message ? e.message : 'unbekannt'), true);
      return false;
    }
  };

  const renderModal = () => {
    const cfg = window.__nwCfg || {};
    const rules = Array.isArray(cfg.thresholdRules) ? cfg.thresholdRules : (Array.isArray(window.__nwThresholdRules) ? window.__nwThresholdRules : []);

    const s = window.latestState || {};
    const v = (k) => (s && s[k]) ? s[k].value : undefined;

    listEl.innerHTML = '';

    const configured = (rules || []).filter(r => r && r.configured);
    if (!configured.length) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.85';
      empty.style.padding = '6px 0';
      empty.textContent = 'Keine Regeln konfiguriert.';
      listEl.appendChild(empty);
      setHint('Regeln werden im App‑Center (Installateur) angelegt.', false);
      return;
    }

    setHint('Nur freigegebene Felder sind veränderbar (pro Regel konfigurierbar).', false);

    const mkRow = (r) => {
      const idx = Number(r.idx);
      const row = document.createElement('div');
      row.style.border = '1px solid rgba(255,255,255,0.08)';
      row.style.borderRadius = '10px';
      row.style.padding = '10px';
      row.style.marginBottom = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'baseline';
      head.style.gap = '10px';

      const name = document.createElement('div');
      name.style.fontWeight = '700';
      name.textContent = r.name || ('Regel ' + idx);

      const badge = document.createElement('div');
      badge.style.fontSize = '0.85rem';
      badge.style.opacity = '0.9';
      const active = !!v(`threshold.rules.r${idx}.active`);
      const status = String(v(`threshold.rules.r${idx}.status`) || '').trim();
      const prettyStatus = (raw) => {
        const t = String(raw || '').trim().toLowerCase();
        if (!t) return '';
        const map = {
          inactive: 'INAKTIV',
          active: 'AKTIV',
          pending_on: 'WARTET (EIN)',
          pending_off: 'WARTET (AUS)',
          stale: 'STALE',
          disabled: 'AUS',
          unconfigured: 'NICHT KONFIGURIERT',
          write_fail: 'SCHREIBFEHLER',
          manual_on: 'MANUELL AN',
          manual_off: 'MANUELL AUS',
        };
        return map[t] || String(raw);
      };

      if (status && String(status).toLowerCase().startsWith('manual_')) {
        badge.textContent = prettyStatus(status);
      } else {
        badge.textContent = active ? 'AKTIV' : (prettyStatus(status) || 'INAKTIV');
      }

      head.appendChild(name);
      head.appendChild(badge);

      const body = document.createElement('div');
      body.style.marginTop = '8px';
      body.style.display = 'grid';
      body.style.gridTemplateColumns = 'repeat(auto-fit, minmax(160px, 1fr))';
      body.style.gap = '10px';

      const mkKpi = (label, valueText) => {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = label;
        const vEl = document.createElement('div');
        vEl.style.fontWeight = '700';
        vEl.textContent = valueText;
        box.appendChild(l);
        box.appendChild(vEl);
        return box;
      };

      const inputVal = v(`threshold.rules.r${idx}.input`);
      const thrEff = v(`threshold.rules.r${idx}.thresholdEff`);
      body.appendChild(mkKpi('Input', (inputVal === undefined || inputVal === null) ? '—' : String(inputVal)));
      body.appendChild(mkKpi('Schwellwert', (thrEff === undefined || thrEff === null) ? '—' : String(thrEff)));

      // User controls
      const ctl = document.createElement('div');
      ctl.style.display = 'flex';
      ctl.style.flexDirection = 'column';
      ctl.style.gap = '8px';
      // Regel ein/aus (Buttons) – fallback auf enabled, falls mode-State noch fehlt
      const modeState = v(`threshold.user.r${idx}.mode`);
      const enabledState = v(`threshold.user.r${idx}.enabled`);
      let curMode = Number.isFinite(Number(modeState))
        ? Math.round(Number(modeState))
        : ((enabledState === undefined || enabledState === null) ? 1 : (enabledState ? 1 : 0));
      curMode = Math.max(0, Math.min(2, curMode));
      let curModeUi = (curMode === 0) ? 0 : 1;

      if (r.userCanToggle) {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = 'Regel ein/aus';

        const btnWrap = document.createElement('div');
        btnWrap.className = 'nw-evcs-mode-buttons';
        btnWrap.style.width = '100%';

        const setActive = (uiVal) => {
          curModeUi = uiVal;
          Array.from(btnWrap.querySelectorAll('button')).forEach((b) => {
            b.classList.toggle('active', Number(b.dataset.mode) === curModeUi);
          });
        };

        const mkBtn = (label, uiVal, sendMode) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = label;
          b.dataset.mode = String(uiVal);
          if (curModeUi === uiVal) b.classList.add('active');
          b.addEventListener('click', async () => {
            if (curModeUi === uiVal) return;
            const ok = await apiSet(`r${idx}.mode`, sendMode);
            if (ok) {
              setActive(uiVal);
              renderModal();
            }
          });
          return b;
        };

        btnWrap.appendChild(mkBtn('Aus', 0, 0));
        btnWrap.appendChild(mkBtn('An', 1, 1));

        box.appendChild(l);
        box.appendChild(btnWrap);
        ctl.appendChild(box);
      } else {
        ctl.appendChild(mkKpi('Regel ein/aus', 'gesperrt'));
      }

      if (r.userCanSetThreshold) {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = 'Schwellwert setzen';
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'input';
        inp.style.width = '100%';
        const current = v(`threshold.user.r${idx}.threshold`);
        inp.value = (current === undefined || current === null) ? '' : String(current);
        inp.addEventListener('change', () => {
          const n = Number(inp.value);
          if (!Number.isFinite(n)) {
            setHint('Ungültiger Schwellwert.', true);
            return;
          }
          (async () => { const ok = await apiSet(`r${idx}.threshold`, n); if (ok) renderModal(); })();
        });
        box.appendChild(l);
        box.appendChild(inp);
        ctl.appendChild(box);
      } else {
        ctl.appendChild(mkKpi('Schwellwert', 'gesperrt'));
      }

      // Optional timing parameters: allow Endkunde to adjust MinOn/MinOff (if enabled in App-Center)
      const canMinOn = (typeof r.userCanSetMinOnSec === 'boolean') ? r.userCanSetMinOnSec : !!r.userCanSetThreshold;
      const canMinOff = (typeof r.userCanSetMinOffSec === 'boolean') ? r.userCanSetMinOffSec : !!r.userCanSetThreshold;

      if (canMinOn) {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = 'MinOn (s)';
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.min = '0';
        inp.step = '1';
        inp.className = 'input';
        inp.style.width = '100%';
        const current = v(`threshold.user.r${idx}.minOnSec`);
        inp.value = (current === undefined || current === null) ? '' : String(current);
        inp.addEventListener('change', () => {
          const n = Number(inp.value);
          if (!Number.isFinite(n) || n < 0) {
            setHint('Ungültiger MinOn-Wert.', true);
            return;
          }
          (async () => { const ok = await apiSet(`r${idx}.minOnSec`, Math.floor(n)); if (ok) renderModal(); })();
        });
        box.appendChild(l);
        box.appendChild(inp);
        ctl.appendChild(box);
      } else {
        ctl.appendChild(mkKpi('MinOn', 'gesperrt'));
      }

      if (canMinOff) {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = 'MinOff (s)';
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.min = '0';
        inp.step = '1';
        inp.className = 'input';
        inp.style.width = '100%';
        const current = v(`threshold.user.r${idx}.minOffSec`);
        inp.value = (current === undefined || current === null) ? '' : String(current);
        inp.addEventListener('change', () => {
          const n = Number(inp.value);
          if (!Number.isFinite(n) || n < 0) {
            setHint('Ungültiger MinOff-Wert.', true);
            return;
          }
          (async () => { const ok = await apiSet(`r${idx}.minOffSec`, Math.floor(n)); if (ok) renderModal(); })();
        });
        box.appendChild(l);
        box.appendChild(inp);
        ctl.appendChild(box);
      } else {
        ctl.appendChild(mkKpi('MinOff', 'gesperrt'));
      }

      body.appendChild(ctl);

      row.appendChild(head);
      row.appendChild(body);
      return row;
    };

    configured.forEach(r => listEl.appendChild(mkRow(r)));
  };

  const open = (e) => {
    try { if (e) e.preventDefault(); } catch(_e) {}
    modal.classList.remove('hidden');
    renderModal();
  };
  const close = () => modal.classList.add('hidden');

  card.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e && e.key === 'Escape') close(); });

  window.__thrApply = () => {
    try {
      if (!modal.classList.contains('hidden')) renderModal();
    } catch (_e) {}
  };

  window.__nwThresholdModalInit = true;
}




function initRelayModal() {
  if (window.__nwRelayModalInit) return;

  const card = document.getElementById('relayCard');
  const modal = document.getElementById('relayModal');
  const closeBtn = document.getElementById('relayClose');
  const listEl = document.getElementById('relayList');
  const hintEl = document.getElementById('relayHint');

  if (!card || !modal || !closeBtn || !listEl) return;

  let pollTimer = null;

  const setHint = (msg, isError = false) => {
    if (!hintEl) return;
    hintEl.textContent = String(msg || '');
    hintEl.style.color = isError ? '#fca5a5' : '';
  };

  const apiSet = async (idx, prop, value) => {
    try {
      const resp = await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ scope: 'relay', key: `r${idx}.${prop}`, value })
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => null);
        throw new Error((j && j.error) ? j.error : ('HTTP ' + resp.status));
      }
      setHint('Gespeichert.', false);
      return true;
    } catch (e) {
      setHint('Schreiben fehlgeschlagen: ' + (e && e.message ? e.message : 'unbekannt'), true);
      return false;
    }
  };

  const fetchSnapshot = async () => {
    try {
      const r = await fetch('/api/relay/snapshot', { credentials: 'same-origin' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return (j && j.relays) ? j.relays : [];
    } catch (_e) {
      return null;
    }
  };

  const renderModal = async () => {
    const relays = await fetchSnapshot();
    listEl.innerHTML = '';

    if (!Array.isArray(relays)) {
      const err = document.createElement('div');
      err.style.opacity = '0.85';
      err.style.padding = '6px 0';
      err.textContent = 'Status konnte nicht geladen werden.';
      listEl.appendChild(err);
      setHint('Verbindung prüfen.', true);
      return;
    }

    const shown = relays.filter(r => r && r.enabled !== false && r.showInLive !== false && r.configured);

    if (!shown.length) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.85';
      empty.style.padding = '6px 0';
      empty.textContent = 'Keine Ausgänge konfiguriert.';
      listEl.appendChild(empty);
      setHint('Ausgänge werden im App‑Center (Installateur) zugeordnet.', false);
      return;
    }

    setHint('Nur freigegebene Ausgänge sind steuerbar (pro Ausgang konfigurierbar).', false);

    const mkRow = (r) => {
      const idx = Number(r.idx);
      const row = document.createElement('div');
      row.style.border = '1px solid rgba(255,255,255,0.08)';
      row.style.borderRadius = '10px';
      row.style.padding = '10px';
      row.style.marginBottom = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'baseline';
      head.style.gap = '10px';

      const name = document.createElement('div');
      name.style.fontWeight = '700';
      name.textContent = r.name || ('Ausgang ' + idx);

      const badge = document.createElement('div');
      badge.style.fontSize = '0.85rem';
      badge.style.opacity = '0.9';
      if (r.type === 'boolean') badge.textContent = (r.val === true) ? 'EIN' : ((r.val === false) ? 'AUS' : '—');
      else badge.textContent = (r.val === null || r.val === undefined) ? '—' : String(r.val) + (r.unit ? (' ' + r.unit) : '');
      head.appendChild(name);
      head.appendChild(badge);

      const body = document.createElement('div');
      body.style.marginTop = '8px';
      body.style.display = 'grid';
      body.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
      body.style.gap = '10px';

      const mkKpi = (label, valueText) => {
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = label;
        const vEl = document.createElement('div');
        vEl.style.fontWeight = '700';
        vEl.textContent = valueText;
        box.appendChild(l);
        box.appendChild(vEl);
        return box;
      };

      // Readback meta
      const ts = Number(r.ts || 0);
      const tsTxt = ts ? (new Date(ts).toLocaleString()) : '—';
      body.appendChild(mkKpi('Zeitpunkt', tsTxt));

      const ctl = document.createElement('div');
      ctl.style.display = 'flex';
      ctl.style.flexDirection = 'column';
      ctl.style.gap = '8px';

      if (r.type === 'boolean') {
        const can = !!r.userCanToggle;

        // Use the same button style as other VIS controls (Aus/An) instead of a checkbox
        const btnWrap = document.createElement('div');
        btnWrap.className = 'nw-evcs-mode-buttons';
        btnWrap.style.alignSelf = 'flex-start';

        const curBool = !!r.val;
        const mkBtn = (label, val) => {
          const b = document.createElement('button');
          b.className = 'nw-evcs-mode-btn' + ((curBool === val) ? ' nw-active' : '');
          b.textContent = label;
          b.disabled = !can;
          b.addEventListener('click', async () => {
            if (!can) return;
            if ((!!r.val) === val) return;
            const ok = await apiSet(idx, 'switch', val);
            if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 200);
          });
          return b;
        };

        btnWrap.appendChild(mkBtn('Aus', false));
        btnWrap.appendChild(mkBtn('An', true));
        ctl.appendChild(btnWrap);

        if (!can) {
          const lock = document.createElement('div');
          lock.style.fontSize = '0.78rem';
          lock.style.opacity = '0.75';
          lock.textContent = 'gesperrt';
          ctl.appendChild(lock);
        }
      } else {
        const can = !!r.userCanSetValue;
        const box = document.createElement('div');
        const l = document.createElement('div');
        l.style.fontSize = '0.78rem';
        l.style.opacity = '0.85';
        l.textContent = can ? 'Wert setzen' : 'Wert (gesperrt)';
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'input';
        inp.style.width = '100%';
        if (Number.isFinite(Number(r.min))) inp.min = String(r.min);
        if (Number.isFinite(Number(r.max))) inp.max = String(r.max);
        if (Number.isFinite(Number(r.step))) inp.step = String(r.step);
        inp.disabled = !can;
        inp.value = (r.val === undefined || r.val === null) ? '' : String(r.val);
        inp.addEventListener('change', async () => {
          const n = Number(inp.value);
          if (!Number.isFinite(n)) {
            setHint('Ungültiger Wert.', true);
            return;
          }
          const ok = await apiSet(idx, 'value', n);
          if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 200);
        });
        box.appendChild(l);
        box.appendChild(inp);
        ctl.appendChild(box);
      }

      body.appendChild(ctl);

      row.appendChild(head);
      row.appendChild(body);
      return row;
    };

    shown.forEach(r => listEl.appendChild(mkRow(r)));
  };

  const open = (e) => {
    try { if (e) e.preventDefault(); } catch(_e) {}
    modal.classList.remove('hidden');
    renderModal();
    // Poll while open
    try {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => { if (!modal.classList.contains('hidden')) renderModal(); }, 1500);
    } catch (_e) {}
  };

  const close = () => {
    modal.classList.add('hidden');
    try { if (pollTimer) clearInterval(pollTimer); } catch(_e) {}
    pollTimer = null;
  };

  card.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e && e.key === 'Escape') close(); });

  window.__relayApply = () => {
    try { if (!modal.classList.contains('hidden')) renderModal(); } catch (_e) {}
  };

  window.__nwRelayModalInit = true;
}



function initBhkwModal() {
  if (window.__nwBhkwModalInit) return;

  const card = document.getElementById('bhkwCard');
  const modal = document.getElementById('bhkwModal');
  const closeBtn = document.getElementById('bhkwClose');
  const listEl = document.getElementById('bhkwList');
  const hintEl = document.getElementById('bhkwHint');

  if (!card || !modal || !closeBtn || !listEl) return;

  let pollTimer = null;

  const setHint = (msg, isError = false) => {
    if (!hintEl) return;
    hintEl.textContent = String(msg || '');
    hintEl.style.color = isError ? '#fca5a5' : '';
  };

  const apiSet = async (idx, prop, value) => {
    try {
      const resp = await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ scope: 'bhkw', key: `b${idx}.${prop}`, value })
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => null);
        throw new Error((j && j.error) ? j.error : ('HTTP ' + resp.status));
      }
      setHint('Gespeichert.', false);
      return true;
    } catch (e) {
      setHint('Schreiben fehlgeschlagen: ' + (e && e.message ? e.message : 'unbekannt'), true);
      return false;
    }
  };

  const fetchSnapshot = async () => {
    try {
      const r = await fetch('/api/bhkw/snapshot', { credentials: 'same-origin' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return (j && j.devices) ? j.devices : [];
    } catch (_e) {
      return null;
    }
  };

  const renderModal = async () => {
    const devices = await fetchSnapshot();
    listEl.innerHTML = '';

    if (!Array.isArray(devices)) {
      const err = document.createElement('div');
      err.style.opacity = '0.85';
      err.style.padding = '6px 0';
      err.textContent = 'Status konnte nicht geladen werden.';
      listEl.appendChild(err);
      setHint('Verbindung prüfen.', true);
      return;
    }

    const isInstaller = !!(window.__nwCfg && window.__nwCfg.session && window.__nwCfg.session.isInstaller);
    const shown = devices.filter(d => d && d.enabled !== false && d.showInLive !== false && d.configured);

    if (!shown.length) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.85';
      empty.style.padding = '6px 0';
      empty.textContent = 'Kein BHKW konfiguriert.';
      listEl.appendChild(empty);
      setHint('BHKW wird im App‑Center (Installateur) zugeordnet.', false);
      return;
    }

    setHint('Modus: Auto/Manuell/Aus. Start/Stop ist nur im Modus „Manuell“ aktiv.', false);

    const mkKpi = (label, valueText) => {
      const box = document.createElement('div');
      const l = document.createElement('div');
      l.style.fontSize = '0.78rem';
      l.style.opacity = '0.85';
      l.textContent = label;
      const vEl = document.createElement('div');
      vEl.style.fontWeight = '700';
      vEl.textContent = valueText;
      box.appendChild(l);
      box.appendChild(vEl);
      return box;
    };

    const mkRow = (d) => {
      const idx = Number(d.idx);
      const row = document.createElement('div');
      row.style.border = '1px solid rgba(255,255,255,0.08)';
      row.style.borderRadius = '10px';
      row.style.padding = '10px';
      row.style.marginBottom = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'baseline';
      head.style.gap = '10px';

      const name = document.createElement('div');
      name.style.fontWeight = '700';
      name.textContent = d.name || ('BHKW ' + idx);

      const badge = document.createElement('div');
      badge.style.fontSize = '0.85rem';
      badge.style.opacity = '0.9';
      if (d.running === true) badge.textContent = 'LÄUFT';
      else if (d.running === false) badge.textContent = 'AUS';
      else badge.textContent = '—';

      head.appendChild(name);
      head.appendChild(badge);

      const body = document.createElement('div');
      body.style.marginTop = '8px';
      body.style.display = 'grid';
      body.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
      body.style.gap = '10px';

      const socTxt = (d.socPct === null || d.socPct === undefined || Number.isNaN(Number(d.socPct))) ? '—' : (String(Math.round(Number(d.socPct) * 10) / 10) + ' %');
      const pwrTxt = (d.powerW === null || d.powerW === undefined || Number.isNaN(Number(d.powerW))) ? '—' : (Math.round(Number(d.powerW)) >= 1000 ? (String(Math.round(Number(d.powerW) / 10) / 100) + ' kW') : (String(Math.round(Number(d.powerW))) + ' W'));
      body.appendChild(mkKpi('SoC', socTxt));
      body.appendChild(mkKpi('Leistung', pwrTxt));

      const statusTxt = (d.status === null || d.status === undefined) ? '—' : String(d.status);
      body.appendChild(mkKpi('Status', statusTxt));

      const mode = String(d.mode || 'auto').toLowerCase();
      const canControl = isInstaller || !!d.userCanControl;

      const ctl = document.createElement('div');
      ctl.style.display = 'flex';
      ctl.style.flexDirection = 'column';
      ctl.style.gap = '8px';

      // Mode buttons
      const modeBox = document.createElement('div');
      const l = document.createElement('div');
      l.style.fontSize = '0.78rem';
      l.style.opacity = '0.85';
      l.textContent = canControl ? 'Modus' : 'Modus (gesperrt)';
      const grp = document.createElement('div');
      grp.className = 'nw-evcs-mode-buttons nw-evcs-mode-buttons-3';

      const addBtn = (val, label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.classList.toggle('active', mode === val);
        b.disabled = !canControl;
        b.addEventListener('click', async () => {
          const ok = await apiSet(idx, 'mode', val);
          if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
        });
        grp.appendChild(b);
      };

      addBtn('auto', 'Auto');
      addBtn('manual', 'Manuell');
      addBtn('off', 'Aus');

      modeBox.appendChild(l);
      modeBox.appendChild(grp);
      ctl.appendChild(modeBox);

      // Start/Stop only in manual mode
      const cmdRow = document.createElement('div');
      cmdRow.style.display = (mode === 'manual') ? 'flex' : 'none';
      cmdRow.style.gap = '8px';
      cmdRow.style.flexWrap = 'wrap';

      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'btn';
      startBtn.textContent = 'Start';
      startBtn.disabled = !canControl;
      startBtn.addEventListener('click', async () => {
        const ok = await apiSet(idx, 'command', 'start');
        if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
      });

      const stopBtn = document.createElement('button');
      stopBtn.type = 'button';
      stopBtn.className = 'btn';
      stopBtn.textContent = 'Stop';
      stopBtn.disabled = !canControl;
      stopBtn.addEventListener('click', async () => {
        const ok = await apiSet(idx, 'command', 'stop');
        if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
      });

      cmdRow.appendChild(startBtn);
      cmdRow.appendChild(stopBtn);
      ctl.appendChild(cmdRow);

      body.appendChild(ctl);

      row.appendChild(head);
      row.appendChild(body);
      return row;
    };

    shown.forEach(d => listEl.appendChild(mkRow(d)));
  };

  const open = (e) => {
    try { if (e) e.preventDefault(); } catch(_e) {}
    modal.classList.remove('hidden');
    renderModal();
    try {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => { if (!modal.classList.contains('hidden')) renderModal(); }, 1500);
    } catch (_e) {}
  };

  const close = () => {
    modal.classList.add('hidden');
    try { if (pollTimer) clearInterval(pollTimer); } catch(_e) {}
    pollTimer = null;
  };

  card.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e && e.key === 'Escape') close(); });

  window.__nwBhkwModalInit = true;
}



function initGeneratorModal() {
  if (window.__nwGeneratorModalInit) return;

  const card = document.getElementById('generatorCard');
  const modal = document.getElementById('generatorModal');
  const closeBtn = document.getElementById('generatorClose');
  const listEl = document.getElementById('generatorList');
  const hintEl = document.getElementById('generatorHint');

  if (!card || !modal || !closeBtn || !listEl) return;

  let pollTimer = null;

  const setHint = (msg, isError = false) => {
    if (!hintEl) return;
    hintEl.textContent = String(msg || '');
    hintEl.style.color = isError ? '#fca5a5' : '';
  };

  const apiSet = async (idx, prop, value) => {
    try {
      const resp = await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ scope: 'generator', key: `g${idx}.${prop}`, value })
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => null);
        throw new Error((j && j.error) ? j.error : ('HTTP ' + resp.status));
      }
      setHint('Gespeichert.', false);
      return true;
    } catch (e) {
      setHint('Schreiben fehlgeschlagen: ' + (e && e.message ? e.message : 'unbekannt'), true);
      return false;
    }
  };

  const fetchSnapshot = async () => {
    try {
      const r = await fetch('/api/generator/snapshot', { credentials: 'same-origin' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return (j && j.devices) ? j.devices : [];
    } catch (_e) {
      return null;
    }
  };

  const renderModal = async () => {
    const devices = await fetchSnapshot();
    listEl.innerHTML = '';

    if (!Array.isArray(devices)) {
      const err = document.createElement('div');
      err.style.opacity = '0.85';
      err.style.padding = '6px 0';
      err.textContent = 'Status konnte nicht geladen werden.';
      listEl.appendChild(err);
      setHint('Verbindung prüfen.', true);
      return;
    }

    const isInstaller = !!(window.__nwCfg && window.__nwCfg.session && window.__nwCfg.session.isInstaller);
    const shown = devices.filter(d => d && d.enabled !== false && d.showInLive !== false && d.configured);

    if (!shown.length) {
      const empty = document.createElement('div');
      empty.style.opacity = '0.85';
      empty.style.padding = '6px 0';
      empty.textContent = 'Kein Generator konfiguriert.';
      listEl.appendChild(empty);
      setHint('Generator wird im App‑Center (Installateur) zugeordnet.', false);
      return;
    }

    setHint('Modus: Auto/Manuell/Aus. Start/Stop ist nur im Modus „Manuell“ aktiv.', false);

    const mkKpi = (label, valueText) => {
      const box = document.createElement('div');
      const l = document.createElement('div');
      l.style.fontSize = '0.78rem';
      l.style.opacity = '0.85';
      l.textContent = label;
      const vEl = document.createElement('div');
      vEl.style.fontWeight = '700';
      vEl.textContent = valueText;
      box.appendChild(l);
      box.appendChild(vEl);
      return box;
    };

    const mkRow = (d) => {
      const idx = Number(d.idx);
      const row = document.createElement('div');
      row.style.border = '1px solid rgba(255,255,255,0.08)';
      row.style.borderRadius = '10px';
      row.style.padding = '10px';
      row.style.marginBottom = '10px';

      const head = document.createElement('div');
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'baseline';
      head.style.gap = '10px';

      const name = document.createElement('div');
      name.style.fontWeight = '700';
      name.textContent = d.name || ('Generator ' + idx);

      const badge = document.createElement('div');
      badge.style.fontSize = '0.85rem';
      badge.style.opacity = '0.9';
      if (d.running === true) badge.textContent = 'LÄUFT';
      else if (d.running === false) badge.textContent = 'AUS';
      else badge.textContent = '—';

      head.appendChild(name);
      head.appendChild(badge);

      const body = document.createElement('div');
      body.style.marginTop = '8px';
      body.style.display = 'grid';
      body.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
      body.style.gap = '10px';

      const socTxt = (d.socPct === null || d.socPct === undefined || Number.isNaN(Number(d.socPct))) ? '—' : (String(Math.round(Number(d.socPct) * 10) / 10) + ' %');
      const pwrTxt = (d.powerW === null || d.powerW === undefined || Number.isNaN(Number(d.powerW))) ? '—' : (Math.round(Number(d.powerW)) >= 1000 ? (String(Math.round(Number(d.powerW) / 10) / 100) + ' kW') : (String(Math.round(Number(d.powerW))) + ' W'));
      body.appendChild(mkKpi('SoC', socTxt));
      body.appendChild(mkKpi('Leistung', pwrTxt));

      const statusTxt = (d.status === null || d.status === undefined) ? '—' : String(d.status);
      body.appendChild(mkKpi('Status', statusTxt));

      const mode = String(d.mode || 'auto').toLowerCase();
      const canControl = isInstaller || !!d.userCanControl;

      const ctl = document.createElement('div');
      ctl.style.display = 'flex';
      ctl.style.flexDirection = 'column';
      ctl.style.gap = '8px';

      // Mode buttons
      const modeBox = document.createElement('div');
      const l = document.createElement('div');
      l.style.fontSize = '0.78rem';
      l.style.opacity = '0.85';
      l.textContent = canControl ? 'Modus' : 'Modus (gesperrt)';
      const grp = document.createElement('div');
      grp.className = 'nw-evcs-mode-buttons nw-evcs-mode-buttons-3';

      const addBtn = (val, label) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.classList.toggle('active', mode === val);
        b.disabled = !canControl;
        b.addEventListener('click', async () => {
          const ok = await apiSet(idx, 'mode', val);
          if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
        });
        grp.appendChild(b);
      };

      addBtn('auto', 'Auto');
      addBtn('manual', 'Manuell');
      addBtn('off', 'Aus');

      modeBox.appendChild(l);
      modeBox.appendChild(grp);
      ctl.appendChild(modeBox);

      // Start/Stop only in manual mode
      const cmdRow = document.createElement('div');
      cmdRow.style.display = (mode === 'manual') ? 'flex' : 'none';
      cmdRow.style.gap = '8px';
      cmdRow.style.flexWrap = 'wrap';

      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'btn';
      startBtn.textContent = 'Start';
      startBtn.disabled = !canControl;
      startBtn.addEventListener('click', async () => {
        const ok = await apiSet(idx, 'command', 'start');
        if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
      });

      const stopBtn = document.createElement('button');
      stopBtn.type = 'button';
      stopBtn.className = 'btn';
      stopBtn.textContent = 'Stop';
      stopBtn.disabled = !canControl;
      stopBtn.addEventListener('click', async () => {
        const ok = await apiSet(idx, 'command', 'stop');
        if (ok) setTimeout(() => { try { renderModal(); } catch(_e) {} }, 150);
      });

      cmdRow.appendChild(startBtn);
      cmdRow.appendChild(stopBtn);
      ctl.appendChild(cmdRow);

      body.appendChild(ctl);

      row.appendChild(head);
      row.appendChild(body);
      return row;
    };

    shown.forEach(d => listEl.appendChild(mkRow(d)));
  };

  const open = (e) => {
    try { if (e) e.preventDefault(); } catch(_e) {}
    modal.classList.remove('hidden');
    renderModal();
    try {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => { if (!modal.classList.contains('hidden')) renderModal(); }, 1500);
    } catch (_e) {}
  };

  const close = () => {
    modal.classList.add('hidden');
    try { if (pollTimer) clearInterval(pollTimer); } catch(_e) {}
    pollTimer = null;
  };

  card.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e && e.key === 'Escape') close(); });

  window.__nwGeneratorModalInit = true;
}



function updateRelayUi(){
  const cfg = window.__nwCfg || {};
  const apps = window.__nwEmsApps || { apps: {} };

  // Prefer App-Center flags (installed + enabled). Fallback: legacy cfg.ems.* flags.
  const hasAppObj = !!(apps && apps.apps && apps.apps.relay && typeof apps.apps.relay === 'object');
  const app = hasAppObj ? apps.apps.relay : {};
  const legacyEnabled = !!(cfg && cfg.ems && cfg.ems.relayEnabled);

  const installed = hasAppObj ? (app.installed === true) : legacyEnabled;
  const enabled = hasAppObj ? (app.enabled === true) : legacyEnabled;

  const card = document.getElementById('relayCard');
  if (!card) return;

  // Nur anzeigen, wenn App installiert + aktiv + mind. ein Relais konfiguriert ist
  const relays = Array.isArray(window.__nwRelayControls) ? window.__nwRelayControls : [];
  const visible = relays.filter(r => r && r.configured);

  if (!installed) {
    card.classList.add('hidden');
    // defensive: inline display can override .hidden without !important
    card.style.display = 'none';
    return;
  }

  card.classList.remove('hidden');
  card.style.display = '';

  const onCount = visible.filter(r => r.on).length;
  setText('relayOnCount', String(onCount));
  setText('relayCount', String(visible.length));
  setText('relayStatusShort', enabled ? (visible.length ? 'aktiv' : 'bereit') : 'aus');
}



function updateThresholdUi(){
  const cfg = window.__nwCfg || {};
  const apps = window.__nwEmsApps || { apps: {} };

  // Prefer App-Center flags (installed + enabled). Fallback: legacy cfg.ems.* flags.
  const hasAppObj = !!(apps && apps.apps && apps.apps.threshold && typeof apps.apps.threshold === 'object');
  const app = hasAppObj ? apps.apps.threshold : {};
  const legacyEnabled = !!(cfg && cfg.ems && cfg.ems.thresholdEnabled);

  const installed = hasAppObj ? (app.installed === true) : legacyEnabled;
  const enabled = hasAppObj ? (app.enabled === true) : legacyEnabled;

  const card = document.getElementById('thresholdCard');
  if (!card) return;

  // Nur anzeigen, wenn App installiert + aktiv + mind. eine Regel konfiguriert ist
  const rules = Array.isArray(window.__nwThresholdRules) ? window.__nwThresholdRules : [];
  const configured = rules.filter(r => r && r.configured);

  if (!installed) {
    card.classList.add('hidden');
    // defensive: inline display can override .hidden without !important
    card.style.display = 'none';
    return;
  }

  card.classList.remove('hidden');
  card.style.display = '';

  const activeCount = configured.filter(r => r.active).length;
  setText('thrActiveCount', String(activeCount));
  setText('thrRuleCount', String(configured.length));
  setText('thrStatusShort', enabled ? (configured.length ? 'aktiv' : 'bereit') : 'aus');
}





function updateBhkwUi(){
  const cfg = window.__nwCfg || {};
  const apps = window.__nwEmsApps || { apps: {} };

  // Prefer App-Center flags (installed + enabled). Fallback: legacy cfg.ems.* flags.
  const hasAppObj = !!(apps && apps.apps && apps.apps.bhkw && typeof apps.apps.bhkw === 'object');
  const app = hasAppObj ? apps.apps.bhkw : {};
  const legacyEnabled = !!(cfg && cfg.ems && cfg.ems.bhkwEnabled);

  const installed = hasAppObj ? (app.installed === true) : legacyEnabled;
  const enabled = hasAppObj ? (app.enabled === true) : legacyEnabled;

  const card = document.getElementById('bhkwCard');
  if (!card) return;

  const devs = Array.isArray(window.__nwBhkwDevices) ? window.__nwBhkwDevices : [];
  const visible = devs.filter(d => d && d.showInLive !== false && d.enabled !== false);

  // Nur anzeigen, wenn App installiert + aktiv + mind. ein Gerät konfiguriert ist
  if (!installed) {
    card.classList.add('hidden');
    // defensive: inline display can override .hidden without !important
    card.style.display = 'none';
    return;
  }

  card.classList.remove('hidden');
  card.style.display = '';

  // Running count from live states
  const st = window.latestState || {};
  const sv = (k) => (st && st[k] && st[k].value !== undefined) ? st[k].value : undefined;

  let runCount = 0;
  for (const d of visible){
    const idx = Number(d.idx);
    if (!idx) continue;
    const r = sv(`bhkw.devices.b${idx}.running`);
    if (r === true) runCount++;
  }

  setText('bhkwRunningCount', String(runCount));
  setText('bhkwCount', String(visible.length));
  setText('bhkwStatusShort', enabled ? (visible.length ? 'aktiv' : 'bereit') : 'aus');
}




function updateGeneratorUi(){
  const cfg = window.__nwCfg || {};
  const apps = window.__nwEmsApps || { apps: {} };

  // Prefer App-Center flags (installed + enabled). Fallback: legacy cfg.ems.* flags.
  const hasAppObj = !!(apps && apps.apps && apps.apps.generator && typeof apps.apps.generator === 'object');
  const app = hasAppObj ? apps.apps.generator : {};
  const legacyEnabled = !!(cfg && cfg.ems && cfg.ems.generatorEnabled);

  const installed = hasAppObj ? (app.installed === true) : legacyEnabled;
  const enabled = hasAppObj ? (app.enabled === true) : legacyEnabled;

  const card = document.getElementById('generatorCard');
  if (!card) return;

  const devs = Array.isArray(window.__nwGeneratorDevices) ? window.__nwGeneratorDevices : [];
  const visible = devs.filter(d => d && d.showInLive !== false && d.enabled !== false);

  // Nur anzeigen, wenn App installiert + aktiv + mind. ein Gerät konfiguriert ist
  if (!installed) {
    card.classList.add('hidden');
    // defensive: inline display can override .hidden without !important
    card.style.display = 'none';
    return;
  }

  card.classList.remove('hidden');
  card.style.display = '';

  const st = window.latestState || {};
  const sv = (k) => (st && st[k] && st[k].value !== undefined) ? st[k].value : undefined;

  let runCount = 0;
  for (const d of visible){
    const idx = Number(d.idx);
    if (!idx) continue;
    const r = sv(`generator.devices.g${idx}.running`);
    if (r === true) runCount++;
  }

  setText('generatorRunningCount', String(runCount));
  setText('generatorCount', String(visible.length));
  setText('generatorStatusShort', enabled ? (visible.length ? 'aktiv' : 'bereit') : 'aus');
}



// ---- Thermik / Verbraucher Quick-Tiles (dynamisch je Slot) ----
const _thermalConsTiles = new Map();

function _ensureThermalConsumerTiles(){
  const grid = document.getElementById('liveQuickTiles');
  if (!grid) return;

  // Wir erstellen feste Platzhalter für bis zu 8 Verbraucher-Slots.
  for (let idx = 1; idx <= 8; idx++) {
    const id = `thermalConsumerCard${idx}`;
    if (document.getElementById(id)) continue;

    const tile = document.createElement('div');
    tile.id = id;
    tile.className = 'nw-tile nw-tile--size-m nw-tile--type-scene';
    tile.setAttribute('role', 'button');
    tile.setAttribute('tabindex', '0');
    tile.style.display = 'none'; // wird in updateThermalConsumerUi() gesetzt

    tile.innerHTML = `
      <div class="nw-tile-h">
        <div class="nw-tile__icon-circle" id="thermalConsumerIcon${idx}">♨</div>
        <div>
          <div class="nw-tile-title" id="thermalConsumerTitle${idx}">Verbraucher ${idx}</div>
          <div class="nw-tile-sub" id="thermalConsumerSub${idx}">Thermik</div>
        </div>
        <div class="nw-badge nw-badge--app" id="thermalConsumerBadge${idx}">APP</div>
      </div>
      <div class="nw-tile-kpi">
        <div class="nw-kpi-val" id="thermalConsumerPower${idx}">0 W</div>
        <div class="nw-kpi-label" id="thermalConsumerMode${idx}">—</div>
      </div>
      <div class="nw-tile-meta">
        <span class="nw-meta" id="thermalConsumerMetaL${idx}">—</span>
        <span class="nw-meta" id="thermalConsumerMetaM${idx}">Slot ${idx}</span>
        <span class="nw-meta nw-meta-right" id="thermalConsumerMetaR${idx}">—</span>
      </div>
    `;

    const open = () => {
      // Re-use der bestehenden Flow-QuickControl (Modal)
      try { openFlowQc('consumers', idx); } catch (e) { console.warn('openFlowQc failed', e); }
    };
    tile.addEventListener('click', open);
    tile.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        open();
      }
    });

    grid.appendChild(tile);

    _thermalConsTiles.set(idx, {
      tile,
      title: document.getElementById(`thermalConsumerTitle${idx}`),
      sub: document.getElementById(`thermalConsumerSub${idx}`),
      power: document.getElementById(`thermalConsumerPower${idx}`),
      mode: document.getElementById(`thermalConsumerMode${idx}`),
      metaL: document.getElementById(`thermalConsumerMetaL${idx}`),
      metaM: document.getElementById(`thermalConsumerMetaM${idx}`),
      metaR: document.getElementById(`thermalConsumerMetaR${idx}`),
    });
  }
}

function _labelThermalMode(mode){
  const m = String(mode || '').trim();
  if (!m) return '—';
  if (m === 'inherit') return 'Auto';
  if (m === 'pvAuto') return 'PV‑Auto';
  if (m === 'sgReady' || m === 'sgready') return 'SG‑Ready';
  if (m === 'manual') return 'Manuell';
  if (m === 'off') return 'Aus';
  return m;
}

function updateThermalConsumerUi(){
  _ensureThermalConsumerTiles();

  const apps = (window.__nwEmsApps && window.__nwEmsApps.apps) ? window.__nwEmsApps.apps : {};
  const thermApp = apps.thermal || {};
  const appInstalled = (thermApp.installed === true);
  const appEnabled = (thermApp.enabled === true);
  const appActive = appInstalled && appEnabled;

  const slots = (flowSlotsCfg && Array.isArray(flowSlotsCfg.consumers)) ? flowSlotsCfg.consumers : [];
  const thermalCfg = (window.__nwEmsApps && window.__nwEmsApps.thermal) ? window.__nwEmsApps.thermal : {};
  const devices = Array.isArray(thermalCfg.devices) ? thermalCfg.devices : [];

  const st = window.latestState || {};
  const sv = (k) => (st && st[k] && st[k].value !== undefined) ? st[k].value : undefined;

  for (let idx = 1; idx <= 8; idx++) {
    const refs = _thermalConsTiles.get(idx);
    if (!refs) continue;

    const slot = slots[idx - 1];
    const qcEnabled = !!(slot && slot.qc && slot.qc.enabled);

    const show = appInstalled && qcEnabled;
    refs.tile.style.display = show ? '' : 'none';
    if (!show) continue;

    const dev = devices[idx - 1] || {};
    const name = (dev && dev.name) ? String(dev.name) : (slot && slot.name ? String(slot.name) : `Verbraucher ${idx}`);

    // Titel/Sub
    if (refs.title) refs.title.textContent = name;
    if (refs.sub) refs.sub.textContent = 'Thermik';

    // Leistung (W)
    const pKey = (slot && slot.stateKey) ? String(slot.stateKey) : `consumer${idx}Power`;
    const pW = Number(sv(pKey) ?? 0);
    if (refs.power) refs.power.textContent = formatPower(pW);

    // Modus (User Override, default: PV-Auto)
    const userMode = sv(`th.user.c${idx}.mode`);
    const effMode = (!userMode || userMode === 'inherit') ? 'pvAuto' : userMode;
    if (refs.mode) refs.mode.textContent = _labelThermalMode(effMode);

    // Meta: capability + slot + aktiv/aus
    let cap = '—';
    if (slot && slot.qc){
      if (slot.qc.hasSgReady) cap = 'SG‑Ready';
      else if (slot.qc.hasSetpoint) cap = 'Setpoint';
      else if (slot.qc.hasSwitch) cap = 'Schalten';
    }
    if (refs.metaL) refs.metaL.textContent = cap;
    if (refs.metaM) refs.metaM.textContent = `Slot ${idx}`;

    const userReg = sv(`th.user.c${idx}.regEnabled`);
    const regEnabled = (typeof userReg === 'boolean') ? userReg : true;
    const cfgEnabled = (typeof dev.enabled === 'boolean') ? dev.enabled : true;
    const isActive = cfgEnabled && regEnabled;

    if (refs.metaR) refs.metaR.textContent = isActive ? 'aktiv' : 'aus';
  }
}





// ---- Energy Web update ----
function updateEnergyWeb() {
  const d = (k) => state[k]?.value;
  const s = window.latestState || {};

  // Raw datapoints (1:1)
  const sfEnabled = !!(s['storageFarm.enabled']?.value);
  const dpCfg = (window.__nwCfg && window.__nwCfg.datapoints) ? window.__nwCfg.datapoints : {};
  const pvMapped = !!(dpCfg && (dpCfg.pvPower || dpCfg.productionTotal));

  // PV (W): primary from mapped PV datapoint; fallback to productionTotal if used as power DP.
  let pv = +(d('pvPower') ?? d('productionTotal') ?? 0);
  if (!Number.isFinite(pv)) pv = 0;

  // Speicherfarm (DC‑PV): im Farm‑Modus zur PV‑Erzeugung addieren (oder ersetzen, wenn kein PV‑DP gemappt ist).
  if (sfEnabled) {
    const pvFarm = +(d('storageFarm.totalPvPowerW') ?? 0);
    if (Number.isFinite(pvFarm) && pvFarm > 0) {
      if (!pvMapped || pv === 0) {
        pv = pvFarm;
      } else {
        // Keep sign-consistency (some adapters use negative PV generation)
        const sign = pv < 0 ? -1 : 1;
        const pvAbs = Math.abs(pv);
        const relDiff = Math.abs(pvAbs - pvFarm) / Math.max(1, pvFarm);

        // Avoid obvious double counting if pvPower already equals the farm sum
        if (relDiff < 0.05) pv = sign * pvFarm;
        else pv = pv + (sign * pvFarm);
      }
    }
  }
  let buy = +(d('gridBuyPower') ?? 0);
  let sell = +(d('gridSellPower') ?? 0);
  let load = +(d('consumptionTotal') ?? 0);
  let c2 = +(d('evcs.totalPowerW') ?? d('consumptionEvcs') ?? 0); // Wallbox (sum)
  let batCharge = +(d('storageChargePower') ?? 0);
  let batDischarge = +(d('storageDischargePower') ?? 0);
  const batSingle = d('batteryPower'); // optional fallback
  let soc = d('storageSoc');

  if (sfEnabled) {
    const c = d('storageFarm.totalChargePowerW');
    const dch = d('storageFarm.totalDischargePowerW');
    const socAvg = d('storageFarm.totalSoc');
    const socMedian = d('storageFarm.medianSoc');
    if (c != null && !isNaN(Number(c))) batCharge = +c;
    if (dch != null && !isNaN(Number(dch))) batDischarge = +dch;
    // Im Farm‑Modus bevorzugen wir den Durchschnitt (Ø), Median bleibt als Fallback.
    if (socAvg != null && !isNaN(Number(socAvg))) soc = socAvg;
    else if (socMedian != null && !isNaN(Number(socMedian))) soc = socMedian;
  }

  // Invert toggles (remain verfügbar)
  const invPv   = !!(s['settings.flowInvertPv']?.value);
  const invBat  = !!(s['settings.flowInvertBattery']?.value);
  const invGrid = !!(s['settings.flowInvertGrid']?.value);
  const invEv   = !!(s['settings.flowInvertEv']?.value);
  const subEvFromLoad = (s['settings.flowSubtractEvFromBuilding']?.value ?? true) ? true : false;
  const evAvail = (flowExtras && flowExtras.meta) ? !!flowExtras.meta.evcsAvailable : true;

  if (invPv) pv = -pv;
  if (invEv) c2 = -c2;
  if (!evAvail) c2 = 0;
  if (invGrid) { const t=buy; buy = sell; sell = t; } // swap semantics if inverted grid

  if (invBat) { const t=batCharge; batCharge = batDischarge; batDischarge = t; }

  // Normalize battery flow signs: some systems report negative for charge/discharge
  if (batCharge < 0 && batDischarge <= 0) { batCharge = Math.abs(batCharge); }
  if (batDischarge < 0 && batCharge <= 0) { batDischarge = Math.abs(batDischarge); }

  // Fallback: if both battery flows are zero AND a single DP exists, infer direction from its sign
  if ((batCharge===0 && batDischarge===0) && batSingle !== undefined && batSingle !== null && !isNaN(Number(batSingle))) {
    const bp = Number(batSingle);
    if (bp < 0) { batCharge = Math.abs(bp); batDischarge = 0; }
    else { batDischarge = Math.abs(bp); batCharge = 0; }
  }

  // Optionale Extra-Kreise aktualisieren (Rückgabe = Summe der optionalen Verbraucher)
  const extrasConsumersSum = updateEnergyWebExtras(d);

  // Gebäudeanzeige: EV (optional) + optionale Verbraucher abziehen, damit der Energiefluss optisch sauber aufgeht
  const evAbs = Math.max(0, Math.abs(c2));
  const loadDisplayBase = Math.max(0, subEvFromLoad ? (load - evAbs) : load);
  let loadDisplay = Math.max(0, loadDisplayBase - extrasConsumersSum);

  // Anti-glitch: if the building load temporarily drops to 0 W while there is clear activity,
  // hold the last plausible value for a short time to avoid confusing UI spikes.
  try {
    const sysActivityW = Math.abs(pv) + Math.abs(buy) + Math.abs(sell) + Math.abs(batCharge) + Math.abs(batDischarge) + Math.abs(c2) + Math.abs(extrasConsumersSum);
    if (sysActivityW > 300 && loadDisplay === 0) {
      const lastW = Number(window.__nwLastGoodLoadDisplayW);
      const lastTs = Number(window.__nwLastGoodLoadDisplayTs);
      if (Number.isFinite(lastW) && Number.isFinite(lastTs) && (Date.now() - lastTs) < 60 * 1000 && lastW > 0) {
        loadDisplay = lastW;
      } else {
        loadDisplay = 100;
      }
    }
    if (loadDisplay > 0) {
      window.__nwLastGoodLoadDisplayW = loadDisplay;
      window.__nwLastGoodLoadDisplayTs = Date.now();
    }
  } catch (_e) {}

  // -------- Anzeige-Werte & Richtungen (ohne Netto-Berechnung) --------
  // PV: immer Richtung Gebäude (keine Richtungsumschaltung); Wert = |pv|
  // Hintergrund: Einige Zähler/Adapter liefern Vorzeichen-Schwankungen um 0W oder invertierte Vorzeichen.
  // Für die VIS soll die Erzeugung optisch immer "zum Gebäude" laufen.
  const pvValNum = Math.abs(pv);
  const pvRev = false;

  // GRID: bevorzugt Bezug (buy). Nur wenn buy==0 und sell>0, zeige Einspeisung.
  let gridShowVal = 0;
  let gridRev = false; // rev = vom Gebäude weg
  let gridSellMode = false;
  if (buy > 0) { gridShowVal = buy; gridRev = false; gridSellMode = false; }
  else if (sell !== 0 && !isNaN(sell)) { gridShowVal = Math.abs(sell); gridRev = true; gridSellMode = true; }
  else { gridShowVal = 0; gridRev = false; gridSellMode = false; }
// removed stray block
// removed stray block
// removed stray block
// removed stray block

  // BATTERIE:
  // Standard (Einzel‑Speicher): wähle vorhandenen Strom (kein Netto)
  // Farm‑Modus: wenn gleichzeitig Laden & Entladen vorkommt, zeigen wir den dominanten Netto‑Fluss
  //             (|Entladen − Laden|) und bestimmen die Richtung über den höheren Wert.
  let batShowVal = 0;
  let batRev = false;

  if (sfEnabled) {
    const ch = Math.max(0, Number(batCharge) || 0);
    const dch = Math.max(0, Number(batDischarge) || 0);
    if (ch > 0 || dch > 0) {
      if (dch >= ch) { batShowVal = dch - ch; batRev = false; }
      else { batShowVal = ch - dch; batRev = true; }
    }
  } else {
    // - Entladen (batDischarge>0) -> zur Mitte; Anzeige +batDischarge
    // - Laden (batCharge>0) -> von Mitte zur Batterie; Anzeige -batCharge
    if (batDischarge > 0 && batCharge <= 0) { batShowVal = batDischarge; batRev = false; }
    else if (batCharge > 0 && batDischarge <= 0) { batShowVal = batCharge; batRev = true; }
    else if (batCharge > 0 || batDischarge > 0) {
      if (batCharge >= batDischarge) { batShowVal = batCharge; batRev = true; }
      else { batShowVal = batDischarge; batRev = false; }
    }
  }


// ---------- Ausgabe ----------
  const T = (id, t) => { const el=document.getElementById(id); if (el) el.textContent=t; };
  const signed = (num, negIsMinus=false)=>{
    const n = Number(num)||0;
    if (n===0) return '0.00 kW';
    const abs = Math.abs(n);
    const prefix = negIsMinus ? '-' : (n<0 ? '-' : '+');
    return prefix + (abs/1000).toFixed(2) + ' kW';
  };

  T('pvVal', formatFlowPower(pvValNum));
  // grid text: +Bezug, -Einspeisung
  T('gridVal', gridShowVal ? (gridSellMode ? ('-'+formatFlowPower(gridShowVal)) : formatFlowPower(gridShowVal)) : '0.00 kW');
  // EV & Batterie Texte
  T('c2Val', formatFlowPower(Math.max(0, Math.abs(c2))));
  T('restVal', batShowVal ? (batRev ? ('-'+formatFlowPower(batShowVal)) : formatFlowPower(batShowVal)) : '0.00 kW');
  T('centerPower', formatFlowPower(Math.max(0, loadDisplay)));
  if (soc===undefined || isNaN(Number(soc))) { T('batterySocIn','-- %'); } else { T('batterySocIn', Number(soc).toFixed(0)+' %'); }

  // Sichtbarkeit
  const show = (id, on)=>{ const el=document.getElementById(id); if(el) el.style.opacity = on ? 1 : 0.15; };
  show('linePV', pvValNum>1);
  show('lineGrid', gridShowVal>1);
  show('lineC2', Math.abs(c2)>1);
  show('lineRest', batShowVal>1);

  // Richtung
  const toggleRev = (id, on)=>{ const el=document.getElementById(id); if (el) el.classList.toggle('rev', !!on); };
  toggleRev('linePV', pvRev);
  toggleRev('lineGrid', gridRev);
  toggleRev('lineC2', Math.abs(c2)>1 ? (invEv ? true : false) : false);toggleRev('lineRest', !batRev);

  // Grid Farbe (Einspeisung grün)
  const lg = document.getElementById('lineGrid');
  if (lg) {
    if (gridSellMode) lg.classList.add('sell'); else lg.classList.remove('sell');
  }
  // Optimierung (Tarife / Peak / §14a) UI
  try { updateEmsControlUi(); } catch(_e) {}
  try { updateThresholdUi(); } catch(_e) {}
  try { updateRelayUi(); } catch(_e) {}
  try { updateBhkwUi(); } catch(_e) {}
  try { updateGeneratorUi(); } catch(_e) {}
  try { updateThermalConsumerUi(); } catch(_e) {}

  // Statusmeldung direkt in der Energiefluss-Kachel (VIS)
  // z.B. "Tarif günstig: Speicher lädt" / "Tarif teuer: Speicher entlädt"
  const statusEl = document.getElementById('emsStatusText');
  if (statusEl) {
    // Prefer the explicit status text computed by the Tarife/Optimierung app.
    let msg = (s['tarif.statusText'] && s['tarif.statusText'].value !== undefined && s['tarif.statusText'].value !== null)
      ? String(s['tarif.statusText'].value)
      : '';

    // Fallback: If Tarife/Optimierung has not produced a message yet, do NOT show a placeholder.
    // The status line should only appear when there is actually something meaningful to show.
    if (!msg) {
      const st = (s['tarif.state'] && s['tarif.state'].value !== undefined && s['tarif.state'].value !== null)
        ? String(s['tarif.state'].value)
        : '';
      const pRaw = (s['tarif.preisAktuellEurProKwh'] && s['tarif.preisAktuellEurProKwh'].value !== undefined && s['tarif.preisAktuellEurProKwh'].value !== null)
        ? Number(s['tarif.preisAktuellEurProKwh'].value)
        : NaN;
      const pTxt = Number.isFinite(pRaw) ? (pRaw.toFixed(3) + ' €/kWh') : '';
      // Only show fallback text if the tariff logic is actually active.
      // If tarif.state is "aus" (or empty), we hide the line.
      if (st && st !== 'aus') msg = `Tarif ${st}${pTxt ? ` (${pTxt})` : ''}`;
      else msg = '';
    }

    statusEl.textContent = msg;
    statusEl.classList.toggle('hidden', !msg);
  }

}


// Patch render to also update energy web
const _renderOld = render;
render = function(){ try{ _renderOld(); }catch(e){ console.warn('render', e); } try{ updateEnergyWeb(); }catch(e){ console.warn('energy web', e); } }

  // open history page via header tab
  const hbtn = document.getElementById('historyTabBtn');
  if (hbtn) hbtn.addEventListener('click', ()=>{ window.location.href = '/history.html'; });

  // open live page via header tab when on a standalone page (e.g. settings)
  const lbtn = document.querySelector('.tabs .tab[data-tab="live"]');
  if (lbtn) lbtn.addEventListener('click', ()=>{
    const p = (window.location && window.location.pathname) || '';
    if (p.endsWith('/settings.html') || p.endsWith('settings.html')) window.location.href = '/';
  });

  // open SmartHome page via header tab
  const shbtn = document.getElementById('tabSmartHome');
  if (shbtn) shbtn.addEventListener('click', ()=>{ window.location.href = '/smarthome.html'; });


// open settings automatically if '?settings=1' is present
(function(){
  function openSettings(){
    try{
      const sbtn = document.getElementById('menuOpenSettings');
      if (sbtn) {
        sbtn.click();
        return;
      }
      // fallback: show settings section explicitly
      const content = document.querySelector('.content');
      if (content) content.style.display = 'none';
      const sec = document.querySelector('[data-tab-content="settings"]');
      if (sec) sec.classList.remove('hidden');
      try{ if (typeof initSettingsPanel==='function') initSettingsPanel();
  try { bindToggleButtonGroups(); } catch(_e) {} }catch(_e){}
      try{ if (typeof setupSettings==='function') setupSettings(); }catch(_e){}
    } catch(e){}
  }
  try{
    const params = new URLSearchParams(window.location.search);
    const isSettingsPage = /settings\.html$/i.test(window.location.pathname || '');
    if (isSettingsPage || params.get('settings') === '1') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', openSettings);
      } else {
        openSettings();
      }
    }
  }catch(e){}
})();

// --- EVCS modal ---
(function(){
  function qs(id){ return document.getElementById(id); }
  const card = qs('evcsCard');
  const modal = qs('evcsModal');
  const close = qs('evcsClose');
  const toggle = qs('evcsActiveToggle');
  const buttons = qs('evcsModeButtons');
  const regRow = qs('evcsRegRow');
  const regToggle = qs('evcsRegToggle');
  const regStatus = qs('evcsRegStatus');
  const regHint = qs('evcsRegHint');
  const goalRow = qs('evcsGoalRow');
  const goalToggle = qs('evcsGoalToggle');
  const goalCfgRow = qs('evcsGoalCfgRow');
  const goalCfgRow2 = qs('evcsGoalCfgRow2');
  const goalSoc = qs('evcsGoalSoc');
  const goalTime = qs('evcsGoalTime');
  const goalKwh = qs('evcsGoalKwh');
  const goalStatus = qs('evcsGoalStatus');
  const goalHint = qs('evcsGoalHint');

  // Unified /api/set helper for the EVCS modal (single wallbox)
  const apiSet = async (scope, key, value) => {
    const r = await fetch('/api/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, key, value })
    });
    if (!r || !r.ok) {
      let txt = '';
      try { txt = await r.text(); } catch (_e) {}
      const err = new Error('api_set_failed');
      err.status = r ? r.status : 0;
      err.body = txt;
      throw err;
    }
    return true;
  };

  // Keep native pickers stable: lock UI refresh briefly on interaction.
  // (Functions are declared further below; function declarations are hoisted.)
  bindGoalLock(goalSoc, 15000);
  bindGoalLock(goalTime, 20000);
  bindGoalLock(goalKwh, 15000);


  // Prefer per-wallbox datapoints (evcs.1.*) for single-EVCS modal, fallback to legacy settings.*
  let hasPerBoxMode = false;
  let hasPerBoxActive = false;

  // EMS present? (chargingManagement states exist)
  let modalHasEms = false;

  // Prevent UI "jumping" while an update is still in-flight
  let pendingMode = null;
  let pendingModeUntil = 0;
  let pendingActive = null;
  let pendingActiveUntil = 0;

  let pendingReg = null;
  let pendingRegUntil = 0;
  let pendingGoalEnabled = null;
  let pendingGoalEnabledUntil = 0;
  let pendingGoalSoc = null;
  let pendingGoalSocUntil = 0;
  let pendingGoalFinishTs = null;
  let pendingGoalFinishUntil = 0;
  let pendingGoalKwh = null;
  let pendingGoalKwhUntil = 0;

  // --- UI lock for goal inputs ---
  // Native time pickers can lose focus (especially on mobile) while the picker is open.
  // If we overwrite the input value during that window, the picker closes.
  // We therefore lock UI updates for a short period after user interaction.
  let goalEditUntil = 0;
  function touchGoalEdit(ms){
    const until = Date.now() + (ms || 12000);
    if (until > goalEditUntil) goalEditUntil = until;
  }
  function goalEditLocked(){
    return Date.now() < goalEditUntil;
  }

  function bindGoalLock(el, ms){
    if (!el) return;
    const bump = () => touchGoalEdit(ms);
    el.addEventListener('focusin', bump);
    el.addEventListener('click', bump);
    el.addEventListener('pointerdown', bump, { passive: true });
    el.addEventListener('mousedown', bump, { passive: true });
    el.addEventListener('touchstart', bump, { passive: true });
  }


  function clampUiMode(v){
    const n = Number(v);
    if (!isFinite(n)) return 1;
    return Math.max(1, Math.min(3, Math.round(n)));
  }

  function normalizeEmsMode(raw){
    const s = String(raw ?? '').trim().toLowerCase();
    if (s === 'min+pv') return 'minpv';
    if (s === 'auto' || s === 'boost' || s === 'minpv' || s === 'pv') return s;
    return 'auto';
  }

  function legacyNumToMode(n){
    const v = clampUiMode(n);
    if (v === 2) return 'minpv';
    if (v === 3) return 'pv';
    return 'boost';
  }

  function nextTsFromTimeInput(hhmm){
    const s = String(hhmm ?? '').trim();
    if (!s || !/^\d{2}:\d{2}$/.test(s)) return 0;
    const parts = s.split(':');
    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    if (!isFinite(hh) || !isFinite(mm)) return 0;
    const now = new Date();
    const d = new Date(now);
    d.setHours(hh, mm, 0, 0);
    // If the selected time is in the past (or within 1 minute), schedule for the next day.
    if (d.getTime() <= now.getTime() + 60000) d.setDate(d.getDate() + 1);
    return d.getTime();
  }

  function clockValueFromTs(ts){
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return '';
    try{
      const dt = new Date(n);
      const hh = String(dt.getHours()).padStart(2,'0');
      const mm = String(dt.getMinutes()).padStart(2,'0');
      return `${hh}:${mm}`;
    }catch(_e){
      return '';
    }
  }

  function modeToLegacyNum(mode){
    const s = normalizeEmsMode(mode);
    if (s === 'minpv') return 2;
    if (s === 'pv') return 3;
    return 1; // boost (auto -> boost fallback for legacy)
  }

  function ensureAutoVisibility(){
    if (!buttons) return;
    const autoBtn = buttons.querySelector('button[data-mode="auto"]');
    if (autoBtn) autoBtn.classList.toggle('hidden', !modalHasEms);
  }

  function applyModeUi(mode){
    if (!buttons) return;
    const m = normalizeEmsMode(mode);
    const btns = buttons.querySelectorAll('button[data-mode]');
    btns.forEach(b => b.classList.toggle('active', String(b.getAttribute('data-mode')||'').toLowerCase() === m));
  }

  if (card){
    card.addEventListener('click', ()=>{
      const c = Number(window.__nwEvcsCount || 1) || 1;
      if (c >= 2) { window.location.href = '/evcs.html'; return; }
      if (modal) modal.classList.remove('hidden');
    });
  }
  if (close){
    close.addEventListener('click', ()=> modal && modal.classList.add('hidden'));
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && modal) modal.classList.add('hidden'); });
  }

  if (toggle){
    toggle.addEventListener('change', async ()=>{
      const desired = !!toggle.checked;
      pendingActive = desired;
      pendingActiveUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}

      const scope = hasPerBoxActive ? 'evcs' : 'settings';
      const key = hasPerBoxActive ? '1.active' : 'evcsActive';
      try{
        await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope, key, value: desired})});
      }catch(e){}
    });
  }


  if (regToggle){
    regToggle.addEventListener('change', async ()=>{
      const desired = !!regToggle.checked;
      pendingReg = desired;
      pendingRegUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}
      try{
        await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'ems', key:'evcs.1.regEnabled', value: desired})});
      }catch(e){}
    });
  }

  if (goalToggle){
    goalToggle.addEventListener('change', async ()=>{
      const b = !!goalToggle.checked;
      pendingGoalEnabled = b;
      pendingGoalEnabledUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}

      try{
        await apiSet('ems', 'evcs.1.goalEnabled', b);
      }catch(_e){
        pendingGoalEnabled = null;
        pendingGoalEnabledUntil = 0;
        try { scheduleRender(); } catch(_e2) {}
      }
    });
  }

  if (goalSoc){
    goalSoc.addEventListener('change', async ()=>{
      const n = Number(goalSoc.value);
      if (!Number.isFinite(n)) return;
      const v = Math.max(0, Math.min(100, Math.round(n)));
      pendingGoalSoc = v;
      pendingGoalSocUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}

      try{
        await apiSet('ems', 'evcs.1.goalTargetSocPct', v);
      }catch(_e){
        pendingGoalSoc = null;
        pendingGoalSocUntil = 0;
      }
    });
  }

  if (goalTime){
    goalTime.addEventListener('change', async ()=>{
      const ts = nextTsFromTimeInput(goalTime.value);
      pendingGoalFinishTs = ts;
      pendingGoalFinishUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}

      try{
        await apiSet('ems', 'evcs.1.goalFinishTs', ts);
      }catch(_e){
        pendingGoalFinishTs = null;
        pendingGoalFinishUntil = 0;
      }
    });
  }

  if (goalKwh){
    goalKwh.addEventListener('change', async ()=>{
      const n = Number(goalKwh.value);
      const v = Number.isFinite(n) ? Math.max(0, Math.min(2000, Math.round(n * 10) / 10)) : 0;
      pendingGoalKwh = v;
      pendingGoalKwhUntil = Date.now() + 2500;
      try { scheduleRender(); } catch(_e) {}

      try{
        await apiSet('ems', 'evcs.1.goalBatteryKwh', v);
      }catch(_e){
        pendingGoalKwh = null;
        pendingGoalKwhUntil = 0;
      }
    });
  }

  if (buttons){
    buttons.addEventListener('click', async (e)=>{
      const b = e.target && e.target.closest ? e.target.closest('button[data-mode]') : null;
      if (!b) return;

      let desired = normalizeEmsMode(b.getAttribute('data-mode') || 'auto');
      // Legacy UI: no "Auto" → map to Boost
      if (!modalHasEms && desired === 'auto') desired = 'boost';

      // UX: allow manual boost cancel by clicking the active Boost button again
      // (instead of waiting for the timeout).
      if (modalHasEms) {
        try {
          const curBtn = buttons.querySelector('button[data-mode].active');
          const cur = curBtn ? normalizeEmsMode(curBtn.getAttribute('data-mode') || 'auto') : 'auto';
          if (desired === 'boost' && cur === 'boost') desired = 'auto';
        } catch(_e) {}
      }

      pendingMode = desired;
      pendingModeUntil = Date.now() + 2500;
      applyModeUi(desired);

      try{
        if (modalHasEms){
          await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:'ems', key:'evcs.1.userMode', value: desired})});
        } else {
          const u = modeToLegacyNum(desired);
          const scope = hasPerBoxMode ? 'evcs' : 'settings';
          const key = hasPerBoxMode ? '1.mode' : 'evcsMode';
          await fetch('/api/set', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope, key, value: Number(u)})});
        }
      }catch(_e){}
    });
  }

  // Update values from state inside global render()
  window.__evcsApply = function(d, s){
    const p = d('evcs.totalPowerW') ?? d('consumptionEvcs') ?? 0;
    const st = d('evcs.1.status') ?? d('evcsStatus') ?? '--';

    // EMS available?
    modalHasEms = d('chargingManagement.wallboxCount') != null;
    const hasEms = !!modalHasEms; // local alias for UI gating
    ensureAutoVisibility();

    // Regelung (Automatik) – nur verfügbar, wenn EMS-Lademanagement aktiv ist
    let regAvail = false;
    let regEnabled = true;
    if (modalHasEms){
      const r = d('chargingManagement.wallboxes.lp1.userEnabled');
      regAvail = (r !== null && r !== undefined);
      regEnabled = (r !== null && r !== undefined) ? !!r : true;
    }
    if (regRow) regRow.style.display = regAvail ? '' : 'none';


    const evcsActive = d('evcs.1.active');
    const settingsActive = s && s['settings.evcsActive'] ? s['settings.evcsActive'].value : null;
    hasPerBoxActive = evcsActive != null;
    const activeVal = (evcsActive != null) ? evcsActive : ((settingsActive != null) ? settingsActive : false);

    // Mode source: EMS userMode (preferred) or legacy EVCS mode
    let modeStrFromState = 'boost';
    if (modalHasEms){
      modeStrFromState = normalizeEmsMode(d('chargingManagement.wallboxes.lp1.userMode') ?? 'auto');
    } else {
      const evcsMode = d('evcs.1.mode');
      const settingsMode = s && s['settings.evcsMode'] ? s['settings.evcsMode'].value : null;
      hasPerBoxMode = evcsMode != null;
      const modeRaw = (evcsMode != null) ? evcsMode : ((settingsMode != null) ? settingsMode : 1);
      const uiFromState = clampUiMode(modeRaw);
      modeStrFromState = legacyNumToMode(uiFromState);
    }

    const fmtP = (val)=> {
      const u = (window.units && window.units.power) || 'W';
      const n = Number(val) || 0;
      if (Math.abs(n) >= 1000) return (n/1000).toFixed(1) + ' kW';
      return n.toFixed(0) + ' ' + u;
    };

    // Ring fill based on current power vs configured max power
    let ratedSingle = Number(s && s['settings.evcsMaxPower'] ? s['settings.evcsMaxPower'].value : 11000); // W
    if (!isFinite(ratedSingle) || ratedSingle <= 0) ratedSingle = 11000;

    const rated = ratedSingle * (Number(window.__nwEvcsCount || 1) || 1);
    const pct = Math.max(0, Math.min(1, rated > 0 ? (Math.abs(Number(p) || 0) / rated) : 0));

    const g = document.querySelector('.evcs-gauge');
    if (g) {
      const deg = (pct * 100).toFixed(1) + '%';
      g.style.background = 'radial-gradient(#0c0f12 60%, transparent 61%),' +
                           'conic-gradient(#6c5ce7 0% ' + deg + ', #2a2f35 ' + deg + ' 100%)';
    }

    const pb = qs('evcsPowerBig'); if (pb) pb.textContent = fmtP(p);
    const sm = qs('evcsStatusModal'); if (sm) sm.textContent = st;

    // Optional: Fahrzeug-SoC anzeigen, falls vorhanden
    try{
      const soc = d('evcs.1.vehicleSoc');
      const row = qs('evcsSocRow');
      const el = qs('evcsVehicleSoc');
      if (soc != null && isFinite(Number(soc))) {
        if (row) row.style.display = '';
        if (el) el.textContent = Math.round(Number(soc)) + ' %';
      } else {
        if (row) row.style.display = 'none';
        if (el) el.textContent = '--';
      }
    }catch(_e){}


    const now = Date.now();

    if (toggle != null){
      if (pendingActive !== null && now < pendingActiveUntil){
        toggle.checked = !!pendingActive;
        if (!!activeVal === !!pendingActive) pendingActive = null;
      } else {
        pendingActive = null;
        toggle.checked = !!activeVal;
      }
      try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('evcsActiveToggle'); } catch(_e) {}
    }


    // Regelung toggle
    if (regToggle != null && regAvail){
      if (pendingReg !== null && now < pendingRegUntil){
        regToggle.checked = !!pendingReg;
        if (!!regEnabled === !!pendingReg) pendingReg = null;
      } else {
        pendingReg = null;
        regToggle.checked = !!regEnabled;
      }
      try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('evcsRegToggle'); } catch(_e) {}
      if (regStatus) regStatus.textContent = regToggle.checked ? 'Aktiv' : 'Aus';
      if (regHint) regHint.textContent = regToggle.checked
        ? 'Automatik aktiv (PV/Netz/§14a/Station/Peak).'
        : 'Regelung deaktiviert – die Automatik greift nicht ein.';
    } else {
      if (regStatus) regStatus.textContent = '—';
      if (regHint) regHint.textContent = '—';
    }

    // EMS: Ziel-Laden (Depot-/Deadline-Laden)
    // Zielladen is only available in AUTO mode.
    const modeOnUi = (pendingMode !== null && now < pendingModeUntil) ? pendingMode : modeStrFromState;
    const goalAllowed = !!hasEms && (modeOnUi === 'auto');
    if (goalRow != null) goalRow.style.display = goalAllowed ? '' : 'none';

    if (!goalAllowed){
      if (goalCfgRow != null) goalCfgRow.style.display = 'none';
      if (goalCfgRow2 != null) goalCfgRow2.style.display = 'none';
      if (goalStatus != null) goalStatus.textContent = '—';
      if (goalHint != null) goalHint.textContent = '';
    } else {
      const gEnabledState = !!d('chargingManagement.wallboxes.lp1.goalEnabled');
      const gTargetState = Number(d('chargingManagement.wallboxes.lp1.goalTargetSocPct'));
      const gFinishState = Number(d('chargingManagement.wallboxes.lp1.goalFinishTs'));
      const gKwhState = Number(d('chargingManagement.wallboxes.lp1.goalBatteryKwh'));
      const gStatusCode = String(d('chargingManagement.wallboxes.lp1.goalStatus') || '');
      const gActive = !!d('chargingManagement.wallboxes.lp1.goalActive');
      const gRemaining = Number(d('chargingManagement.wallboxes.lp1.goalRemainingMin'));
      const gDesiredW = Number(d('chargingManagement.wallboxes.lp1.goalDesiredPowerW'));
      const gShortfallW = Number(d('chargingManagement.wallboxes.lp1.goalShortfallW'));

      const goalEnabled = (pendingGoalEnabled !== null && now < pendingGoalEnabledUntil) ? pendingGoalEnabled : gEnabledState;
      const goalTarget = (pendingGoalSoc !== null && now < pendingGoalSocUntil) ? pendingGoalSoc : (Number.isFinite(gTargetState) ? Math.round(gTargetState) : 100);
      const goalFinishTs = (pendingGoalFinishTs !== null && now < pendingGoalFinishUntil) ? pendingGoalFinishTs : (Number.isFinite(gFinishState) ? Math.round(gFinishState) : 0);
      const goalKwhVal = (pendingGoalKwh !== null && now < pendingGoalKwhUntil) ? pendingGoalKwh : (Number.isFinite(gKwhState) ? gKwhState : 0);

      if (goalToggle != null){
        if (pendingGoalEnabled !== null && now < pendingGoalEnabledUntil){
          goalToggle.checked = !!pendingGoalEnabled;
          if (!!gEnabledState === !!pendingGoalEnabled){
            pendingGoalEnabled = null;
            pendingGoalEnabledUntil = 0;
          }
        } else {
          pendingGoalEnabled = null;
          pendingGoalEnabledUntil = 0;
          goalToggle.checked = !!gEnabledState;
        }
        try{ window.nwSyncToggleButtons(goalToggle.id); }catch(_e){}
      }

      const showCfg = !!goalEnabled;
      if (goalCfgRow != null) goalCfgRow.style.display = showCfg ? '' : 'none';
      if (goalCfgRow2 != null) goalCfgRow2.style.display = showCfg ? '' : 'none';

      // Inputs (avoid overwriting while user edits / while native pickers are open)
      if (!goalEditLocked()){
        if (goalSoc != null && document.activeElement !== goalSoc){
          goalSoc.value = String(goalTarget);
        }
        if (goalTime != null && document.activeElement !== goalTime){
          goalTime.value = clockValueFromTs(goalFinishTs);
        }
        if (goalKwh != null && document.activeElement !== goalKwh){
          goalKwh.value = (goalKwhVal > 0 ? String(goalKwhVal) : '');
        }
      }

      // Status / Hint text
      let label = '—';
      let hint = '';

      const remMin = Number.isFinite(gRemaining) ? Math.round(gRemaining) : 0;
      const desiredW = Number.isFinite(gDesiredW) ? Math.round(gDesiredW) : 0;
      const shortfallW = Number.isFinite(gShortfallW) ? Math.round(gShortfallW) : 0;

      if (!goalEnabled){
        label = 'Aus';
        hint = 'Zeit‑Ziel‑Laden deaktiviert.';
      } else if (gStatusCode === 'no_soc'){
        label = 'SoC fehlt';
        hint = 'Fahrzeug‑SoC Datenpunkt fehlt (Zuordnung im Appcenter).';
      } else if (gStatusCode === 'no_deadline'){
        label = 'Uhrzeit fehlt';
        hint = 'Bitte „Fertig um“ setzen.';
      } else if (gStatusCode === 'reached'){
        label = 'Ziel erreicht';
        hint = `Ziel‑SoC ${goalTarget}% erreicht.`;
      } else if (gStatusCode === 'overdue'){
        label = 'Überfällig';
        hint = `Unterversorgung: ${shortfallW} W.`;
      } else if (gStatusCode === 'shortfall'){
        label = 'Unterversorgung';
        hint = `Fehlleistung: ${shortfallW} W.`;
      } else if (gStatusCode === 'active' || gActive){
        label = 'Aktiv';
        hint = `Rest ${remMin} min • Ziel ${goalTarget}% • Ø ${desiredW} W.`;
      } else {
        label = 'Konfiguriert';
      }

      if (goalStatus != null) goalStatus.textContent = label;
      if (goalHint != null) goalHint.textContent = hint;
    }

    if (buttons != null){
      try {
        const dis = (regAvail && !regEnabled);
        const btns = buttons.querySelectorAll('button[data-mode]');
        btns.forEach(b => { b.disabled = !!dis; b.style.opacity = dis ? 0.45 : 1; });
      } catch(_e) {}

      if (pendingMode !== null){
        if (modeStrFromState === pendingMode){
          pendingMode = null;
        } else if (now < pendingModeUntil){
          applyModeUi(pendingMode);
          return;
        } else {
          pendingMode = null;
        }
      }
      applyModeUi(modeStrFromState);
    }
  };

})();


// Energiefluss: Schnellsteuerung (optionale Verbraucher/Erzeuger)
// - Kreis wird nur klickbar, wenn im App-Center (Installer) mindestens ein Write-Datenpunkt gesetzt ist
// - Readback ist optional (für Status/Feedback)
function openFlowQc(kind, idx){
  try {
    if (typeof window.__nwFlowQcOpen === 'function') window.__nwFlowQcOpen(kind, idx);
  } catch(_e) {}
}

(function(){
  const modal = document.getElementById('flowQcModal');
  if (!modal) return;

  const title = document.getElementById('flowQcTitle');
  const subtitle = document.getElementById('flowQcSubtitle');
  const powerEl = document.getElementById('flowQcPower');
  const msgEl = document.getElementById('flowQcMsg');

  const swWrap = document.getElementById('flowQcSwitchWrap');
  const sw = document.getElementById('flowQcSwitch');
  const swStatus = document.getElementById('flowQcSwitchStatus');

  const spWrap = document.getElementById('flowQcSetpointWrap');
  const spLabel = document.getElementById('flowQcSetpointLabel');
  const spUnit = document.getElementById('flowQcSetpointUnit');
  const spRange = document.getElementById('flowQcSetpointRange');
  const spValue = document.getElementById('flowQcSetpointValue');
  const spApply = document.getElementById('flowQcSetpointApply');

  const boostWrap = document.getElementById('flowQcBoostWrap');
  const boostStatus = document.getElementById('flowQcBoostStatus');
  const boostHint = document.getElementById('flowQcBoostHint');
  const boostBtn = document.getElementById('flowQcBoostBtn');
  const boostStopBtn = document.getElementById('flowQcBoostStopBtn');

  const regWrap = document.getElementById('flowQcRegWrap');
  const regEnable = document.getElementById('flowQcRegEnable');
  const regStatus = document.getElementById('flowQcRegStatus');
  const regHint = document.getElementById('flowQcRegHint');

  const modeWrap = document.getElementById('flowQcModeWrap');
  const modeButtons = document.getElementById('flowQcModeButtons');
  const modeHint = document.getElementById('flowQcModeHint');

  const closeBtn = document.getElementById('flowQcClose');

  let ctx = null;
  let poll = null;
  let pendingSwitch = null;
  let pendingSetpoint = null;
  let pendingBoost = null;

  const showMsg = (t, kind) => {
    if (!msgEl) return;
    msgEl.textContent = t || '';
    msgEl.style.color = (kind === 'error') ? '#fca5a5' : (kind === 'ok') ? '#6ee7b7' : 'var(--muted)';
  };

  const modeLabel = (m) => {
    const s = String(m || '').trim();
    const k = s.toLowerCase();
    if (k === 'inherit' || k === 'system') return 'System';
    if (k === 'pvauto' || k === 'auto' || k === 'pv') return 'Auto (PV)';
    if (k === 'manual' || k === 'manuell') return 'Manuell';
    if (k === 'off' || k === 'aus') return 'Aus';
    return s || '—';
  };



  const getSlotMeta = (k, i) => {
    const cfg = flowSlotsCfg || {};
    const arr = (k === 'producer') ? (cfg.producers || []) : (cfg.consumers || []);
    const n = Number(i) || 0;
    return arr.find(x => Number(x && x.idx) === n) || null;
  };

  const getEntry = (k, i) => {
    const arr = (k === 'producer') ? flowExtras.producers : flowExtras.consumers;
    const n = Number(i) || 0;
    return arr.find(x => Number(x && x.idx) === n) || null;
  };

  const updatePower = () => {
    if (!ctx || !powerEl) return;
    const entry = getEntry(ctx.kind, ctx.idx);
    const stateKey = entry ? entry.stateKey : null;
    const v = stateKey ? state[stateKey] : null;
    powerEl.textContent = formatPowerSigned(v ?? 0);
  };

  const readback = async () => {
    if (!ctx) return;
    try {
      const qp = new URLSearchParams({ kind: ctx.kind, idx: String(ctx.idx) });
      const r = await fetch('/api/flow/qc/read?' + qp.toString());
      const data = await r.json();
      if (!data || !data.ok) return;

      if (ctx.qc && ctx.qc.hasSwitch && sw){
        if (data.switch !== null && data.switch !== undefined){
          const v = !!data.switch;
          if (pendingSwitch === null) sw.checked = v;
          try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('flowQcSwitch'); } catch(_e) {}
          if (swStatus) swStatus.textContent = v ? 'Ein' : 'Aus';
        } else {
          if (swStatus) swStatus.textContent = '--';
        }
      }

      if (ctx.qc && ctx.qc.hasSetpoint && spValue){
        if (data.setpoint !== null && data.setpoint !== undefined){
          const n = Number(data.setpoint);
          if (Number.isFinite(n)){
            if (pendingSetpoint === null){
              spValue.value = String(n);
              if (spRange && spRange.style.display !== 'none') spRange.value = String(n);
            }
          }
        }
      }

      // Boost/Override info (nur, wenn vom Backend angeboten)
      if (ctx.qc && ctx.qc.hasBoost && boostWrap) {
        const now = Date.now();
        const active = !!data.boostActive;
        const rem = Number(data.boostRemainingMin || 0);
        if (boostStatus) boostStatus.textContent = active ? `Aktiv (${rem} min)` : 'Inaktiv';
        if (boostBtn) boostBtn.style.display = active ? 'none' : '';
        if (boostStopBtn) boostStopBtn.style.display = active ? '' : 'none';
        if (boostHint) {
          const minsCfg = Number(ctx.qc.boostMinutes || 0);
          const mins = Number.isFinite(minsCfg) && minsCfg > 0 ? minsCfg : 30;
          boostHint.textContent = active
            ? 'Boost läuft – Automatik wird vorübergehend nicht überschrieben.'
            : `Boost startet für ${mins} Minuten (z.B. Schnellaufheizen/Kühlen).`;
        }

        // Optionaler Hinweis, wenn ein Manual‑Hold aktiv ist
        if (!!data.manualActive && data.manualUntil && msgEl && !msgEl.textContent) {
          const until = Number(data.manualUntil);
          const mRem = Number.isFinite(until) && until > now ? Math.max(0, Math.ceil((until - now) / 60000)) : 0;
          if (mRem > 0) showMsg(`Manuelle Vorgabe aktiv (noch ${mRem} min)`, '');
        }
      }
    

      // Betriebsmodus/Regelung (Thermik): optional vom Backend angeboten
      try {
        const t = data && data.thermal ? data.thermal : null;
        const avail = !!(t && t.available);

        if (regWrap) regWrap.style.display = avail ? '' : 'none';
        if (modeWrap) modeWrap.style.display = avail ? '' : 'none';

        if (avail) {
          const uEn = (t.userEnabled !== undefined && t.userEnabled !== null) ? !!t.userEnabled : true;
          const uMode = String(t.userMode || 'inherit');
          const effMode = String(t.effectiveMode || t.cfgMode || 'pvAuto');

          if (regStatus) regStatus.textContent = uEn ? 'Aktiv' : 'Aus';
          if (regHint) regHint.textContent = uEn
            ? 'Automatik aktiv. Manuelle Bedienung bleibt möglich.'
            : 'Regelung deaktiviert – manuelle Bedienung bleibt möglich.';
          if (regEnable && pendingReg === null) regEnable.checked = uEn;
          try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('flowQcRegEnable'); } catch(_e) {}

          if (modeButtons && pendingMode === null) {
            const btns = Array.from(modeButtons.querySelectorAll('button'));
            btns.forEach(b => {
              const mm = String(b.getAttribute('data-mode') || '');
              b.classList.toggle('active', mm === uMode);
            });
          }
          if (modeHint) {
            if (String(uMode || '').toLowerCase() === 'inherit') {
              modeHint.textContent = `System: ${modeLabel(t.cfgMode)} (aktiv: ${modeLabel(effMode)})`;
            } else {
              modeHint.textContent = `Aktiv: ${modeLabel(effMode)}`;
            }
          }
        }
      } catch(_e2) {}

} catch(_e) {}
  };

  const setSwitch = async (v) => {
    if (!ctx) return;
    pendingSwitch = !!v;
    showMsg('Sende…', '');
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'flow', key: `${ctx.kind}.${ctx.idx}.switch`, value: !!v })
      });
      showMsg('Gesendet', 'ok');
      setTimeout(() => showMsg('', ''), 1200);
    } catch(_e) {
      showMsg('Fehler beim Schreiben', 'error');
    } finally {
      setTimeout(() => { pendingSwitch = null; }, 900);
    }
  };

  const setSetpoint = async (v) => {
    if (!ctx) return;
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    pendingSetpoint = n;
    showMsg('Sende…', '');
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'flow', key: `${ctx.kind}.${ctx.idx}.setpoint`, value: n })
      });
      showMsg('Gesendet', 'ok');
      setTimeout(() => showMsg('', ''), 1200);
    } catch(_e) {
      showMsg('Fehler beim Schreiben', 'error');
    } finally {
      setTimeout(() => { pendingSetpoint = null; }, 900);
    }
  };

  

  const setRegEnabled = async (enable) => {
    if (!ctx) return;
    pendingReg = !!enable;
    showMsg('Sende…', '');
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'flow', key: `${ctx.kind}.${ctx.idx}.regEnabled`, value: !!enable })
      });
      showMsg('OK', 'ok');
      setTimeout(() => showMsg('', ''), 900);
    } catch(_e) {
      showMsg('Fehler beim Schreiben', 'error');
    } finally {
      setTimeout(() => { pendingReg = null; }, 900);
    }
  };

  const setMode = async (mode) => {
    if (!ctx) return;
    const m = String(mode || '').trim();
    if (!m) return;
    pendingMode = m;
    showMsg('Sende…', '');
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'flow', key: `${ctx.kind}.${ctx.idx}.mode`, value: m })
      });
      showMsg('OK', 'ok');
      setTimeout(() => showMsg('', ''), 900);
    } catch(_e) {
      showMsg('Fehler beim Schreiben', 'error');
    } finally {
      setTimeout(() => { pendingMode = null; }, 900);
    }
  };

const setBoost = async (enable) => {
    if (!ctx) return;
    pendingBoost = !!enable;
    showMsg(enable ? 'Boost starte…' : 'Boost stoppe…', '');
    try {
      await fetch('/api/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'flow', key: `${ctx.kind}.${ctx.idx}.boost`, value: !!enable })
      });
      showMsg(enable ? 'Boost aktiviert' : 'Boost beendet', 'ok');
      setTimeout(() => showMsg('', ''), 1400);
      setTimeout(() => readback(), 300);
    } catch(_e) {
      showMsg('Fehler beim Boost', 'error');
    } finally {
      setTimeout(() => { pendingBoost = null; }, 900);
    }
  };

  const open = (kind, idx) => {
    const k = (kind === 'producer' || kind === 'producers') ? 'producer' : 'consumer';
    const meta = getSlotMeta(k, idx);
    if (!meta) return;
    const qc = (meta && meta.qc) ? meta.qc : null;
    if (!qc || !qc.enabled) return;

    ctx = { kind: k, idx: Number(idx) || 0, name: String(meta.name || ''), qc };

    if (title) title.textContent = ctx.name || 'Schnellsteuerung';
    if (subtitle) subtitle.textContent = (k === 'producer') ? 'Erzeuger' : 'Verbraucher';

    // Switch
    if (swWrap) swWrap.style.display = qc.hasSwitch ? '' : 'none';
    if (swStatus) swStatus.textContent = '--';
    if (sw) {
      sw.checked = false;
      try { if (window.nwSyncToggleButtons) window.nwSyncToggleButtons('flowQcSwitch'); } catch(_e) {}
      sw.onchange = () => { setSwitch(sw.checked); };
    }

    // Setpoint
    if (spWrap) spWrap.style.display = qc.hasSetpoint ? '' : 'none';
    if (qc.hasSetpoint) {
      if (spLabel) spLabel.textContent = qc.label || 'Sollwert';
      if (spUnit) spUnit.textContent = qc.unit || 'W';

      const hasRange = qc.min !== null && qc.max !== null && isFinite(qc.min) && isFinite(qc.max) && Number(qc.max) > Number(qc.min);
      if (spRange) {
        spRange.style.display = hasRange ? '' : 'none';
        if (hasRange) {
          spRange.min = String(qc.min);
          spRange.max = String(qc.max);
          const st = (qc.step !== null && isFinite(qc.step) && Number(qc.step) > 0) ? Number(qc.step) : 1;
          spRange.step = String(st);
          spRange.oninput = () => { if (spValue) spValue.value = spRange.value; };
        }
      }

      if (spValue) spValue.value = '';
      if (spApply) spApply.onclick = () => { if (spValue) setSetpoint(spValue.value); };
    }

    // Thermik: Betriebsmodus + Regelung (initial versteckt; Readback schaltet sichtbar)
    if (regWrap) {
      regWrap.style.display = 'none';
      if (regStatus) regStatus.textContent = '—';
      if (regHint) regHint.textContent = '';
      if (regEnable) {
        regEnable.onchange = () => setRegEnabled(!!regEnable.checked);
      }
    }
    if (modeWrap) {
      modeWrap.style.display = 'none';
      if (modeHint) modeHint.textContent = '';
      if (modeButtons) {
        const btns = Array.from(modeButtons.querySelectorAll('button'));
        btns.forEach(b => {
          b.onclick = () => setMode(String(b.getAttribute('data-mode') || ''));
        });
      }
    }



    // Boost
    if (boostWrap) boostWrap.style.display = qc.hasBoost ? '' : 'none';
    if (qc.hasBoost) {
      if (boostStatus) boostStatus.textContent = '—';
      if (boostBtn) boostBtn.onclick = () => setBoost(true);
      if (boostStopBtn) boostStopBtn.onclick = () => setBoost(false);
      if (boostHint) boostHint.textContent = '';
    }

    showMsg('', '');
    updatePower();
    readback();

    if (poll) clearInterval(poll);
    poll = setInterval(() => { updatePower(); readback(); }, 1000);
    modal.classList.remove('hidden');
  };

  const close = () => {
    if (poll) { clearInterval(poll); poll = null; }
    ctx = null;
    pendingSwitch = null;
    pendingSetpoint = null;
    pendingBoost = null;
    showMsg('', '');
    modal.classList.add('hidden');
  };

  if (closeBtn) closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e && e.target === modal) close(); });

  // Expose
  window.__nwFlowQcOpen = open;
})();


// open EVCS on node click as well
(function(){
  const n = document.getElementById('nodeEvcs');
  const modal = document.getElementById('evcsModal');
  if (n && modal){
    // mark clickable
    n.classList.add('clickable');
    n.addEventListener('click', ()=>{
      const c = Number(window.__nwEvcsCount || 1) || 1;
      if (c >= 2) { window.location.href = '/evcs.html'; return; }
      modal.classList.remove('hidden');
    });
  }
})();
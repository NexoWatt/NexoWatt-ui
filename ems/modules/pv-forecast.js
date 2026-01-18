'use strict';

const { BaseModule } = require('./base');

/**
 * PV Forecast Manager
 *
 * Responsibilities:
 * - Read PV forecast JSON datapoints (today + tomorrow) mapped in App-Center
 * - Normalize a provider specific JSON into a simple power curve (segments)
 * - Provide aggregated metrics (kWh next 6/12/24h) for other modules
 * - Expose diagnostic states under `forecast.pv.*`
 *
 * Design goals:
 * - Provider-agnostic (supports common schemas like forecast.solar, Solcast, custom JSON)
 * - Fail-safe: if parsing fails, the EMS keeps working (forecast is simply marked invalid)
 */
class PvForecastModule extends BaseModule {
  constructor(adapter, dpRegistry) {
    super(adapter, dpRegistry);

    /** @type {string} */
    this._lastCurveHash = '';

    /** @type {boolean} */
    this._warnedNoMapping = false;
  }

  async init() {
    // States (diagnostics)
    await this.adapter.setObjectNotExistsAsync('forecast', {
      type: 'channel',
      common: { name: 'Forecast' },
      native: {},
    });

    await this.adapter.setObjectNotExistsAsync('forecast.pv', {
      type: 'channel',
      common: { name: 'PV Forecast' },
      native: {},
    });

    const mk = async (id, name, type, role) => {
      await this.adapter.setObjectNotExistsAsync(id, {
        type: 'state',
        common: { name, type, role, read: true, write: false },
        native: {},
      });
    };

    await mk('forecast.pv.valid', 'PV Forecast gültig', 'boolean', 'indicator');
    await mk('forecast.pv.points', 'PV Forecast Punkte (Segmente)', 'number', 'value');
    await mk('forecast.pv.ageMs', 'PV Forecast Alter (ms)', 'number', 'value');
    await mk('forecast.pv.kwhNext6h', 'PV Forecast Energie nächste 6h (kWh)', 'number', 'value');
    await mk('forecast.pv.kwhNext12h', 'PV Forecast Energie nächste 12h (kWh)', 'number', 'value');
    await mk('forecast.pv.kwhNext24h', 'PV Forecast Energie nächste 24h (kWh)', 'number', 'value');
    await mk('forecast.pv.peakWNext24h', 'PV Forecast Peak nächste 24h (W)', 'number', 'value.power');
    await mk('forecast.pv.statusText', 'PV Forecast Status', 'string', 'text');
    await mk('forecast.pv.curveJson', 'PV Forecast Kurve (JSON, gekürzt)', 'string', 'json');

    // Register mapped forecast datapoints (App-Center)
    if (this.dp && typeof this.dp.upsert === 'function') {
      const dps = (this.adapter && this.adapter.config && this.adapter.config.datapoints)
        ? this.adapter.config.datapoints
        : {};

      const todayId = String(dps.pvForecastTodayJson || '').trim();
      const tomorrowId = String(dps.pvForecastTomorrowJson || '').trim();

      if (todayId) {
        await this.dp.upsert({ key: 'pv.forecastTodayJson', objectId: todayId, dataType: 'string' });
      }
      if (tomorrowId) {
        await this.dp.upsert({ key: 'pv.forecastTomorrowJson', objectId: tomorrowId, dataType: 'string' });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  _safeJsonParse(v) {
    if (v === null || v === undefined) return { ok: false, value: null, err: 'empty' };
    if (typeof v === 'object') return { ok: true, value: v, err: null };
    const s = String(v || '').trim();
    if (!s) return { ok: false, value: null, err: 'empty' };
    try {
      return { ok: true, value: JSON.parse(s), err: null };
    } catch (e) {
      return { ok: false, value: null, err: (e && e.message) ? e.message : String(e) };
    }
  }

  _parseTimeMs(x) {
    if (x === null || x === undefined) return null;
    if (typeof x === 'number' && Number.isFinite(x)) {
      // Heuristic: treat seconds as epoch seconds
      if (x > 1e12) return x;
      if (x > 1e9) return x * 1000;
      return x;
    }
    if (x instanceof Date) {
      const t = x.getTime();
      return Number.isFinite(t) ? t : null;
    }
    const s = String(x).trim();
    if (!s) return null;

    // Accept both "2026-01-18 11:00:00" and ISO
    const iso = s.includes('T') ? s : s.replace(' ', 'T');
    const t = Date.parse(iso);
    if (Number.isFinite(t)) return t;
    return null;
  }

  _num(v) {
    if (v === null || v === undefined) return NaN;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      let s = v.trim();
      if (!s) return NaN;
      // Support German decimal comma
      if (s.includes(',')) s = s.replace(/\./g, '').replace(/,/g, '.');
      else s = s.replace(/,/g, '');
      const n = Number(s);
      return Number.isFinite(n) ? n : NaN;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }

  _powerToW(n, keyHint) {
    const v = Number(n);
    if (!Number.isFinite(v)) return NaN;
    const k = String(keyHint || '').toLowerCase();
    if (k.includes('pv_estimate')) return v * 1000; // Solcast uses kW
    if (k.includes('kw')) return v * 1000;
    // Otherwise assume it's already W.
    return v;
  }

  _extractSegmentsFromParsed(parsed) {
    if (parsed === null || parsed === undefined) return [];

    // 1) Direct array
    if (Array.isArray(parsed)) {
      return this._segmentsFromArray(parsed);
    }

    // 2) Known wrapper objects
    if (typeof parsed === 'object') {
      const p = parsed;

      // Solcast: { forecasts: [...] }
      if (Array.isArray(p.forecasts)) {
        return this._segmentsFromArray(p.forecasts);
      }

      // forecast.solar: { result: { watts: {...} } } or { result: { watt_hours: {...} } }
      if (p.result && typeof p.result === 'object') {
        if (p.result.watts && typeof p.result.watts === 'object') {
          return this._segmentsFromTimeMap(p.result.watts);
        }
        if (p.result.watt_hours && typeof p.result.watt_hours === 'object') {
          // watt_hours is energy per hour; convert to average power for that hour
          return this._segmentsFromEnergyMap(p.result.watt_hours, 3600000);
        }
      }

      // Alternative: { watts: {...} }
      if (p.watts && typeof p.watts === 'object') {
        return this._segmentsFromTimeMap(p.watts);
      }

      // Alternative: { watt_hours: {...} }
      if (p.watt_hours && typeof p.watt_hours === 'object') {
        return this._segmentsFromEnergyMap(p.watt_hours, 3600000);
      }

      // If it's a plain {time->value} map
      if (this._looksLikeTimeMap(p)) {
        return this._segmentsFromTimeMap(p);
      }
    }

    return [];
  }

  _looksLikeTimeMap(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const keys = Object.keys(obj);
    if (!keys.length) return false;
    // Check a handful of keys
    const sample = keys.slice(0, Math.min(5, keys.length));
    let timeKeys = 0;
    for (const k of sample) {
      const t = this._parseTimeMs(k);
      if (t !== null) timeKeys++;
    }
    return timeKeys >= Math.max(1, Math.floor(sample.length / 2));
  }

  _segmentsFromArray(arr) {
    const out = [];
    if (!Array.isArray(arr)) return out;

    for (const it of arr) {
      if (!it || typeof it !== 'object') continue;

      const keys = Object.keys(it);

      const pick = (candidates) => {
        for (const c of candidates) {
          if (Object.prototype.hasOwnProperty.call(it, c) && it[c] !== null && it[c] !== undefined) {
            return { key: c, val: it[c] };
          }
        }
        return { key: '', val: null };
      };

      const tStartPick = pick(['startsAt', 'start', 'from', 'time', 'timestamp', 'period_start', 'periodStart', 't', 'date', 'datetime']);
      const tEndPick = pick(['endsAt', 'end', 'to', 'period_end', 'periodEnd']);

      let tStart = this._parseTimeMs(tStartPick.val);
      const tEnd = this._parseTimeMs(tEndPick.val);

      // Some providers only give period_end (Solcast). Use it as anchor.
      if (tStart === null && tEnd !== null) tStart = tEnd;
      if (tStart === null) continue;

      const valPick = pick([
        // Solcast
        'pv_estimate',
        'pv_estimate10',
        'pv_estimate90',
        // generic
        'powerW',
        'power',
        'watts',
        'w',
        'value',
      ]);

      const n = this._num(valPick.val);
      if (!Number.isFinite(n)) continue;
      let w = this._powerToW(n, valPick.key);
      if (!Number.isFinite(w)) continue;
      if (w < 0) w = 0;

      if (tEnd !== null && tEnd > tStart && (tEnd - tStart) >= 5 * 60 * 1000) {
        out.push({ t: tStart, dtMs: (tEnd - tStart), w });
      } else {
        // Anchor point, dt inferred later
        out.push({ t: tStart, dtMs: 0, w });
      }
    }

    return this._inferDtForAnchors(out);
  }

  _segmentsFromTimeMap(mapObj) {
    const anchors = [];
    if (!mapObj || typeof mapObj !== 'object') return [];
    for (const [k, v] of Object.entries(mapObj)) {
      const t = this._parseTimeMs(k);
      if (t === null) continue;
      const n = this._num(v);
      if (!Number.isFinite(n)) continue;
      let w = this._powerToW(n, 'watts');
      if (!Number.isFinite(w)) continue;
      if (w < 0) w = 0;
      anchors.push({ t, dtMs: 0, w });
    }
    return this._inferDtForAnchors(anchors);
  }

  _segmentsFromEnergyMap(energyMapObj, defaultDtMs) {
    const anchors = [];
    if (!energyMapObj || typeof energyMapObj !== 'object') return [];
    const dtMs = (Number.isFinite(defaultDtMs) && defaultDtMs > 0) ? defaultDtMs : 3600000;

    for (const [k, v] of Object.entries(energyMapObj)) {
      const t = this._parseTimeMs(k);
      if (t === null) continue;
      const wh = this._num(v);
      if (!Number.isFinite(wh)) continue;
      // Convert Wh per interval to average W
      const w = Math.max(0, (wh * 3600000) / dtMs);
      anchors.push({ t, dtMs, w });
    }
    // If dt is already set for all, just sort and return.
    anchors.sort((a, b) => a.t - b.t);
    return anchors;
  }

  _inferDtForAnchors(list) {
    if (!Array.isArray(list) || !list.length) return [];
    const explicit = list.filter((p) => Number.isFinite(p.dtMs) && p.dtMs > 0);
    const anchors = list.filter((p) => !(Number.isFinite(p.dtMs) && p.dtMs > 0));

    // Preserve explicit segments
    const segs = explicit.map((p) => ({ t: p.t, dtMs: p.dtMs, w: p.w }));

    if (!anchors.length) {
      segs.sort((a, b) => a.t - b.t);
      return segs;
    }

    // Sort anchors
    anchors.sort((a, b) => a.t - b.t);

    // Infer a typical interval
    const diffs = [];
    for (let i = 0; i < anchors.length - 1; i++) {
      const d = anchors[i + 1].t - anchors[i].t;
      if (Number.isFinite(d) && d >= 5 * 60 * 1000 && d <= 4 * 3600000) diffs.push(d);
    }
    diffs.sort((a, b) => a - b);
    const typical = diffs.length ? diffs[Math.floor(diffs.length / 2)] : 3600000;
    const typicalDt = (Number.isFinite(typical) && typical >= 5 * 60 * 1000 && typical <= 4 * 3600000) ? typical : 3600000;

    for (let i = 0; i < anchors.length; i++) {
      const cur = anchors[i];
      const next = anchors[i + 1];
      let dt = typicalDt;
      if (next && Number.isFinite(next.t)) {
        const d = next.t - cur.t;
        if (Number.isFinite(d) && d >= 5 * 60 * 1000 && d <= 4 * 3600000) dt = d;
      }
      segs.push({ t: cur.t, dtMs: dt, w: cur.w });
    }

    // Normalize: sort and drop invalid
    segs.sort((a, b) => a.t - b.t);
    return segs.filter((s) => Number.isFinite(s.t) && Number.isFinite(s.dtMs) && s.dtMs > 0 && Number.isFinite(s.w));
  }

  _integrateKwh(segments, fromMs, toMs, clampW) {
    if (!Array.isArray(segments) || !segments.length) return 0;
    const a = Number(fromMs);
    const b = Number(toMs);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;

    let wh = 0;
    for (const s of segments) {
      const t0 = Number(s.t);
      const dt = Number(s.dtMs);
      if (!Number.isFinite(t0) || !Number.isFinite(dt) || dt <= 0) continue;
      const t1 = t0 + dt;
      if (t1 <= a || t0 >= b) continue;
      const ov0 = Math.max(a, t0);
      const ov1 = Math.min(b, t1);
      const ovMs = ov1 - ov0;
      if (!(ovMs > 0)) continue;

      let w = Number(s.w);
      if (!Number.isFinite(w)) continue;
      if (w < 0) w = 0;
      if (Number.isFinite(clampW) && clampW > 0) w = Math.min(w, clampW);

      wh += w * (ovMs / 3600000);
    }
    return wh / 1000;
  }

  async _setIfChanged(id, val) {
    const v = (val === undefined) ? null : val;
    try {
      const cur = await this.adapter.getStateAsync(id);
      const curVal = cur ? cur.val : null;
      // eslint-disable-next-line eqeqeq
      if (cur && curVal == v) return;
      await this.adapter.setStateAsync(id, v, true);
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Tick
  // ---------------------------------------------------------------------------

  async tick() {
    const now = Date.now();

    // Read mapped DPs (raw JSON)
    let rawToday = null;
    let rawTomorrow = null;
    let ageToday = Number.POSITIVE_INFINITY;
    let ageTomorrow = Number.POSITIVE_INFINITY;

    if (this.dp) {
      const vT = this.dp.getRaw('pv.forecastTodayJson');
      const vM = this.dp.getRaw('pv.forecastTomorrowJson');

      rawToday = vT;
      rawTomorrow = vM;
      ageToday = this.dp.getAgeMs('pv.forecastTodayJson');
      ageTomorrow = this.dp.getAgeMs('pv.forecastTomorrowJson');
    }

    const hasAnyMapping = (rawToday !== null && rawToday !== undefined) || (rawTomorrow !== null && rawTomorrow !== undefined);
    if (!hasAnyMapping) {
      // Nothing mapped -> keep adapter snapshot consistent but do not spam logs.
      if (!this._warnedNoMapping) {
        this.adapter.log.info('[PvForecast] Kein PV-Forecast gemappt (App-Center → Tarife). PV-aware Netzladen bleibt deaktiviert.');
        this._warnedNoMapping = true;
      }

      this.adapter._pvForecast = {
        ts: now,
        valid: false,
        ageMs: null,
        points: 0,
        kwhNext6h: 0,
        kwhNext12h: 0,
        kwhNext24h: 0,
        peakWNext24h: 0,
        curve: [],
      };

      await this._setIfChanged('forecast.pv.valid', false);
      await this._setIfChanged('forecast.pv.points', 0);
      await this._setIfChanged('forecast.pv.ageMs', null);
      await this._setIfChanged('forecast.pv.kwhNext6h', 0);
      await this._setIfChanged('forecast.pv.kwhNext12h', 0);
      await this._setIfChanged('forecast.pv.kwhNext24h', 0);
      await this._setIfChanged('forecast.pv.peakWNext24h', 0);
      await this._setIfChanged('forecast.pv.statusText', 'Kein PV Forecast gemappt');
      await this._setIfChanged('forecast.pv.curveJson', '[]');
      return;
    }

    // Ensure warnings reset when mapping appears
    this._warnedNoMapping = false;

    const strToday = (typeof rawToday === 'string') ? rawToday : (rawToday && typeof rawToday === 'object') ? JSON.stringify(rawToday) : '';
    const strTomorrow = (typeof rawTomorrow === 'string') ? rawTomorrow : (rawTomorrow && typeof rawTomorrow === 'object') ? JSON.stringify(rawTomorrow) : '';

    const parsedToday = this._safeJsonParse(strToday);
    const parsedTomorrow = this._safeJsonParse(strTomorrow);

    let segs = [];
    let parseErrs = [];
    if (parsedToday.ok) segs = segs.concat(this._extractSegmentsFromParsed(parsedToday.value));
    else if (strToday && parsedToday.err) parseErrs.push(`heute: ${parsedToday.err}`);

    if (parsedTomorrow.ok) segs = segs.concat(this._extractSegmentsFromParsed(parsedTomorrow.value));
    else if (strTomorrow && parsedTomorrow.err) parseErrs.push(`morgen: ${parsedTomorrow.err}`);

    // Normalize & sort
    segs = segs
      .filter((s) => s && Number.isFinite(s.t) && Number.isFinite(s.dtMs) && s.dtMs > 0 && Number.isFinite(s.w))
      .map((s) => ({ t: Number(s.t), dtMs: Number(s.dtMs), w: Math.max(0, Number(s.w)) }))
      .sort((a, b) => a.t - b.t);

    // Keep only a reasonable window (avoid huge JSON in memory)
    const maxKeepMs = 48 * 3600000;
    segs = segs.filter((s) => (s.t + s.dtMs) >= (now - 2 * 3600000) && s.t <= (now + maxKeepMs));

    // Compute metrics
    const t6 = now + 6 * 3600000;
    const t12 = now + 12 * 3600000;
    const t24 = now + 24 * 3600000;

    const kwh6 = this._integrateKwh(segs, now, t6);
    const kwh12 = this._integrateKwh(segs, now, t12);
    const kwh24 = this._integrateKwh(segs, now, t24);

    let peakW = 0;
    for (const s of segs) {
      const t0 = s.t;
      const t1 = s.t + s.dtMs;
      if (t1 <= now || t0 >= t24) continue;
      if (s.w > peakW) peakW = s.w;
    }

    const anyFuture = segs.some((s) => (s.t + s.dtMs) > now);
    const valid = anyFuture && segs.length > 0;

    const ageMs = Math.min(
      Number.isFinite(ageToday) ? ageToday : Number.POSITIVE_INFINITY,
      Number.isFinite(ageTomorrow) ? ageTomorrow : Number.POSITIVE_INFINITY,
    );
    const ageEff = Number.isFinite(ageMs) && ageMs !== Number.POSITIVE_INFINITY ? ageMs : null;

    // Build a short curve JSON for debugging (first ~48 points)
    const curveShort = segs.slice(0, 64).map((s) => ({ t: s.t, dtMs: s.dtMs, w: Math.round(s.w) }));
    const curveHash = JSON.stringify(curveShort);

    // Status text
    let statusText = '';
    if (!valid) {
      statusText = parseErrs.length
        ? `PV Forecast ungültig (${parseErrs.join('; ')})`
        : 'PV Forecast ungültig (keine Daten)';
    } else {
      const ageTxt = (ageEff !== null && ageEff > 0)
        ? (ageEff > 3600000 ? `${Math.round(ageEff / 3600000)}h alt` : `${Math.round(ageEff / 60000)}min alt`)
        : 'frisch';
      statusText = `PV Forecast ok: ${kwh24.toFixed(1)} kWh/24h (Peak ${Math.round(peakW)} W), ${ageTxt}`;
    }

    // Publish snapshot for other modules (synchronous access)
    this.adapter._pvForecast = {
      ts: now,
      valid,
      ageMs: ageEff,
      points: segs.length,
      kwhNext6h: kwh6,
      kwhNext12h: kwh12,
      kwhNext24h: kwh24,
      peakWNext24h: peakW,
      curve: segs,
    };

    // Write states (only if changed)
    await this._setIfChanged('forecast.pv.valid', valid);
    await this._setIfChanged('forecast.pv.points', segs.length);
    await this._setIfChanged('forecast.pv.ageMs', ageEff);
    await this._setIfChanged('forecast.pv.kwhNext6h', Number.isFinite(kwh6) ? Number(kwh6.toFixed(3)) : 0);
    await this._setIfChanged('forecast.pv.kwhNext12h', Number.isFinite(kwh12) ? Number(kwh12.toFixed(3)) : 0);
    await this._setIfChanged('forecast.pv.kwhNext24h', Number.isFinite(kwh24) ? Number(kwh24.toFixed(3)) : 0);
    await this._setIfChanged('forecast.pv.peakWNext24h', Math.round(peakW));
    await this._setIfChanged('forecast.pv.statusText', statusText);

    if (curveHash !== this._lastCurveHash) {
      this._lastCurveHash = curveHash;
      await this._setIfChanged('forecast.pv.curveJson', curveHash);
    }
  }
}

module.exports = { PvForecastModule };

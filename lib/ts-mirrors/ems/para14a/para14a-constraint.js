'use strict';


const { normalizeResult } = require('../services/para14a-power-contract');
/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/para14a/para14a-constraint.ts
 * Quell-Hash: sha256:d407d79823996131edf0970ff74601ba4a0105620b538a186a44801b7fa63c9b
 * Erzeugung: npm run sync:ts-ems-mirrors
 *
 * Zweck:
 * §14a-Signalfrische und zentrale Constraint-Verteilung ohne direkte Hardware-Writes.
 *
 * Zusammenhang:
 * Dieser Spiegel ist die sichere Vorstufe für spätere Core-Limits-/Heizstab-
 * Shadow-Vergleiche. In 0.7.76 bleibt die produktive Runtime unverändert.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/ vornehmen.
 * 2. npm run sync:ts-ems-mirrors ausführen.
 * 3. npm run test:ems-mirrors prüfen.
 */
/**
 * Datei: src-ts/ems/para14a/para14a-constraint.ts
 *
 * Zweck:
 * Typisierte §14a-Constraint-Berechnung. Das Netzbetreibersignal erzeugt nur
 * zentrale Caps; die Fachmodule (EVCS, Speicher, Thermik, Heizstab) bleiben die
 * einzigen Hardware-Schreiber.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePara14aSignal = resolvePara14aSignal;
exports.getPara14aGzf = getPara14aGzf;
exports.buildPara14aConstraintSnapshot = buildPara14aConstraintSnapshot;
exports.resolvePara14aAppCap = resolvePara14aAppCap;
function finiteOrNull(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'string' && value.trim() === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function finite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
function positive(value) {
    return Math.max(0, finite(value, 0));
}
function clamp(value, min, max) {
    const n = finite(value, min);
    return Math.min(max, Math.max(min, n));
}
function parseBool(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number' && Number.isFinite(value))
        return value !== 0;
    if (typeof value === 'string') {
        const text = value.trim().toLowerCase();
        if (['1', 'true', 'on', 'active', 'yes', 'ja'].includes(text))
            return true;
        if (['0', 'false', 'off', 'inactive', 'no', 'nein', ''].includes(text))
            return false;
    }
    return null;
}
function normalizePolicy(value) {
    const text = String(value ?? '').trim().toLowerCase();
    if (text === 'release')
        return 'release';
    if (text === 'force-active' || text === 'active')
        return 'force-active';
    return 'hold-active';
}
function resolvePara14aSignalInternal(input) {
    const now = finite(input.nowMs, Date.now());
    const policy = normalizePolicy(input.stalePolicy);
    const lastFreshActive = typeof input.lastFreshActive === 'boolean' ? input.lastFreshActive : null;
    const lastFreshTs = Number.isFinite(Number(input.lastFreshTs)) ? Number(input.lastFreshTs) : null;
    const ageMs = Number.isFinite(Number(input.ageMs)) ? Math.max(0, Number(input.ageMs)) : null;
    if (!input.enabled) {
        return { active: false, fresh: true, stale: false, source: 'disabled', reason: 'feature-disabled', ageMs, lastFreshActive, lastFreshTs, stalePolicy: policy };
    }
    if (!input.mapped) {
        const active = input.assumeActiveWithoutSignal === true;
        return { active, fresh: false, stale: true, source: active ? 'config' : 'no-signal', reason: active ? 'assume-active-without-signal' : 'activation-signal-not-mapped', ageMs, lastFreshActive, lastFreshTs, stalePolicy: policy };
    }
    const parsed = parseBool(input.rawValue);
    const fresh = parsed !== null && ageMs !== null && ageMs <= Math.max(1000, finite(input.maxAgeMs, 30000));
    if (fresh) {
        return { active: parsed === true, fresh: true, stale: false, source: 'dp', reason: parsed ? 'fresh-active' : 'fresh-inactive', ageMs, lastFreshActive: parsed, lastFreshTs: now, stalePolicy: policy };
    }
    if (policy === 'force-active') {
        return { active: true, fresh: false, stale: true, source: 'dp-stale', reason: 'stale-force-active', ageMs, lastFreshActive, lastFreshTs, stalePolicy: policy };
    }
    if (policy === 'release') {
        return { active: false, fresh: false, stale: true, source: 'dp-stale', reason: 'stale-release', ageMs, lastFreshActive, lastFreshTs, stalePolicy: policy };
    }
    const active = lastFreshActive === true || parsed === true;
    const reason = lastFreshActive === true
        ? 'stale-hold-last-active'
        : (parsed === true ? 'stale-hold-active-value' : 'stale-no-active-command');
    return { active, fresh: false, stale: true, source: 'dp-stale', reason, ageMs, lastFreshActive, lastFreshTs, stalePolicy: policy };
}
function getPara14aGzf(count) {
    const n = Math.max(1, Math.round(finite(count, 1)));
    if (n <= 1)
        return 1;
    if (n === 2)
        return 0.8;
    if (n === 3)
        return 0.75;
    if (n === 4)
        return 0.7;
    if (n === 5)
        return 0.65;
    if (n === 6)
        return 0.6;
    if (n === 7)
        return 0.55;
    if (n === 8)
        return 0.5;
    return 0.45;
}
function splitGroupCap(capW, rows) {
    const out = {};
    if (!rows.length || capW <= 0)
        return out;
    const normalized = rows.map((row, index) => ({
        row,
        index,
        installedW: positive(row.installedPowerW),
        allocationW: 0,
    }));
    const sumInstalled = normalized.reduce((sum, entry) => sum + entry.installedW, 0);
    for (const entry of normalized) {
        const proportional = sumInstalled > 0 && entry.installedW > 0
            ? capW * entry.installedW / sumInstalled
            : capW / normalized.length;
        entry.allocationW = entry.installedW > 0 ? Math.min(proportional, entry.installedW) : proportional;
    }
    let remaining = Math.max(0, capW - normalized.reduce((sum, entry) => sum + entry.allocationW, 0));
    for (const entry of normalized) {
        if (remaining <= 0)
            break;
        const headroom = entry.installedW > 0 ? Math.max(0, entry.installedW - entry.allocationW) : 0;
        const add = Math.min(headroom, remaining);
        entry.allocationW += add;
        remaining -= add;
    }
    let roundedRemaining = Math.max(0, Math.round(capW));
    normalized.forEach((entry, index) => {
        const rounded = index === normalized.length - 1
            ? roundedRemaining
            : Math.min(roundedRemaining, Math.max(0, Math.round(entry.allocationW)));
        out[entry.row.id] = rounded;
        roundedRemaining = Math.max(0, roundedRemaining - rounded);
    });
    return out;
}
function sumCaps(values) {
    return values.reduce((sum, value) => sum + positive(value), 0);
}
function buildPara14aConstraintSnapshot(input) {
    const forceZero = input.forceZero === true || input.emergencyStop === true;
    const emergencyStop = input.emergencyStop === true;
    const active = input.active === true || forceZero;
    const mode = String(input.mode || '').toLowerCase() === 'ems' ? 'ems' : 'direct';
    const baseW = Math.max(4200, positive(input.minPerDeviceW ?? 4200));
    const consumers = Array.isArray(input.consumers) ? input.consumers.filter(Boolean) : [];
    const evcs = Array.isArray(input.evcs) ? input.evcs.filter((row) => row && String(row.safe || '').trim()) : [];
    const heatRows = consumers.filter((row) => row.type === 'heatPump');
    const heatingRodRows = consumers.filter((row) => row.type === 'heatingRod');
    const airRows = consumers.filter((row) => row.type === 'airCondition');
    const storageRows = consumers.filter((row) => row.type === 'storage');
    const customRows = consumers.filter((row) => row.type === 'custom');
    const pHeat = heatRows.reduce((sum, row) => sum + positive(row.installedPowerW), 0);
    const pAir = airRows.reduce((sum, row) => sum + positive(row.installedPowerW), 0);
    const units = [];
    evcs.forEach((row, index) => units.push({
        id: `evcs:${String(row.safe)}`,
        kind: 'evcs',
        installedW: positive(row.maxPowerW),
        capW: 0,
        priority: 100 + index,
        rows: [],
        evcsSafe: String(row.safe),
    }));
    if (heatRows.length)
        units.push({
            id: 'heat',
            kind: 'heat',
            installedW: pHeat,
            capW: 0,
            priority: Math.min(...heatRows.map((row) => finite(row.priority, 100))),
            rows: heatRows,
        });
    if (airRows.length)
        units.push({
            id: 'air',
            kind: 'airCondition',
            installedW: pAir,
            capW: 0,
            priority: Math.min(...airRows.map((row) => finite(row.priority, 100))),
            rows: airRows,
        });
    heatingRodRows.forEach((row, index) => units.push({
        id: `heatingRod:${row.id || index}`,
        kind: 'heatingRod',
        installedW: positive(row.installedPowerW),
        capW: 0,
        priority: finite(row.priority, 100),
        rows: [row],
    }));
    const storageGroups = new Map();
    storageRows.forEach((row, index) => {
        const explicitGroup = String(row.groupId || '').trim();
        const groupKey = explicitGroup ? `group:${explicitGroup}` : `unit:${row.id || index}`;
        const groupRows = storageGroups.get(groupKey) || [];
        groupRows.push(row);
        storageGroups.set(groupKey, groupRows);
    });
    for (const [groupKey, rows] of storageGroups.entries()) {
        units.push({
            id: `storage:${groupKey}`,
            kind: 'storage',
            installedW: rows.reduce((sum, row) => sum + positive(row.installedPowerW), 0),
            capW: 0,
            priority: Math.min(...rows.map((row) => finite(row.priority, 100))),
            rows,
        });
    }
    customRows.forEach((row, index) => units.push({
        id: `custom:${row.id || index}`,
        kind: 'custom',
        installedW: positive(row.installedPowerW),
        capW: 0,
        priority: finite(row.priority, 100),
        rows: [row],
    }));
    const nSteuVE = units.length;
    const gzf = getPara14aGzf(Math.max(1, nSteuVE));
    const isLargeThermalGroup = (unit) => ((unit.kind === 'heat' || unit.kind === 'airCondition') && unit.installedW > 11000);
    const bigThermalGroups = units
        .filter(isLargeThermalGroup)
        .sort((a, b) => (0.4 * b.installedW) - (0.4 * a.installedW));
    const deterministicUnits = units.slice().sort((a, b) => {
        if (a.priority !== b.priority)
            return a.priority - b.priority;
        return a.id.localeCompare(b.id);
    });
    const primary = bigThermalGroups[0] || deterministicUnits[0] || null;
    const primaryW = primary
        ? (isLargeThermalGroup(primary) ? Math.max(baseW, 0.4 * primary.installedW) : baseW)
        : 0;
    const secondaryW = nSteuVE > 1 ? gzf * baseW : (nSteuVE === 1 ? baseW : 0);
    if (active && !forceZero) {
        for (const unit of units) {
            let cap = mode === 'direct'
                ? (isLargeThermalGroup(unit) ? Math.max(baseW, 0.4 * unit.installedW) : baseW)
                : (unit === primary ? primaryW : secondaryW);
            if (unit.installedW > 0)
                cap = Math.min(cap, unit.installedW);
            unit.capW = Math.max(0, cap);
        }
    }
    const nominalPMinW = active && !forceZero ? units.reduce((sum, unit) => sum + unit.capW, 0) : 0;
    const explicitRaw = finiteOrNull(input.externalTotalSetpointW);
    const explicitTotal = mode === 'ems' && explicitRaw !== null && explicitRaw >= 0 ? Math.max(0, explicitRaw) : null;
    const requestedTotalCapW = active ? (forceZero ? 0 : (explicitTotal ?? nominalPMinW)) : null;
    if (active && requestedTotalCapW !== null && nominalPMinW > 0) {
        if (requestedTotalCapW < nominalPMinW) {
            const factor = requestedTotalCapW / nominalPMinW;
            units.forEach((unit) => { unit.capW = Math.max(0, unit.capW * factor); });
        }
        else if (requestedTotalCapW > nominalPMinW) {
            let remaining = requestedTotalCapW - nominalPMinW;
            for (const unit of deterministicUnits) {
                if (remaining <= 0)
                    break;
                const headroom = unit.installedW > 0 ? Math.max(0, unit.installedW - unit.capW) : 0;
                const add = Math.min(headroom, remaining);
                unit.capW += add;
                remaining -= add;
            }
        }
    }
    const evcsCapsBySafe = {};
    units.filter((unit) => unit.kind === 'evcs' && unit.evcsSafe).forEach((unit) => { evcsCapsBySafe[String(unit.evcsSafe)] = Math.round(unit.capW); });
    const heatUnit = units.find((unit) => unit.kind === 'heat');
    const airUnit = units.find((unit) => unit.kind === 'airCondition');
    const heatSplit = splitGroupCap(positive(heatUnit?.capW), heatRows);
    const airSplit = splitGroupCap(positive(airUnit?.capW), airRows);
    const storageSplit = {};
    units.filter((unit) => unit.kind === 'storage').forEach((unit) => {
        Object.assign(storageSplit, splitGroupCap(positive(unit.capW), unit.rows));
    });
    const heatingRodSplit = {};
    units.filter((unit) => unit.kind === 'heatingRod').forEach((unit) => {
        Object.assign(heatingRodSplit, splitGroupCap(positive(unit.capW), unit.rows));
    });
    const targetCapsById = {};
    const targetControlById = {};
    const assignTarget = (row, cap) => {
        for (const target of [row.setWId, row.enableId]) {
            const id = String(target || '').trim();
            if (!id)
                continue;
            targetCapsById[id] = Math.max(0, Math.round(cap));
            targetControlById[id] = row.controlType;
        }
    };
    heatRows.forEach((row) => assignTarget(row, heatSplit[row.id] || 0));
    heatingRodRows.forEach((row) => assignTarget(row, heatingRodSplit[row.id] || 0));
    airRows.forEach((row) => assignTarget(row, airSplit[row.id] || 0));
    storageRows.forEach((row) => assignTarget(row, storageSplit[row.id] || 0));
    customRows.forEach((row) => {
        const unit = units.find((candidate) => candidate.id === `custom:${row.id}` || candidate.rows.includes(row));
        assignTarget(row, positive(unit?.capW));
    });
    const heatPumpCap = heatRows.reduce((sum, row) => sum + positive(heatSplit[row.id]), 0);
    const heatingRodCap = heatingRodRows.reduce((sum, row) => sum + positive(heatingRodSplit[row.id]), 0);
    const thermalCap = heatPumpCap + positive(airUnit?.capW);
    const customCap = units.filter((unit) => unit.kind === 'custom').reduce((sum, unit) => sum + positive(unit.capW), 0);
    const storageCap = units.filter((unit) => unit.kind === 'storage').reduce((sum, unit) => sum + positive(unit.capW), 0);
    const effectiveTotal = active ? sumCaps(units.map((unit) => unit.capW)) : 0;
    return {
        active,
        forceZero,
        emergencyStop,
        source: String(input.source || ''),
        mode,
        constraintOnly: true,
        nSteuVE,
        gzf,
        pMinW: Math.round(nominalPMinW),
        totalCapW: active && (units.length || forceZero) ? Math.round(forceZero ? 0 : effectiveTotal) : null,
        primaryGroup: primary?.kind || '',
        primaryW: Math.round(primaryW),
        secondaryW: Math.round(secondaryW),
        evcsCapsBySafe,
        evcsTotalCapW: active && (evcs.length || forceZero) ? Math.round(forceZero ? 0 : sumCaps(Object.values(evcsCapsBySafe))) : null,
        appCapsW: {
            evcs: active && (evcs.length || forceZero) ? Math.round(forceZero ? 0 : sumCaps(Object.values(evcsCapsBySafe))) : null,
            storage: active && (storageRows.length || forceZero) ? Math.round(forceZero ? 0 : storageCap) : null,
            thermal: active && (heatRows.length || airRows.length || forceZero) ? Math.round(forceZero ? 0 : thermalCap) : null,
            heatingRod: active && (heatingRodRows.length || forceZero) ? Math.round(forceZero ? 0 : heatingRodCap) : null,
            airCondition: active && (airRows.length || forceZero) ? Math.round(forceZero ? 0 : positive(airUnit?.capW)) : null,
            custom: active && (customRows.length || forceZero) ? Math.round(forceZero ? 0 : customCap) : null,
        },
        targetCapsById,
        targetControlById,
        unmanagedConsumerCount: customRows.filter((row) => row.automatic !== true).length,
    };
}
function resolvePara14aAppCap(appCaps, key, app) {
    if (!appCaps || typeof appCaps !== 'object')
        return null;
    const text = `${String(app || '')}:${String(key || '')}`.toLowerCase();
    const src = appCaps;
    const candidates = [];
    if (text.includes('evcs') || text.includes('charging'))
        candidates.push('evcs');
    if (text.includes('storage') || text.includes('speicher'))
        candidates.push('storage');
    if (text.includes('heatingrod') || text.includes('heizstab'))
        candidates.push('heatingRod');
    if (text.includes('thermal') || text.includes('waerm') || text.includes('wärm') || text.includes('climate'))
        candidates.push('thermal');
    if (text.includes('aircondition') || text.includes('klima'))
        candidates.push('airCondition');
    if (text.includes('multiuse') || text.includes('nexologic') || text.includes('custom'))
        candidates.push('custom');
    for (const candidate of candidates) {
        const raw = Number(src[candidate]);
        if (Number.isFinite(raw) && raw >= 0)
            return raw;
    }
    return null;
}

// RC48_CONSTRAINT_WRAPPER
function resolvePara14aSignal(...args) { return normalizeResult(resolvePara14aSignalInternal(...args)); }

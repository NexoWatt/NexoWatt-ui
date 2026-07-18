'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/ems/para14a/para14a-constraint.ts
 * Quell-Hash: sha256:20b890056c9f382011afc12e6cd1656a688a10b5f0035e081b4f0fe6cccd8849
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
function resolvePara14aSignal(input) {
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
    const sumInstalled = rows.reduce((sum, row) => sum + positive(row.installedPowerW), 0);
    let remaining = capW;
    rows.forEach((row, index) => {
        const share = index === rows.length - 1
            ? remaining
            : (sumInstalled > 0 && positive(row.installedPowerW) > 0
                ? capW * positive(row.installedPowerW) / sumInstalled
                : capW / rows.length);
        const capped = positive(row.installedPowerW) > 0 ? Math.min(share, positive(row.installedPowerW)) : share;
        const rounded = Math.max(0, Math.round(capped));
        out[row.id] = rounded;
        remaining = Math.max(0, remaining - rounded);
    });
    return out;
}
function sumCaps(values) {
    return values.reduce((sum, value) => sum + positive(value), 0);
}
function buildPara14aConstraintSnapshot(input) {
    const active = input.active === true;
    const mode = String(input.mode || '').toLowerCase() === 'ems' ? 'ems' : 'direct';
    const baseW = positive(input.minPerDeviceW || 4200);
    const consumers = Array.isArray(input.consumers) ? input.consumers.filter(Boolean) : [];
    const evcs = Array.isArray(input.evcs) ? input.evcs.filter((row) => row && String(row.safe || '').trim()) : [];
    const heatRows = consumers.filter((row) => row.type === 'heatPump' || row.type === 'heatingRod');
    const airRows = consumers.filter((row) => row.type === 'airCondition');
    const storageRows = consumers.filter((row) => row.type === 'storage');
    const customRows = consumers.filter((row) => row.type === 'custom');
    const pHeat = heatRows.reduce((sum, row) => sum + positive(row.installedPowerW), 0);
    const pAir = airRows.reduce((sum, row) => sum + positive(row.installedPowerW), 0);
    const pStorage = storageRows.reduce((sum, row) => sum + positive(row.installedPowerW), 0);
    const units = [];
    evcs.forEach((row, index) => units.push({ id: `evcs:${index}`, kind: 'evcs', installedW: positive(row.maxPowerW), capW: 0, evcsSafe: String(row.safe) }));
    if (heatRows.length)
        units.push({ id: 'heat', kind: 'heat', installedW: pHeat, capW: 0 });
    if (airRows.length)
        units.push({ id: 'air', kind: 'airCondition', installedW: pAir, capW: 0 });
    if (storageRows.length)
        units.push({ id: 'storage', kind: 'storage', installedW: pStorage, capW: 0 });
    customRows.forEach((row, index) => units.push({ id: `custom:${index}`, kind: 'custom', installedW: positive(row.installedPowerW), capW: 0, consumer: row }));
    const nSteuVE = units.length;
    const gzf = getPara14aGzf(Math.max(1, nSteuVE));
    const bigGroups = units.filter((unit) => unit.kind !== 'evcs' && unit.installedW > 11000);
    let primary = bigGroups.sort((a, b) => (0.4 * b.installedW) - (0.4 * a.installedW))[0] || null;
    if (!primary)
        primary = units.find((unit) => unit.kind === 'heat') || units.find((unit) => unit.kind === 'airCondition') || units.find((unit) => unit.kind === 'storage') || units.find((unit) => unit.kind === 'custom') || units[0] || null;
    const primaryW = primary && primary.installedW > 11000 && primary.kind !== 'evcs'
        ? Math.max(baseW, 0.4 * primary.installedW)
        : baseW;
    const secondaryW = nSteuVE > 1 ? gzf * baseW : baseW;
    if (active) {
        for (const unit of units) {
            let cap = mode === 'direct'
                ? (unit.installedW > 11000 && unit.kind !== 'evcs' ? Math.max(baseW, 0.4 * unit.installedW) : baseW)
                : (unit === primary ? primaryW : secondaryW);
            if (unit.installedW > 0)
                cap = Math.min(cap, unit.installedW);
            unit.capW = Math.max(0, cap);
        }
    }
    const nominalPMinW = active ? units.reduce((sum, unit) => sum + unit.capW, 0) : 0;
    const explicitTotal = mode === 'ems' && finite(input.externalTotalSetpointW, 0) > 0 ? positive(input.externalTotalSetpointW) : null;
    const requestedTotalCapW = active ? (explicitTotal ?? nominalPMinW) : null;
    if (active && requestedTotalCapW !== null && nominalPMinW > requestedTotalCapW && nominalPMinW > 0) {
        const factor = requestedTotalCapW / nominalPMinW;
        units.forEach((unit) => { unit.capW = Math.max(0, unit.capW * factor); });
    }
    const evcsCapsBySafe = {};
    units.filter((unit) => unit.kind === 'evcs' && unit.evcsSafe).forEach((unit) => { evcsCapsBySafe[String(unit.evcsSafe)] = Math.round(unit.capW); });
    const heatUnit = units.find((unit) => unit.kind === 'heat');
    const airUnit = units.find((unit) => unit.kind === 'airCondition');
    const storageUnit = units.find((unit) => unit.kind === 'storage');
    const heatSplit = splitGroupCap(positive(heatUnit?.capW), heatRows);
    const airSplit = splitGroupCap(positive(airUnit?.capW), airRows);
    const storageSplit = splitGroupCap(positive(storageUnit?.capW), storageRows);
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
    airRows.forEach((row) => assignTarget(row, airSplit[row.id] || 0));
    storageRows.forEach((row) => assignTarget(row, storageSplit[row.id] || 0));
    units.filter((unit) => unit.kind === 'custom' && unit.consumer).forEach((unit) => assignTarget(unit.consumer, unit.capW));
    const heatPumpCap = heatRows.filter((row) => row.type === 'heatPump').reduce((sum, row) => sum + positive(heatSplit[row.id]), 0);
    const heatingRodCap = heatRows.filter((row) => row.type === 'heatingRod').reduce((sum, row) => sum + positive(heatSplit[row.id]), 0);
    const thermalCap = heatPumpCap + positive(airUnit?.capW);
    const customCap = units.filter((unit) => unit.kind === 'custom').reduce((sum, unit) => sum + positive(unit.capW), 0);
    const effectiveTotal = active ? sumCaps(units.map((unit) => unit.capW)) : 0;
    return {
        active,
        source: String(input.source || ''),
        mode,
        constraintOnly: true,
        nSteuVE,
        gzf,
        pMinW: Math.round(nominalPMinW),
        totalCapW: active && units.length ? Math.round(Math.min(requestedTotalCapW ?? effectiveTotal, effectiveTotal)) : null,
        primaryGroup: primary?.kind || '',
        primaryW: Math.round(primaryW),
        secondaryW: Math.round(secondaryW),
        evcsCapsBySafe,
        evcsTotalCapW: active && evcs.length ? Math.round(sumCaps(Object.values(evcsCapsBySafe))) : null,
        appCapsW: {
            evcs: active && evcs.length ? Math.round(sumCaps(Object.values(evcsCapsBySafe))) : null,
            storage: active && storageRows.length ? Math.round(positive(storageUnit?.capW)) : null,
            thermal: active && (heatRows.some((row) => row.type === 'heatPump') || airRows.length) ? Math.round(thermalCap) : null,
            heatingRod: active && heatRows.some((row) => row.type === 'heatingRod') ? Math.round(heatingRodCap) : null,
            airCondition: active && airRows.length ? Math.round(positive(airUnit?.capW)) : null,
            custom: active && customRows.length ? Math.round(customCap) : null,
        },
        targetCapsById,
        targetControlById,
        unmanagedConsumerCount: customRows.length,
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

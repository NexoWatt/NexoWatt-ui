"use strict";
/**
 * Datei: src-ts/ems/charging-management/charging-phase-selection.ts
 *
 * Zweck:
 * TypeScript-Entscheidungsschicht für AC-1p/3p-Phasenwahl im EVCS-Lademanagement.
 * Die Datei schreibt keine ioBroker-States. Sie entscheidet nur, ob eine Wallbox
 * im PV-Überschussbetrieb einphasig oder dreiphasig laufen soll und ob eine sichere
 * Umschaltsequenz vorbereitet werden darf.
 *
 * Sicherheitsprinzip:
 * - DC-Lader werden nicht phasenautomatisch geschaltet.
 * - Hoch auf 3p nur bei stabil ausreichendem PV-/EVCS-Budget.
 * - Runter auf 1p bei dauerhaft zu niedrigem Überschuss.
 * - Bei stale Meter keine Hoch-Umschaltung.
 * - Phasenumschaltung ist ein schwerer Schaltvorgang: Stop/0-Setpoint vor Umschaltung,
 *   Cooldown und optionale Rückmeldung werden berücksichtigt.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildChargingPhaseSelectionPlan = buildChargingPhaseSelectionPlan;
function finiteOrNull(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
        const s = value.trim().replace(',', '.');
        if (!s)
            return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function nonNegative(value, fallback = 0) {
    const n = finiteOrNull(value);
    const v = n === null ? fallback : n;
    return v > 0 ? Math.round(v) : 0;
}
function boolValue(value, fallback = false) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'number' && Number.isFinite(value))
        return value !== 0;
    if (typeof value === 'string') {
        const s = value.trim().toLowerCase();
        if (['true', '1', 'on', 'yes', 'ja', 'enabled', 'active', 'auto'].includes(s))
            return true;
        if (['false', '0', 'off', 'no', 'nein', 'disabled', 'inactive'].includes(s))
            return false;
    }
    return fallback;
}
function str(value, fallback = '') {
    const s = String(value ?? '').trim();
    return s || fallback;
}
function safeKey(value, fallbackIndex = 0) {
    const raw = str(value, `wallbox_${fallbackIndex + 1}`);
    const safe = raw.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
    return safe || `wallbox_${fallbackIndex + 1}`;
}
function normalizePhaseCount(value, fallback = 3) {
    const raw = str(value, '').toLowerCase();
    if (raw === '1p' || raw === '1phase' || raw === '1-phase' || raw === 'one' || raw === 'single')
        return 1;
    if (raw === '3p' || raw === '3phase' || raw === '3-phase' || raw === 'three')
        return 3;
    const n = finiteOrNull(value);
    return n !== null && Math.round(n) === 1 ? 1 : fallback;
}
function normalizePhaseMode(value, configured) {
    const raw = str(value, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (raw === 'autopv' || raw === 'pvauto' || raw === 'auto13' || raw === 'auto1p3p' || raw === 'auto')
        return 'auto-pv';
    if (raw === 'fixed1p' || raw === '1p' || raw === 'onephase' || raw === 'fixed1')
        return 'fixed-1p';
    if (raw === 'fixed3p' || raw === '3p' || raw === 'threephase' || raw === 'fixed3')
        return 'fixed-3p';
    return configured === 1 ? 'fixed-1p' : 'fixed-3p';
}
function phaseValueFor(target, value1p, value3p) {
    const raw = target === 1 ? value1p : value3p;
    if (typeof raw === 'boolean')
        return raw;
    if (typeof raw === 'number' && Number.isFinite(raw))
        return raw;
    if (typeof raw === 'string') {
        const s = raw.trim();
        if (!s)
            return target;
        const low = s.toLowerCase();
        if (['true', 'false'].includes(low))
            return low === 'true';
        const n = Number(s.replace(',', '.'));
        return Number.isFinite(n) ? n : s;
    }
    return target;
}
function effectiveStableBudgetW(input) {
    const candidates = [input.stablePvAvailableW, input.pvAvailableW, input.remainingW, input.budgetW];
    for (const candidate of candidates) {
        const n = finiteOrNull(candidate);
        if (n !== null && n > 0)
            return Math.max(0, Math.round(n));
    }
    return 0;
}
function unique(values) {
    const out = [];
    for (const value of values) {
        const v = String(value || '').trim();
        if (v && !out.includes(v))
            out.push(v);
    }
    return out;
}
/**
 * Code-Teil: buildChargingPhaseSelectionPlan
 * Zweck: Entscheidet pro AC-Ladepunkt den stabilen 1p/3p-Zielzustand für PV-Überschussladen.
 */
function buildChargingPhaseSelectionPlan(input) {
    const now = nonNegative(input.now, Date.now()) || Date.now();
    const phaseAutoEnabled = boolValue(input.phaseAutoEnabled, true);
    const stableBudgetW = effectiveStableBudgetW(input);
    const globalUpW = nonNegative(input.switchUpThresholdW, 4800) || 4800;
    const globalDownW = nonNegative(input.switchDownThresholdW, 3700) || 3700;
    const globalUpMs = nonNegative(input.switchUpStableMs, 5 * 60 * 1000) || 5 * 60 * 1000;
    const globalDownMs = nonNegative(input.switchDownStableMs, 2 * 60 * 1000) || 2 * 60 * 1000;
    const globalCooldownMs = nonNegative(input.switchCooldownMs, 15 * 60 * 1000) || 15 * 60 * 1000;
    const globalSettleMs = nonNegative(input.switchSettleMs, 30 * 1000) || 30 * 1000;
    const globalSafePowerW = nonNegative(input.switchSafePowerW, 150) || 150;
    const staleMeter = boolValue(input.staleMeter, false);
    const staleBudget = boolValue(input.staleBudget, false);
    const wallboxes = Array.isArray(input.wallboxes) ? input.wallboxes : [];
    const warnings = [];
    const blockers = [];
    if (!wallboxes.length)
        warnings.push('no-wallboxes-configured');
    if (!phaseAutoEnabled)
        warnings.push('phase-auto-disabled-globally');
    if (staleMeter)
        warnings.push('stale-meter-keeps-phase-or-allows-downshift-only');
    if (staleBudget)
        warnings.push('stale-budget-keeps-phase');
    const decisions = wallboxes.map((wb, index) => {
        const safe = safeKey(wb.safe ?? wb.key ?? wb.id ?? wb.name, index);
        const name = str(wb.name, safe);
        const chargerType = str(wb.chargerType, 'ac').toLowerCase() === 'dc' ? 'dc' : 'ac';
        const configured = normalizePhaseCount(wb.phases, chargerType === 'dc' ? 1 : 3);
        const current = normalizePhaseCount(wb.currentPhaseCount ?? wb.phaseFeedback ?? wb.phases, configured);
        const mode = normalizePhaseMode(wb.phaseMode, configured);
        const enabled = boolValue(wb.enabled, false);
        const online = boolValue(wb.online, false);
        const connected = boolValue(wb.vehiclePlugged, enabled || online);
        const charging = boolValue(wb.charging, false);
        const actualPowerW = nonNegative(wb.actualPowerW, 0);
        const voltageV = nonNegative(wb.voltageV, 230) || 230;
        const minA = finiteOrNull(wb.minA);
        const effectiveMinA = minA !== null && minA > 0 ? minA : 6;
        const minPower1pW = Math.round(voltageV * effectiveMinA);
        const minPower3pW = Math.round(3 * voltageV * effectiveMinA);
        const upW = nonNegative(wb.switchUpThresholdW, globalUpW) || globalUpW;
        const downCandidate = nonNegative(wb.switchDownThresholdW, globalDownW) || globalDownW;
        const downW = Math.min(downCandidate, Math.max(0, upW - 200));
        const upMs = nonNegative(wb.switchUpStableMs, globalUpMs) || globalUpMs;
        const downMs = nonNegative(wb.switchDownStableMs, globalDownMs) || globalDownMs;
        const cooldownMs = nonNegative(wb.switchCooldownMs, globalCooldownMs) || globalCooldownMs;
        const settleMs = nonNegative(wb.switchSettleMs, globalSettleMs) || globalSettleMs;
        const safePowerW = nonNegative(wb.switchSafePowerW, globalSafePowerW) || globalSafePowerW;
        const highSince = nonNegative(wb.highSinceMs, 0);
        const lowSince = nonNegative(wb.lowSinceMs, 0);
        const cooldownUntilMs = nonNegative(wb.cooldownUntilMs, 0);
        const settleUntilMs = nonNegative(wb.settleUntilMs, 0);
        const cooldownActive = cooldownUntilMs > now || settleUntilMs > now;
        const cooldownRemainingMs = Math.max(0, Math.max(cooldownUntilMs, settleUntilMs) - now);
        const supportsPhaseSwitch = boolValue(wb.supportsPhaseSwitch, !!str(wb.phaseSwitchKey));
        const phaseSwitchKey = str(wb.phaseSwitchKey);
        const stopBefore = boolValue(wb.stopBeforePhaseSwitch, true);
        const onePhaseLine = str(wb.onePhaseLine, 'L1').toUpperCase();
        let nextHighSinceMs = stableBudgetW >= upW ? (highSince > 0 ? highSince : now) : 0;
        let nextLowSinceMs = stableBudgetW <= downW ? (lowSince > 0 ? lowSince : now) : 0;
        if (!phaseAutoEnabled || mode !== 'auto-pv' || chargerType !== 'ac') {
            nextHighSinceMs = 0;
            nextLowSinceMs = 0;
        }
        const stableAbove3p = nextHighSinceMs > 0 && (now - nextHighSinceMs) >= upMs;
        const stableBelow1p = nextLowSinceMs > 0 && (now - nextLowSinceMs) >= downMs;
        let target = mode === 'fixed-1p' ? 1 : (mode === 'fixed-3p' ? 3 : current);
        let reason = '';
        let warning = '';
        let blocker = '';
        if (chargerType === 'dc') {
            target = 1;
            reason = 'dc-no-ac-phase-switch';
        }
        else if (!phaseAutoEnabled) {
            target = current;
            reason = 'phase-auto-disabled';
        }
        else if (!enabled || !online) {
            target = current;
            reason = !enabled ? 'wallbox-disabled-keep-phase' : 'wallbox-offline-keep-phase';
        }
        else if (mode === 'auto-pv') {
            if (staleBudget) {
                target = current;
                reason = 'stale-budget-keep-phase';
                warning = reason;
            }
            else if (staleMeter) {
                // Bei stale Meter nicht hochschalten. Eine bestehende 3p-Ladung darf aber bei wenig Budget auf 1p runter.
                if (current === 3 && stableBelow1p) {
                    target = 1;
                    reason = 'stable-low-budget-downshift-allowed-while-stale-meter';
                }
                else {
                    target = current;
                    reason = 'stale-meter-blocks-phase-upshift';
                    warning = reason;
                }
            }
            else if (current === 1 && stableAbove3p) {
                target = 3;
                reason = 'stable-pv-budget-upshift-to-3p';
            }
            else if (current === 3 && stableBelow1p) {
                target = 1;
                reason = 'stable-low-pv-budget-downshift-to-1p';
            }
            else {
                target = current;
                if (current === 1)
                    reason = stableBudgetW >= upW ? 'waiting-for-3p-stability' : 'pv-budget-prefers-1p';
                else
                    reason = stableBudgetW <= downW ? 'waiting-for-1p-stability' : 'pv-budget-keeps-3p';
            }
        }
        else {
            reason = mode === 'fixed-1p' ? 'fixed-1p-configured' : 'fixed-3p-configured';
        }
        const desiredSwitch = target !== current;
        const direction = !desiredSwitch ? 'none' : (current === 1 && target === 3 ? '1p-to-3p' : '3p-to-1p');
        let switchRequired = desiredSwitch;
        let switchAllowed = true;
        let switchCommandAllowed = false;
        let safetyStopRequired = false;
        if (switchRequired && cooldownActive) {
            switchRequired = false;
            target = current;
            switchAllowed = false;
            reason = 'phase-switch-cooldown';
            warning = reason;
        }
        else if (switchRequired && (!supportsPhaseSwitch || !phaseSwitchKey)) {
            switchAllowed = false;
            blocker = 'missing-phase-switch-datapoint';
            reason = blocker;
            safetyStopRequired = false;
        }
        else if (switchRequired) {
            const needsStop = stopBefore && (charging || actualPowerW > safePowerW);
            safetyStopRequired = stopBefore;
            switchCommandAllowed = !needsStop;
            if (needsStop)
                reason = `stop-before-phase-switch:${direction}`;
            else
                reason = `phase-switch-command-ready:${direction}`;
        }
        const allocationPhaseCount = switchRequired ? current : target;
        return {
            safe,
            name,
            chargerType,
            mode,
            enabled,
            online,
            connected,
            currentPhaseCount: current,
            configuredPhaseCount: configured,
            targetPhaseCount: target,
            allocationPhaseCount,
            switchRequired,
            switchDirection: switchRequired ? direction : 'none',
            switchAllowed,
            switchCommandAllowed,
            safetyStopRequired,
            stopBeforePhaseSwitch: stopBefore,
            phaseSwitchKey,
            phaseSwitchValue: phaseValueFor(target, wb.phaseSwitchValue1p, wb.phaseSwitchValue3p),
            supportsPhaseSwitch,
            cooldownActive,
            cooldownRemainingMs,
            cooldownUntilMs,
            settleUntilMs,
            highSinceMs: highSince,
            lowSinceMs: lowSince,
            nextHighSinceMs,
            nextLowSinceMs,
            stableAbove3p,
            stableBelow1p,
            stableBudgetW,
            switchUpThresholdW: upW,
            switchDownThresholdW: downW,
            switchUpStableMs: upMs,
            switchDownStableMs: downMs,
            switchCooldownMs: cooldownMs,
            switchSettleMs: settleMs,
            minPower1pW,
            minPower3pW,
            onePhaseLine,
            reason,
            blocker,
            warning,
        };
    });
    const planBlockers = unique([...blockers, ...decisions.map((d) => d.blocker).filter((v) => !!v)]);
    const planWarnings = unique([...warnings, ...decisions.map((d) => d.warning).filter((v) => !!v)]);
    return {
        source: 'ts-charging-phase-selection-v1',
        available: true,
        ok: planBlockers.length === 0,
        productive: true,
        ts: finiteOrNull(input.ts) ?? now,
        mode: str(input.mode, 'auto'),
        budgetMode: str(input.budgetMode, ''),
        phaseAutoEnabled,
        stableBudgetW,
        switchRequiredCount: decisions.filter((d) => d.switchRequired).length,
        commandAllowedCount: decisions.filter((d) => d.switchCommandAllowed).length,
        safetyStopCount: decisions.filter((d) => d.safetyStopRequired).length,
        cooldownCount: decisions.filter((d) => d.cooldownActive).length,
        wallboxCount: decisions.length,
        wallboxes: decisions,
        blockers: planBlockers,
        warnings: planWarnings,
        safety: {
            doesNotWriteIoBrokerStates: true,
            acOnly: true,
            dcIgnored: true,
            highSwitchRequiresStablePvBudget: true,
            staleMeterBlocksPhaseUpshift: true,
            stopBeforePhaseSwitchDefault: true,
            cooldownPreventsFlapping: true,
        },
    };
}

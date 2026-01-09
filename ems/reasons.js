'use strict';

/**
 * Canonical, module-wide reason codes for transparency and deterministic diagnostics.
 * Values are stable string constants (UPPER_SNAKE_CASE).
 */
const ReasonCodes = Object.freeze({
    // Generic
    OK: 'OK',
    UNKNOWN: 'UNKNOWN',

    // Safety / failsafe
    STALE_METER: 'STALE_METER',
    SAFETY_OVERLOAD: 'SAFETY_OVERLOAD',

    // Peak shaving
    LIMIT_POWER: 'LIMIT_POWER',
    LIMIT_PHASE: 'LIMIT_PHASE',
    LIMIT_POWER_AND_PHASE: 'LIMIT_POWER_AND_PHASE',

    // Charging / allocation
    LIMITED_BY_BUDGET: 'LIMITED_BY_BUDGET',
    // Hard grid safety caps (Gate A)
    LIMITED_BY_GRID_IMPORT: 'LIMITED_BY_GRID_IMPORT',
    LIMITED_BY_PHASE_CAP: 'LIMITED_BY_PHASE_CAP',
    // Station group cap (multi-connector stations)
    LIMITED_BY_STATION_CAP: 'LIMITED_BY_STATION_CAP',
    // User-defined caps/limits (per connector or global)
    LIMITED_BY_USER_LIMIT: 'LIMITED_BY_USER_LIMIT',
    // §14a cap (optional)
    LIMITED_BY_14A: 'LIMITED_BY_14A',
    NO_SETPOINT: 'NO_SETPOINT',
    UNLIMITED: 'UNLIMITED',
    NO_BUDGET: 'NO_BUDGET',
    ALLOCATED: 'ALLOCATED',
    BELOW_MIN: 'BELOW_MIN',
    NO_PV_SURPLUS: 'NO_PV_SURPLUS',
    PAUSED_BY_PEAK_SHAVING: 'PAUSED_BY_PEAK_SHAVING',

    // Boost
    BOOST_TIMEOUT: 'BOOST_TIMEOUT',
    BOOST_NOT_ALLOWED: 'BOOST_NOT_ALLOWED',

    // Availability / state
    CONTROL_DISABLED: 'CONTROL_DISABLED',
    DISABLED: 'DISABLED',
    OFFLINE: 'OFFLINE',
    SKIPPED: 'SKIPPED',
});

/**
 * Normalize legacy reason strings to canonical ReasonCodes where possible.
 * Unknown reasons are returned as an UPPERCASE string.
 * @param {any} input
 * @returns {string}
 */
function normalizeReason(input) {
    const raw = (input === null || input === undefined) ? '' : String(input);
    const s = raw.trim();
    if (!s) return '';
    const up = s.toUpperCase();

    // Common historical lower/underscore forms
    if (up === 'STALE_METER' || up === 'STALE-METER' || up === 'STALEMETER') return ReasonCodes.STALE_METER;
    if (up === 'PAUSED_BY_PEAK_SHAVING' || up === 'PAUSED-BY-PEAK-SHAVING') return ReasonCodes.PAUSED_BY_PEAK_SHAVING;

    if (up === 'BOOST_TIMEOUT' || up === 'BOOST-TIMEOUT' || up === 'BOOSTEXPIRED' || up === 'BOOST_EXPIRED') return ReasonCodes.BOOST_TIMEOUT;
    if (up === 'BOOST_NOT_ALLOWED' || up === 'BOOST-NOT-ALLOWED' || up === 'BOOSTNOTALLOWED') return ReasonCodes.BOOST_NOT_ALLOWED;

    // PeakShaving legacy
    if (up === 'OK') return ReasonCodes.OK;
    if (up === 'POWER') return ReasonCodes.LIMIT_POWER;
    if (up === 'PHASE') return ReasonCodes.LIMIT_PHASE;
    if (up === 'POWER_AND_PHASE') return ReasonCodes.LIMIT_POWER_AND_PHASE;
    if (up === 'UNKNOWN') return ReasonCodes.UNKNOWN;

    // Charging legacy / canonical pass-through
    if (up === 'LIMITED_BY_BUDGET') return ReasonCodes.LIMITED_BY_BUDGET;
    if (up === 'LIMITED_BY_STATION_CAP' || up === 'STATION_CAP' || up === 'STATIONCAP') return ReasonCodes.LIMITED_BY_STATION_CAP;
    if (up === 'LIMITED_BY_USER_LIMIT' || up === 'USER_LIMIT' || up === 'USERLIMIT') return ReasonCodes.LIMITED_BY_USER_LIMIT;
    if (up === 'LIMITED_BY_14A' || up === 'LIMITED_BY_PARA14A' || up === 'PARA14A') return ReasonCodes.LIMITED_BY_14A;
    if (up === 'NO_SETPOINT' || up === 'NO_SETPOINTS') return ReasonCodes.NO_SETPOINT;
    if (up === 'UNLIMITED') return ReasonCodes.UNLIMITED;
    if (up === 'NO_BUDGET') return ReasonCodes.NO_BUDGET;
    if (up === 'ALLOCATED') return ReasonCodes.ALLOCATED;
    if (up === 'BELOW_MIN') return ReasonCodes.BELOW_MIN;
    if (up === 'CONTROL_DISABLED' || up === 'CONTROL-DISABLED' || up === 'CONTROL_DISABLED_BY_USER') return ReasonCodes.CONTROL_DISABLED;
    if (up === 'DISABLED') return ReasonCodes.DISABLED;
    if (up === 'OFFLINE') return ReasonCodes.OFFLINE;
    if (up === 'SKIPPED') return ReasonCodes.SKIPPED;

    // If it's already one of our codes, keep it
    if (Object.values(ReasonCodes).includes(up)) return up;

    return up;
}

const ReasonTextDe = Object.freeze({
    [ReasonCodes.OK]: 'OK',
    [ReasonCodes.UNKNOWN]: 'Unbekannt',
    [ReasonCodes.STALE_METER]: 'Messwert veraltet',
    [ReasonCodes.SAFETY_OVERLOAD]: 'Sicherheitsabschaltung (Überlast)',
    [ReasonCodes.LIMIT_POWER]: 'Leistungsbegrenzung',
    [ReasonCodes.LIMIT_PHASE]: 'Phasenbegrenzung',
    [ReasonCodes.LIMIT_POWER_AND_PHASE]: 'Leistungs- und Phasenbegrenzung',
    [ReasonCodes.LIMITED_BY_BUDGET]: 'Begrenzt durch Budget',
    [ReasonCodes.LIMITED_BY_GRID_IMPORT]: 'Begrenzt durch Netzimport-Limit',
    [ReasonCodes.LIMITED_BY_PHASE_CAP]: 'Begrenzt durch Phasenlimit',
    [ReasonCodes.LIMITED_BY_STATION_CAP]: 'Begrenzt durch Stationslimit',
    [ReasonCodes.LIMITED_BY_USER_LIMIT]: 'Begrenzt durch Benutzerlimit',
    [ReasonCodes.LIMITED_BY_14A]: 'Begrenzt durch §14a',
    [ReasonCodes.NO_SETPOINT]: 'Kein Sollwert verfügbar',
    [ReasonCodes.UNLIMITED]: 'Unbegrenzt',
    [ReasonCodes.NO_BUDGET]: 'Kein Budget',
    [ReasonCodes.ALLOCATED]: 'Zugewiesen',
    [ReasonCodes.BELOW_MIN]: 'Unter Mindestleistung',
    [ReasonCodes.NO_PV_SURPLUS]: 'Kein PV-Überschuss',
    [ReasonCodes.PAUSED_BY_PEAK_SHAVING]: 'Pausiert durch Lastspitzenkappung',
    [ReasonCodes.BOOST_TIMEOUT]: 'Boost abgelaufen',
    [ReasonCodes.BOOST_NOT_ALLOWED]: 'Boost nicht erlaubt',
    [ReasonCodes.CONTROL_DISABLED]: 'Regelung aus',
    [ReasonCodes.DISABLED]: 'Deaktiviert',
    [ReasonCodes.OFFLINE]: 'Offline',
    [ReasonCodes.SKIPPED]: 'Übersprungen',
});

/**
 * Human-readable German explanation for a reason code (for logs/UI).
 * Keeps canonical codes intact (code remains the source of truth).
 */
function reasonToGerman(code) {
    const c = normalizeReason(code);
    return ReasonTextDe[c] || c;
}

module.exports = { ReasonCodes, normalizeReason, reasonToGerman, ReasonTextDe };

'use strict';

/**
 * Generic numeric setpoint consumer (e.g. temperature setpoint) with optional enable/switch datapoint.
 *
 * Consumer:
 * {
 *   type: 'setpoint',
 *   key: string,
 *   name: string,
 *   setKey?: string,     // numeric setpoint (write)
 *   enableKey?: string   // boolean enable/switch (write)
 * }
 *
 * Target:
 * {
 *   enable?: boolean|null,
 *   setpoint?: number|null
 * }
 */

/**
 * @param {{dp:any, adapter:any}} ctx
 * @param {any} consumer
 * @param {{enable?:boolean|null, setpoint?:number|null}} target
 */
async function applySetpointNumeric(ctx, consumer, target) {
    const adapter = ctx && ctx.adapter;
    const dp = ctx && ctx.dp;

    const setKey = consumer && (consumer.setKey || consumer.setWKey);
    const enableKey = consumer && consumer.enableKey;

    const hasSet = !!(setKey && dp && dp.getEntry && dp.getEntry(setKey));
    const hasEnable = !!(enableKey && dp && dp.getEntry && dp.getEntry(enableKey));

    if (!hasSet && !hasEnable) {
        return { applied: false, status: 'no_setpoint_dp', writes: { setpoint: null, enable: null } };
    }

    /** @type {true|false|null} */
    let wroteSetpoint = null;
    /** @type {true|false|null} */
    let wroteEnable = null;

    // Enable
    if (enableKey) {
        if (!hasEnable) {
            wroteEnable = false;
        } else if (target && target.enable !== undefined && target.enable !== null) {
            wroteEnable = await dp.writeBoolean(enableKey, !!target.enable, false);
        }
    }

    // Numeric setpoint
    if (hasSet) {
        const n = (target && target.setpoint !== undefined && target.setpoint !== null) ? Number(target.setpoint) : null;
        if (n !== null && Number.isFinite(n)) {
            wroteSetpoint = await dp.writeNumber(setKey, n, false);
        }
    }

    const results = [wroteSetpoint, wroteEnable].filter(v => v !== null && v !== undefined);
    const anyFalse = results.some(v => v === false);
    const anyTrue = results.some(v => v === true);
    const applied = !anyFalse;

    let status = 'unchanged';
    if (anyFalse && anyTrue) status = 'applied_partial';
    else if (anyFalse) status = 'write_failed';
    else if (anyTrue) status = 'applied';

    if (adapter && adapter.log && typeof adapter.log.debug === 'function') {
        const k = String(consumer && consumer.key || '');
        adapter.log.debug(`[consumer:setpoint] apply '${k}' enable=${target && target.enable} setpoint=${target && target.setpoint} wroteSetpoint=${wroteSetpoint} wroteEnable=${wroteEnable} status=${status}`);
    }

    return { applied, status, writes: { setpoint: wroteSetpoint, enable: wroteEnable } };
}

module.exports = { applySetpointNumeric };

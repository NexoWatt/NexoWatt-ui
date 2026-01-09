'use strict';

/**
 * SG-Ready consumer actuation (two digital outputs).
 *
 * Consumer:
 * {
 *   type: 'sgready',
 *   key: string,
 *   name: string,
 *   sg1Key?: string,      // DP-registry key (write)
 *   sg2Key?: string,      // DP-registry key (write)
 *   enableKey?: string,   // optional enable DP (write)
 *   invert1?: boolean,
 *   invert2?: boolean
 * }
 *
 * Target:
 * {
 *   state?: 'off'|'on'|'boost'|'normal'|'block'
 * }
 */

/**
 * Default SG-Ready state mapping:
 * - off/normal:  sg1=false, sg2=false
 * - on:          sg1=true,  sg2=false
 * - boost:       sg1=true,  sg2=true
 * - block:       sg1=false, sg2=true
 *
 * Note: Real installations may wire/invert relays differently.
 * Use invert1/invert2 to adapt to active-low relays.
 */

/**
 * @param {{dp:any, adapter:any}} ctx
 * @param {any} consumer
 * @param {{state?:string}} target
 */
async function applySgReady(ctx, consumer, target) {
    const adapter = ctx && ctx.adapter;
    const dp = ctx && ctx.dp;

    const sg1Key = consumer && consumer.sg1Key;
    const sg2Key = consumer && consumer.sg2Key;
    const enableKey = consumer && consumer.enableKey;

    const has1 = !!(sg1Key && dp && dp.getEntry && dp.getEntry(sg1Key));
    const has2 = !!(sg2Key && dp && dp.getEntry && dp.getEntry(sg2Key));
    const hasEn = !!(enableKey && dp && dp.getEntry && dp.getEntry(enableKey));

    if (!has1 && !has2 && !hasEn) {
        return { applied: false, status: 'no_sgready_dp', writes: { sg1: null, sg2: null, enable: null } };
    }

    const raw = String(target && target.state || 'off').trim().toLowerCase();
    const state = (!raw || raw === '0') ? 'off'
        : (raw === 'normal') ? 'off'
        : (raw === 'on' || raw === '1') ? 'on'
        : (raw === 'boost' || raw === '2') ? 'boost'
        : (raw === 'block' || raw === 'blocked' || raw === '3') ? 'block'
        : 'off';

    /** @type {boolean} */
    let sg1 = false;
    /** @type {boolean} */
    let sg2 = false;

    if (state === 'on') { sg1 = true; sg2 = false; }
    else if (state === 'boost') { sg1 = true; sg2 = true; }
    else if (state === 'block') { sg1 = false; sg2 = true; }

    const enable = (state !== 'off' && state !== 'normal' && state !== 'block');

    const inv1 = !!(consumer && consumer.invert1);
    const inv2 = !!(consumer && consumer.invert2);
    if (inv1) sg1 = !sg1;
    if (inv2) sg2 = !sg2;

    /** @type {true|false|null} */
    let wrote1 = null;
    /** @type {true|false|null} */
    let wrote2 = null;

    /** @type {true|false|null} */
    let wroteEn = null;

    if (has1) wrote1 = await dp.writeBoolean(sg1Key, !!sg1, false);
    if (has2) wrote2 = await dp.writeBoolean(sg2Key, !!sg2, false);
    if (enableKey) {
        if (!hasEn) wroteEn = false;
        else wroteEn = await dp.writeBoolean(enableKey, !!enable, false);
    }

    const results = [wrote1, wrote2, wroteEn].filter(v => v !== null && v !== undefined);
    const anyFalse = results.some(v => v === false);
    const anyTrue = results.some(v => v === true);
    const applied = !anyFalse;

    let status = 'unchanged';
    if (anyFalse && anyTrue) status = 'applied_partial';
    else if (anyFalse) status = 'write_failed';
    else if (anyTrue) status = 'applied';

    if (adapter && adapter.log && typeof adapter.log.debug === 'function') {
        const k = String(consumer && consumer.key || '');
        adapter.log.debug(`[consumer:sgready] apply '${k}' state=${state} wrote1=${wrote1} wrote2=${wrote2} wroteEn=${wroteEn} status=${status}`);
    }

    return { applied, status, writes: { sg1: wrote1, sg2: wrote2, enable: wroteEn }, state };
}

module.exports = { applySgReady };

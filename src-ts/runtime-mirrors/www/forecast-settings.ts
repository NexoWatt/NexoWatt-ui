// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/forecast-settings.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * www/forecast-settings.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Änderungen an der Runtime müssen aktuell noch
 * in der JS-Datei erfolgen und danach mit diesem Spiegel synchronisiert werden.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: e3537d28cd607cabdcd573a65e895a9d8546cef10d3e70d8f9a236c2ce9e92b2
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/forecast-settings.ts
 * Quell-Hash: sha256:327063ea282d33c0d870b99722bf5178dc4a6b87fa5d635067607cd521fc7014
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/forecast-settings.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
'use strict';
/**
 * Kundenfreundliche Wetter-/PV-Prognoseeinstellungen.
 *
 * - zeigt den aktuellen Forecast-Status aus forecast.pv.* bzw. dem unmittelbaren
 *   Open-Meteo-Fallback forecast.openMeteoPv.*,
 * - ersetzt das frühere JSON-Eingabefeld durch einen sicheren Tabelleneditor,
 * - hält den bestehenden settings.pvForecastArrays-Vertrag für Backend und
 *   Bestandsanlagen vollständig kompatibel.
 */
(function initForecastSettings() {
    const startedAt = Date.now();
/**
 * Code-Teil: byId
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const byId = (id) => document.getElementById(id);
/**
 * Code-Teil: stateEntry
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const stateEntry = (key) => {
        const state = window.latestState || {};
        const entry = state[key];
        return entry && typeof entry === 'object' ? entry : null;
    };
/**
 * Code-Teil: hasState
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const hasState = (key) => {
        const entry = stateEntry(key);
        return !!entry && Object.prototype.hasOwnProperty.call(entry, 'value');
    };
/**
 * Code-Teil: stateValue
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const stateValue = (key, fallback = null) => {
        const entry = stateEntry(key);
        return entry && Object.prototype.hasOwnProperty.call(entry, 'value') ? entry.value : fallback;
    };
/**
 * Code-Teil: firstStateValue
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const firstStateValue = (keys, fallback = null) => {
        for (const key of keys)
            if (hasState(key))
                return stateValue(key, fallback);
        return fallback;
    };
/**
 * Code-Teil: asBoolean
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const asBoolean = (value, fallback = false) => {
        if (typeof value === 'boolean')
            return value;
        if (typeof value === 'number')
            return value !== 0;
        const normalized = String(value ?? '').trim().toLowerCase();
        if (['true', '1', 'on', 'yes', 'ja', 'an', 'active', 'enabled'].includes(normalized))
            return true;
        if (['false', '0', 'off', 'no', 'nein', 'aus', 'inactive', 'disabled'].includes(normalized))
            return false;
        return fallback;
    };
/**
 * Code-Teil: finite
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const finite = (value, fallback = 0) => {
        const normalized = typeof value === 'string' ? value.trim().replace(',', '.') : value;
        const number = Number(normalized);
        return Number.isFinite(number) ? number : fallback;
    };
/**
 * Code-Teil: clamp
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const clamp = (value, min, max, fallback) => Math.min(max, Math.max(min, finite(value, fallback)));
/**
 * Code-Teil: round
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const round = (value, digits) => Number(value.toFixed(digits));
    const ORIENTATIONS = [
        { value: -180, label: 'Nord' },
        { value: -135, label: 'Nordost' },
        { value: -90, label: 'Ost' },
        { value: -45, label: 'Südost' },
        { value: 0, label: 'Süd' },
        { value: 45, label: 'Südwest' },
        { value: 90, label: 'West' },
        { value: 135, label: 'Nordwest' },
    ];
/**
 * Code-Teil: nearestOrientation
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const nearestOrientation = (value) => {
        const number = clamp(value, -180, 180, 0);
/**
 * Code-Teil: distance
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const distance = (candidate) => Math.abs((((candidate - number) + 540) % 360) - 180);
        return ORIENTATIONS.reduce((best, item) => distance(item.value) < distance(best) ? item.value : best, ORIENTATIONS[0].value);
    };
/**
 * Code-Teil: normalizeRow
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const normalizeRow = (value, index) => ({
        name: String(value?.name ?? `PV-Fläche ${index + 1}`).trim() || `PV-Fläche ${index + 1}`,
        kwp: round(clamp(value?.kwp, 0, 100000, 0), 3),
        tiltDeg: round(clamp(value?.tiltDeg ?? value?.tilt, 0, 90, 30), 1),
        azimuthDeg: nearestOrientation(value?.azimuthDeg ?? value?.azimuth ?? 0),
        lossPercent: round(clamp(value?.lossPercent ?? value?.lossesPercent, 0, 60, 14), 1),
        inverterLimitW: Math.round(clamp(value?.inverterLimitW, 0, 100000000, 0)),
    });
/**
 * Code-Teil: parseRows
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const parseRows = (raw) => {
        let parsed = raw;
        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed || '[]');
            }
            catch {
                return [];
            }
        }
        if (!Array.isArray(parsed))
            return [];
        return parsed
            .filter((item) => !!item && typeof item === 'object')
            .map((item, index) => normalizeRow(item, index))
            .filter((item) => item.kwp > 0 || item.name.trim() !== '');
    };
/**
 * Code-Teil: inputOrState
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const inputOrState = (id, key, fallback) => {
        const input = byId(id);
        if (input && String(input.value ?? '').trim() !== '')
            return input.value;
        return stateValue(`settings.${key}`, fallback);
    };
/**
 * Code-Teil: legacyRow
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const legacyRow = () => normalizeRow({
        name: 'PV-Fläche 1',
        kwp: inputOrState('s_pvForecastInstalledKwp', 'pvForecastInstalledKwp', 0),
        tiltDeg: inputOrState('s_pvForecastTiltDeg', 'pvForecastTiltDeg', 30),
        azimuthDeg: inputOrState('s_pvForecastAzimuthDeg', 'pvForecastAzimuthDeg', 0),
        lossPercent: inputOrState('s_pvForecastLossPercent', 'pvForecastLossPercent', 14),
        inverterLimitW: inputOrState('s_pvForecastInverterLimitW', 'pvForecastInverterLimitW', 0),
    }, 0);
/**
 * Code-Teil: createNumberInput
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const createNumberInput = (field, value, min, max, step, label) => {
        const input = document.createElement('input');
        input.type = 'number';
        input.dataset.field = field;
        input.min = String(min);
        input.max = String(max);
        input.step = step;
        input.value = String(value);
        input.setAttribute('aria-label', label);
        return input;
    };
/**
 * Code-Teil: createCell
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const createCell = (label, control) => {
        const cell = document.createElement('td');
        cell.dataset.label = label;
        cell.appendChild(control);
        return cell;
    };
    let persistTimer = null;
    let lastHydrationFingerprint = '';
    let editorInitialized = false;
/**
 * Code-Teil: collectRows
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const collectRows = () => {
        const body = byId('nwPvArrayRows');
        if (!body)
            return [];
        return Array.from(body.querySelectorAll('tr')).map((row, index) => {
/**
 * Code-Teil: field
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
            const field = (name) => row.querySelector(`[data-field="${name}"]`);
            return normalizeRow({
                name: field('name')?.value,
                kwp: field('kwp')?.value,
                tiltDeg: field('tiltDeg')?.value,
                azimuthDeg: field('azimuthDeg')?.value,
                lossPercent: field('lossPercent')?.value,
                inverterLimitW: finite(field('inverterLimitKw')?.value, 0) * 1000,
            }, index);
        });
    };
/**
 * Code-Teil: updateRemoveButtons
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const updateRemoveButtons = () => {
        const body = byId('nwPvArrayRows');
        if (!body)
            return;
        const buttons = Array.from(body.querySelectorAll('.nw-pv-array-remove'));
        buttons.forEach((button) => { button.disabled = buttons.length <= 1; });
    };
/**
 * Code-Teil: setLegacyField
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const setLegacyField = (id, value) => {
        const input = byId(id);
        if (input)
            input.value = String(value ?? '');
    };
/**
 * Code-Teil: persistRows
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const persistRows = () => {
        persistTimer = null;
        const rows = collectRows();
        const hidden = byId('s_pvForecastArrays');
        if (!hidden)
            return;
        const serialized = JSON.stringify(rows);
        hidden.value = serialized;
        const first = rows[0] || normalizeRow(null, 0);
        setLegacyField('s_pvForecastInstalledKwp', first.kwp);
        setLegacyField('s_pvForecastTiltDeg', first.tiltDeg);
        setLegacyField('s_pvForecastAzimuthDeg', first.azimuthDeg);
        setLegacyField('s_pvForecastLossPercent', first.lossPercent);
        setLegacyField('s_pvForecastInverterLimitW', first.inverterLimitW);
        const validation = byId('nwPvArrayValidation');
        const configured = rows.filter((item) => item.kwp > 0).length;
        if (validation) {
            validation.textContent = configured > 0 ? '' : 'Bitte mindestens bei einer PV-Fläche eine installierte Leistung größer 0 kWp eintragen.';
            validation.classList.toggle('hidden', configured > 0);
        }
        hidden.dispatchEvent(new Event('change', { bubbles: true }));
        lastHydrationFingerprint = `arrays:${serialized}`;
    };
/**
 * Code-Teil: markRefreshPending
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const markRefreshPending = () => {
        const status = byId('nwForecastStatus');
        const updated = byId('nwForecastUpdated');
        if (status) {
            status.textContent = 'Einstellungen werden übernommen …';
            status.dataset.state = 'off';
        }
        if (updated)
            updated.textContent = 'Neue Prognose wird abgefragt …';
    };
/**
 * Code-Teil: queuePersist
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const queuePersist = () => {
        markRefreshPending();
        if (persistTimer !== null)
            window.clearTimeout(persistTimer);
        persistTimer = window.setTimeout(persistRows, 350);
    };
/**
 * Code-Teil: renderRows
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const renderRows = (rows) => {
        const body = byId('nwPvArrayRows');
        if (!body)
            return;
        const values = rows.length ? rows : [normalizeRow(null, 0)];
        body.replaceChildren();
        values.forEach((value, index) => {
            const row = document.createElement('tr');
            row.dataset.index = String(index);
            const name = document.createElement('input');
            name.type = 'text';
            name.dataset.field = 'name';
            name.maxLength = 80;
            name.value = value.name;
            name.setAttribute('aria-label', `Bezeichnung PV-Fläche ${index + 1}`);
            row.appendChild(createCell('Bezeichnung', name));
            row.appendChild(createCell('Leistung (kWp)', createNumberInput('kwp', value.kwp, 0, 100000, '0.01', `Leistung PV-Fläche ${index + 1} in kWp`)));
            row.appendChild(createCell('Neigung (°)', createNumberInput('tiltDeg', value.tiltDeg, 0, 90, '1', `Dachneigung PV-Fläche ${index + 1}`)));
            const orientation = document.createElement('select');
            orientation.dataset.field = 'azimuthDeg';
            orientation.setAttribute('aria-label', `Ausrichtung PV-Fläche ${index + 1}`);
            ORIENTATIONS.forEach((item) => {
                const option = document.createElement('option');
                option.value = String(item.value);
                option.textContent = item.label;
                orientation.appendChild(option);
            });
            orientation.value = String(nearestOrientation(value.azimuthDeg));
            row.appendChild(createCell('Ausrichtung', orientation));
            row.appendChild(createCell('Verluste (%)', createNumberInput('lossPercent', value.lossPercent, 0, 60, '0.1', `Anlagenverluste PV-Fläche ${index + 1}`)));
            row.appendChild(createCell('WR-Grenze (kW)', createNumberInput('inverterLimitKw', round(value.inverterLimitW / 1000, 3), 0, 100000, '0.1', `Wechselrichtergrenze PV-Fläche ${index + 1} in kW`)));
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'nw-pv-array-remove';
            remove.textContent = '×';
            remove.title = 'PV-Fläche entfernen';
            remove.setAttribute('aria-label', `PV-Fläche ${index + 1} entfernen`);
            remove.addEventListener('click', () => {
                const current = collectRows();
                if (current.length <= 1)
                    return;
                current.splice(index, 1);
                renderRows(current.map((item, rowIndex) => ({ ...item, name: item.name || `PV-Fläche ${rowIndex + 1}` })));
                persistRows();
            });
            row.appendChild(createCell('Aktion', remove));
            row.querySelectorAll('input,select').forEach((control) => {
                control.addEventListener(control instanceof HTMLSelectElement ? 'change' : 'input', queuePersist);
                if (!(control instanceof HTMLSelectElement))
                    control.addEventListener('change', queuePersist);
            });
            body.appendChild(row);
        });
        updateRemoveButtons();
        editorInitialized = true;
    };
/**
 * Code-Teil: sourceRows
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const sourceRows = () => {
        const hidden = byId('s_pvForecastArrays');
        const hiddenRaw = String(hidden?.value || '').trim();
        const stateRaw = String(stateValue('settings.pvForecastArrays', '') || '').trim();
        const raw = hiddenRaw && hiddenRaw !== '[]' ? hiddenRaw : stateRaw;
        const rows = parseRows(raw);
        if (rows.length)
            return { rows, fingerprint: `arrays:${JSON.stringify(rows)}` };
        const legacy = legacyRow();
        return { rows: [legacy], fingerprint: `legacy:${JSON.stringify(legacy)}` };
    };
/**
 * Code-Teil: hydrateEditor
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const hydrateEditor = (force = false) => {
        const editor = byId('nwPvArrayRows');
        if (!editor)
            return;
        if (!force && editor.contains(document.activeElement))
            return;
        const next = sourceRows();
        if (!force && editorInitialized && next.fingerprint === lastHydrationFingerprint)
            return;
        renderRows(next.rows);
        lastHydrationFingerprint = next.fingerprint;
    };
/**
 * Code-Teil: setupArrayEditor
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const setupArrayEditor = () => {
        const add = byId('nwPvArrayAdd');
        if (add && add.dataset.bound !== '1') {
            add.dataset.bound = '1';
            add.addEventListener('click', () => {
                const rows = collectRows();
                rows.push(normalizeRow({ name: `PV-Fläche ${rows.length + 1}`, kwp: 0, tiltDeg: 30, azimuthDeg: 0, lossPercent: 14, inverterLimitW: 0 }, rows.length));
                renderRows(rows);
                persistRows();
                const body = byId('nwPvArrayRows');
                body?.querySelector('tr:last-child [data-field="name"]')?.focus();
            });
        }
        hydrateEditor(true);
    };
/**
 * Code-Teil: formatEnergyKwh
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const formatEnergyKwh = (value) => {
        const kwh = Number(value);
        if (!Number.isFinite(kwh))
            return '—';
        const decimals = Math.abs(kwh) >= 100 ? 0 : Math.abs(kwh) >= 10 ? 1 : 2;
        return `${kwh.toFixed(decimals)} kWh`;
    };
/**
 * Code-Teil: formatAge
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const formatAge = (ageValue, updatedAtValue) => {
        let ageMs = Number(ageValue);
        const updatedAt = Number(updatedAtValue);
        if (!Number.isFinite(ageMs) && Number.isFinite(updatedAt) && updatedAt > 0)
            ageMs = Math.max(0, Date.now() - updatedAt);
        if (!Number.isFinite(ageMs))
            return '—';
        const minutes = Math.max(0, Math.round(ageMs / 60000));
        if (minutes < 1)
            return 'gerade eben';
        if (minutes < 60)
            return `vor ${minutes} min`;
        const hours = Math.round(minutes / 6) / 10;
        return `vor ${String(hours).replace('.', ',')} h`;
    };
/**
 * Code-Teil: sourceLabel
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const sourceLabel = (value) => {
        const source = String(value || '').trim().toLowerCase();
        if (source.includes('open-meteo'))
            return 'Open-Meteo';
        if (source.includes('appcenter') || source.includes('datapoint') || source.includes('mapping'))
            return 'AppCenter-Datenpunkte';
        if (source === 'disabled')
            return 'Deaktiviert';
        if (!source || source === 'none')
            return 'Nicht verfügbar';
        return String(value);
    };
/**
 * Code-Teil: friendlyMessage
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const friendlyMessage = (value) => {
        const raw = String(value || '').trim();
        const message = raw.toLowerCase();
        if (!raw)
            return '';
        if (message.includes('anlagenstandort nicht konfiguriert') || message.includes('location-not-configured')) {
            return 'Kein Anlagenstandort gefunden. Bitte im EOS-Admin einen Ort, eine Postleitzahl oder Koordinaten für den Systemstandort hinterlegen.';
        }
        if (message.includes('keine pv-fläche') || message.includes('pv-arrays-not-configured')) {
            return 'Es ist noch keine PV-Fläche mit einer installierten Leistung größer 0 kWp eingetragen.';
        }
        if (message.includes('api-key') || message.includes('apikey')) {
            return 'Für die gewerbliche Open-Meteo-Nutzung fehlt der API-Schlüssel.';
        }
        if (message.includes('http 401') || message.includes('http 403'))
            return 'Open-Meteo hat den Zugriff abgelehnt. Bitte API-Schlüssel und Nutzungsart prüfen.';
        if (message.includes('http 429'))
            return 'Open-Meteo hat zu viele Anfragen gemeldet. NexoWatt versucht es beim nächsten Aktualisierungszyklus erneut.';
        if (message.includes('timeout'))
            return 'Open-Meteo antwortet derzeit nicht rechtzeitig. NexoWatt versucht es automatisch erneut.';
        if (message.includes('keine zukünftigen einstrahlungswerte'))
            return 'Open-Meteo hat keine nutzbaren zukünftigen Einstrahlungswerte geliefert.';
        if (message.includes('nicht verfügbar und kein appcenter') || message.includes('kein pv forecast gemappt'))
            return 'Open-Meteo liefert aktuell keine Prognose und im AppCenter ist keine Ersatzquelle zugeordnet.';
        if (message.includes('deaktiviert'))
            return 'Die PV-Prognose ist deaktiviert.';
        return raw;
    };
/**
 * Code-Teil: updateVisibility
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const updateVisibility = () => {
        const source = String(byId('s_forecastSourceMode')?.value || stateValue('settings.forecastSourceMode', 'auto') || 'auto');
        const enabledInput = byId('s_openMeteoPvEnabled');
        const enabled = enabledInput ? enabledInput.checked : asBoolean(stateValue('settings.openMeteoPvEnabled', false), false);
        const fields = byId('nwOpenMeteoPvFields');
        if (fields)
            fields.classList.toggle('hidden', !enabled || !['auto', 'open-meteo'].includes(source));
        const fallback = byId('s_forecastFallbackToDatapoints')?.closest('.row');
        if (fallback)
            fallback.classList.toggle('hidden', source !== 'auto');
    };
/**
 * Code-Teil: updateStatus
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const updateStatus = () => {
        const effectiveValid = asBoolean(stateValue('forecast.pv.valid', false), false);
        const openValid = asBoolean(stateValue('forecast.openMeteoPv.valid', false), false);
        const useOpenSnapshot = !effectiveValid && openValid;
        const valid = effectiveValid || openValid;
        const hasForecastStates = hasState('forecast.pv.valid') || hasState('forecast.openMeteoPv.valid');
        const source = useOpenSnapshot
            ? stateValue('forecast.openMeteoPv.source', 'open-meteo-gti')
            : firstStateValue(['forecast.pv.source', 'forecast.openMeteoPv.source'], 'none');
        const ageMs = useOpenSnapshot
            ? stateValue('forecast.openMeteoPv.ageMs', Number.NaN)
            : firstStateValue(['forecast.pv.ageMs', 'forecast.openMeteoPv.ageMs'], Number.NaN);
        const updatedAt = stateValue('forecast.openMeteoPv.updatedAt', Number.NaN);
        const openStatusText = firstStateValue(['forecast.openMeteoPv.error', 'forecast.openMeteoPv.statusText'], '');
        const statusText = useOpenSnapshot
            ? firstStateValue(['forecast.openMeteoPv.statusText', 'forecast.openMeteoPv.error'], '')
            : (!valid && String(openStatusText || '').trim()
                ? openStatusText
                : firstStateValue(['forecast.pv.statusText', 'forecast.openMeteoPv.statusText', 'forecast.openMeteoPv.error'], ''));
        const mode = String(stateValue('settings.forecastSourceMode', byId('s_forecastSourceMode')?.value || 'auto') || 'auto').toLowerCase();
        const status = byId('nwForecastStatus');
        const sourceNode = byId('nwForecastSource');
        const updated = byId('nwForecastUpdated');
        const error = byId('nwForecastError');
        if (status) {
            let label = 'Keine aktuelle Prognose';
            let state = 'warning';
            if (valid) {
                label = 'Prognose aktiv';
                state = 'ok';
            }
            else if (mode === 'disabled') {
                label = 'Deaktiviert';
                state = 'off';
            }
            else if (!hasForecastStates && Date.now() - startedAt < 12000) {
                label = 'Adapterdaten werden verbunden …';
                state = 'off';
            }
            else if (!hasForecastStates) {
                label = 'Keine Prognosedaten empfangen';
                state = 'warning';
            }
            status.textContent = label;
            status.dataset.state = state;
        }
        if (sourceNode)
            sourceNode.textContent = sourceLabel(source);
        if (updated)
            updated.textContent = formatAge(ageMs, updatedAt);
        const prefix = useOpenSnapshot ? 'forecast.openMeteoPv.' : 'forecast.pv.';
/**
 * Code-Teil: energyValue
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
        const energyValue = (suffix) => {
            const preferred = stateValue(`${prefix}${suffix}`, undefined);
            if (preferred !== undefined)
                return preferred;
            return firstStateValue([`forecast.pv.${suffix}`, `forecast.openMeteoPv.${suffix}`], Number.NaN);
        };
        const e6 = byId('nwForecast6h');
        if (e6)
            e6.textContent = valid ? formatEnergyKwh(energyValue('kwhNext6h')) : '—';
        const e12 = byId('nwForecast12h');
        if (e12)
            e12.textContent = valid ? formatEnergyKwh(energyValue('kwhNext12h')) : '—';
        const e24 = byId('nwForecast24h');
        if (e24)
            e24.textContent = valid ? formatEnergyKwh(energyValue('kwhNext24h')) : '—';
        const points = byId('nwForecastPoints');
        if (points) {
            const value = Number(energyValue('points'));
            points.textContent = Number.isFinite(value) && value > 0 ? String(Math.round(value)) : '—';
        }
        const location = byId('nwForecastLocation');
        if (location) {
            const label = String(firstStateValue(['forecast.openMeteoPv.locationText'], '') || '').trim();
            const lat = Number(stateValue('forecast.openMeteoPv.latitude', Number.NaN));
            const lon = Number(stateValue('forecast.openMeteoPv.longitude', Number.NaN));
            location.textContent = label || (Number.isFinite(lat) && Number.isFinite(lon) ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : '—');
        }
        const message = friendlyMessage(statusText);
        if (error) {
            error.textContent = valid || mode === 'disabled' ? '' : message;
            error.classList.toggle('hidden', valid || mode === 'disabled' || !message);
        }
        hydrateEditor(false);
    };
/**
 * Code-Teil: setup
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const setup = () => {
        const source = byId('s_forecastSourceMode');
        const enabled = byId('s_openMeteoPvEnabled');
        if (source && source.dataset.nwForecastBound !== '1') {
            source.dataset.nwForecastBound = '1';
            source.addEventListener('change', () => { updateVisibility(); updateStatus(); });
        }
        if (enabled && enabled.dataset.nwForecastBound !== '1') {
            enabled.dataset.nwForecastBound = '1';
            enabled.addEventListener('change', () => { updateVisibility(); updateStatus(); });
        }
        setupArrayEditor();
        updateVisibility();
        updateStatus();
        window.setInterval(updateStatus, 3000);
    };
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', setup, { once: true });
    else
        setup();
})();

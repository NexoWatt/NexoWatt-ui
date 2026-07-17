// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-loadmanagement-grid-cap-sanity.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-loadmanagement-grid-cap-sanity.js
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
 * Original-Hash: 2f3e97e9d7c411eecd8e0ca82c1a6ebfc0271e2bd264d546db457c0d2cb9dcd1
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

'use strict';
/** Regressionstest 0.8.61: EVCS Cap (Netz) darf nie über Netzlimit steigen. */
const fs = require('fs');
/**
 * Code-Teil: read
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function read(p) { return fs.readFileSync(p, 'utf8'); }
/**
 * Code-Teil: must
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function must(file, needle, label) {
  const s = read(file);
  if (!s.includes(needle)) {
    console.error(`[grid-cap-sanity] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
}
/**
 * Code-Teil: mustNot
 *
 * Zweck:
 * Automatisch markierter Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
function mustNot(file, needle, label) {
  const s = read(file);
  if (s.includes(needle)) {
    console.error(`[grid-cap-sanity] VERBOTEN ${label}: ${needle}`);
    process.exit(1);
  }
}
const cm = 'src-ts/runtime-executables/ems/modules/charging-management.ts';
const core = 'src-ts/runtime-executables/ems/modules/core-limits.ts';
must(cm, 'gridBaseLoadRawW = gridW - gridEvcsActualForCapW;', 'raw base load');
must(cm, 'derived.core.building.loadRestW', 'energy-flow loadRestW preference');
must(cm, 'gridBaseLoadW = Number.isFinite(Number(derivedBaseLoadW))', 'derived base load preference');
must(cm, 'gridLocalSupportW = Math.max(0, gridBaseLoadW - Math.max(0, gridBaseLoadRawW));', 'local support diagnosis');
must(cm, 'gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, gridImportLimitEffW);', 'EVCS Netz-Cap clamp <= Anschlusslimit');
must(cm, "chargingManagement.control.gridBaseLoadRawW", 'raw state');
must(cm, "chargingManagement.control.gridLocalSupportW", 'support state');
must(core, 'const gridHeadroomRawW = gridMeasurementUsable', 'NVP-frischegeführtes zentrales Headroom-Gate');
must(core, 'gridLimitW > 0 ? Math.max(0, gridLimitW - gridImportW + flexUsedW) : Number.POSITIVE_INFINITY', 'raw central headroom');
must(core, 'const gridHeadroomW = gridMeasurementUsable', 'NVP-frischegeführtes zentrales Cap');
must(core, 'gridLimitW > 0 ? Math.min(gridLimitW, gridHeadroomRawW) : Number.POSITIVE_INFINITY', 'central grid headroom clamp');
must(core, 'headroomRawW', 'central raw diagnostic');
mustNot(cm, 'gridCapEvcsW = clamp(gridImportLimitEffW - gridBaseLoadW, 0, 1e12);', 'alte überhöhte EVCS-Cap Formel');
mustNot(core, 'const gridHeadroomW = gridLimitW > 0 ? Math.max(0, gridLimitW - gridImportW + flexUsedW) : Number.POSITIVE_INFINITY;', 'alte zentrale Headroom-Formel');
const gridImportLimitEffW = 40000;
const gridW = 34;
const totalPowerW = 10970;
const raw = gridW - totalPowerW;
const derivedLoadRestW = 9000;
const base = Number.isFinite(derivedLoadRestW) ? Math.max(0, derivedLoadRestW) : Math.max(0, raw);
const cap = Math.max(0, Math.min(gridImportLimitEffW - base, gridImportLimitEffW));
if (raw !== -10936 || base !== 9000 || cap !== 31000) {
  console.error('[grid-cap-sanity] Formeltest fehlgeschlagen', { raw, base, cap });
  process.exit(1);
}
console.log('[grid-cap-sanity] OK: EVCS Cap (Netz) nutzt Gebäudelast und bleibt <= Netzlimit.');

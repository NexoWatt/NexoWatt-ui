// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-discharge-demand-cap.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-discharge-demand-cap.js
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
 * Original-Hash: a2ba2b37e99c9101ae38b26f932c3e93c73fde09809559359696e4c1ce3c3e61
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
/**
 * Regressionstest 0.8.79: Die Speicher-NVP-Regelung darf den letzten Sollwert
 * nicht mehr als echte Entladeleistung zurückkoppeln. Dieser Fehler hat im Feld
 * aus ca. 2,6 kW Netzbezug eine viel zu hohe Entladevorgabe erzeugt.
 */
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
function read(file) {
  return fs.readFileSync(file, 'utf8');
}

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
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[storage-discharge-demand-cap] FEHLT ${label}: ${needle}`);
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
  const text = read(file);
  if (text.includes(needle)) {
    console.error(`[storage-discharge-demand-cap] VERBOTEN ${label}: ${needle}`);
    process.exit(1);
  }
}

for (const file of [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-mirrors/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
]) {
  must(file, 'WICHTIGER Feldfix 0.8.79: Der letzte Sollwert darf hier NICHT', 'Kommentar gegen Sollwert-Rückkopplung');
  must(file, 'const loadEstimate = getFeneconAcLoadTargetW();', 'Lastschätzung im Demand-Cap');
  must(file, 'const demandBaseW = Math.max(importRawNowW + measuredDischargeNowW, loadEstimateW);', 'Demand-Basis ohne letzten Sollwert');
  must(file, 'dischargeDemandHardCapReason = `Tarif-NVP-Demand-Cap', 'Tarif-NVP-Cap nach Rampe verfügbar');
  must(file, 'dischargeDemandHardCapReason = `Eigenverbrauch-NVP-Demand-Cap', 'Eigenverbrauch-NVP-Cap nach Rampe verfügbar');
  mustNot(file, 'commandedDischargeNowW', 'alter Sollwert darf nicht mehr Demand-Basis sein');
}

for (const file of [
  'src-ts/runtime-executables/main.ts',
  'src-ts/runtime-mirrors/main.ts',
  'main.js',
]) {
  must(file, 'Feldschutz 0.8.79: Ist-Leistungs-DPs der Speicherfarm dürfen niemals', 'Farm-Istwertschutz');
  must(file, 'const looksLikeSetpointPowerId = (id) => {', 'Setpoint-Erkennung bleibt JS-kompatibel');
  must(file, 'status.powerFeedbackIgnoredReason = ignoredPowerFeedback.join', 'Diagnose ignorierter Istwerte');
  mustNot(file, 'id: unknown', 'Runtime-TS darf keine TypeScript-Annotation in JS spiegeln');
}

console.log('[storage-discharge-demand-cap] OK: NVP-Entladevorgabe ist gegen Sollwert-Rückkopplung abgesichert.');

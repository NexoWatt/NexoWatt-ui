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
 * Original-Hash: 97db586e88a4792ab9fd3c879543d4577bd7ced0c3a3ab1400db6a59f37f463f
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
 * Regressionstest 0.8.81: Entladen darf nicht ueber alte Sollwerte oder abgeleitete
 * Gebaeudelasten hochintegrieren. Feldfall: ca. 2,6 kW Netzbezug duerfen keine
 * 71-kW-Entladevorgabe erzeugen.
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
  must(file, 'WICHTIGER Feldfix 0.8.81: Abgeleitete Gebäudelasten', 'Tarif-Kommentar gegen Gebaeudelast-Cap');
  must(file, 'WICHTIGER Feldfix 0.8.81: Der letzte eigene Sollwert und derived.loadTotalW', 'Eigenverbrauch-Kommentar gegen Sollwert-/Gebaeudelast-Cap');
  must(file, 'const battWRaw = (battPowerTrusted && typeof battPowerW ===', 'Balancing nutzt nur vertrauenswuerdige Batterie-Istleistung');
    must(file, 'const measuredDemandCapW = Math.max(0, protectedTariffImportW + measuredDischargeNowW + protectedTariffMarginW);', 'Demand-Cap aus NVP plus echter Batterie-Istleistung und EVCS-Schutz');
  must(file, "'Tarif-NVP-Demand-Cap (konservativ ohne Batterie-Istleistung)'", 'Tarif-NVP-Cap Diagnose ohne Feedback');
  must(file, "'Eigenverbrauch-NVP-Demand-Cap (konservativ ohne Batterie-Istleistung)'", 'Eigenverbrauch-NVP-Cap Diagnose ohne Feedback');
  must(file, 'Feldschutz 0.8.81: Lastspitzenkappung darf nicht über den sichtbaren', 'LSK gegen Integrator-Hochlauf abgesichert');
  must(file, 'const lskOverLimitW = Math.max(0, importNowW - limitW);', 'LSK-Cap auf echte Peak-Ueberschreitung');
  must(file, 'const lskDemandCapW = Math.max(0, lskOverLimitW + lskMeasuredDischargeW + lskSafetyMarginW);', 'LSK-Cap ohne alten Sollwert');
  must(file, "source === 'lastspitze'", 'Demand-Cap greift auch nach Rampe bei LSK');
  mustNot(file, 'feedbacklessHoldCapW', 'feedbackloser Deadband-Hold darf den Demand-Cap nicht erweitern');
  mustNot(file, 'feedbacklessHoldPlausible', 'alte Sollwerte duerfen ohne Batterie-Istleistung nicht gehalten werden');
  mustNot(file, 'commandedDischargeNowW', 'alter Sollwert darf nicht Demand-Basis sein');
  mustNot(file, 'const demandBaseW = Math.max(importRawNowW + measuredDischargeNowW, loadEstimateW);', 'abgeleitete Gebaeudelast darf Demand-Cap nicht vergroessern');
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

console.log('[storage-discharge-demand-cap] OK: NVP-Entladevorgabe ist gegen Sollwert-/Last-Rueckkopplung abgesichert.');

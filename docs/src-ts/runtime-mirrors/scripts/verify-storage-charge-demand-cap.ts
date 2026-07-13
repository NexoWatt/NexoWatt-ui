// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-charge-demand-cap.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-charge-demand-cap.js
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
 * Original-Hash: f9fc9f936ba61aef9e7817fc8f1ed1aa234687fc923ca2f0ce5c856a6f776733
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
 * Regressionstest 0.8.81: Speicher-Ladevorgaben duerfen nicht durch alte negative
 * Sollwerte weiterlaufen. PV-Laden wird hart durch RAW-Export begrenzt.
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
    console.error(`[storage-charge-demand-cap] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
}

for (const file of [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-mirrors/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
]) {
  must(file, 'let chargeDemandHardCapW = null;', 'Lade-Cap Laufzeitvariable');
  must(file, '0 W heißt dabei bewusst: diese Richtung jetzt stoppen.', '0-W-Stop-Kommentar');
  must(file, "'Tarif-Netzlade-Headroom-Cap'", 'Tarif-Netzlade-Cap');
  must(file, 'const exportCtrlCapW = Math.max(0, currentChargeForBalancingW + exportCtrlW + extraBias);', 'PV-Cap nutzt laufende Ladung plus geglaetteten Exportwunsch');
  must(file, 'const exportRawCapW = exportRawW > 0 ? Math.max(0, currentChargeForBalancingW + exportRawW + extraBias) : currentChargeForBalancingW;', 'PV-Cap RAW-Export nutzt laufende Ladung plus aktuellen NVP-Export');
  must(file, 'const pvRawChargeCapW = clamp(Math.min(exportCtrlCapW, exportRawCapW), 0, chargeLimitW);', 'PV-Wunsch wird durch RAW hart begrenzt');
  must(file, 'targetW = -pvRawChargeCapW;', 'PV-Zielwert nutzt harten RAW-Cap');
  must(file, "chargeDemandHardCapReason = zeEnabled ? 'Nulleinspeisung-NVP-Lade-Cap (aktuelle Ladung+Export)' : 'PV-NVP-Lade-Cap (aktuelle Ladung+Export)';", 'PV-NVP-Cap Diagnose mit laufender Ladung');
  must(file, "chargeDemandHardCapReason = 'Notstrom-Reserve-Lade-Cap';", 'Reserve-Lade-Cap');
  must(file, "chargeDemandHardCapReason = 'LSK-Refill-Lade-Cap';", 'LSK-Refill-Lade-Cap');
  must(file, 'if (_prevRampW < 0 && targetW >= _prevRampW) {', 'Laderuecknahme ohne Rampe');
  must(file, 'if (_reqW >= 0) {', 'keine aktuelle Ladeanforderung stoppt Restladung');
  must(file, 'Lade-Cap ${Math.round(capW)} W nach Rampe', 'harter Lade-Cap nach Rampe');
  must(file, 'speicher.regelung.chargeDemandCapW', 'Lade-Cap Diagnose-State');
  must(file, 'speicher.regelung.chargeDemandCapReason', 'Lade-Cap Diagnose-Grund');
}

console.log('[storage-charge-demand-cap] OK: Speicher-Ladevorgabe ist gegen alten Rampen-/Sollwert-Nachlauf abgesichert.');

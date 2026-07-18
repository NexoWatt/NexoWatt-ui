// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: scripts/verify-storage-control-app-separation.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die produktive Quelle bleibt vorerst:
 * scripts/verify-storage-control-app-separation.js
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
 * Original-Hash: 4122b5bd765529b3635c9289f80af7f55019988a9944a1fd993b65d735eef59c
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
 * Regressionstest 0.8.81: Speicherregelung, MultiUse und Speicherfarm bleiben sauber getrennt.
 * - Speicherregelung aktiv => reine Eigenverbrauchsoptimierung.
 * - MultiUse aktiv => fuehrt SoC-Zonen, Reserve, LSK/Peak-Shaving und Komfortkopplungen.
 * - Speicherfarm aktiv => startet die Basis-Eigenverbrauchsoptimierung und verteilt den fertigen Sollwert.
 * - 0-W-Limits in der Farm bleiben bewusste Richtungssperren; leer bleibt unbegrenzt.
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
    console.error(`[storage-control-app-separation] FEHLT ${label}: ${needle}`);
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
    console.error(`[storage-control-app-separation] VERBOTEN ${label}: ${needle}`);
    process.exit(1);
  }
}

for (const file of [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-mirrors/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
]) {
  must(file, 'const enabled = cfgEnabled || autoTarifEnabled || multiUseAppPolicyActive || farmAppPolicyActive;', 'Farm startet die Basis-Eigenverbrauchsoptimierung');
  must(file, 'Eine aktiv konfigurierte Speicherfarm startet dieselbe Basisregelung', 'Speicherfarm-Kommentar Rollenverteilung');
  must(file, "await this._setIfChanged('speicher.regelung.aktivAutoMultiUse', multiUseAppPolicyActive);", 'MultiUse Auto-Diagnose');
  must(file, "await this._setIfChanged('speicher.regelung.aktivAutoSpeicherfarm', farmAppPolicyActive);", 'Farm-Autostart Diagnose');
  must(file, 'const storageOnlyPolicyActive = !multiUsePolicyActive;', 'Storage-only Policy-Schicht');
  must(file, 'const multiUseOwnsZones = !!multiUsePolicyActive;', 'SoC-Zonen gehoeren MultiUse');
  must(file, 'const reserveEnabled = multiUseOwnsZones && !!cfg.reserveEnabled;', 'Reserve nur MultiUse');
  must(file, 'const lskEnabledCfg = multiUseOwnsZones && (cfg.lskEnabled !== false);', 'LSK nur MultiUse');
  must(file, 'const evcsStorageAssistPolicyAllowed = !!multiUsePolicyActive;', 'EVCS-Speicherassist nur MultiUse');
  must(file, "await this._setIfChanged('speicher.regelung.policyMode', multiUsePolicyActive ? 'multiuse' : 'eigenverbrauch');", 'Policy-Modus eigenverbrauch/multiuse');
  must(file, 'pureSelfConsumptionWithoutMultiUse: !multiUsePolicyActive', 'Policy-JSON reine Eigenverbrauchsebene');
}

for (const file of [
  'src-ts/runtime-executables/main.ts',
  'src-ts/runtime-mirrors/main.ts',
  'main.js',
]) {
  must(file, 'if (!nativeObj.enableMultiUse || mu.enabled !== true)', 'MultiUse wirkt nur bei aktiver App und Policy');
  must(file, 'st.multiUsePolicyActive = true;', 'aktive MultiUse-Policy wird markiert');
  must(file, 'Reserve/LSK gelten nur, wenn MultiUse aktiv führt', 'Farm-Floor folgt Rollenmodell');
  must(file, 'const reserveEnabled = multiUsePolicyActive && !!storageCfg.reserveEnabled;', 'Farm-Reserve nur MultiUse');
  must(file, 'const lskEnabled = !!(multiUsePolicyActive && storageCfg.lskDischargeEnabled !== false && storageCfg.lskEnabled !== false);', 'Farm-LSK nur MultiUse');
  mustNot(file, 'delete st[k]', 'MultiUse darf Storage-Config nicht loeschen');
}

must('src-ts/runtime-executables/main.ts', 'Eine bewusst eingetragene 0-W-Vorgabe sperrt diese Richtung', '0-W-Limit als Sperre im Farm-Status');
must('src-ts/runtime-executables/main.ts', 'if (!Number.isFinite(n) || n < 0) return null;', '0-W-Limit wird nicht als leer verworfen');
must('src-ts/runtime-executables/main.ts', 'if (Number.isFinite(v) && v >= 0) return Math.round(v);', 'Farm-Verteilung akzeptiert 0 W als echtes Limit');
must('src-ts/runtime-executables/www/ems-apps.ts', 'Leer = unbegrenzt, 0 W = diese Richtung sperren', 'UI-Hinweis fuer 0-W-Sperre');
must('www/ems-apps.js', 'Leer = unbegrenzt, 0 W = diese Richtung sperren', 'Runtime-UI-Hinweis fuer 0-W-Sperre');

console.log('[storage-control-app-separation] OK: Einzel-Speicher, MultiUse, Speicherfarm-Basisregelung und 0-W-Limits sind sauber getrennt.');

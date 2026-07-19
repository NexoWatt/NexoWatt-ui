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
 * Original-Hash: ae3f652d01f392e3d9851234f2826c8659f059ac65c9e58bec6bbca9931d7955
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
 * - Beschreibbare Speicherfarm => wird als exklusive Hardwaretopologie ausgewählt.
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
  must(file, 'const enabled = !!storageAuthorityEarly.writerActive;', 'zentrale Speicher-Steuerhoheit aktiviert genau einen Writer');
  must(file, 'Tarif, MultiUse, Peak-Shaving und Eigenverbrauch sind ausschliesslich', 'Policies aktivieren keinen Hardwarewriter');
  must(file, "const farmEnabledEarly = storageAuthorityEarly.selectedTopology === 'farm';", 'Farm wird exklusiv über die Topologie ausgewählt');
  must(file, "await this._setIfChanged('speicher.regelung.aktivAutoMultiUse', multiUseAppPolicyActive);", 'MultiUse Auto-Diagnose');
  must(file, "await this._setIfChanged('speicher.regelung.aktivAutoSpeicherfarm', farmAppPolicyActive);", 'Farm-Dispatch Diagnose');
  must(file, "await this._setIfChanged('speicher.regelung.topologie', String(storageAuthorityEarly.selectedTopology || 'none'));", 'Topologie-Diagnose');
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
  mustNot(file, 'nativeObj.enableStorageControl = true;', 'MultiUse darf die Speicherregelungs-App nicht heimlich aktivieren');
  must(file, '_nwGetStorageControlAuthority()', 'zentrale Speicher-Steuerhoheit');
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

console.log('[storage-control-app-separation] OK: Policies, Einzel-Speicher, Speicherfarm und 0-W-Limits sind über eine exklusive Steuerhoheit getrennt.');

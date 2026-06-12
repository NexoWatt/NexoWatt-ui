# Regression-Testplan für die TypeScript-Migration

Dieser Plan beschreibt, welche fachlichen Fälle bei jeder späteren TypeScript-Migration
geprüft werden müssen. Die Liste ist bewusst deutsch und fachlich formuliert, damit sie
auch ohne TypeScript-Vorkenntnisse verständlich bleibt.

## Speicher / Batterie

- Split-DPs: `Laden` und `Entladen` separat gemappt.
- Signed-DP: ein Speicherleistungs-DP mit Vorzeichen.
- 0 W ist ein gültiger Wert und darf nicht als fehlend/stale behandelt werden.
- Rechenfallback nur dann, wenn wirklich kein Speicher-DP konfiguriert ist.
- History darf keine rechnerischen Ersatzwerte schreiben, wenn echte DPs vorhanden sind.

## Netz

- Signed Netzanschlusspunkt muss korrekt in Bezug/Einspeisung getrennt werden.
- Separate Import-/Export-DPs bleiben gültig.
- Gleichzeitige falsche Doppelzählung muss verhindert werden.

## Heizstab

- Speicherreserve darf nach Speichern nicht zurückspringen.
- PV-Budget muss dieselbe Speicher-/Netzlogik verwenden wie LIVE und History.
- Netzbezug erlaubt/verboten muss unverändert wirken.

## Feature-Sichtbarkeit

- Keine Wallbox → keine EVCS-Kacheln, keine EVCS-History, kein EVCS-Menü.
- Keine Speicherfarm → keine Farm-Navigation und keine Farm-Ansicht.
- SmartHome nur sichtbar, wenn aktiviert.

## Lizenz

- Maskierte Werte wie `********` dürfen nie als echter Lizenzschlüssel gespeichert werden.
- Lizenzprüfung darf durch Admin-Maskierung nicht kaputtgehen.

## info.connection

- `true`, wenn Webserver/SSE sauber laufen.
- `false` bei Unload, Serverfehler oder Startfehler vor Webserverstart.
- Teilfehler nach Webserverstart dürfen Verbindung nicht fälschlich offline setzen.

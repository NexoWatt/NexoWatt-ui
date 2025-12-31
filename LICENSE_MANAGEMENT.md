# Lizenzierung (NexoWatt VIS / EMS)

Dieses Dokument beschreibt die **technische** Lizenzierung für den Adapter **nexowatt-vis**.

## Ziel

- Der Adapter soll nur auf autorisierter Hardware laufen.
- Ohne gültige Lizenz startet der Adapter im **LOCKED Mode** (keine VIS-/EMS-Funktionen).
- Die Lizenz ist offline verifizierbar (keine Cloud-Abhängigkeit).

## Wo wird die Lizenz hinterlegt?

Es gibt zwei Möglichkeiten:

1. **Lizenzschlüssel** im ioBroker Admin:
   - Adapter → nexowatt-vis → Instanz → **Allgemein** → **Lizenzschlüssel** (`license.key`)
   - Format: Base64-kodiertes JSON (empfohlen) oder JSON direkt.

2. **Lizenzdatei** auf dem System:
   - Pfad: `/opt/nexowatt/license.json` (Default)
   - Konfigurierbar über `license.filePath`.
   - Wird verwendet, wenn `license.key` leer ist.

## Verhalten ohne Lizenz

Wenn `license.required=true` und keine gültige Lizenz vorliegt:

- Webserver startet im **LOCKED Mode** und zeigt eine Aktivierungsseite.
- Alle anderen `/api/...` Endpunkte liefern HTTP **402** (`license_required`).
- EMS/Setpoints/Visualisierung werden **nicht** gestartet.

## Device-ID

Die Lizenz ist an eine **Device-ID** gebunden. Die Device-ID wird wie folgt ermittelt:

1. Linux `machine-id` (`/etc/machine-id` oder `/var/lib/dbus/machine-id`)
2. Fallback: erste nicht-interne MAC-Adresse
3. Fallback: Hostname

Die Device-ID wird im LOCKED Mode auf der Aktivierungsseite angezeigt und als State `nexowatt-vis.X.license.deviceId` veröffentlicht.

## Schlüsselpaare (Ed25519)

Für die Signatur wird Ed25519 verwendet.

Empfehlung:
- **Private Key** bleibt ausschließlich in eurer Fertigung/Backend (niemals auf Kundenhardware ausliefern).
- **Public Key** ist im Adapter eingebettet und dient zur Verifikation.

Beispiel (OpenSSL):

```bash
openssl genpkey -algorithm ed25519 -out nexowatt_license_private.pem
openssl pkey -in nexowatt_license_private.pem -pubout -out nexowatt_license_public.pem
```

## Lizenz generieren

Im Repository liegt ein Generator:

```bash
node tools/generate-license.js \
  --privateKey ./keys/nexowatt_license_private.pem \
  --deviceId "machine-id:..." \
  --serial "NW-0001" \
  --issuedTo "Kunde / Projekt" \
  --out ./license.json \
  --base64
```

Den Base64-Block könnt ihr dann in `license.key` einfügen oder als Datei ablegen.

## Entwickler-Bypass

Für Entwicklungs-/Testsysteme kann der Lizenzzwang via Umgebungsvariable deaktiviert werden:

```bash
export NEXOWATT_DEV_LICENSE_BYPASS=1
```

Hinweis: Diese Option ist **nicht** für den Produktivbetrieb gedacht.

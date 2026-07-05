# NexoWatt UI 0.8.48 – EOS Access Control / Rollen & Rechte

## Zweck

Version 0.8.48 führt ein zentrales Rollen- und Rechtekonzept für den NexoWatt UI Adapter ein. Die Rechte hängen an EOS/ioBroker Benutzern und Gruppen. Der Adapter nutzt keine isolierte zweite Benutzerwelt, sondern leitet daraus NexoWatt-Rollen ab.

## Direkt anzulegende EOS/ioBroker Gruppen

Bitte im EOS Admin beziehungsweise in der ioBroker-Benutzerverwaltung diese Gruppen anlegen:

| Gruppe | Rolle im NexoWatt UI Adapter | Zweck |
|---|---|---|
| `system.group.eosAdmin` | `admin` | Vollzugriff inklusive Lizenzverwaltung |
| `system.group.eosInstaller` | `installer` | App-Center, Zuordnung, Simulation, Ladepunkte, Mesh/Microgrid, Export Guard – ohne Lizenzverwaltung |
| `system.group.eosUser` | `customer` | Endkunde: SmartHome, NexoLogik, Kundeneinstellungen |

Zusätzlich werden folgende Alias-Gruppen unterstützt:

| Alias-Gruppe | Rolle |
|---|---|
| `system.group.nexowattAdmin` | `admin` |
| `system.group.nexowattInstaller` | `installer` |
| `system.group.nexowattUser` | `customer` |

Die bestehende ioBroker-Gruppe `system.group.administrator` bleibt immer Admin-Fallback.

## Benutzerzuordnung

Empfohlene Benutzer:

```text
admin      → system.group.administrator oder system.group.eosAdmin
installer  → system.group.eosInstaller
kunde      → system.group.eosUser
```

## Berechtigungen

### Admin

Darf alles, inklusive:

```text
Lizenzverwaltung
App-Center
Simulation
Zuordnung
Ladepunkte
Mesh/Microgrid
Export Guard
SmartHome
NexoLogik
Benutzer-/Rechteverwaltung
```

### Installer

Darf technische Konfigurationen, aber keine Lizenz:

```text
App-Center
Simulation
Zuordnung / Datenpunkt-Mapping
Ladepunkte / DC Station Display
Mesh/Microgrid
Export Guard
Speicherfarm
SmartHome-/NexoLogik-Vorbereitung
Diagnose
```

Nicht erlaubt:

```text
Lizenzschlüssel sehen oder speichern
Lizenzverwaltung öffnen
Benutzer-/Rechtesystem ändern
```

### Benutzer / Endkunde

Darf kundennahe Funktionen:

```text
normales Frontend
SmartHome-Kundenkonfiguration
NexoLogik-Kundenregeln mit freigegebenen Geräten
Energie-Wertkonto Kundeneinstellungen
```

Nicht erlaubt:

```text
App-Center
Simulation
Lizenzverwaltung
Datenpunkt-Mapping
Export Guard
Mesh/Microgrid-Konfiguration
Ladepunkt-Technik
```

## Neue API

```text
GET /api/session/me
```

Antwortbeispiel:

```json
{
  "ok": true,
  "user": "installer",
  "role": "installer",
  "roles": ["installer"],
  "groups": ["system.group.eosInstaller"],
  "capabilities": ["appcenter.open", "mapping.edit"],
  "isAdmin": false,
  "isInstaller": true,
  "isCustomer": false
}
```

## Sicherheit

Die UI blendet gesperrte Bereiche aus. Entscheidend ist aber: Der Adapter prüft Capabilities auch serverseitig.

Geschützt sind unter anderem:

```text
/api/license/save                 admin-only
/api/installer/config             admin + installer
/ems-apps.html                    admin + installer
/simulation.html                  admin + installer
/api/logic/editor                 admin + installer + customer-capability
```

## EOS Admin / SSO Vorbereitung

Für eine spätere direkte EOS-Admin-SSO-Integration sind Header vorbereitet:

```text
x-eos-user
x-eos-groups
x-eos-role
x-eos-access-secret
```

Diese Header werden nur genutzt, wenn `accessControl.trustedHeaderEnabled=true` gesetzt ist. Ohne diese Freigabe nutzt der Adapter die normale EOS/ioBroker Benutzeranmeldung.

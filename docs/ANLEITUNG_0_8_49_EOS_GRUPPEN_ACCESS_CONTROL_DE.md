# NexoWatt UI 0.8.49 – EOS Gruppen / Access-Control Hotfix

## Zweck

Diese Version ergänzt die bestehende EOS-/ioBroker-Gruppenstruktur im Access-Control-System.

Bisher waren die neuen Gruppen `system.group.eosInstaller`, `system.group.nexowattInstaller`, `system.group.eosUser` und `system.group.nexowattUser` vorbereitet. In bestehenden EOS-Systemen werden aber häufig bereits diese Gruppen genutzt:

- `system.group.administrator`
- `system.group.installer`
- `system.group.user`

Diese Gruppen werden jetzt direkt berücksichtigt.

## Gruppen, die im EOS Admin genutzt werden können

| Gruppe | Rolle im NexoWatt UI Adapter | Bedeutung |
|---|---|---|
| `system.group.administrator` | Admin | Vollzugriff inklusive Lizenzverwaltung |
| `system.group.installer` | Installer | Technische Einrichtung ohne Lizenzverwaltung |
| `system.group.user` | Customer / Endkunde | SmartHome, NexoLogik und Kundeneinstellungen |

Zusätzlich bleiben diese Alias-Gruppen unterstützt:

| Gruppe | Rolle |
|---|---|
| `system.group.eosAdmin` | Admin |
| `system.group.nexowattAdmin` | Admin |
| `system.group.eosInstaller` | Installer |
| `system.group.nexowattInstaller` | Installer |
| `system.group.eosUser` | Customer |
| `system.group.nexowattUser` | Customer |

## Wichtig für bestehende Installationen

Auch wenn in einer bestehenden Adapter-Konfiguration noch alte Gruppen gespeichert sind, werden die Pflichtgruppen jetzt zusätzlich gemerged:

- `system.group.installer` wird immer als Installer-Gruppe ergänzt.
- `system.group.user` wird immer als Customer-Gruppe ergänzt.
- `system.group.administrator` bleibt immer Admin-Fallback.

Damit funktionieren normaler Admin und EOS Admin parallel sauber.

## Empfohlene Benutzerzuordnung

| Benutzer | Gruppe |
|---|---|
| `admin` | `system.group.administrator` |
| `Installer` | `system.group.installer` |
| Endkunde / Benutzer | `system.group.user` |

## Verhalten nach Rollen

### Admin

Darf alles, inklusive Lizenzverwaltung.

### Installer

Darf App-Center, Mapping, Simulation, Ladepunkte, Export Guard, Mesh/Microgrid und technische Einrichtung nutzen. Darf keine Lizenz verwalten.

### Customer / Endkunde

Darf SmartHome-Kundenkonfiguration, NexoLogik-Kundenregeln und Kundeneinstellungen nutzen. Kein Zugriff auf App-Center, Simulation, Lizenz, Mapping oder technische Systemfunktionen.

## Test

Nach dem Update prüfen:

1. Mit Admin anmelden: Lizenz und App-Center müssen sichtbar sein.
2. Mit Installer anmelden: App-Center sichtbar, Lizenzverwaltung gesperrt.
3. Mit Benutzer aus `system.group.user` anmelden: App-Center und Simulation gesperrt, Kundenfunktionen erlaubt.


# NexoWatt UI 0.8.41 – Mesh/Microgrid Peer-Handshake & Command Receiver

## Ziel

Diese Version erweitert die EOS-App **Mesh/Microgrid** für den Feldtest mit zwei oder mehr NexoWatt-Instanzen über ein separates Tailscale-Mesh.

Wichtig: Die Fernwartung bleibt getrennt. Das Mesh/Microgrid nutzt ein eigenes Tailscale-Profil beziehungsweise ein eigenes Tailnet/Interface.

```text
Tailscale 1 = Fernwartung / Support
Tailscale 2 = Mesh/Microgrid Instanz-zu-Instanz
```

## Neue APIs

```text
GET  /api/mesh/handshake
GET  /api/mesh/status
POST /api/mesh/command/receive
```

Der Handshake liefert Node-ID, Cluster-ID, Tailscale-Profil, Receiver-Status und die verfügbaren Endpunkte.

Der Command Receiver nimmt neutrale NexoWatt-Command-Intents an, prüft diese und schreibt sie nur in einen lokalen JSON-Command-State.

## Sicherheitsregeln

Der Receiver prüft:

```text
EOS-Lizenz
Receiver aktiv
Peer-Token
Cluster-ID
Command-TTL
Replay/Duplikate
allowedPeerNodeIds optional
directHardwareWrite ist verboten
nur neutrale Commands
```

Es gibt weiterhin keine direkten Hardware-Schreibpfade aus der Mesh/Microgrid-App.

## Installer/App-Center

Die Einstellungen liegen im eigenen Reiter:

```text
Mesh/Microgrid → Feldtest-Steuerung & Tailscale Mesh
```

Neu dort:

```text
Command Receiver aktiv
Receiver Token erforderlich
Command TTL Sekunden
Lokaler Receiver Command-State
Erlaubte Peer-Node-IDs optional
```

Der Apps-Reiter bleibt nur App-Katalog.

## Beispiel Peer-Aufruf

Instanz A sendet an Instanz B:

```text
POST http://100.x.y.z:8188/api/mesh/command/receive
Header: x-nexowatt-mesh-token: <peer-token>
```

Payload-Beispiel:

```json
{
  "schema": "nexowatt.mesh-field-command-envelope.v1",
  "clusterId": "cluster_01",
  "sourceNodeId": "haus_a",
  "neutralCommandOnly": true,
  "directHardwareWrite": false,
  "commands": [
    {
      "commandId": "cmd_001",
      "ts": 1760000000000,
      "clusterId": "cluster_01",
      "sourceNodeId": "haus_a",
      "category": "local_first",
      "direction": "increase_local_use",
      "nodeId": "lp1",
      "plannedPowerW": 3000,
      "directHardwareWrite": false,
      "neutralCommandOnly": true
    }
  ]
}
```

Die empfangende Instanz schreibt dann einen lokalen JSON-Envelope in den konfigurierten Receiver Command-State. Die lokale Bridge beziehungsweise ein Herstelleradapter setzt den Intent um.

## Neue States

```text
meshMicrogrid.receiver.enabled
meshMicrogrid.receiver.commandStateDp
meshMicrogrid.receiver.requireToken
meshMicrogrid.receiver.ttlSec
meshMicrogrid.receiver.status
meshMicrogrid.receiver.lastHandshakeAt
meshMicrogrid.receiver.lastHandshakeJson
meshMicrogrid.receiver.lastCommandAt
meshMicrogrid.receiver.lastCommandId
meshMicrogrid.receiver.lastCommandJson
meshMicrogrid.receiver.lastAckJson
meshMicrogrid.receiver.lastRejectReason
meshMicrogrid.receiver.acceptedCount
meshMicrogrid.receiver.rejectedCount
meshMicrogrid.receiver.replayBlockedCount
meshMicrogrid.receiver.processedCommandIdsJson
meshMicrogrid.receiver.summaryJson
```

## Browser nach Update

Nach dem Update bitte einen Hard Reload ausführen, damit `nexowatt-cache-v341` aktiv wird.

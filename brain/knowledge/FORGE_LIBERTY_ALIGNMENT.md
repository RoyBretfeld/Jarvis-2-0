# Forge x Liberty Alignment

## Zielbild
The Forge liefert Geschwindigkeit und UX.
Liberty liefert Sicherheits- und Governance-Leitplanken.
Das Ziel ist Hybrid, nicht Ersatz.

## Architekturprinzipien
- TAIA bleibt Weltmodell und Koordinator.
- Coder-Modell wird fuer Code-lastige Tasks zugeschaltet.
- Multi-Agenten arbeiten parallel, mutierende I/O laeuft serialisiert.
- Bus-Dateien sind persistente Source of Truth.

## Liberty-Gesetze in Forge-Umsetzung
1. Glass-Box:
   - `/api/bus-status` fuer Live-Taskstatus
   - Audit-/Bus-Logs fuer Nachvollziehbarkeit
2. Undo is King:
   - Guarded Mutations mit Checkpoints vor kritischen Aktionen
3. Progressive Offenlegung:
   - Wissen on-demand aus `brain/knowledge/`
   - keine unnoetige Kontextflutung
4. Menschliche Hoheit:
   - Approval-Gate vor kritischer Batch-Orchestrierung

## Implementierungsregeln fuer neue Features
- Erst Scan, dann Aenderung.
- Erst Pattern in Knowledge Base, dann Code.
- API-Endpunkte mit klaren Fehlerzustandsmodellen bauen.
- Jede kritische Neuerung muss observierbar sein (Status + Logs).

## Definition of Done (DoD)
- Funktionalitaet arbeitet stabil unter Neustartbedingungen.
- Safety-Pfade koennen nicht einfach umgangen werden.
- Dashboard zeigt den Kernstatus der neuen Funktion.
- Knowledge-Dokumentation aktualisiert.

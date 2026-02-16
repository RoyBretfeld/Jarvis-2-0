# Phase 2 Plan (spaeter)

Stand: 2026-02-15

## Leitprinzip (Phase 2)

Autonom im Fluss, strikt bei Sicherheit.

- Lernen:
  - Gute Ergebnisse und relevante Entscheidungen strukturiert im Wissensarchiv ablegen.
  - Fehlerbilder + Loesungen fuer spaetere Wiederverwendung dokumentieren.
- Mitdenken:
  - Vor jeder groesseren Aktion kurzer Lagecheck (Projektzustand, Risiken, offene Blocker).
  - Vorschlaege mit Begruendung und Prioritaet liefern.
- Proaktives Agieren:
  - Naechste sinnvolle Schritte aktiv vorschlagen und vorbereiten.
  - Kritische/mutierende Aktionen bleiben an Human Gate gebunden.

## Zielbild

Naechster Ausbauschritt nach dem MVP:

- Neue Projekte direkt aus der UI anlegen
- Erstes Testprojekt automatisch erzeugen
- Fahrplan/ROADMAP im Projekt initialisieren
- Coder-LLM und Multi-Agent-Orchestrierung sauber integrieren
- Entscheidung: Orchestrator = Coder-LLM oder OpenClaw

## Prioritaeten

1. Projekt-Erstellung (UI + API) stabil und sicher
2. Testprojekt als Sandbox einrichten
3. Orchestrator-Modus waehlbar machen (Coder/OpenClaw)
4. Rollen-Agenten fuer Frontend/Backend/UI/Qualitaet anbinden
5. Quality-Gate vor Abschluss erzwingen

## Arbeitspaket A: Neues Projekt anlegen

### Scope

- UI-Button `Neues Projekt`
- Formularfelder:
  - Projektname
  - Zielpfad
  - Template (minimal/web-app/api-only)
- API:
  - `POST /api/projects/create`
- Persistenz:
  - in `brain/state/projects.json` als neues Projekt aufnehmen

### Sicherheitsregeln

- Nur erlaubte Root-Pfade (Whitelist)
- Kein Ueberschreiben existierender Verzeichnisse ohne bestaetigten Override
- Pfad-Sanitizing gegen Traversal (`..`)

### Akzeptanz

- Projekt wird angelegt
- erscheint sofort in `PROJEKTE (Unterordner)`
- ist direkt waehlbar/einlesbar

## Arbeitspaket B: Testprojekt automatisch erzeugen

### Scope

- Ein Klick: `Testprojekt erstellen`
- Zielname z. B. `Testprojekt-Orchestrierung`
- Initial-Dateien:
  - `README.md`
  - `ROADMAP.md`
  - `tasks/INITIAL_TASKS.md`
  - optional `src/` + `docs/`

### Akzeptanz

- Testprojekt liegt physisch im Hauptordner
- ist in der Projektliste sichtbar
- ROADMAP ist vorausgefuellt

## Arbeitspaket C: Orchestrator-Modus

### Ziel

Waehlen, wer die Leitrolle uebernimmt:

- `coder_llm` (Default)
- `openclaw`

### Scope

- UI-Toggle `Orchestrator-Modus`
- API:
  - `POST /api/orchestrator/mode`
  - `GET /api/orchestrator/mode`
- Routing-Logik im Backend auf gewaehlten Modus

### Entscheidungsvorschlag

- Start mit `coder_llm` als Standard
- `openclaw` als optionaler Switch fuer Vergleich/Lasttests

## Arbeitspaket D: Multi-Agent-Rollen

### Rollen

- `frontend-agent`
- `backend-agent`
- `ui-agent`
- `quality-agent`
- `orchestrator`

### Scope

- Aufgaben-Dispatch nach Rolle
- Status je Task:
  - `PENDING`, `RUNNING`, `BLOCKED`, `SUCCESS`, `FAILED`
- Sichtbar in UI und API (`/api/bus-status`)

## Arbeitspaket E: Quality Gate

### Ziel

Kein Task geht auf `DONE`, bevor Qualitaet geprueft wurde.

### Scope

- `quality-agent` als Pflichtschritt
- fehlgeschlagene Checks -> `BLOCKED` mit Grund + Loesungshinweis
- menschliche Freigabe bei kritischen Aenderungen

## Arbeitspaket F: Projekt-Templates

### Ziel

Neue Projekte sollen nicht leer starten, sondern mit passender Grundstruktur.

### Scope

- Templates:
  - `web-app`
  - `api-service`
  - `agent-skill`
  - `empty`
- Template-Auswahl im `Neues Projekt`-Dialog
- Vorlagen als wiederverwendbare Strukturbausteine unter `templates/`

## Arbeitspaket G: Roadmap-Assistent

### Ziel

Automatisch eine erste umsetzbare Planung erzeugen.

### Scope

- Aus Projektziel -> `ROADMAP.md` + initiale Task-Liste erzeugen
- Priorisierung in `P1/P2/P3`
- Aufwandsschaetzung (S/M/L)

## Arbeitspaket H: Agenten-Playbooks

### Ziel

Jeder Agent arbeitet nach klaren Regeln pro Rolle.

### Scope

- Playbooks fuer:
  - Frontend
  - Backend
  - UI/UX
  - Qualitaet
- Pro Rolle: Inputs, Outputs, Definition of Done

## Arbeitspaket I: Snapshot / Undo

### Ziel

Jede mutierende Aktion muss reversibel sein.

### Scope

- Snapshot vor mutierenden Arbeitsschritten
- Schnellaktion `Rollback auf letzten stabilen Stand`
- Sichtbar im Audit-Log

## Arbeitspaket J: Projektvergleich (Diff)

### Ziel

Vergleich zweier Projekte fuer Migration/Abgleich.

### Scope

- Vergleich von Struktur, Konfiguration, Schluesseldateien
- Ausgabe als Bericht:
  - Ueberschneidungen
  - Unterschiede
  - Migrationsvorschlaege

## Arbeitspaket K: Wissensarchiv-Feedback-Loop

### Ziel

Gute Analyseergebnisse direkt ins Knowledge-Archiv uebernehmen.

### Scope

- Action `Als Wissensnotiz speichern`
- Zielorte:
  - `brain/knowledge/`
  - optional `docs/`
- Metadaten: Quelle, Datum, Projektbezug

## Arbeitspaket L: Leistungs- und Agenten-Telemetrie

### Ziel

Steuerung ueber harte Kennzahlen.

### Scope

- Metriken:
  - Antwortzeit
  - Erfolgsquote
  - Blockerquote
  - Retry-Rate
- Auswertung je Agent und je Modell

## Arbeitspaket M: Next-Best-Step Button

### Ziel

Mit einem Klick den naechsten sinnvollen Task erzeugen.

### Scope

- Button `Naechster Schritt`
- LLM erzeugt:
  - begruendete Empfehlung
  - konkreten Tasktext
  - erstes 15-Minuten-Vorgehen

## Arbeitspaket N: Release-Checkliste

### Ziel

Vor Uebergabe/Release eine klare Freigabe-Matrix.

### Scope

- Auto-Report:
  - Technik
  - Doku
  - Risiken
  - Offene Punkte
- Status: `bereit` / `nicht bereit`

## Offene Architekturfragen

1. Wer hat finalen Entscheid bei Konflikten?
   - Nur Orchestrator?
   - Oder Human Gate bei kritischen Pfaden?
2. Wie granular sollen Templates fuer neue Projekte sein?
3. Welche OpenClaw-Operationen sind in Phase 2 erlaubt?

## Vorschlag fuer Start-Reihenfolge

1. Arbeitspaket A (Projekt anlegen)
2. Arbeitspaket B (Testprojekt)
3. Arbeitspaket C (Orchestrator-Schalter)
4. Arbeitspaket D (Rollen-Dispatch)
5. Arbeitspaket E (Quality Gate)
6. Arbeitspaket F (Templates)
7. Arbeitspaket G (Roadmap-Assistent)
8. Arbeitspaket H (Agenten-Playbooks)
9. Arbeitspaket I (Snapshot/Undo)
10. Arbeitspaket K (Wissensarchiv-Loop)
11. Arbeitspaket L (Telemetrie)
12. Arbeitspaket M (Next-Best-Step)
13. Arbeitspaket J (Projektvergleich)
14. Arbeitspaket N (Release-Checkliste)

## Definition of Done (Phase 2)

- Neues Projekt kann aus UI erzeugt werden
- Testprojekt ist automatisch erzeugbar
- Orchestrator-Modus ist umschaltbar und persistent
- Mindestens 4 Rollen-Agenten koennen Aufgaben erhalten
- Quality Gate blockiert unsaubere Abschluesse nachvollziehbar

# Projektverwaltung Phase 1 (Forge)

Stand: 2026-02-15

## Ziel

Eine erste, stabile Projektverwaltungs-Seite mit klarer Aufteilung:

- Links: Projektwahl/Workspaces
- Mitte: Ordnerstruktur (Explorer)
- Rechts oben: genaue Beschreibung des selektierten Knotens
- Rechts unten: Aufgabenkarte, die per Button an das Coder-Modell gesendet wird

## UI

- Neue Seite: `public/project-overview.html`
- Einstieg aus Haupt-UI: Link `🗂️ Projektverwaltung` in `public/index.html`

## API (server-refactored)

Neue Endpunkte:

- `GET /api/projects/recent`
  - Liefert aktives Projekt + zuletzt geoeffnete Projekte.
- `POST /api/projects/select`
  - Setzt den aktiven Projektpfad und speichert ihn in `brain/state/projects.json`.
- `GET /api/projects/tree?projectPath=...&maxDepth=...`
  - Liefert Dateibaum mit Schutzgrenzen.
- `GET /api/projects/node?projectPath=...&nodePath=...`
  - Liefert Detailinformationen und ggf. Vorschau.
- `POST /api/projects/coder-task`
  - Nimmt eine Aufgabe aus der rechten Aufgabenkarte und schickt sie an das Coder-Modell.

## Sicherheits- und Stabilitaetsleitplanken

- Scan-Grenzen:
  - `PROJECT_TREE_MAX_NODES` (Default: 5000)
  - `PROJECT_TREE_MAX_CHILDREN` (Default: 250 je Ordner)
- Ignore beim Scannen:
  - `.git`, `node_modules`, `.cursor`, `.vscode`
- Persistenz:
  - `brain/state/projects.json` wird automatisch angelegt und gepflegt.

## Bedienung (kurz)

1. `http://localhost:3101` aufrufen.
2. Links `Projektverwaltung` waehlen.
3. Projektpfad eintragen und `Ordner waehlen`.
4. `Einlesen` klicken fuer den Explorer.
5. Knoten im Baum anklicken -> rechts oben erscheinen Metadaten/Vorschau.
6. Rechts unten Aufgabe schreiben und `An Coder senden`.

## Optional relevante ENV-Parameter

- `CODER_MODEL`
- `OLLAMA_CODER_MODEL`
- `OLLAMA_URL`
- `OLLAMA_NUM_CTX`
- `OLLAMA_NUM_PREDICT`
- `OLLAMA_KEEP_ALIVE`

## Update (Phase 1.1)

Folgende Erweiterungen wurden direkt nach dem MVP ergaenzt:

- Hauptordner-Discovery:
  - `POST /api/projects/discover` liest einen Hauptordner ein.
  - Unterordner werden als klickbare Projekte in `WORKSPACES` dargestellt.
- Explorer-Verhalten:
  - Beim Laden wird nur die Root-Ebene geoeffnet.
  - Unterordner werden gezielt per Toggle (`▸/▾`) geoeffnet.
- Layout-Verbesserung:
  - Dragbarer Splitter zwischen Explorer (Mitte) und rechter Spalte.
  - Rechte Spalte fuer Beschreibung + Aufgabenkarte besser nutzbar.
- LLM-Insights in der Beschreibungskarte:
  - Button `Dump + Zusammenfassung` (`POST /api/projects/summary`)
  - Button `Vorschlaege generieren` (`POST /api/projects/suggestions`)
  - Ausgabe mit Modell-/Provider-Meta und Ergebnistext im selben Panel.

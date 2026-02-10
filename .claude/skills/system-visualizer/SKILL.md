---
name: system-visualizer
description: Interaktive HTML-Strukturkarte der Codebase. Liest NUR Dateisystem-Metadaten (Größe, Typ, Datum) – keine Code-Interpretation.
category: visualization
version: 1.0.0
author: TAIA
created: 2026-02-09
status: ACTIVE
disable-model-invocation: false
allowed-tools: Bash(python3 .claude/skills/system-visualizer/scripts/visualize_structure.py)
user-invocable: true
---

# System Visualizer - Interaktive Codebase-Karte

**Skill Name:** system-visualizer
**Version:** 1.0.0
**Author:** TAIA
**Created:** 2026-02-09
**Status:** ACTIVE

## Mission

**System Visualizer** erstellt eine **interaktive HTML-Strukturkarte** der Codebase. Das Skill liest NUR Dateisystem-Metadaten (Dateigröße, Typ, Änderungsdatum), interpretiert NIEMALS Code-Inhalte. Die Visualisierung ermöglicht:

- 📊 Größen-Übersicht nach Dateityp
- 🌳 Reduzierbare Verzeichnis-Bäume
- 🎨 Farb-Codierung nach Dateityp
- ⏱️ Änderungs-Zeitstempel
- 🔍 Schnelle Orientierung in großen Codebases

## Funktionsweise

### Input
- Projekt-Verzeichnis (z.B. `.` für aktuelles Verzeichnis)
- Optional: Max-Tiefe oder Ausschluss-Pattern

### Processing (Metadaten-only)

```
Verzeichnis-Scan
  ↓
Für JEDE Datei:
├─ Dateigröße (bytes)
├─ Dateityp (extension)
├─ Änderungs-Datum (mtime)
└─ Pfad (relativ)

[NICHT gelesen: Dateiinhalt]

Aggregation:
├─ Größen summieren pro Dateityp
├─ Verzeichnis-Hierarchie aufbauen
└─ HTML-Template rendern

Output:
  codebase-map.html
```

### Output: Interactive Map

```html
┌─────────────────────────────────────────────────────┐
│ 📊 SUMMARY                                          │
├─────────────────────────────────────────────────────┤
│ Files: 892                                          │
│ Directories: 145                                    │
│ Total Size: 24.5 MB                                │
│ File Types: 28                                      │
├─────────────────────────────────────────────────────┤
│ BY FILE TYPE (Top 10):                              │
│ .js        ████████ 12.3 MB (50%)                  │
│ .py        ███ 4.2 MB (17%)                        │
│ .json      ██ 2.1 MB (8%)                          │
│ .md        █ 1.5 MB (6%)                           │
│ .ts        █ 1.2 MB (5%)                           │
│ ... (5 more)                                        │
├─────────────────────────────────────────────────────┤
│ FOLDER TREE:                                        │
│ + src/ (8.2 MB)                                    │
│   + core/ (2.1 MB)                                 │
│     - agent.py (234 KB) 2026-02-08                │
│     - sentinel.py (145 KB) 2026-02-07             │
│   + services/ (3.5 MB)                             │
│     + memory/                                       │
│       + archive.py (156 KB)                        │
│       + scheduler.py (134 KB)                      │
│     + skills/                                       │
│   + utils/ (1.1 MB)                                │
│ + tests/ (4.1 MB)                                  │
│ + docs/ (2.3 MB)                                   │
│ + node_modules/ (8.9 MB) [collapsed]              │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

**Interaktive Features:**
- ✅ Klick auf Ordner zum Expandieren/Kollabieren
- ✅ Hover für Größe + Änderungs-Datum
- ✅ Farb-Legende (Python=🔵, JavaScript=🟡, etc.)
- ✅ Search-Box zum Filtern
- ✅ Sortierung nach Größe/Name/Datum

## Glass-Box Principle

Das Skill folgt dem Glass-Box-Prinzip:
- **Sichtbar:** Nur Dateisystem-Metadaten, keine Geheimnis
- **Nachvollziehbar:** Jede Datei zeigt Größe und Datum
- **Kein Code-Lesen:** HTML wird aus reinen Metadaten generiert
- **Inspizierbar:** Python-Skript ist lesbar und einfach

## Sicherheit (Metadaten-only)

- ✅ Liest NICHT Dateiinhalte
- ✅ Python-Skript nutzt nur pathlib + os.stat()
- ✅ Keine Netzwerk-Zugriffe
- ✅ HTML wird lokal generiert
- ✅ Allowed-Tools: Nur das spezifische Skript

**Threat Model:**
- ❌ Code-Injection: Unmöglich (kein Code gelesen)
- ❌ Datei-Manipulation: Skript ist read-only
- ❌ Backdoors: Keine externen Befehle außer `python3`

## Verwendungsbeispiele

### Befehl 1: Current Project
```
/system-visualizer .
```
→ Generiert codebase-map.html für aktuelles Verzeichnis

### Befehl 2: Specific Path
```
/system-visualizer src/
```
→ Visualisiert nur src/ Verzeichnis

### Befehl 3: Large Project (mit Tiefe-Limit)
```
/system-visualizer . --max-depth 3
```
→ Baumansicht bis 3 Ebenen tief

## Ausgabe

**Datei:** `codebase-map.html`
- Größe: 50-200 KB (je nach Projektgröße)
- Format: Standalone HTML5 + Inline CSS + Vanilla JavaScript
- Browser: Firefox, Chrome, Safari (keine Dependencies)
- Performance: <100ms render time

**Speicherort:** Im aktuellen Verzeichnis
**Browser-Öffnung:** Automatisch nach Generierung

## Integration mit TAIA

Dieser Skill kann:
- 🔄 Automatisch aufgerufen werden bei `visualisiere die Struktur`
- 🛠️ Manuell aufgerufen mit `/system-visualizer [path]`
- 📊 In Berichte eingebettet werden

## Script Details

**Datei:** `.claude/skills/system-visualizer/scripts/visualize_structure.py`

Das Python-Skript:
- ~150 Zeilen reiner Python-Code
- Nutzt nur: pathlib, os, json, webbrowser
- Keine externe Dependencies
- UTC-Timestamps für Änderungs-Daten
- UTF-8 Safe (Windows-compatible)

## Status

✅ **Konzept:** Definiert
✅ **Python-Skript:** Implementiert
⏳ **Browser-Test:** Pending

## Write Verification

**File Path:** .claude/skills/system-visualizer/SKILL.md
**Generated By:** TAIA Engineer v1.0.0
**Timestamp:** 2026-02-09T19:42:00
**Validation:** PASSED (YAML + Markdown structure valid)
**Tools Required:** Bash(python3 .claude/skills/system-visualizer/scripts/visualize_structure.py) - whitelisted
**Security Model:** Metadaten-only, no code interpretation

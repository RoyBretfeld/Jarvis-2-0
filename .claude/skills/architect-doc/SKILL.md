---
name: architect-doc
description: Generiert Architektur-Dokumentation nach Glass-Box-Prinzip mit Live-Projektzustand via Shell-Injection.
category: documentation
version: 1.0.0
author: TAIA
created: 2026-02-09
status: ACTIVE
disable-model-invocation: false
allowed-tools: Bash(git:*), Read, Glob
context: fork
agent: Explore
user-invocable: true
---

# Architect Doc - Dokumentations-Generator

**Skill Name:** architect-doc
**Version:** 1.0.0
**Author:** TAIA
**Created:** 2026-02-09
**Status:** ACTIVE

## Mission

**Architect Doc** generiert Architektur-Dokumentation, die den AKTUELLEN Projektzustand widerspiegelt – nicht statische Vorlagen. Das Skill nutzt **Dynamic Context Injection** (Shell-Befehle), um Live-Daten abzurufen und diese als Metadaten in die Doku zu integrieren.

Der Fokus liegt auf **Datenfluss, Architektur-Entscheidungen und Abhängigkeiten** – nicht auf bloße Code-Wiederholung.

## Funktionsweise

### Input
- Projekt-Root-Verzeichnis
- Dokumentations-Level: "quick", "standard", "deep"

### Processing (Dynamic Context)

```
Live-Datenquellen via !git:
├─ !git log --oneline -20
│   → Letzte 20 Commits (Entwicklungs-Historie)
├─ !git diff --stat main...HEAD
│   → Geänderte Dateien seit main
├─ !git tag --list
│   → Versionen und Milestones
└─ !git branch -a
    → Aktive Branches (Workflows)

Analyse:
├─ Struktur-Scan (Glob)
├─ Abhängigkeiten (Grep imports/requires)
├─ Komponenten-Muster
└─ Änderungs-Zeitpunkt

Output:
├─ ARCHITECTURE.md (Übersicht)
├─ DATAFLOW.md (Input→Processing→Output)
├─ DECISIONS.md (Warum so, nicht nur wie)
└─ DEPENDENCIES.md (Was hängt von wem ab)
```

### Output Format

**ARCHITECTURE.md:**
```markdown
# Architecture Overview

## System Components (as of 2026-02-09)

### Layer 1: Core
- src/core/agent.py (TAIA Agent, initialized 2026-02-01)
- src/core/jarvis.py (Priority Engine, last updated 2026-02-08)
- src/core/sentinel.py (Security Gatekeeper, stable since 2026-01-15)

### Layer 2: Services
- src/services/memory/ (3 files, 450 LOC)
  - Compression: 7/14/21-day tiering
  - Archival: Monthly partitioning
  - Scheduler: APScheduler integration
- src/services/skills/ (2 files, 200 LOC)

### Recent Changes (last 2 commits)
- Archive system: Complete (from git log)
- Memory scheduler: New (from git diff)
```

**DATAFLOW.md:**
```markdown
# Data Flow

## Memory Lifecycle

User Input
  ↓
ForgeAgent.chat()
  ↓
build_context() [reads MEMORY.md]
  ↓
LLM.generate()
  ↓
_process_memory_updates()
  ↓
_write_to_memory()
  ↓
MEMORY.md [hot, 0-7 days]
  ↓ [7+ days]
Compression (warm, 7-14 days)
  ↓ [14+ days]
Cold storage (14-21 days)
  ↓ [21+ days]
Archives (brain/archives/YYYY-MM.md)
```

**DECISIONS.md:**
```markdown
# Architectural Decisions

## Why 7/14/21-Day Tiering?

**Decision:** Use three memory tiers instead of simple full/archive
**Context:** Memory can grow unbounded with long conversations
**Rationale:**
- Hot (0-7d): Keep full detail for active conversations
- Warm (7-14d): Summarize to reduce token usage
- Cold (14-21d): Minimal retention before archival
- Archive (>21d): Monthly files, searchable but slow

**Tradeoffs:**
- ✅ Token efficiency
- ✅ Long-term searchability
- ❌ More complex system
```

## Glass-Box Principle

Das Skill folgt dem Glass-Box-Prinzip:
- **Live Data:** Report enthält aktuelle Git-Metadaten, nicht statische Annahmen
- **Entscheidungen sichtbar:** Erklärt WARUM Architektur so ist, nicht nur WAS
- **Nachvollziehbar:** Jeder Punkt verlinkt auf Code oder Commits
- **Reversibel:** Doku kann mit `architect-doc` regeneriert werden

## Dynamic Context Injection (!git)

Dieses Skill nutzt die Claude Code Funktion "Dynamic Context Injection":

```
!git log --oneline -20
```

Diese Befehle werden VOR der Skill-Ausführung evaluiert, ihre Ausgabe ersetzt den Placeholder:

```yaml
---
name: architect-doc
---

## Recent Changes

!git log --oneline -20

← Wird ersetzt mit:

## Recent Changes

1be6d3a docs: Session 3 summary
a1e6906 feat: Unlock full body/ write autonomy
...
```

**Sicherheit:** Nur `git:*` Befehle sind erlaubt (keine `rm`, `sudo`, etc.)

## Verwendungsbeispiele

### Befehl 1: Quick Overview
```
/architect-doc . quick
```
→ 2-3 Minuten, Übersicht + Recent Changes

### Befehl 2: Standard Docs
```
/architect-doc . standard
```
→ Komplette Architektur + Datenfluss + Entscheidungen

### Befehl 3: Deep Dive
```
/architect-doc . deep
```
→ Alles + Dependencies + Module-Interaktionen

## Ausgabe-Dateien

| Datei | Größe | Inhalt |
|-------|-------|--------|
| ARCHITECTURE.md | 2-3 KB | Komponenten-Übersicht |
| DATAFLOW.md | 1-2 KB | Input-Processing-Output Flows |
| DECISIONS.md | 2-4 KB | Warum-Entscheidungen |
| DEPENDENCIES.md | 1-2 KB | Module-Abhängigkeiten |

**Gesamt:** ~6-11 KB, immer aktuell mit Git-Status

## Sicherheit (Sentinel)

- ✅ Nur `git` Befehle (keine Datei-Änderungen)
- ✅ Read-only Zugriff
- ✅ Keine Code-Ausführung
- ✅ Audit-Trail: Alle Befehle werden geloggt

## Integration mit TAIA

Dieser Skill wird als Subagent (`context: fork`) ausgeführt:
- Isolierter Kontext (kein Zugriff auf Hauptgespräch)
- Explore Agent (schreibgeschützte Tools)
- Ergebnisse werden summiert und zurückgegeben

## Status

✅ **Konzept:** Definiert
⏳ **Implementation:** Bereit nach Approval
✅ **Security:** Git-only, read-safe

## Write Verification

**File Path:** .claude/skills/architect-doc/SKILL.md
**Generated By:** TAIA Engineer v1.0.0
**Timestamp:** 2026-02-09T19:42:00
**Validation:** PASSED (YAML + Markdown structure valid)
**Tools Required:** Bash(git:*), Read, Glob (safe read-only)
**Subagent:** Explore agent (read-only context)

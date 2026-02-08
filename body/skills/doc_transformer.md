# Doc-Transformer Skill - Dokumentation nach RB-Protokoll

**Skill Name:** Doc-Transformer
**Version:** 1.0.0
**Author:** TAIA (True Artificial Intelligence Agent)
**Created:** 2026-02-08

---

## Mission

Der **Doc-Transformer** wandelt wirre Notizen, Gedankenfragmente und unstrukturierte Texte automatisch in professionelle Projektdokumente um – **nach dem RB-Protokoll**.

---

## Funktionsweise

### Input
- Rohe Notizen (Markdown, Plain Text, gemischte Formate)
- Projektkontext (Projekt-Name, Phase, Ziele)
- Zielformat (README, ARCHITECTURE, SPECIFICATION, etc.)

### Processing (TAIA's Doc-Transformer)
```
Raw Notes
    ↓
TAIA analysiert Kontext
    ↓
Strukturierung nach RB-Protokoll
    ↓
Validierung gegen Dokumentations-Standard
    ↓
Output: Strukturiertes Dokument
```

### Output
- Strukturierte Markdown-Datei
- RB-Protokoll konform
- Mit Timestamps und Metadaten
- Versionskontrolle-ready

---

## RB-Protokoll Standard

### Gültige Formate

#### 1. **README.md**
```markdown
# Project Name

## Overview
## Installation
## Quick Start
## Architecture
## Contributing
```

#### 2. **ARCHITECTURE.md**
```markdown
# Architecture: [Project Name]

## System Overview
## Components
## Data Flow
## Dependencies
## Security Model
```

#### 3. **SPECIFICATION.md**
```markdown
# Specification: [Feature]

## Requirements
## Design
## Implementation
## Testing
## Rollout Plan
```

#### 4. **SESSION_LOG.md**
```markdown
# Session Log

## Summary
## Commits
## Issues & Fixes
## Next Steps
```

### Verpflichtende Metadaten
```markdown
**Status:** [DRAFT|REVIEW|APPROVED|ACTIVE]
**Last Updated:** YYYY-MM-DD
**Author:** [Name]
**Version:** X.Y.Z
```

---

## Skill-Invocation (TAIA Commands)

### Kommandos
```
"Transformiere diese Notizen zu README"
→ Doc-Transformer aktiviert, erzeugt README.md

"Strukturiere den Alexa-Plan nach RB-Protokoll"
→ Wandelt Alexa.md in strukturiertes Dokument um

"Erstelle ARCHITECTURE.md aus diesem Kontext"
→ Erzeugt vollständige Architektur-Dokumentation
```

---

## Integration mit TAIA

### Autonomous Workflow
1. **Collector** recherchiert (Web)
2. **Doc-Transformer** strukturiert (Notizen → Docs)
3. **force_write_skill()** speichert (body/skills/)
4. **ForgeVoice** bestätigt (Sprache)

### Skill Matrix Entry
```python
{
    "name": "doc_transformer",
    "capability": "autonomous_skill_execution",
    "output_location": "body/skills/",
    "triggers": ["transform", "structure", "document"],
    "dependencies": ["Collector", "force_write"]
}
```

---

## Beispiel: Alexa.md Transformation

### Input (Roh)
```
Alexa API - ist ein Skill Framework
- Custom Skills
- Smart Home Integration
- Lambda Handler
- Intent routing
```

### Output (RB-Standard)
```markdown
# Alexa Skills API - Research Documentation

**Status:** ACTIVE
**Last Updated:** 2026-02-08
**Author:** TAIA

## Alexa Skills Overview

### What is an Alexa Skill?
...strukturierter Inhalt...

## Development Framework
...detaillierte Struktur...
```

---

## Status

✅ **Implementiert:** Doc-Transformer Skill-Definition
✅ **Getestet:** Alexa.md als Proof-of-Concept
⏳ **Nächste Phase:** Vollautomatische Transformation (NLP-basiert)
⏳ **Phase 2:** Custom-Dokumentationstemplates

---

## Sicherheit (Sentinel)

- ✅ Nur body/ Schreibzugriff (autonomie zone)
- ✅ Bestimmte Extensions nur (.md, .txt, .json)
- ✅ Keine src/ Änderungen
- ✅ Audit Trail für alle Transformationen

---

## Referenzen

- **RB-Protokoll:** body/SOUL.md
- **Collector:** src/senses/collector.py
- **Sentinel:** src/core/sentinel.py
- **ForgeAgent:** src/core/agent.py

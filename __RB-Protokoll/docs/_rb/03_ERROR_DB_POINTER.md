# Error DB Pointer

⚠️ **ACHTUNG**: Die zentrale Antigravity ERROR_DB ist die einzige Source of Truth!

**Location:** `C:\Workflow\___111___Antigravity-Projekte\03_ERROR_DB.md`

## Verwendung

- Alle neuen Fehler aus diesem Projekt werden in die zentrale DB eingetragen
- **Keine Duplikate** über Projekte hinweg
- Beim Lernen (`rb learn`) immer den zentralen Pfad referenzieren

## Workflow

```bash
# Neuen Fehler zur zentralen DB hinzufügen
python scripts/rb.py learn
```

Die zentrale Datenbank wird von allen Antigravity-Projekten geteilt.

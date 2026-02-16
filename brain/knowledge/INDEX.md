# Forge Library Index

Dieses Verzeichnis ist die operative Knowledge Base fuer TAIA.
Ziel: "Wie mache ich was?" dokumentieren, damit Skills und Tools konsistent gebaut werden.

## Regeln
- Single Source of Truth fuer Skill-/Tool-Muster liegt hier.
- Kurze, fokussierte Dokumente statt Monolith.
- Neue Patterns immer als eigene Datei ablegen und im Index verlinken.

## Dokumente
- `SKILL_CREATION_GUIDE.md` - Standard fuer Agent Skills (Struktur, Checkliste, Fehlerbilder).
- `FORGE_LIBERTY_ALIGNMENT.md` - Wie Forge-Features nach Liberty-Gesetzen gebaut werden.
- `TOOL_API_REFERENCE.md` - API-Endpunkte fuer Skill-Backends (inkl. knowledge search).
- `about_taia.md` - Basiskontext zu TAIA.

## Nutzung durch TAIA
Wenn ein User nach neuem Skill/Tool fragt:
1. Erst passende Datei in `brain/knowledge/` lesen.
2. Dann Plan/Implementierung auf Basis dieses Patterns erzeugen.
3. Bei Abweichungen begruenden und dokumentieren.

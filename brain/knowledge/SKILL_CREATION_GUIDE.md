# Skill Creation Guide

## Zweck
Definiert den Standard, wie neue Agent Skills in The Forge erstellt werden.
Dieser Guide priorisiert:
- Progressive Offenlegung (nur noetigen Kontext laden)
- Transparenz (Glass-Box)
- Sicheres Verhalten bei mutierenden Aktionen

## Minimalstruktur eines Skills
Ein Skill ist ein Ordner mit mindestens einer `SKILL.md`.

Empfohlene Struktur:
- `SKILL.md` - Beschreibung, Trigger, Ablauf, Safety-Hinweise
- `examples/` - kurze Beispiele (optional)
- `scripts/` - optionale Hilfsskripte, nur wenn wirklich noetig

## Inhalt von SKILL.md
1. Name und Kurzbeschreibung
2. Wann der Skill aktiviert werden soll (Trigger)
3. Schrittfolge (deterministisch)
4. Input-/Output-Format
5. Safety-Regeln
6. Test-Checkliste

## Trigger-Design
Gute Trigger sind konkret:
- "Erstelle einen neuen API-Endpunkt"
- "Baue einen Agent Skill fuer X"
- "Refaktor + Tests + Doku synchron"

Schlechte Trigger sind vage:
- "Mach es besser"
- "Irgendwas mit Skill"

## Safety-Standard (Pflicht)
- Mutierende Aktionen nur ueber Bridge/Guarded Pfad.
- Kritische Aktionen mit Human Approval Gate.
- Keine direkten destruktiven Befehle ohne explizite Freigabe.
- Bei Unsicherheit: read-only Analyse, dann Rueckfrage.

## Build-Checkliste
- [ ] Bestehende Patterns in `brain/knowledge/` gelesen
- [ ] Skill-Zweck in 1-2 Saetzen klar
- [ ] Trigger- und Inputformat eindeutig
- [ ] Fehlerfaelle und Limits dokumentiert
- [ ] Tests/Validierung definiert
- [ ] Dokument im `INDEX.md` verlinkt

## Hauefige Fehler
- Skill wird zu breit und ueberlaedt den Kontext.
- Fehlende Safety-Hinweise bei Schreib-/Command-Aktionen.
- Kein klares Outputformat (fuehrt zu inkonsistenten Antworten).
- Doppelte Patterns statt Wiederverwendung existierender Guides.

## Empfehlung fuer TAIA-Loop
Vor jeder Skill-Implementierung:
1. `INDEX.md` lesen.
2. Relevante Knowledge-Datei laden.
3. Plan + Umsetzung daran spiegeln.

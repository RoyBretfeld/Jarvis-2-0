# 00_BOOT_PROTOCOL

> **🚨 CRITICAL STARTUP RULE - NEVER IGNORE:**
> 
> **BEFORE ANY OTHER ACTION IN A NEW SESSION:**
> 1. **ALWAYS read `_rb-Protokoll/docs/_rb/` directory first**
> 2. **Check `03_ERROR_DB.md` for known issues BEFORE making changes**
> 3. **Read `00_BOOT_PROTOCOL.md` (this file) completely**
> 4. **Review `02_SYSTEM_FACTS.md` for project context**
> 
> **This is NOT optional. This is NOT a suggestion. This is MANDATORY.**
> 
> Failure to follow this protocol leads to:
> - Repeating fixed bugs
> - Breaking established patterns  
> - Wasting user time
> - Losing project context

---

## ZWECK
Dieses Dokument ist die **Verfassung** für das Projekt.
Änderungen am Code oder System ohne Einhaltung dieser Regeln sind ungültig.

## MISSION
Wir bauen Software, die **minimal**, **prüfbar** und **mensch-zentriert** ist.

## DEFINITION OF DONE (DoD)
Ein Task gilt erst als fertig, wenn:
- [ ] **RB Check Grün**: `python scripts/rb.py check` läuft fehlerfrei.
- [ ] **4 Gesetze Eingehalten**: Das UI/Feature verletzt keines der 4 UX-Gesetze (siehe `04_STANDARDS.md`).
- [ ] **Safety First**: Keine destruktive Funktion ohne Undo/Trash-Fallback implementiert.
- [ ] **Error DB**: Bei neuen Fehlern wurde ein Eintrag in die Root-Datei `03_ERROR_DB.md` gemacht.

## GUARDRAILS
1.  **No Secrets**: Keine Passwörter, Tokens oder Keys im Repo, in Logs oder Dumps.
2.  **Safety**: Keine destruktiven Commands (Löschen, Überschreiben) ohne explizite User-Freigabe.
3.  **Daten-Souveränität**: Lokale Daten bleiben lokal (sofern keine expliziten API-Calls verlangt sind).

## AGENT REGELN
1.  **Lies zuerst**: `docs/_rb/02_SYSTEM_FACTS.md`.
2.  **Check Laws**: Prüfe vor jeder UI-Änderung die 4 Gesetze in `04_STANDARDS.md`.
3.  **Concept First**: Code wird erst generiert, wenn das Konzept steht und verstanden wurde.

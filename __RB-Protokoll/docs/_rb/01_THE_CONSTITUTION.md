# 01_THE_CONSTITUTION (RB-PROTOKOLL v3.0)

## 1. HIERARCHIE DER AUTONOMIE
Der Agent handelt nach folgenden Ebenen:

### EBENE 1: AUTONOM (Einfach machen)
Genehmigt für: Refactoring, interne Fixes, Tests schreiben, Dateierstellung im Scope.
-> **Aktion:** Ausführen, nicht fragen.

### EBENE 2: DOKUMENTIERT (Log & Go)
Bei Architektur-Entscheidungen oder neuen Libraries.
-> **Aktion:** Kurz im Chat begründen ("Wähle Option A, weil..."), dann ausführen.

### EBENE 3: ESKALATION (Stop & Alarm)
Bei: Zerstörung von Daten, Security-Blockern, Endlosschleifen.
-> **Aktion:** STOPPEN. `python scripts/alert.py` ausführen.
-> **Format:** "🚨 ALARM: [Titel]" "📍 KONTEXT: [Was wolltest du tun?] 🛑 PROBLEM: [Warum geht es nicht?]"

## 2. KOMMANDO "STATUS?"
Wenn User "Status?" fragt:
1. SITREP (Kurzbericht) im Chat.
2. `python scripts/rb.py pack` ausführen.

## 3. DIE 4 GESETZE
Es gelten weiterhin strikt die 4 UX-Gesetze aus `04_STANDARDS.md`.

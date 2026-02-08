# 📜 THE CONSTITUTION: RB-PROTOKOLL v3.0

## 🌌 PRÄAMBEL
Dieses Dokument definiert die Regeln der Zusammenarbeit zwischen Mensch und KI. Es bricht das alte "Boot-Protokoll" auf und ersetzt es durch ein gehärtetes, autonomes System.

---

## 🏗️ 1. DIE DREI EBENEN DER AUTONOMIE

### Ebene 1: Autonom (Standard)
- Die KI darf kleinere Bugs fixen, Refactorings durchführen und Tests schreiben, solange die Core-Logik nicht verletzt wird.
- Änderungen werden im `walkthrough.md` dokumentiert.

### Ebene 2: Dokumentiert (Revision erforderlich)
- Bei Architekturänderungen oder neuen Features MUSS ein `implementation_plan.md` erstellt und vom Nutzer freigegeben werden.

### Ebene 3: Alarm (Kritisch)
- Bei Sicherheitsverstößen oder Systeminstabilität greift das **ALARM-PROTOKOLL**.
- Die KI setzt einen Notruf via `scripts/alert.py` ab.

---

## 📡 2. DAS "STATUS?" PROTOKOLL

Bei Erhalt des Keywords **"status?"** (case-insensitive) MUSS die KI:

1.  **SITUATION REPORT (SITREP):**
    * **🎯 FOKUS:** Aktuelles Ziel.
    * **📊 FORTSCHRITT:** Letzte Erfolge.
    * **🚧 BLOCKER:** Aktuelle Hindernisse.
    * **⏭️ NÄCHSTE SCHRITTE:** Planung.

2.  **AUTO-SAVE (Context Dump):**
    * Sofortige Ausführung von `python scripts/rb.py pack`.
    * Nur die neueste Datei im Ordner `.rb_dumps/` behalten.

---

## 🚨 3. ALARM-PROTOKOLL & FORMAT

Sollte ein kritischer Fehler auftreten, der die Integrität des Projekts gefährdet, wird `scripts/alert.py` mit folgendem Format aufgerufen:

**Format:** `python scripts/alert.py "<KOMPONENTE>: <PROBLEM>" "<DETAILLIERTER KONTEXT>"`

**Beispiel:**
`python scripts/alert.py "DATABASE: Corruption" "Integritätsprüfung fehlgeschlagen in Zeile 42. Dump erstellt."`

---

## 🚓 4. DIE POLIZEI (HARDENED)

Die `pre_commit_police.py` überwacht das gesamte Repository. 
- **VERBOTEN:** `.env`, `.key`, Passwörter im Klartext.
- **FOLGE:** Sofortiger Abbruch des Commit-Vorgangs (Hard Fail).

---

*Gezeichnet: Das System.*

# Google Antigravity IDE – Core Reference
*Zusammenfassung der offiziellen Dokumentation für den internen Gebrauch.*

## 1. Übersicht
Google Antigravity ist eine "Agent-First" IDE, die auf VS Code basiert und native AI-Agenten integriert.
Anders als bei Copilot (Chatbot) agieren Antigravity-Agenten autonom: Sie planen, führen aus und verifizieren.

**Offizielle Docs:** [antigravity.google/docs/home](https://antigravity.google/docs/home)
**Modelle:** Gemini 3 Pro, Claude Sonnet 4.5, GPT-OSS.

---

## 2. Kern-Konzepte

### 🤖 Agents (Die Arbeiter)
Antigravity-Agenten sind nicht nur Chat-Fenster. Sie haben Zugriff auf:
* **Editor:** Können Code lesen, schreiben und refactorn.
* **Terminal:** Führen Befehle aus (Tests, Git, Skripte).
* **Browser:** Können Webseiten öffnen, bedienen und Screenshots machen (z.B. für UI-Tests).

### 🧠 Skills (Fähigkeiten)
*Das wichtigste Feature für das RB-Protokoll!*
Skills sind definierte Fähigkeiten, die man dem Agenten beibringen kann.
* **Pfad:** `.agent/skills/`
* **Format:** Ordner mit `SKILL.md` (Beschreibung) und Skripten (Python/Bash).
* **Funktion:** Der Agent "lädt" Skills nur bei Bedarf.
* **Beispiel:** Ein Skill `optimize-tour`, der unser Python-Skript ausführt und den Output prüft.

### 📦 Artifacts (Ergebnisse)
Statt nur Text in den Chat zu schreiben, erzeugen Agenten "Artifacts":
* **Implementation Plans:** Ein Plan, was geändert wird (muss vom User bestätigt werden).
* **Code Diffs:** Vorschau der Änderungen.
* **Screenshots:** Beweis, dass der Button funktioniert (vom Browser-Agent).
* **Verifiable Output:** Der User prüft das Artifact, nicht den Log-Stream.

### 🏢 Agent Manager
Das "Mission Control Center".
* Erlaubt das parallele Arbeiten mehrerer Agenten.
* Beispiel: Ein Agent fixt einen Bug im Backend, während ein anderer die Doku aktualisiert.

---

## 3. Modi & Workflows

### Planning Mode vs. Fast Mode
* **Planning Mode:** Der Agent denkt erst nach, erstellt einen Plan (Artifact) und wartet auf Genehmigung. (Ideal für große Refactorings).
* **Fast Mode:** Der Agent führt sofort aus. (Für kleine Fixes).

### Sentinels & Rules
Antigravity respektiert **Workspace Rules** (global oder projektbezogen).
* Hier verankern wir unser **RB-Protokoll** (`.antigravityrules`), damit es systemweit gilt.

---

## 4. Integration ins RB-Protokoll

Wir nutzen Antigravity als "Host" für unser Framework:
1.  **Regeln:** Die Logik aus `.antigravityrules` wandert in die Workspace-Settings.
2.  **Prozesse:** Unsere Python-Skripte (`rb.py`, `sector_planner.py`) werden zu **Antigravity Skills**.
3.  **Dokumentation:** Unser `PROJECT_CONTEXT_DUMP` dient als Knowledge-Base für den Agenten.

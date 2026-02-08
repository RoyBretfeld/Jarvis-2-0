# RB-Protokoll: Structured Agent Architecture

## 🎯 Die Mission
Das RB-Protokoll ist ein Standard-Framework, um AI-Agenten in **Google Antigravity** (und anderen IDEs) zu steuern. Es verhindert Kontext-Verlust und Halluzinationen durch eine strikte, dateibasierte Hierarchie.

Wir transformieren "lose Prompts" in eine feste **Architektur**.

---

## 🏗️ Die Architektur

Das Protokoll basiert auf 4 Säulen, die direkt auf Antigravity-Features mappen:

### 1. The Gatekeeper (Der Einstieg)
**Konzept:** Der Agent darf nicht "einfach so" loslegen. Er muss sich initialisieren.
* **RB-Classic:** `.antigravityrules` (Textdatei).
* **Antigravity Native:** **Workspace Rules** (System-Level Prompt).
* **Regel:** *"Bevor du Code schreibst: Prüfe `_RB-Protokoll/STATUS.md`."*

### 2. The Hierarchy (Die Kaskade)
Wissen ist nicht flach, sondern hierarchisch.
1.  **Level 1: Global Standards** (Audit, Security, No-Go Areas).
2.  **Level 2: Project Profile** (Stack, Architektur-Entscheidungen).
3.  **Level 3: Task Context** (Das aktuelle Ticket).

### 3. Sentinels (Wächter-Dateien)
Der Agent braucht einen "Anker" in der Realität.
* **Status-File:** Definiert den Modus (z.B. *Frozen*, *Refactoring*, *Feature-Dev*).
* **Audit-Log:** Der Agent muss kritische Änderungen protokollieren, bevor er sie anwendet.

### 4. Skills (Fähigkeiten)
Wiederkehrende Aufgaben werden in Skripte (Skills) ausgelagert, statt sie jedes Mal neu zu "erfinden".
* Beispiel: "Project Packer", "Code Linter", "Dependency Check".

---

## 🚀 Community Pitch

**Titel:** RB-Protokoll – Ein Framework für deterministische AI-Entwicklung

"Wer mit AI in großen Codebases arbeitet, kennt das Problem: Die AI vergisst Regeln oder 'halluziniert' Lösungen, die nicht zur Architektur passen.

Das **RB-Protokoll** löst das durch **Context Anchoring**.
Statt die AI frei laufen zu lassen, zwingen wir sie in eine definierte Prozedur:

1.  **Initialize:** Lese die Regeln.
2.  **Check:** Prüfe den Sentinel-Status.
3.  **Execute:** Nutze definierte Skills.
4.  **Audit:** Protokolliere das Ergebnis.

Das macht AI-Coding von einem 'Glücksspiel' zu einem verlässlichen Ingenieurs-Prozess."

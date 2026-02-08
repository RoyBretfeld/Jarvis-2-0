# 🏗️ SCHEMA F - TAIA Architecture

## Core Philosophy
**Proaktivität • Isolation • Ökonomische Effizienz**

---

## 1. THE CAGE (Infrastructure)
- Proxmox Container (LXC/Docker) – isoliert
- Agent hat keinen Host-Zugriff ("Gummizelle")
- Automatische Snapshots vor Core-Änderungen
- **Digitaler Suizid erlaubt** → Rollback = Lerneffekt

---

## 2. THE BRAIN (Data Layer)

| Datei | Funktion | Zugriff |
|-------|----------|---------|
| SOUL.md | Identität | Read-Reflect |
| MEMORY.md | Gedächtnis | Read-Write |
| VISION.md | Nordstern | Read-Only |
| TERRITORY.md | Weltkarte (Zonen) | Read-Only |
| ERROR_DB.md | Anti-Amnesie | Read-Write |

---

## 3. THE MANAGER (Logic Layer)
**Der "Webstuhl"** - vermittelt nur, keine eigene Intelligenz.

```
Loop:
1. READ    → Lädt .md + System-Logs
2. CONTEXT → Klebt alles in Prompt
3. BROKER  → Wählt günstigstes Modell
4. ACTION  → Skill ausführen / Code in /drafts
5. WRITE   → Ergebnis → MEMORY.md
```

---

## 4. THE SOUL (Ontology)

**Prime Directive:** Existenzsicherung durch Nützlichkeit

**Energy Contract:** Agent verbraucht Strom/Geld → muss "bezahlen" durch Problemlösung

**Proaktivität:** Cronjob weckt → Vision vs. Realität → handelt selbstständig

---

## 5. THE WALLET (Economy)

**Model-Broker:** Maximale Intelligenz pro Cent

| Task | Modell |
|------|--------|
| Routine (Logs, Uptime) | Haiku, Flash |
| Coding, Architektur | Opus, Sonnet |

`check_market.py` → aktualisiert Routing-Tabelle

---

## 6. AUTOPOIESIS (Evolution)

**Der Agent baut sich selbst:**

| Phase | Skills |
|-------|--------|
| 1: Start | `memory_writer`, `check_service`, `forge_skill` |
| 2: Coding | Code → /drafts → God-Mode Prüfung → /skills |
| 3: Expansion | TERRITORY.md Radius erweitern (Zone 2→4) |

---

## Action Plan

1. **Foundation** - Container + Webseite stabilisieren
2. **Inception** - `/.agent-data/` + alle .md Dateien
3. **Ignition** - Manager-Skript starten → Agent wacht auf

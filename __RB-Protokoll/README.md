#  RB-Protokoll: Structured Agent Architecture

**Modulare Windows-Systempflege mit KI-Power**

Intelligente Festplatten-Bereinigung durch strikte Trennung von Analyse (Scan) und Ausführung (Action), kombiniert mit KI-gestützter Ordner-Organisation.

## 🚀 RB Framework Bootstrap (First Run)

_Checklist for Agent/User when starting a new project:_

- [ ] **Files copied**: Template structure is present.
- [ ] **System Facts**: `docs/_rb/02_SYSTEM_FACTS.md` filled with real values.
- [ ] **RB Check**: Wired to Police + fast Baseline Test (<30s).
- [ ] **Tests**: Trigger commands defined in `06_TEST_MATRIX.md`.
- [ ] **Police**: Updated extensions, secrets, & migration rules for this stack.
- [ ] **Packer**: Includes/Excludes adapted to project folders.
- [ ] **Error DB**: Seeded with 10 project-relevant risks.
- [ ] **Hooks**: `python scripts/setup_hooks.py` run locally.
- [ ] **CI**: Workflow active and enforcing `rb check`.
- [ ] **Green State**: `rb check` passes cleanly.

> **Use the standard prompt:** `docs/_rb/BOOTSTRAP_PROMPT.md`

## Quickstart

1. Voraussetzungen: {{PREREQS}}
2. Install:
   - {{INSTALL_STEPS}}
3. Start:
   - {{START_COMMAND}}

## Dev‑Workflow (wichtig)

- **Ein einziges Gate:** `python scripts/rb.py check`
- Vor jedem Commit muss `rb check` grün sein.

## Commands

- `rb check` → Police + Baseline Tests
- `rb test` → komplette Testsuite
- `rb pack` → Kontextdump für Agenten/Debug
- `rb learn` → neuer Error‑DB Eintrag (Template)

## Links

- Runbook: `RUNBOOK.md`
- RB‑Verfassung: `docs/_rb/`

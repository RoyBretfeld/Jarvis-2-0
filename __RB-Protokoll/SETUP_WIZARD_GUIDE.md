# RB-Protocol Setup Wizard Guide

## Overview

The **Setup Wizard** configures the RB-Protocol framework based on your application type:

- **Standard Applications** (Printer, DesktopControl, Utilities)
- **LLM-Based Applications** (JARVIS, AI Agents, Adaptive Systems)

## Running the Wizard

```bash
python setup_wizard.py
```

The wizard will:
1. Ask about your application type
2. Configure components accordingly
3. Save configuration to `rb_config.json`
4. Create installation marker in `docs/_rb/INSTALLATION_MARKER.md`

## Application Types

### Option 1: Standard Application

**Choose this if you're building:**
- Printer drivers or utilities
- System maintenance tools
- DesktopControl operations suite
- Any non-AI application

**What gets installed:**
- ✅ Core Framework (base_cleaner.py)
- ✅ Module System (system_cleaner, temp_cleaner, browser_cleaner)
- ✅ CLI Interface
- ❌ Skills System
- ❌ SkillManager

**Use case:** `python src/cli/main.py --scan`

---

### Option 2: LLM-Based Application

**Choose this if you're building:**
- JARVIS-like conversational agents
- AI-powered systems with self-learning
- Adaptive workflows
- Applications that need expandable skills

**What gets installed:**
- ✅ Core Framework
- ✅ Module System
- ✅ CLI Interface
- ✅ Skills System (full auto-discovery)
- ✅ SkillManager (hot-reloading capable)

**Use case:** `python src/cli/main.py --skills`

---

## Configuration Files

### `rb_config.json`

```json
{
  "protocol_version": "1.0",
  "application_type": "standard|llm_agent",
  "llm_enabled": true|false,
  "components": {
    "core": true,
    "modules": true,
    "cli": true,
    "skills": true|false,
    "skill_manager": true|false
  }
}
```

### `docs/_rb/INSTALLATION_MARKER.md`

Markdown file documenting:
- Installation date
- Application type
- Enabled/disabled components

---

## Changing Configuration

To reconfigure:

```bash
python setup_wizard.py
```

This will:
- Prompt for new application type
- Update `rb_config.json`
- Adjust SkillManager imports
- Update installation marker

---

## Component Details

### Core Framework
Always installed. Provides:
- `src/core/base_cleaner.py` - Abstract base for cleaners
- `src/core/skill_manager.py` - Loads skills (enabled only for LLM apps)

### Module System
Always installed. Provides:
- `src/modules/system_cleaner.py` - Clean system temp files
- `src/modules/temp_cleaner.py` - Clean app caches
- `src/modules/browser_cleaner.py` - Clean browser caches

### CLI Interface
Always installed. Provides:
- `src/cli/main.py` - Entry point
- `--scan` flag for dry-run analysis
- `--clean` flag for execution
- `--skills` flag (LLM apps only)

### Skills System
Only for LLM apps. Enables:
- Skill discovery from `skills/` directory
- SKILL.md file parsing
- 3-Layer EVERLAST Standard enforcement
- Hot-reloading capability

---

## Examples

### Standard Application Setup
```bash
$ python setup_wizard.py
[1] Standard Application
[y] Proceed

✅ Configuration: STANDARD
   Modules enabled for system cleanup
   Skills DISABLED (not needed)
```

### LLM Agent Setup
```bash
$ python setup_wizard.py
[2] LLM-Based Application
[y] Proceed

✅ Configuration: LLM_AGENT
   All components enabled
   Skills auto-discovery active
```

---

## Troubleshooting

### Question: I set up as Standard, can I add Skills later?

**Answer:** Yes! Re-run `python setup_wizard.py` and select LLM mode.

### Question: Will Skills impact performance in Standard mode?

**Answer:** No! When disabled, SkillManager import is commented out in `main.py`.

### Question: Can I manually edit `rb_config.json`?

**Answer:** Not recommended. Use the wizard to ensure consistency.

---

## Technical Notes

- **Protocol Version:** 1.0
- **Compatible Python:** 3.8+
- **Windows Compatibility:** Full (UTF-8 handled)
- **Git-Tracked:** `rb_config.json` should be committed

---

## Next Steps

After installation:

**For Standard Apps:**
```bash
python src/cli/main.py --scan
python scripts/rb.py check
```

**For LLM Apps:**
```bash
python src/cli/main.py --skills
python scripts/rb.py check
```

Both:
```bash
python scripts/rb.py check   # Verify RB-Protocol compliance
```

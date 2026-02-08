# System Facts

## Tech Stack
- **Language:** Python 3.11+
- **Platform:** Windows 10/11
- **Architecture:** Object-Oriented (Abstract Base Classes)
- **Dependencies:** `os`, `shutil`, `ctypes`, `dataclasses`, `openai` (API), LLM-Scanner (multi-provider)

## Project Structure
```
src/
├── core/
│   └── base_cleaner.py      # Abstract base class for all modules
├── modules/
│   ├── temp_cleaner.py      # System temp file cleaner
│   ├── browser_cleaner.py   # Browser cache cleaner
│   ├── system_cleaner.py    # Recycle bin + logs
│   └── organizer.py         # KI-gestützte Ordner-Organisation (Phase 2)
├── cli/
│   └── main.py              # CLI Interface
└── utils/
    └── llm_scanner.py       # Multi-provider LLM detection (Phase 2)
```

## LLM Providers (Organizer Module - Phase 2)
- **Primary:** OpenAI GPT-4o-mini (API)
- **Fallback:** Ollama (local), OpenRouter, Text-Generation-WebUI, Docker containers
- **Scanner:** Auto-detection of available providers

## Important Paths
- **Error DB (Central):** `C:\Workflow\___111___Antigravity-Projekte\03_ERROR_DB.md`
- **RB Protocols:** `docs/_rb/`
- **Scripts:** `scripts/`

## Critical Commands

### Development
```powershell
# Dry-run scan (no deletion)
python src/cli/main.py --scan

# Execute cleanup with user confirmation
python src/cli/main.py --clean

# RB Framework
python scripts/rb.py check    # Police + baseline tests
python scripts/rb.py test     # Full test suite
```

## Safety Rules
- **NEVER** auto-delete without user confirmation
- **Scan-Action Separation:** Always scan first, show preview, then execute
- **Error Handling:** Catch `PermissionError`, `OSError` - log but don't crash
- **Age Filters:** Temp files < 24h, Logs < 7 days are protected

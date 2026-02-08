# CHANGELOG

Alle wichtigen Änderungen am RB-Framework werden hier dokumentiert.

Format basiert auf [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.0.0] - 2025-12-29

### ⚡ Performance

- **Police**: Git diff optimization - scannt nur geänderte Dateien (10-100x schneller)
- **Packer**: Effizienteres File Walking mit pathlib

### 🪟 Cross-Platform

- **Police**: Vollständige Windows/Linux/Mac Kompatibilität via pathlib
- **Packer**: Platform-agnostic directory handling
- **RB CLI**: Pfad-Validierung für alle Betriebssysteme

### 🎯 Features

- **Police**: Context-aware Secret Detection (ignoriert Kommentare/Platzhalter)
- **Police**: Konfigurierbarer Scan via `RB_POLICE_FULL_SCAN=true`
- **RB CLI**: Neuer `rb init` Command zur Setup-Validierung
- **RB CLI**: Placeholder-Validierung mit hilfreichen Fehlermeldungen
- **Packer**: Smart Directory Detection (findet `backend/`, `frontend/`, etc.)
- **Packer**: Konfigurierbar via `RB_PACK_INCLUDE=dir1,dir2`

### 📚 Documentation

- **SYSTEM_FACTS**: Beispiele für alle Platzhalter in HTML-Kommentaren
- **IMPROVEMENTS.md**: Detaillierte Dokumentation aller v2.0 Änderungen

### 🛡️ Security

- **Police**: Strengere Bearer Token Pattern
- **Police**: Secrets benötigen Quotes + Min-Length (weniger False Positives)

### 💬 UX

- Emoji-basierte Ausgaben für bessere Lesbarkeit
- Hilfreiche Error Messages mit konkreten Lösungsvorschlägen
- Progress-Feedback bei allen Scripts

---

## [1.0.0] - 2025-12-29

### Added

- Initial RB-Framework Setup
- Normative Docs (`docs/_rb/00-06`)
- Scripts: `rb.py`, `pre_commit_police.py`, `packer.py`
- GitHub Actions CI Workflow
- EditorConfig + GitIgnore
- README, RUNBOOK, LICENSE Templates

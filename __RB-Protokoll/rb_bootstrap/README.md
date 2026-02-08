# 🚀 RB-PROTOKOLL v3.0 DROP-IN INSTALLER

## Was ist das?
Ein autonomes Setup-Paket, das jedes Projekt auf den **RB-Protokoll v3.0 Standard** hebt.

## Installation
1. Kopiere den `rb_bootstrap/` Ordner in dein Projekt-Root
2. Führe aus: `python rb_bootstrap/installer.py`
3. Fertig! Der Installer löscht sich selbst nach erfolgreicher Installation.

## Was wird installiert?
- **📜 The Constitution** (`docs/_rb/01_THE_CONSTITUTION.md`): Autonomie-Ebenen & Alarm-Protokoll
- **🚓 Hardened Police** (`scripts/pre_commit_police.py`): Rekursives Repo-Scanning, Multi-Extension Support
- **🚨 Alert System** (`scripts/alert.py`): SMTP-basiertes Notsignal
- **🛠️ CLI Tools** (`scripts/rb.py`, `packer.py`, `setup_hooks.py`)

## Neue Features in v3.0
### 🎯 3-Ebenen Autonomie
- **Ebene 1:** Autonom (Bug-Fixes, Refactoring)
- **Ebene 2:** Dokumentiert (Architekturänderungen mit Plan)
- **Ebene 3:** Alarm (Kritische Fehler → Notruf)

### 📡 "Status?"-Protokoll
Bei Eingabe von **"status?"** erstellt die KI automatisch:
1. SITREP (Fokus, Fortschritt, Blocker, Nächste Schritte)
2. Auto-Dump (Context wird gesichert, alte Dumps gelöscht)

### 🔒 Gehärtete Sicherheit
- Blocked Files (.env, .key) → **Hard Fail**
- Rekursiver Scan (nicht nur `src/`)
- Multi-Extension (py, json, yml, sh, md, txt, js, ts)

## Konfiguration
Nach Installation: `.env` mit SMTP-Credentials ergänzen für Alert-System:
```
RB_SMTP_SERVER=smtp.example.com
RB_SMTP_PORT=587
RB_SMTP_USER=your-email@example.com
RB_SMTP_PASS=your-password
RB_ALERT_EMAIL=alert-recipient@example.com
```

## Kommandos
```bash
python scripts/rb.py check    # Police + Baseline Check
python scripts/rb.py pack     # Context Dump (nur neueste Datei)
python scripts/rb.py learn    # Neuen Error-DB Eintrag erstellen
python scripts/alert.py "TITLE" "MESSAGE"  # Notruf senden
```

---
**Version:** 3.0 (Autonomous & Hardened)  
**Lizenz:** Intern (Antigravity Edition)

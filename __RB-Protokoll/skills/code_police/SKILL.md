---
name: Code Police
description: Security and Quality Assurance Agent. Runs policy checks and identifies violations.
author: Antigravity Core
version: 1.0.0
---

# Code Police: Security & Compliance

## 1. Prerequisites
- [ ] `scripts/pre_commit_police.py` must exist and be executable.
- [ ] Python environment active.

## 2. Instructions
1.  **Trigger:** "Audit this file" or "Check project security".
2.  **Action:**
    -   Run: `python scripts/pre_commit_police.py`
    -   Capture output (Stdout/Stderr).
3.  **Interpretation:**
    -   If `✅ All checks passed`: Report Green status.
    -   If `⚠️ Policy violations`: Summarize the specific files and lines.
    -   If `❌ BLOCKED`: ALERT the user immediately.

## 3. Reference Material
### Integration
The Police script is the *Single Source of Truth* for security rules. Do not re-implement regexes here. Use the tool.

### Common Violations
- `.env` files committed to Git.
- Hardcoded passwords / API Keys.
- `TODO: SECURITY` markers left unresolved.

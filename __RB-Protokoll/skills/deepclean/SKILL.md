---
name: Deepclean
description: Advanced system maintenance. Scans for temp files, cache bloat, and stale node_modules.
author: Antigravity Core
version: 1.0.0
---

# Deepclean: System Storage Optimization

## 1. Prerequisites
- [ ] User permission is REQUIRED before deletion.
- [ ] `src/modules/system_cleaner.py` (optional, for backend logic).

## 2. Instructions
1.  **Scan Phase:**
    -   Identify "safe" targets: `%TEMP%`, `%prefetch%`, Browser Caches.
    -   Identify "heavy" targets: `node_modules` (unused), old log files (>7 days).
2.  **Report Phase:**
    -   Present a summary of bytes to be freed.
    -   Group by category (User Temp, System, Dev Waste).
3.  **Action Phase:**
    -   If User approves: Delete identified files.
    -   If User denies: Abort.

## 3. Reference Material
### Target Paths (Windows)
- `C:\Users\%USERNAME%\AppData\Local\Temp`
- `C:\Windows\Temp`
- `C:\Users\%USERNAME%\AppData\Local\Google\Chrome\User Data\Default\Cache`

### Safety Rules
- NEVER delete files locked by running processes (Skip on error).
- Retain files created in the last 24 hours (Safety buffer).

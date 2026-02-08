---
name: Gravity Organizer
description: AI-powered file organization. Sorts chaotic dumps into semantic category structures.
author: Antigravity Core
version: 1.0.0
---

# Gravity Organizer: Order from Chaos

## 1. Prerequisites
- [ ] Source directory (e.g., Downloads, Desktop, or a "Dump" folder).
- [ ] LLM Access (for semantic classification).

## 2. Instructions
1.  **Ingest:**
    -   Read list of files in target directory.
    -   For text files, read first 50 lines (Context).
2.  **Classify:**
    -   Ask LLM: "Where does this file belong?" based on the *Content* and *Filename*.
    -   Map to Categories: `Docs`, `Images`, `Code`, `Archives`, `Installers`.
3.  **Sort:**
    -   *Proposed Action:* `move src/file.txt -> organized/Docs/file.txt`
    -   Generate a script or execute moves one-by-one.

## 3. Reference Material
### Standard Categories
- **Docs:** PDF, DOCX, TXT, MD (if text content)
- **Media:** JPG, PNG, MP4, MOV
- **Dev:** PY, JS, JSON, YML
- **Exec:** EXE, MSI, BAT, PS1

### Prompt Template
"Filename: {{filename}}\nHeader: {{header_content}}\n\nTask: Assign a category from [Docs, Media, Dev, Exec, Other]. Return ONLY the category."

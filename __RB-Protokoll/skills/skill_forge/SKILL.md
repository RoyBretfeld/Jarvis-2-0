---
name: Skill Forge
description: Meta-Skill for constructing high-quality Antigravity Skills. Enforces the "3-Layer" Protocol (Context, Logic, References).
author: Antigravity Core
version: 1.1.0
---

# Skill Forge: The Protocol for Self-Evolution

**Trigger:** When the user requests a new specific capability or inputs a transcript defining a new workflow.

## THE "EVERLAST" STANDARD (3 Layers)
Every Skill created MUST follow this layout to maximize token efficiency:

### Layer 1: The Hook (YAML Frontmatter) ~5%
*   **Purpose:** Allows the Agent to "see" the skill without reading it.
*   **Content:** Name, Description (Context), Author, Version.
*   **Rule:** Keep description under 280 chars. Optimized for semantic search.

### Layer 2: The Logic (Markdown Instructions) ~30%
*   **Purpose:** The "How-To". Step-by-step execution rules.
*   **Content:** 
    - `## Prerequisite Check`: Fast fail conditions.
    - `## Workflow`: The exact chain of thought.
    - `## Constraints`: What NOT to do.

### Layer 3: The Assets (Reference Material) ~65%
*   **Purpose:** Heavy lifting data. Loaded only when needed.
*   **Content:** 
    - Templates (jinja2, txt)
    - Code Examples
    - Form Definitions
    - Style Guides (e.g., "Corporate Identity Colors")

---

## PROCEDURE FOR FORGING

1.  **Mkdir:** Create `skills/<skill_name_snake_case>/`
2.  **Define:** Write `skills/<skill_name_snake_case>/SKILL.md` using the Standard Template below.
3.  **Populate:** If the skill needs templates (e.g., HTML structure), put them in `skills/<skill_name_snake_case>/templates/`.
4.  **Register:** Run `python src/cli/main.py --skills` to verify.

## STANDARD TEMPLATE (Copy this!)

```markdown
---
name: <Skill Name>
description: <Action-oriented description, e.g., "Converts raw CSV logs into a Pandas-ready DataFrame.">
author: Antigravity Agent
version: 1.0.0
---

# <Skill Name>

## 1. Prerequisites
- [ ] Check if X exists
- [ ] Verify Y is installed

## 2. Instructions
1. Step One
2. Step Two (with reasoning)

## 3. Reference Material
<!-- Put long prompts, templates, or example outputs here -->
```

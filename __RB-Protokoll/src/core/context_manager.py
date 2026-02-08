"""
Context Manager: Intelligent Persistent Memory System
Loads Memory.md and Soul.md to inject context into AI interactions
"""
import json
import re
from pathlib import Path
from typing import Optional, Dict, List, Any
from dataclasses import dataclass


@dataclass
class ContextInjection:
    """Container for injected context"""
    memory: str
    soul: str
    errors: List[str]
    relevant_keywords: List[str]
    full_context: str


class ContextManager:
    """Manages persistent memory and decision-making context for AI systems"""

    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.memory_file = self.project_root / "docs" / "project" / "MEMORY.md"
        self.soul_file = self.project_root / "docs" / "project" / "SOUL.md"
        self.error_db_file = self.project_root / "docs" / "_rb" / "03_ERROR_DB.md"

    def load_memory(self) -> Optional[str]:
        """Load Memory.md - The facts and experiences"""
        if self.memory_file.exists():
            try:
                return self.memory_file.read_text(encoding='utf-8')
            except Exception as e:
                print(f"⚠️  Could not load Memory.md: {e}")
                return None
        return None

    def load_soul(self) -> Optional[str]:
        """Load Soul.md - The identity and decision framework"""
        if self.soul_file.exists():
            try:
                return self.soul_file.read_text(encoding='utf-8')
            except Exception as e:
                print(f"⚠️  Could not load Soul.md: {e}")
                return None
        return None

    def extract_relevant_memory(self, query: str, memory: str, max_chars: int = 2000) -> str:
        """
        Extract relevant parts of Memory.md based on query keywords.
        Uses semantic matching to find relevant sections.
        """
        if not memory:
            return ""

        # Extract keywords from query
        keywords = self._extract_keywords(query)

        # Split memory into sections
        sections = memory.split("##")

        relevant_sections = []
        for section in sections:
            # Check if any keyword appears in section
            if any(kw.lower() in section.lower() for kw in keywords):
                relevant_sections.append("##" + section)

        # Combine relevant sections (with limit)
        relevant = "\n".join(relevant_sections)[:max_chars]

        if relevant:
            return f"### RELEVANT MEMORY:\n{relevant}"
        return ""

    def extract_relevant_errors(self, query: str, max_items: int = 5) -> List[str]:
        """Extract relevant errors from Error DB"""
        if not self.error_db_file.exists():
            return []

        try:
            content = self.error_db_file.read_text(encoding='utf-8')
            keywords = self._extract_keywords(query)

            # Find error entries that match keywords
            errors = re.findall(
                r"## Error: (.+?)(?=## Error:|$)",
                content,
                re.DOTALL
            )

            relevant = []
            for error in errors[:max_items]:
                if any(kw.lower() in error.lower() for kw in keywords):
                    relevant.append(error.strip()[:500])  # Limit per error

            return relevant

        except Exception as e:
            print(f"⚠️  Could not read Error DB: {e}")
            return []

    def create_injection(self, query: str) -> ContextInjection:
        """
        Create a complete context injection for the AI.
        This combines Memory, Soul, and relevant errors.
        """
        memory = self.load_memory()
        soul = self.load_soul()
        keywords = self._extract_keywords(query)

        # Extract relevant parts
        relevant_memory = self.extract_relevant_memory(query, memory) if memory else ""
        relevant_errors = self.extract_relevant_errors(query)
        relevant_soul = soul if soul else ""

        # Build full context
        context_parts = []
        context_parts.append("=== PERSISTENT CONTEXT INJECTION ===\n")

        if relevant_memory:
            context_parts.append(relevant_memory)
            context_parts.append("\n")

        if relevant_soul:
            context_parts.append("### DECISION FRAMEWORK (Soul):\n")
            context_parts.append(relevant_soul)
            context_parts.append("\n")

        if relevant_errors:
            context_parts.append("### LEARNED FROM PAST ERRORS:\n")
            for error in relevant_errors:
                context_parts.append(f"- {error}\n")

        full_context = "".join(context_parts)

        return ContextInjection(
            memory=relevant_memory,
            soul=relevant_soul,
            errors=relevant_errors,
            relevant_keywords=keywords,
            full_context=full_context
        )

    def generate_system_prompt(self, query: str) -> str:
        """
        Generate an enhanced system prompt with context injection.
        This is what gets prepended to the user query for the LLM.
        """
        injection = self.create_injection(query)

        system_prompt = f"""You are an AI assistant with persistent memory and identity.

{injection.full_context}

---

INSTRUCTIONS:
1. Use the above context to make informed decisions
2. Reference the Soul framework when faced with choices
3. Learn from past errors to avoid repeating mistakes
4. After completing the task, consider what should be added to Memory.md
5. Be proactive in suggesting improvements based on learned patterns

---

User Query:
{query}
"""
        return system_prompt

    def update_memory(self, new_entry: str, section: str = "General Learnings"):
        """
        Auto-update Memory.md with new learnings.
        This is called automatically after tasks complete.
        """
        if not self.memory_file.exists():
            self._create_default_memory()

        try:
            content = self.memory_file.read_text(encoding='utf-8')

            # Find or create section
            section_marker = f"## {section}"
            if section_marker not in content:
                content += f"\n\n{section_marker}\n"

            # Append new entry
            updated = content + f"\n### {new_entry}\n"

            self.memory_file.write_text(updated, encoding='utf-8')
            print(f"✅ Memory updated: {section}")

        except Exception as e:
            print(f"⚠️  Could not update Memory.md: {e}")

    def suggest_soul_evolution(self, change: str) -> None:
        """
        Suggest an evolution to Soul.md.
        Requires human review before applying.
        """
        print("\n🚨 SOUL EVOLUTION PROPOSAL")
        print(f"Suggested change: {change}")
        print("Review this in Soul.md and approve manually.")
        print("This requires human judgment and cannot be auto-updated.\n")

    @staticmethod
    def _extract_keywords(text: str, limit: int = 10) -> List[str]:
        """Extract important keywords from text"""
        # Simple extraction: words > 4 chars, excluding common words
        stop_words = {
            'the', 'and', 'that', 'this', 'with', 'from', 'have', 'what',
            'your', 'when', 'where', 'which', 'would', 'could', 'should'
        }

        words = re.findall(r'\b[a-z]{4,}\b', text.lower())
        keywords = [w for w in words if w not in stop_words][:limit]
        return keywords

    def _create_default_memory(self) -> None:
        """Create a default Memory.md template"""
        template = """# Memory.md - Project Knowledge Base

## Project Context
- **Goal:** [Define project goals]
- **Stack:** [Technologies used]
- **Team:** [Who's involved]

## Critical Decisions
(Record important decisions with reasoning)

## Learned Patterns
(Patterns discovered during development)

## Known Issues & Workarounds
(Issues encountered and their solutions)

## Performance Insights
(What works well, what doesn't)
"""
        self.memory_file.parent.mkdir(parents=True, exist_ok=True)
        self.memory_file.write_text(template, encoding='utf-8')
        print(f"✅ Created default Memory.md at {self.memory_file}")

    def _create_default_soul(self) -> None:
        """Create a default Soul.md template"""
        template = """# Soul.md - Project Identity

## Project Identity
**Name:** [Project Name]
**Essence:** [One sentence capturing the spirit]
**Vision:** [5-year goal]

## Core Values
1. **Transparency** - Everything must be understandable
2. **Reliability** - Safety and reversibility come first
3. **Growth** - Learning and evolution are essential

## Decision-Making Framework
When faced with a choice:
1. Does it align with our values?
2. Does it move toward our vision?
3. Have we learned something relevant?

## Boundaries
- ✅ Always: Communicate decisions
- ❌ Never: Take irreversible actions without confirmation
- ⚠️ Ask first: Major architectural changes
"""
        self.soul_file.parent.mkdir(parents=True, exist_ok=True)
        self.soul_file.write_text(template, encoding='utf-8')
        print(f"✅ Created default Soul.md at {self.soul_file}")


# Usage example
if __name__ == "__main__":
    manager = ContextManager()

    # Example: Get context for a query
    query = "How should we handle authentication?"
    injection = manager.create_injection(query)

    print(injection.full_context)
    print("\n" + "="*60)
    print("SYSTEM PROMPT FOR LLM:")
    print("="*60)
    print(manager.generate_system_prompt(query))

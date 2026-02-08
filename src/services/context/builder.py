"""Context Builder Service - Composes LLM context from multiple sources"""

from pathlib import Path
from typing import Optional, Dict, Any

from src.services.memory.manager import MemoryManager
from src.services.identity.name_manager import NameManager
from src.services.identity.soul_manager import SoulManager
from src.repositories.error_db_repo import ErrorDBRepository
from src.core.errors import MemoryError


class ContextBuilder:
    """
    Context Builder Service

    Assembles comprehensive context for LLM from multiple sources:
    - Agent name and soul
    - Memory entries
    - Error history
    - System identity

    Methods:
        build(include_error_db) - Build complete context
        build_identity_context() - Just name/soul
        build_memory_context(limit) - Just memory
        build_error_context() - Just errors
    """

    def __init__(self, body_path: Path, error_db_path: Optional[Path] = None):
        """
        Initialize Context Builder

        Args:
            body_path: Path to body/ directory
            error_db_path: Path to ERROR_DB.md (optional)
        """
        self.body_path = Path(body_path)
        self.error_db_path = error_db_path or Path("ERROR_DB.md")

        # Initialize services
        self.memory_manager = MemoryManager(self.body_path)
        self.name_manager = NameManager(self.body_path)
        self.soul_manager = SoulManager(self.body_path)
        self.error_db_repo = ErrorDBRepository(self.error_db_path)

    def build(
        self,
        include_identity: bool = True,
        include_memory: bool = True,
        include_errors: bool = False,
        memory_limit: int = 50,
        max_tokens: Optional[int] = None
    ) -> str:
        """
        Build complete LLM context

        Args:
            include_identity: Include agent identity/soul
            include_memory: Include memory entries
            include_errors: Include error database
            memory_limit: Max memory entries to include
            max_tokens: Optional token limit (approximate)

        Returns:
            Formatted context string

        Raises:
            MemoryError: If context building fails
        """
        try:
            parts = []

            # Add identity
            if include_identity:
                parts.append(self.build_identity_context())

            # Add memory
            if include_memory:
                parts.append(self.build_memory_context(memory_limit))

            # Add errors
            if include_errors:
                parts.append(self.build_error_context())

            # Combine and optionally truncate
            context = "\n\n".join(filter(None, parts))

            if max_tokens:
                context = self._truncate_to_tokens(context, max_tokens)

            return context
        except Exception as e:
            raise MemoryError(f"Failed to build context: {e}")

    def build_identity_context(self) -> str:
        """Build identity section"""
        parts = []

        # Agent name
        current_name = self.name_manager.get_current_name()
        parts.append(f"# Agent Identity\n**Name:** {current_name}")

        # Soul
        if self.soul_manager.has_soul():
            soul = self.soul_manager.get_soul()
            parts.append(f"\n## Soul\n{soul}")

        # Identity
        if self.soul_manager.has_identity():
            identity = self.soul_manager.get_identity()
            parts.append(f"\n## Identity\n{identity}")

        return "\n".join(parts)

    def build_memory_context(self, limit: int = 50) -> str:
        """
        Build memory section

        Args:
            limit: Max entries to include

        Returns:
            Formatted memory section
        """
        try:
            entries = self.memory_manager.get_memory_entries()
            if not entries:
                return ""

            # Take most recent entries
            recent_entries = entries[-limit:] if len(entries) > limit else entries

            lines = ["# Memory"]
            stats = self.memory_manager.get_stats()
            lines.append(f"*{stats['entry_count']} total entries, {stats['file_size_mb']:.1f} MB*\n")

            for entry in recent_entries:
                date = entry.get("date", "?")
                content = entry.get("content", "")
                lines.append(f"* [{date}] {content}")

            return "\n".join(lines)
        except Exception:
            return ""

    def build_error_context(self) -> str:
        """Build error database section"""
        try:
            errors = self.error_db_repo.get_all_errors()
            if not errors:
                return ""

            lines = ["# Error History"]
            metadata = self.error_db_repo.get_metadata()
            if metadata:
                lines.append(f"*{metadata['total_errors']} total errors, {metadata['open_errors']} open*\n")

            # Show only open errors
            open_errors = [e for e in errors if e.get("status", "").lower() != "resolved"]
            for error in open_errors[:10]:  # Limit to 10 most recent
                lines.append(f"- **{error.get('id')}**: {error.get('error')}")
                lines.append(f"  - Cause: {error.get('root_cause')}")
                lines.append(f"  - Fix: {error.get('fix')}")

            return "\n".join(lines)
        except Exception:
            return ""

    def get_context_summary(self) -> Dict[str, Any]:
        """Get summary of context components"""
        return {
            "agent_name": self.name_manager.get_current_name(),
            "has_soul": self.soul_manager.has_soul(),
            "has_identity": self.soul_manager.has_identity(),
            "memory_entries": self.memory_manager.get_entry_count(),
            "memory_size_mb": self.memory_manager.get_stats().get("file_size_mb", 0),
            "total_errors": len(self.error_db_repo.get_all_errors()),
            "open_errors": sum(
                1 for e in self.error_db_repo.get_all_errors()
                if e.get("status", "").lower() != "resolved"
            ),
        }

    def _truncate_to_tokens(self, text: str, max_tokens: int) -> str:
        """
        Approximate truncation to token limit

        Uses rough estimate: 1 token ≈ 4 characters

        Args:
            text: Text to truncate
            max_tokens: Maximum tokens

        Returns:
            Truncated text
        """
        max_chars = max_tokens * 4
        if len(text) <= max_chars:
            return text

        truncated = text[:max_chars]
        # Try to truncate at a sentence boundary
        last_period = truncated.rfind(".")
        if last_period > max_chars * 0.8:
            return truncated[:last_period + 1]

        return truncated

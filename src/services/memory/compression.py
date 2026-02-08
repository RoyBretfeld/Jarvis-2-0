"""Memory Compression Service - LLM-based summarization"""

from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

from src.repositories.memory_repo import MemoryRepository
from src.core.errors import MemoryError


class CompressionService:
    """
    Memory Compression Service

    Provides LLM-based summarization and compression of memory entries.
    Classifies entries into Hot/Warm/Cold tiers for tiered storage.

    Methods:
        compress(llm_provider, compression_ratio) - Compress memory via LLM
        tier_entries(entries) - Classify entries by temperature
        summarize_tier(entries, mode) - Summarize entries in tier
    """

    def __init__(self, body_path: Path):
        """
        Initialize Compression Service

        Args:
            body_path: Path to body/ directory
        """
        self.body_path = Path(body_path)
        self.repository = MemoryRepository(self.body_path)

    def compress(
        self,
        llm_provider: Any,
        compression_ratio: float = 0.5,
        preserve_recent: int = 7
    ) -> bool:
        """
        Compress memory via LLM summarization

        Args:
            llm_provider: LLM provider instance with summarize() method
            compression_ratio: Target compression ratio (0.0-1.0)
            preserve_recent: Days of recent entries to preserve uncompressed

        Returns:
            True if successful

        Raises:
            MemoryError: If compression fails
        """
        try:
            # Get entries to compress
            entries = self.repository.parse_entries()
            if not entries:
                return True

            # Classify entries by temperature
            hot, warm, cold = self.tier_entries(entries, preserve_recent)

            # Summarize warm and cold entries
            compressed_parts = []

            if hot:
                compressed_parts.append("# HOT (Recent)\n")
                compressed_parts.append(self._format_entries(hot))

            if warm:
                compressed_parts.append("\n# WARM (Medium-term)\n")
                warm_summary = self.summarize_tier(warm, "warm", llm_provider)
                compressed_parts.append(warm_summary)

            if cold:
                compressed_parts.append("\n# COLD (Archived)\n")
                cold_summary = self.summarize_tier(cold, "cold", llm_provider)
                compressed_parts.append(cold_summary)

            # Write compressed version
            compressed_content = "".join(compressed_parts)
            self.repository.write_compressed(compressed_content)

            return True
        except Exception as e:
            raise MemoryError(f"Failed to compress memory: {e}")

    def tier_entries(
        self,
        entries: List[Dict[str, Any]],
        preserve_recent: int = 7
    ) -> tuple:
        """
        Classify entries into Hot/Warm/Cold tiers

        Hot: Last N days
        Warm: Last 30 days
        Cold: Older than 30 days

        Args:
            entries: List of memory entries
            preserve_recent: Days to keep in HOT tier

        Returns:
            Tuple of (hot_entries, warm_entries, cold_entries)
        """
        from datetime import datetime, timedelta

        now = datetime.now()
        hot_cutoff = now - timedelta(days=preserve_recent)
        warm_cutoff = now - timedelta(days=30)

        hot = []
        warm = []
        cold = []

        for entry in entries:
            try:
                date_str = entry.get("date", "")
                entry_date = datetime.strptime(date_str, "%Y-%m-%d")

                if entry_date > hot_cutoff:
                    hot.append(entry)
                elif entry_date > warm_cutoff:
                    warm.append(entry)
                else:
                    cold.append(entry)
            except (ValueError, KeyError):
                # If date parsing fails, classify as warm (middle tier)
                warm.append(entry)

        return hot, warm, cold

    def summarize_tier(
        self,
        entries: List[Dict[str, Any]],
        mode: str = "warm",
        llm_provider: Optional[Any] = None
    ) -> str:
        """
        Summarize entries in a tier

        Args:
            entries: List of entries to summarize
            mode: Tier mode ("hot", "warm", "cold")
            llm_provider: Optional LLM provider for AI summarization

        Returns:
            Summarized content as markdown

        Raises:
            MemoryError: If summarization fails
        """
        if not entries:
            return ""

        try:
            if llm_provider and hasattr(llm_provider, "summarize"):
                # Use LLM-based summarization
                content = self._format_entries(entries)
                prompt = f"Summarize these {mode} memory entries concisely:\n\n{content}"
                summary = llm_provider.summarize(prompt)
                return summary
            else:
                # Fallback: extract key points manually
                return self._extract_key_points(entries, mode)
        except Exception as e:
            raise MemoryError(f"Failed to summarize tier: {e}")

    def _format_entries(self, entries: List[Dict[str, Any]]) -> str:
        """Format entries as markdown"""
        lines = []
        for entry in entries:
            date = entry.get("date", "?")
            content = entry.get("content", "")
            lines.append(f"* [{date}] {content}")
        return "\n".join(lines)

    def _extract_key_points(self, entries: List[Dict[str, Any]], mode: str) -> str:
        """Extract key points from entries without LLM"""
        lines = []

        # Group by category if available
        by_category: Dict[str, List[Dict]] = {}
        for entry in entries:
            category = entry.get("category", "other")
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(entry)

        # Summarize each category
        for category, cat_entries in by_category.items():
            lines.append(f"\n## {category.title()}")

            # Show only first and last entry of category
            if len(cat_entries) > 1:
                lines.append(f"* [{cat_entries[0].get('date', '?')}] {cat_entries[0].get('content', '')}")
                if len(cat_entries) > 2:
                    lines.append(f"  ... ({len(cat_entries) - 2} more entries)")
                lines.append(f"* [{cat_entries[-1].get('date', '?')}] {cat_entries[-1].get('content', '')}")
            else:
                lines.append(f"* [{cat_entries[0].get('date', '?')}] {cat_entries[0].get('content', '')}")

        return "\n".join(lines)

    def get_compression_stats(self) -> Dict[str, Any]:
        """Get compression statistics"""
        try:
            entries = self.repository.parse_entries()
            hot, warm, cold = self.tier_entries(entries)

            return {
                "total_entries": len(entries),
                "hot_count": len(hot),
                "warm_count": len(warm),
                "cold_count": len(cold),
                "compression_potential": len(warm) + len(cold)
            }
        except Exception as e:
            raise MemoryError(f"Failed to get compression stats: {e}")

"""Memory Manager Service - Core memory operations"""

from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any

from src.repositories.memory_repo import MemoryRepository
from src.core.errors import StorageError, MemoryError


class MemoryManager:
    """
    Memory Manager Service

    High-level interface for memory operations.
    Provides business logic for memory management, statistics, and compression.

    Methods:
        write_entry(category, content) - Write memory entry
        read_memory(compressed) - Read memory (normal or compressed)
        get_stats() - Get memory statistics
        compress_memory(llm_provider) - Trigger compression via LLM
    """

    def __init__(self, body_path: Path):
        """
        Initialize Memory Manager

        Args:
            body_path: Path to body/ directory
        """
        self.body_path = Path(body_path)
        self.repository = MemoryRepository(self.body_path)

    def write_entry(
        self,
        category: str = "default",
        content: str = "",
        timestamp: Optional[str] = None
    ) -> str:
        """
        Write memory entry with timestamp

        Args:
            category: Entry category (default: "default")
            content: Entry content
            timestamp: Optional timestamp (default: now)

        Returns:
            Timestamp of written entry

        Raises:
            MemoryError: If write fails
            ValueError: If content is empty
        """
        if not content or not content.strip():
            raise ValueError("Entry content cannot be empty")

        if timestamp is None:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        try:
            # Format: * [YYYY-MM-DD HH:MM:SS] [category] content
            entry = f"* [{timestamp}] [{category}] {content}"
            self.repository.write("default", entry + "\n")
            return timestamp
        except Exception as e:
            raise MemoryError(f"Failed to write memory entry: {e}")

    def read_memory(self, compressed: bool = False) -> str:
        """
        Read memory content

        Args:
            compressed: If True, read compressed version

        Returns:
            Memory content as string

        Raises:
            MemoryError: If read fails
        """
        try:
            identifier = "compressed" if compressed else "default"
            return self.repository.read(identifier)
        except Exception as e:
            raise MemoryError(f"Failed to read memory: {e}")

    def get_memory_entries(self) -> List[Dict[str, Any]]:
        """
        Get parsed memory entries

        Returns:
            List of memory entry dictionaries

        Raises:
            MemoryError: If parsing fails
        """
        try:
            return self.repository.parse_entries()
        except Exception as e:
            raise MemoryError(f"Failed to parse memory entries: {e}")

    def search_memory(self, keyword: str) -> List[Dict[str, Any]]:
        """
        Search memory entries by keyword

        Args:
            keyword: Keyword to search for

        Returns:
            List of matching entries

        Raises:
            MemoryError: If search fails
        """
        if not keyword or not keyword.strip():
            raise ValueError("Search keyword cannot be empty")

        try:
            return self.repository.search_entries(keyword)
        except Exception as e:
            raise MemoryError(f"Failed to search memory: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """
        Get memory statistics

        Returns:
            Dictionary with statistics:
                - entry_count: Total entries
                - file_size_mb: File size in MB
                - modified: Last modified timestamp
                - file: Filename
        """
        try:
            metadata = self.repository.get_metadata()
            if metadata is None:
                return {
                    "entry_count": 0,
                    "file_size_mb": 0,
                    "modified": None,
                    "file": "MEMORY.md"
                }

            size_mb = metadata.get("size_bytes", 0) / (1024 * 1024)
            return {
                "entry_count": metadata.get("entry_count", 0),
                "file_size_mb": round(size_mb, 2),
                "modified": metadata.get("modified"),
                "file": metadata.get("file")
            }
        except Exception as e:
            raise MemoryError(f"Failed to get memory stats: {e}")

    def clear_memory(self) -> bool:
        """
        Clear memory file

        WARNING: This cannot be undone!

        Returns:
            True if successful
        """
        try:
            memory_file = self.body_path / "MEMORY.md"
            if memory_file.exists():
                memory_file.write_text("# MEMORY\n\n", encoding="utf-8")
            return True
        except Exception as e:
            raise MemoryError(f"Failed to clear memory: {e}")

    def exists(self) -> bool:
        """Check if memory file exists"""
        return self.repository.exists()

    def get_entry_count(self) -> int:
        """Get total number of memory entries"""
        try:
            entries = self.get_memory_entries()
            return len(entries)
        except Exception:
            return 0

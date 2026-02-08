"""Memory Repository - Abstraction for MEMORY.md Operations"""

from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict, Any

from .base import BaseRepository
from src.core.errors import StorageError


class MemoryRepository(BaseRepository):
    """
    Repository for Memory file operations

    Handles reading/writing to MEMORY.md and MEMORY_COMPRESSED.md files.
    Provides structured access to memory entries with parsing support.

    Attributes:
        memory_file: Path to MEMORY.md
        compressed_file: Path to MEMORY_COMPRESSED.md
    """

    def __init__(self, body_path: Path):
        """
        Initialize Memory Repository

        Args:
            body_path: Path to body/ directory
        """
        super().__init__(body_path)
        self.memory_file = self.base_path / "MEMORY.md"
        self.compressed_file = self.base_path / "MEMORY_COMPRESSED.md"

    def read(self, identifier: str = "default") -> str:
        """
        Read memory file content

        Args:
            identifier: "default" for MEMORY.md, "compressed" for MEMORY_COMPRESSED.md

        Returns:
            File content as string, empty string if not found

        Raises:
            StorageError: If read fails
        """
        file_path = self.compressed_file if identifier == "compressed" else self.memory_file

        try:
            if file_path.exists():
                return file_path.read_text(encoding="utf-8")
            return ""
        except Exception as e:
            raise StorageError(
                f"Failed to read memory: {e}",
                context={"file": str(file_path), "identifier": identifier},
            )

    def write(self, identifier: str, content: str) -> bool:
        """
        Append entry to memory file

        Args:
            identifier: Key for entry (unused, always appends to default)
            content: Entry text to append

        Returns:
            True if successful

        Raises:
            StorageError: If write fails
        """
        timestamp = datetime.now().strftime("%Y-%m-%d")
        entry = f"\n* [{timestamp}] {content}"

        try:
            # Create file if not exists
            if not self.memory_file.exists():
                self.memory_file.write_text("# MEMORY\n\n", encoding="utf-8")

            # Append entry
            with open(self.memory_file, "a", encoding="utf-8") as f:
                f.write(entry)
            return True
        except Exception as e:
            raise StorageError(
                f"Failed to write memory: {e}",
                context={"file": str(self.memory_file)},
            )

    def exists(self, identifier: str = "default") -> bool:
        """
        Check if memory file exists

        Args:
            identifier: "default" or "compressed"

        Returns:
            True if file exists
        """
        file_path = self.compressed_file if identifier == "compressed" else self.memory_file
        return file_path.exists()

    def write_compressed(self, content: str) -> bool:
        """
        Write compressed memory version

        Args:
            content: Compressed memory content

        Returns:
            True if successful

        Raises:
            StorageError: If write fails
        """
        try:
            self.compressed_file.write_text(content, encoding="utf-8")
            return True
        except Exception as e:
            raise StorageError(
                f"Failed to write compressed memory: {e}",
                context={"file": str(self.compressed_file)},
            )

    def parse_entries(self) -> List[Dict[str, str]]:
        """
        Parse memory file into structured entries

        Returns:
            List of entry dictionaries with 'date' and 'content' keys

        Example:
            >>> entries = repo.parse_entries()
            >>> for entry in entries:
            ...     print(f"{entry['date']}: {entry['content']}")
        """
        import re

        content = self.read()
        entries = []

        for line in content.split("\n"):
            line = line.strip()
            if line.startswith("*"):
                # Parse: * [2025-02-07] Entry text
                match = re.match(r"\*\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)", line)
                if match:
                    entries.append({
                        "date": match.group(1),
                        "content": match.group(2)
                    })

        return entries

    def get_metadata(self, identifier: str = "default") -> Optional[Dict[str, Any]]:
        """
        Get metadata about memory file

        Args:
            identifier: "default" or "compressed"

        Returns:
            Dictionary with size, modified date, entry count
        """
        file_path = self.compressed_file if identifier == "compressed" else self.memory_file

        if not file_path.exists():
            return None

        try:
            stat = file_path.stat()
            entries = self.parse_entries() if identifier == "default" else []

            return {
                "size_bytes": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "entry_count": len(entries),
            }
        except Exception:
            return None

    def search_entries(self, keyword: str) -> List[Dict[str, str]]:
        """
        Search for entries containing keyword

        Args:
            keyword: Search term

        Returns:
            Matching entries
        """
        entries = self.parse_entries()
        keyword_lower = keyword.lower()

        return [
            entry for entry in entries
            if keyword_lower in entry["content"].lower()
        ]

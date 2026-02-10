"""Archive Repository - Manages archived memory entries

Archive files follow YYYY-MM.md format in brain/archives/ directory.
Provides read/write/search operations for archived memories.

Author: TAIA (Phase D - Tiered Memory System)
Version: 1.0.0
"""

import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from .base import BaseRepository

logger = logging.getLogger(__name__)


class ArchiveRepository(BaseRepository):
    """
    Repository for archived memory entries

    Manages YYYY-MM.md archive files and maintains an INDEX.md
    for searchable metadata.

    Archive Structure:
    ```
    brain/archives/
    ├── 2026-01.md      (January 2026 archived entries)
    ├── 2026-02.md      (February 2026 archived entries)
    └── INDEX.md        (Metadata index: {month: count, size, etc.})
    ```

    Archive Entry Format:
    ```
    * [YYYY-MM-DD HH:MM:SS] [category] content
    ```
    """

    INDEX_FILENAME = "INDEX.md"
    ARCHIVE_FORMAT = "{year:04d}-{month:02d}.md"

    def __init__(self, archive_path: Path):
        """
        Initialize Archive Repository

        Args:
            archive_path: Path to brain/archives/ directory
        """
        super().__init__(archive_path)
        logger.info(f"[ArchiveRepository] Initialized at {self.base_path}")

    def read(self, identifier: str) -> Optional[str]:
        """
        Read archive file by identifier

        Args:
            identifier: Format 'YYYY-MM' (e.g., '2026-01')

        Returns:
            Archive content or None if not found
        """
        try:
            archive_file = self._get_archive_path(identifier)

            if not archive_file.exists():
                logger.warning(f"[ArchiveRepository] Archive not found: {identifier}")
                return None

            with open(archive_file, "r", encoding="utf-8") as f:
                content = f.read()

            logger.info(f"[ArchiveRepository] Read archive: {identifier} ({len(content)} bytes)")
            return content

        except Exception as e:
            logger.error(f"[ArchiveRepository] Read failed for {identifier}: {e}")
            return None

    def write(self, identifier: str, content: str) -> bool:
        """
        Write to archive file

        Args:
            identifier: Format 'YYYY-MM'
            content: Archive content to write

        Returns:
            True if successful, False otherwise
        """
        try:
            archive_file = self._get_archive_path(identifier)

            with open(archive_file, "a", encoding="utf-8") as f:
                f.write(content)

            logger.info(f"[ArchiveRepository] Appended to {identifier}")
            return True

        except Exception as e:
            logger.error(f"[ArchiveRepository] Write failed for {identifier}: {e}")
            return False

    def exists(self, identifier: str) -> bool:
        """
        Check if archive exists

        Args:
            identifier: Format 'YYYY-MM'

        Returns:
            True if archive file exists
        """
        archive_file = self._get_archive_path(identifier)
        return archive_file.exists()

    def append_entries(self, identifier: str, entries: List[Dict[str, Any]]) -> bool:
        """
        Append structured entries to archive

        Args:
            identifier: Format 'YYYY-MM'
            entries: List of memory entries with keys: timestamp, category, content

        Returns:
            True if successful
        """
        try:
            formatted_entries = []
            for entry in entries:
                timestamp = entry.get("timestamp", datetime.now().isoformat())
                category = entry.get("category", "general")
                content = entry.get("content", "")

                formatted_entries.append(f"* [{timestamp}] [{category}] {content}\n")

            # Join all entries
            full_content = "".join(formatted_entries)

            # Append to archive file
            return self.write(identifier, full_content)

        except Exception as e:
            logger.error(f"[ArchiveRepository] Append entries failed: {e}")
            return False

    def get_index(self) -> Dict[str, Any]:
        """
        Read archive index

        Returns:
            Dictionary with archive metadata
        """
        try:
            index_file = self.base_path / self.INDEX_FILENAME

            if not index_file.exists():
                logger.info("[ArchiveRepository] Index not found, returning empty")
                return {"archives": {}, "last_updated": datetime.now().isoformat()}

            content = index_file.read_text(encoding="utf-8")

            # Parse INDEX.md format (markdown table or JSON)
            # For now, return structured dict
            return {
                "archives": self._parse_index_content(content),
                "last_updated": datetime.fromtimestamp(index_file.stat().st_mtime).isoformat()
            }

        except Exception as e:
            logger.error(f"[ArchiveRepository] Get index failed: {e}")
            return {"archives": {}, "error": str(e)}

    def update_index(self, identifier: str, entry_count: int) -> bool:
        """
        Update archive index with new archive metadata

        Args:
            identifier: Format 'YYYY-MM'
            entry_count: Number of entries in archive

        Returns:
            True if successful
        """
        try:
            index_file = self.base_path / self.INDEX_FILENAME
            archive_file = self._get_archive_path(identifier)

            # Get current index
            index = self.get_index()

            # Update with new archive info
            if "archives" not in index:
                index["archives"] = {}

            archive_size_mb = archive_file.stat().st_size / (1024 * 1024) if archive_file.exists() else 0

            index["archives"][identifier] = {
                "entry_count": entry_count,
                "size_mb": round(archive_size_mb, 2),
                "created": datetime.now().isoformat()
            }

            index["last_updated"] = datetime.now().isoformat()

            # Write updated index
            index_content = f"""# Archive Index

Archive metadata for memory tiering system.

## Statistics
- Total Archives: {len(index['archives'])}
- Last Updated: {index['last_updated']}

## Archives
"""

            for arch_id, metadata in sorted(index["archives"].items()):
                index_content += f"\n- **{arch_id}**: {metadata['entry_count']} entries, {metadata['size_mb']}MB"

            with open(index_file, "w", encoding="utf-8") as f:
                f.write(index_content)

            logger.info(f"[ArchiveRepository] Updated index with {identifier}")
            return True

        except Exception as e:
            logger.error(f"[ArchiveRepository] Update index failed: {e}")
            return False

    def search_archives(self, keyword: str, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Search across all archive files

        Args:
            keyword: Search term
            start_date: Optional start date filter
            end_date: Optional end date filter

        Returns:
            List of matching entries
        """
        try:
            results = []

            # Get all archive files
            archive_files = sorted(self.base_path.glob("*.md"))

            for archive_file in archive_files:
                if archive_file.name == self.INDEX_FILENAME:
                    continue

                # Read archive content
                content = archive_file.read_text(encoding="utf-8")

                # Parse entries and search
                for line in content.split("\n"):
                    if keyword.lower() in line.lower():
                        # Parse entry: * [YYYY-MM-DD HH:MM:SS] [category] content
                        try:
                            parts = line.split("]")
                            if len(parts) >= 3:
                                timestamp_str = parts[0].replace("* [", "").strip()
                                category = parts[1].replace("[", "").strip()
                                entry_content = "]".join(parts[2:]).strip()

                                entry_date = datetime.fromisoformat(timestamp_str)

                                # Check date filters
                                if start_date and entry_date < start_date:
                                    continue
                                if end_date and entry_date > end_date:
                                    continue

                                results.append({
                                    "timestamp": timestamp_str,
                                    "category": category,
                                    "content": entry_content,
                                    "archive_file": archive_file.name
                                })
                        except Exception as parse_error:
                            logger.debug(f"Failed to parse line: {parse_error}")

            logger.info(f"[ArchiveRepository] Search found {len(results)} results for '{keyword}'")
            return results

        except Exception as e:
            logger.error(f"[ArchiveRepository] Search failed: {e}")
            return []

    def list_all_archives(self) -> List[str]:
        """
        List all archive identifiers

        Returns:
            List of archive IDs (YYYY-MM format)
        """
        try:
            archives = []

            for archive_file in sorted(self.base_path.glob("*.md")):
                if archive_file.name != self.INDEX_FILENAME:
                    # Extract YYYY-MM from filename
                    identifier = archive_file.stem
                    archives.append(identifier)

            return archives

        except Exception as e:
            logger.error(f"[ArchiveRepository] List archives failed: {e}")
            return []

    def get_metadata(self, identifier: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata for specific archive

        Args:
            identifier: Format 'YYYY-MM'

        Returns:
            Dictionary with size, created date, entry count
        """
        try:
            archive_file = self._get_archive_path(identifier)

            if not archive_file.exists():
                return None

            content = archive_file.read_text(encoding="utf-8")
            # Count entries: each line starting with "* [" is an entry
            entry_count = len([line for line in content.split("\n") if line.startswith("* [")])

            return {
                "size_bytes": archive_file.stat().st_size,
                "size_mb": round(archive_file.stat().st_size / (1024 * 1024), 2),
                "created": datetime.fromtimestamp(archive_file.stat().st_ctime).isoformat(),
                "modified": datetime.fromtimestamp(archive_file.stat().st_mtime).isoformat(),
                "entry_count": entry_count
            }

        except Exception as e:
            logger.error(f"[ArchiveRepository] Get metadata failed: {e}")
            return None

    # Helper methods

    def _get_archive_path(self, identifier: str) -> Path:
        """
        Get full path for archive file

        Args:
            identifier: Format 'YYYY-MM'

        Returns:
            Path to archive file
        """
        return self.base_path / f"{identifier}.md"

    def _parse_index_content(self, content: str) -> Dict[str, Any]:
        """
        Parse INDEX.md content into structured data

        Args:
            content: INDEX.md file content

        Returns:
            Dictionary of archive metadata
        """
        archives = {}

        for line in content.split("\n"):
            # Parse lines like: "- **2026-01**: 42 entries, 1.5MB"
            if line.startswith("- **"):
                try:
                    parts = line.split("**")
                    if len(parts) >= 2:
                        identifier = parts[1]
                        # Extract entry count
                        entry_count = 0
                        size_mb = 0.0

                        if "entries" in line:
                            entry_str = line.split(",")[0].split()[-2]
                            entry_count = int(entry_str)

                        if "MB" in line:
                            # Extract size from "1.5MB" format
                            size_str = line.split(",")[-1].strip().replace("MB", "").strip()
                            try:
                                size_mb = float(size_str)
                            except ValueError:
                                size_mb = 0.0

                        archives[identifier] = {
                            "entry_count": entry_count,
                            "size_mb": size_mb
                        }
                except Exception as parse_error:
                    logger.debug(f"Failed to parse index line: {parse_error}")

        return archives

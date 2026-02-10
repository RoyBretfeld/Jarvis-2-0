"""Archive Service - Memory Archival & Lifecycle Management

Implements 7/14/21-day tiering with automatic archival of old entries.

Author: TAIA (Phase D - Tiered Memory System)
Version: 1.0.0
"""

import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from src.repositories.memory_repo import MemoryRepository
from src.repositories.archive_repo import ArchiveRepository

logger = logging.getLogger(__name__)


class ArchiveService:
    """
    Memory Archival Service

    Manages lifecycle of memory entries:
    - Hot (0-7 days): Full detail
    - Warm (7-14 days): Summarized
    - Cold (14-21 days): Compressed
    - Archive (>21 days): Moved to archives/

    Archives are organized by month (YYYY-MM.md format).
    """

    def __init__(self, body_path: Path, archive_path: Path):
        """
        Initialize Archive Service

        Args:
            body_path: Path to body/ directory (for memory files)
            archive_path: Path to archives/ directory
        """
        self.body_path = Path(body_path)
        self.archive_path = Path(archive_path)

        # Initialize repositories
        self.memory_repo = MemoryRepository(self.body_path)
        self.archive_repo = ArchiveRepository(self.archive_path)

        logger.info(f"[ArchiveService] Initialized")
        logger.info(f"  Memory: {self.body_path}")
        logger.info(f"  Archive: {self.archive_path}")

    def archive_old_entries(self, older_than_days: int = 21) -> Dict[str, Any]:
        """
        Archive entries older than specified days

        Process:
        1. Parse all entries from MEMORY.md
        2. Identify entries older than threshold
        3. Move to archives/YYYY-MM.md
        4. Remove from MEMORY.md
        5. Update INDEX.md

        Args:
            older_than_days: Entries older than N days will be archived (default: 21)

        Returns:
            Dictionary with archive statistics:
            {
                "archived_count": 15,
                "files_created": ["2026-01.md", "2026-02.md"],
                "index_updated": True,
                "removed_from_memory": True
            }
        """
        try:
            logger.info(f"[ArchiveService] Starting archival (older than {older_than_days} days)")

            # 1. Read all memory entries
            memory_content = self.memory_repo.read("default")
            if not memory_content:
                logger.warning("[ArchiveService] No memory to archive")
                return {
                    "status": "OK",
                    "archived_count": 0,
                    "message": "No memory entries found"
                }

            # 2. Parse entries
            entries = self._parse_memory_entries(memory_content)
            logger.info(f"[ArchiveService] Found {len(entries)} total entries")

            # 3. Separate old vs recent
            cutoff_date = datetime.now() - timedelta(days=older_than_days)
            old_entries = [e for e in entries if self._parse_timestamp(e["timestamp"]) < cutoff_date]
            recent_entries = [e for e in entries if self._parse_timestamp(e["timestamp"]) >= cutoff_date]

            if not old_entries:
                logger.info("[ArchiveService] No entries to archive")
                return {
                    "status": "OK",
                    "archived_count": 0,
                    "message": f"All entries are newer than {older_than_days} days"
                }

            logger.info(f"[ArchiveService] Will archive {len(old_entries)} entries")

            # 4. Group by month and archive
            archive_groups = self._group_by_month(old_entries)
            created_files = []

            for month_id, month_entries in archive_groups.items():
                # Append to archive file
                success = self.archive_repo.append_entries(month_id, month_entries)

                if success:
                    # Update index
                    self.archive_repo.update_index(month_id, len(month_entries))
                    created_files.append(f"{month_id}.md")
                    logger.info(f"[ArchiveService] Archived {len(month_entries)} entries to {month_id}")

            # 5. Update MEMORY.md with only recent entries (replace, not append)
            updated_memory = self._format_entries_to_memory(recent_entries)
            memory_file = self.body_path / "MEMORY.md"
            try:
                # Write header + entries (replace entire file)
                with open(memory_file, "w", encoding="utf-8") as f:
                    f.write("# MEMORY\n\n")
                    f.write(updated_memory)
                memory_write_success = True
            except Exception as e:
                logger.error(f"[ArchiveService] Failed to write MEMORY.md: {e}")
                memory_write_success = False

            if memory_write_success:
                logger.info(f"[ArchiveService] Updated MEMORY.md (removed {len(old_entries)} entries)")
            else:
                logger.warning("[ArchiveService] Failed to update MEMORY.md")

            result = {
                "status": "SUCCESS",
                "archived_count": len(old_entries),
                "recent_count": len(recent_entries),
                "files_created": created_files,
                "memory_updated": memory_write_success
            }

            logger.info(f"[ArchiveService] Archival complete: {len(old_entries)} entries archived")
            return result

        except Exception as e:
            logger.error(f"[ArchiveService] Archive operation failed: {e}")
            return {
                "status": "ERROR",
                "error": str(e)
            }

    def get_archive_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive archive statistics

        Returns:
            {
                "total_archives": 5,
                "total_archived_entries": 1250,
                "oldest_archive": "2025-10.md",
                "newest_archive": "2026-02.md",
                "total_size_mb": 2.5,
                "archives": {
                    "2026-02": {
                        "entry_count": 100,
                        "size_mb": 0.5
                    }
                }
            }
        """
        try:
            archive_list = self.archive_repo.list_all_archives()

            if not archive_list:
                return {
                    "total_archives": 0,
                    "total_archived_entries": 0,
                    "total_size_mb": 0.0,
                    "archives": {}
                }

            total_entries = 0
            total_size_mb = 0.0
            archives_detail = {}

            for archive_id in archive_list:
                metadata = self.archive_repo.get_metadata(archive_id)

                if metadata:
                    total_entries += metadata["entry_count"]
                    total_size_mb += metadata["size_mb"]

                    archives_detail[archive_id] = {
                        "entry_count": metadata["entry_count"],
                        "size_mb": metadata["size_mb"]
                    }

            return {
                "total_archives": len(archive_list),
                "total_archived_entries": total_entries,
                "oldest_archive": archive_list[0] if archive_list else None,
                "newest_archive": archive_list[-1] if archive_list else None,
                "total_size_mb": round(total_size_mb, 2),
                "archives": archives_detail
            }

        except Exception as e:
            logger.error(f"[ArchiveService] Get stats failed: {e}")
            return {
                "error": str(e),
                "total_archives": 0,
                "total_size_mb": 0.0
            }

    def restore_from_archive(self, archive_id: str) -> Dict[str, Any]:
        """
        Restore archived entries back to MEMORY.md

        WARNING: This overwrites recent entries if there are conflicts!

        Args:
            archive_id: Format 'YYYY-MM'

        Returns:
            Dictionary with restore status
        """
        try:
            logger.warning(f"[ArchiveService] Restoring archive {archive_id}")

            # Read archived entries
            archive_content = self.archive_repo.read(archive_id)

            if not archive_content:
                logger.warning(f"[ArchiveService] Archive not found: {archive_id}")
                return {
                    "status": "ERROR",
                    "message": f"Archive {archive_id} not found"
                }

            # Parse archived entries
            archived_entries = self._parse_memory_entries(archive_content)

            # Read current memory
            current_memory = self.memory_repo.read("default") or ""
            current_entries = self._parse_memory_entries(current_memory)

            # Merge: add archived entries to current
            merged_entries = current_entries + archived_entries
            merged_entries.sort(key=lambda e: e["timestamp"])

            # Write back to memory (replace file)
            merged_content = self._format_entries_to_memory(merged_entries)
            memory_file = self.body_path / "MEMORY.md"
            try:
                with open(memory_file, "w", encoding="utf-8") as f:
                    f.write("# MEMORY\n\n")
                    f.write(merged_content)
                success = True
            except Exception as e:
                logger.error(f"[ArchiveService] Failed to write merged memory: {e}")
                success = False

            if success:
                logger.info(f"[ArchiveService] Restored {len(archived_entries)} entries from {archive_id}")
                return {
                    "status": "SUCCESS",
                    "restored_count": len(archived_entries),
                    "total_entries": len(merged_entries)
                }
            else:
                return {
                    "status": "ERROR",
                    "message": "Failed to write to MEMORY.md"
                }

        except Exception as e:
            logger.error(f"[ArchiveService] Restore failed: {e}")
            return {
                "status": "ERROR",
                "error": str(e)
            }

    # Helper Methods

    def _parse_memory_entries(self, content: str) -> List[Dict[str, str]]:
        """
        Parse memory entries from markdown format

        Format: * [YYYY-MM-DD HH:MM:SS] [category] content

        Args:
            content: Markdown content with entries

        Returns:
            List of parsed entry dictionaries
        """
        entries = []

        for line in content.split("\n"):
            line = line.strip()

            if line.startswith("* ["):
                try:
                    # Parse: * [timestamp] [category] content
                    parts = line.split("]")

                    if len(parts) >= 3:
                        timestamp = parts[0].replace("* [", "").strip()
                        category = parts[1].replace("[", "").strip()
                        entry_content = "]".join(parts[2:]).strip()

                        entries.append({
                            "timestamp": timestamp,
                            "category": category,
                            "content": entry_content
                        })
                except Exception as e:
                    logger.debug(f"Failed to parse entry: {e}")

        return entries

    def _format_entries_to_memory(self, entries: List[Dict[str, str]]) -> str:
        """
        Format entries back to markdown format

        Args:
            entries: List of entry dictionaries

        Returns:
            Markdown formatted content
        """
        lines = []

        for entry in entries:
            timestamp = entry.get("timestamp", "")
            category = entry.get("category", "general")
            content = entry.get("content", "")

            line = f"* [{timestamp}] [{category}] {content}"
            lines.append(line)

        return "\n".join(lines) + "\n" if lines else ""

    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """
        Parse timestamp string to datetime

        Args:
            timestamp_str: Format 'YYYY-MM-DD HH:MM:SS'

        Returns:
            Datetime object
        """
        try:
            return datetime.fromisoformat(timestamp_str)
        except Exception as e:
            logger.warning(f"Failed to parse timestamp: {e}")
            return datetime.now()

    def _group_by_month(self, entries: List[Dict[str, str]]) -> Dict[str, List[Dict[str, str]]]:
        """
        Group entries by month

        Args:
            entries: List of entry dictionaries

        Returns:
            Dictionary mapping 'YYYY-MM' to list of entries
        """
        groups = {}

        for entry in entries:
            timestamp_str = entry.get("timestamp", "")

            try:
                # Extract YYYY-MM from timestamp
                date_part = timestamp_str.split()[0]  # "2026-01-15"
                month_id = date_part[:7]  # "2026-01"

                if month_id not in groups:
                    groups[month_id] = []

                groups[month_id].append(entry)
            except Exception as e:
                logger.debug(f"Failed to group entry: {e}")

        return groups

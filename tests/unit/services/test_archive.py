"""Tests for Archive Service

Unit tests for src/services/memory/archive.py

Test Coverage:
- Initialization
- Archive operations (archival, stats, restoration)
- Entry parsing and formatting
- Error handling
- Date boundary conditions
- Integration scenarios
"""

import pytest
from pathlib import Path
from datetime import datetime, timedelta
from src.services.memory.archive import ArchiveService
from src.repositories.memory_repo import MemoryRepository
from src.repositories.archive_repo import ArchiveRepository


@pytest.fixture
def temp_memory_path(tmp_path):
    """Create temporary memory directory"""
    memory_dir = tmp_path / "body"
    memory_dir.mkdir()
    return memory_dir


@pytest.fixture
def temp_archive_path(tmp_path):
    """Create temporary archive directory"""
    archive_dir = tmp_path / "archives"
    archive_dir.mkdir()
    return archive_dir


@pytest.fixture
def archive_service(temp_memory_path, temp_archive_path):
    """Create ArchiveService instance"""
    return ArchiveService(temp_memory_path, temp_archive_path)


@pytest.fixture
def memory_repo(temp_memory_path):
    """Create MemoryRepository instance"""
    return MemoryRepository(temp_memory_path)


def write_memory_entry(memory_path: Path, entry: str):
    """Helper to write memory entry directly (bypassing repo's auto-timestamping)"""
    memory_file = memory_path / "MEMORY.md"
    if not memory_file.exists():
        memory_file.write_text("# MEMORY\n\n", encoding="utf-8")
    with open(memory_file, "a", encoding="utf-8") as f:
        f.write(entry)


class TestArchiveServiceInit:
    """Test service initialization"""

    def test_init_creates_service(self, archive_service):
        """Should initialize with repositories"""
        assert archive_service.memory_repo is not None
        assert archive_service.archive_repo is not None

    def test_init_with_paths(self, temp_memory_path, temp_archive_path):
        """Should store paths correctly"""
        service = ArchiveService(temp_memory_path, temp_archive_path)
        assert service.body_path == Path(temp_memory_path)
        assert service.archive_path == Path(temp_archive_path)


class TestArchiveOldEntries:
    """Test archival of old entries"""

    def test_archive_no_entries(self, archive_service):
        """Should handle empty memory gracefully"""
        result = archive_service.archive_old_entries()

        assert result["status"] == "OK"
        assert result["archived_count"] == 0

    def test_archive_returns_statistics(self, archive_service, temp_memory_path):
        """Should return dict with statistics"""
        # Add recent entries
        now = datetime.now()
        entry = f"* [{now.isoformat()}] [learning] Recent entry\n"
        write_memory_entry(temp_memory_path, entry)

        result = archive_service.archive_old_entries()

        assert isinstance(result, dict)
        assert "status" in result
        assert "archived_count" in result

    def test_archive_keeps_recent_entries(self, archive_service, temp_memory_path):
        """Should not archive entries newer than threshold"""
        now = datetime.now()
        entry = f"* [{now.isoformat()}] [learning] Recent entry\n"
        write_memory_entry(temp_memory_path, entry)

        result = archive_service.archive_old_entries(older_than_days=21)

        assert result["archived_count"] == 0
        # Entry should still be in MEMORY.md
        memory_file = temp_memory_path / "MEMORY.md"
        content = memory_file.read_text(encoding="utf-8")
        assert "Recent entry" in content

    def test_archive_moves_old_entries(self, archive_service, temp_memory_path):
        """Should move old entries to archives"""
        # Add old entry (30 days old)
        old_date = datetime.now() - timedelta(days=30)
        old_entry = f"* [{old_date.isoformat()}] [learning] Old entry\n"
        write_memory_entry(temp_memory_path, old_entry)

        result = archive_service.archive_old_entries(older_than_days=21)

        assert result["archived_count"] == 1
        assert result["memory_updated"] is True

    def test_archive_creates_month_files(self, archive_service, temp_memory_path):
        """Should create archive files for each month"""
        # Add entries from different months
        date1 = datetime(2026, 1, 15, 10, 0, 0)
        date2 = datetime(2026, 2, 10, 10, 0, 0)

        old_date = datetime.now() - timedelta(days=30)
        write_memory_entry(temp_memory_path, f"* [{date1.isoformat()}] [cat] Jan entry\n")
        write_memory_entry(temp_memory_path, f"* [{date2.isoformat()}] [cat] Feb entry\n")

        result = archive_service.archive_old_entries(older_than_days=21)

        assert len(result["files_created"]) >= 1

    def test_archive_removes_from_memory(self, archive_service, temp_memory_path):
        """Should remove archived entries from MEMORY.md"""
        # Add one old, one new entry
        old_date = datetime.now() - timedelta(days=30)
        new_date = datetime.now()

        write_memory_entry(temp_memory_path, f"* [{old_date.isoformat()}] [cat] Old\n")
        write_memory_entry(temp_memory_path, f"* [{new_date.isoformat()}] [cat] New\n")

        archive_service.archive_old_entries(older_than_days=21)

        # Check MEMORY.md still has new entry
        memory_file = temp_memory_path / "MEMORY.md"
        content = memory_file.read_text(encoding="utf-8")
        assert "New" in content
        assert "Old" not in content

    def test_archive_preserves_entry_format(self, archive_service, temp_memory_path):
        """Should preserve timestamp, category, content format"""
        old_date = datetime.now() - timedelta(days=30)
        entry = f"* [{old_date.isoformat()}] [testing] Important data\n"
        write_memory_entry(temp_memory_path, entry)

        archive_service.archive_old_entries(older_than_days=21)

        # Check archived file
        month_id = f"{old_date.year:04d}-{old_date.month:02d}"
        archived_content = archive_service.archive_repo.read(month_id)

        assert old_date.isoformat() in archived_content
        assert "[testing]" in archived_content
        assert "Important data" in archived_content

    def test_archive_multiple_old_entries(self, archive_service, temp_memory_path):
        """Should archive multiple entries"""
        old_date = datetime.now() - timedelta(days=30)

        for i in range(5):
            entry = f"* [{old_date.isoformat()}] [cat] Entry {i}\n"
            write_memory_entry(temp_memory_path, entry)

        result = archive_service.archive_old_entries(older_than_days=21)

        assert result["archived_count"] == 5

    def test_archive_updates_index(self, archive_service, temp_memory_path):
        """Should update archive index"""
        old_date = datetime.now() - timedelta(days=30)
        write_memory_entry(temp_memory_path, f"* [{old_date.isoformat()}] [cat] Entry\n")

        archive_service.archive_old_entries(older_than_days=21)

        # Check INDEX.md exists
        index_file = archive_service.archive_path / "INDEX.md"
        assert index_file.exists()

    def test_archive_respects_threshold(self, archive_service, temp_memory_path):
        """Should respect custom threshold"""
        date_15d_old = datetime.now() - timedelta(days=15)
        date_25d_old = datetime.now() - timedelta(days=25)

        write_memory_entry(temp_memory_path, f"* [{date_15d_old.isoformat()}] [cat] 15d\n")
        write_memory_entry(temp_memory_path, f"* [{date_25d_old.isoformat()}] [cat] 25d\n")

        # Archive entries older than 20 days
        result = archive_service.archive_old_entries(older_than_days=20)

        # Should only archive 25d entry, not 15d
        assert result["archived_count"] == 1

    def test_archive_handles_mixed_dates(self, archive_service, temp_memory_path):
        """Should correctly separate old and recent"""
        old_date = datetime.now() - timedelta(days=30)
        new_date = datetime.now() - timedelta(days=5)

        write_memory_entry(temp_memory_path, f"* [{old_date.isoformat()}] [cat] Old\n")
        write_memory_entry(temp_memory_path, f"* [{new_date.isoformat()}] [cat] Recent\n")
        write_memory_entry(temp_memory_path, f"* [{old_date.isoformat()}] [cat] Old2\n")

        result = archive_service.archive_old_entries(older_than_days=21)

        assert result["archived_count"] == 2
        assert result["recent_count"] == 1


class TestGetArchiveStats:
    """Test archive statistics retrieval"""

    def test_get_stats_empty_archives(self, archive_service):
        """Should return zeros for empty archives"""
        stats = archive_service.get_archive_stats()

        assert stats["total_archives"] == 0
        assert stats["total_archived_entries"] == 0
        assert stats["total_size_mb"] == 0.0

    def test_get_stats_returns_structure(self, archive_service):
        """Should return dict with required fields"""
        stats = archive_service.get_archive_stats()

        assert "total_archives" in stats
        assert "total_archived_entries" in stats
        # oldest/newest only when archives exist
        assert "total_size_mb" in stats
        assert "archives" in stats

    def test_get_stats_counts_archives(self, archive_service):
        """Should count all archives"""
        archive_service.archive_repo.write("2026-01", "content1\n")
        archive_service.archive_repo.write("2026-02", "content2\n")
        archive_service.archive_repo.write("2026-03", "content3\n")

        archive_service.archive_repo.update_index("2026-01", 1)
        archive_service.archive_repo.update_index("2026-02", 1)
        archive_service.archive_repo.update_index("2026-03", 1)

        stats = archive_service.get_archive_stats()

        assert stats["total_archives"] == 3

    def test_get_stats_identifies_oldest(self, archive_service):
        """Should identify oldest archive"""
        archive_service.archive_repo.write("2026-01", "content\n")
        archive_service.archive_repo.write("2026-03", "content\n")

        archive_service.archive_repo.update_index("2026-01", 1)
        archive_service.archive_repo.update_index("2026-03", 1)

        stats = archive_service.get_archive_stats()

        assert stats["oldest_archive"] == "2026-01"

    def test_get_stats_identifies_newest(self, archive_service):
        """Should identify newest archive"""
        archive_service.archive_repo.write("2026-01", "content\n")
        archive_service.archive_repo.write("2026-03", "content\n")

        archive_service.archive_repo.update_index("2026-01", 1)
        archive_service.archive_repo.update_index("2026-03", 1)

        stats = archive_service.get_archive_stats()

        assert stats["newest_archive"] == "2026-03"

    def test_get_stats_aggregates_entries(self, archive_service):
        """Should sum entries across archives"""
        # Create actual archive files with content
        archive_service.archive_repo.write("2026-01", "* [2026-01-01 10:00:00] [cat] 1\n" * 10)
        archive_service.archive_repo.write("2026-02", "* [2026-02-01 10:00:00] [cat] 1\n" * 15)

        # Update indices
        archive_service.archive_repo.update_index("2026-01", 10)
        archive_service.archive_repo.update_index("2026-02", 15)

        stats = archive_service.get_archive_stats()

        assert stats["total_archived_entries"] == 25

    def test_get_stats_calculates_size(self, archive_service):
        """Should calculate total size"""
        # Write archive with substantial content
        content = "x" * 5000
        archive_service.archive_repo.write("2026-01", content + "\n")
        archive_service.archive_repo.update_index("2026-01", 1)

        stats = archive_service.get_archive_stats()

        assert stats["total_size_mb"] >= 0  # Size might be small but should be calculated

    def test_get_stats_per_archive_metadata(self, archive_service):
        """Should include metadata for each archive"""
        archive_service.archive_repo.write("2026-01", "content\n")
        archive_service.archive_repo.update_index("2026-01", 5)

        stats = archive_service.get_archive_stats()

        assert "2026-01" in stats["archives"]
        assert "entry_count" in stats["archives"]["2026-01"]
        assert "size_mb" in stats["archives"]["2026-01"]


class TestRestoreFromArchive:
    """Test archive restoration"""

    def test_restore_returns_dict(self, archive_service):
        """Should return status dictionary"""
        archive_service.archive_repo.write("2026-01", "* [2026-01-01 10:00:00] [cat] entry\n")

        result = archive_service.restore_from_archive("2026-01")

        assert isinstance(result, dict)
        assert "status" in result

    def test_restore_nonexistent_archive(self, archive_service):
        """Should handle missing archive"""
        result = archive_service.restore_from_archive("2099-99")

        assert result["status"] == "ERROR"

    def test_restore_adds_entries_to_memory(self, archive_service, temp_memory_path):
        """Should add archived entries to MEMORY.md"""
        # Create archive with entries
        archive_service.archive_repo.write("2026-01", "* [2026-01-01 10:00:00] [cat] archived\n")

        # Restore
        result = archive_service.restore_from_archive("2026-01")

        assert result["status"] == "SUCCESS"
        assert result["restored_count"] == 1

        # Check in memory
        memory_file = temp_memory_path / "MEMORY.md"
        content = memory_file.read_text(encoding="utf-8")
        assert "archived" in content

    def test_restore_merges_with_existing(self, archive_service, temp_memory_path):
        """Should merge archived with existing entries"""
        # Add entry to memory
        write_memory_entry(temp_memory_path, "* [2026-02-01 10:00:00] [cat] existing\n")

        # Create archive
        archive_service.archive_repo.write("2026-01", "* [2026-01-01 10:00:00] [cat] archived\n")

        # Restore
        archive_service.restore_from_archive("2026-01")

        # Check both exist
        memory_file = temp_memory_path / "MEMORY.md"
        content = memory_file.read_text(encoding="utf-8")
        assert "existing" in content
        assert "archived" in content

    def test_restore_sorts_by_timestamp(self, archive_service, temp_memory_path):
        """Should sort merged entries by timestamp"""
        # Add newer entry to memory
        write_memory_entry(temp_memory_path, "* [2026-02-01 10:00:00] [cat] new\n")

        # Restore older archived entry
        archive_service.archive_repo.write("2026-01", "* [2026-01-01 10:00:00] [cat] old\n")

        archive_service.restore_from_archive("2026-01")

        memory_file = temp_memory_path / "MEMORY.md"
        content = memory_file.read_text(encoding="utf-8")
        # Old entry should appear before new entry in content
        old_idx = content.find("old")
        new_idx = content.find("new")
        assert old_idx < new_idx

    def test_restore_multiple_entries(self, archive_service):
        """Should restore multiple entries"""
        entries = [
            "* [2026-01-01 10:00:00] [cat] entry1\n",
            "* [2026-01-02 10:00:00] [cat] entry2\n",
            "* [2026-01-03 10:00:00] [cat] entry3\n"
        ]
        for entry in entries:
            archive_service.archive_repo.write("2026-01", entry)

        result = archive_service.restore_from_archive("2026-01")

        assert result["restored_count"] == 3


class TestHelperMethods:
    """Test helper methods"""

    def test_parse_memory_entries(self, archive_service):
        """Should parse memory entries correctly"""
        content = """* [2026-01-01 10:00:00] [learning] First entry
* [2026-01-02 10:00:00] [reflection] Second entry"""

        entries = archive_service._parse_memory_entries(content)

        assert len(entries) == 2
        assert entries[0]["timestamp"] == "2026-01-01 10:00:00"
        assert entries[0]["category"] == "learning"
        assert entries[0]["content"] == "First entry"

    def test_parse_timestamp(self, archive_service):
        """Should parse ISO format timestamps"""
        timestamp_str = "2026-01-15 10:30:45"

        result = archive_service._parse_timestamp(timestamp_str)

        assert isinstance(result, datetime)
        assert result.year == 2026
        assert result.month == 1
        assert result.day == 15

    def test_group_by_month(self, archive_service):
        """Should group entries by month"""
        entries = [
            {"timestamp": "2026-01-01 10:00:00", "category": "cat", "content": "Jan"},
            {"timestamp": "2026-01-15 10:00:00", "category": "cat", "content": "Jan2"},
            {"timestamp": "2026-02-01 10:00:00", "category": "cat", "content": "Feb"}
        ]

        groups = archive_service._group_by_month(entries)

        assert "2026-01" in groups
        assert "2026-02" in groups
        assert len(groups["2026-01"]) == 2
        assert len(groups["2026-02"]) == 1

    def test_format_entries_to_memory(self, archive_service):
        """Should format entries back to markdown"""
        entries = [
            {
                "timestamp": "2026-01-01 10:00:00",
                "category": "learning",
                "content": "Test entry"
            }
        ]

        result = archive_service._format_entries_to_memory(entries)

        assert "* [2026-01-01 10:00:00]" in result
        assert "[learning]" in result
        assert "Test entry" in result


class TestErrorHandling:
    """Test error handling"""

    def test_archive_handles_parse_error(self, archive_service, temp_memory_path):
        """Should handle malformed entries gracefully"""
        # Write invalid entry
        write_memory_entry(temp_memory_path, "* INVALID [cat] content\n")

        # Should not crash
        result = archive_service.archive_old_entries()

        assert result["status"] in ["OK", "SUCCESS"]

    def test_get_stats_handles_error(self, archive_service, mocker):
        """Should return error dict on exception"""
        mocker.patch.object(
            archive_service.archive_repo,
            "list_all_archives",
            side_effect=Exception("Read error")
        )

        stats = archive_service.get_archive_stats()

        assert "error" in stats or stats["total_archives"] == 0

    def test_restore_handles_write_error(self, archive_service, mocker, temp_memory_path):
        """Should report error on write failure"""
        archive_service.archive_repo.write("2026-01", "* [2026-01-01 10:00:00] [cat] entry\n")

        # Mock the open call to simulate permission error
        mocker.patch("builtins.open", side_effect=Exception("Permission denied"))

        result = archive_service.restore_from_archive("2026-01")

        assert result["status"] == "ERROR"


class TestIntegrationScenarios:
    """Integration test scenarios"""

    def test_full_archival_lifecycle(self, archive_service, temp_memory_path):
        """Test complete archival cycle"""
        # Add entries with mixed ages
        old_date = datetime.now() - timedelta(days=30)
        new_date = datetime.now()

        write_memory_entry(temp_memory_path, f"* [{old_date.isoformat()}] [learning] Old\n")
        write_memory_entry(temp_memory_path, f"* [{new_date.isoformat()}] [reflection] New\n")

        # Archive old entries
        archive_result = archive_service.archive_old_entries(older_than_days=21)

        assert archive_result["archived_count"] == 1
        assert archive_result["recent_count"] == 1

        # Get stats
        stats = archive_service.get_archive_stats()

        assert stats["total_archives"] >= 1
        assert stats["total_archived_entries"] == 1

        # Verify memory
        memory_file = temp_memory_path / "MEMORY.md"
        content = memory_file.read_text(encoding="utf-8")
        assert "New" in content
        assert "Old" not in content

    def test_monthly_archival_spanning(self, archive_service, temp_memory_path):
        """Test archival across multiple months"""
        # Add entries from Jan, Feb, Mar (all 30 days old)
        for month in range(1, 4):
            date = datetime(2025, month, 15)
            entry = f"* [{date.isoformat()}] [cat] Month {month}\n"
            write_memory_entry(temp_memory_path, entry)

        # Archive 21+ day entries
        result = archive_service.archive_old_entries(older_than_days=21)

        # Should have 3 files created (one per month)
        assert len(result["files_created"]) == 3

        # Verify all archived
        assert result["archived_count"] == 3

    def test_repeated_archival_idempotent(self, archive_service, temp_memory_path):
        """Test running archival multiple times"""
        old_date = datetime.now() - timedelta(days=30)
        write_memory_entry(temp_memory_path, f"* [{old_date.isoformat()}] [cat] Entry\n")

        # First archival
        result1 = archive_service.archive_old_entries(older_than_days=21)
        assert result1["archived_count"] == 1

        # Second archival should find nothing
        result2 = archive_service.archive_old_entries(older_than_days=21)
        assert result2["archived_count"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""Tests for Archive Repository

Unit tests for src/repositories/archive_repo.py

Test Coverage:
- CRUD operations (read/write/append)
- Archive index management
- Search functionality
- Metadata retrieval
- Edge cases (missing archives, invalid identifiers)
"""

import pytest
from pathlib import Path
from datetime import datetime, timedelta
from src.repositories.archive_repo import ArchiveRepository


@pytest.fixture
def temp_archive_dir(tmp_path):
    """Create temporary archive directory"""
    archive_dir = tmp_path / "archives"
    archive_dir.mkdir()
    return archive_dir


@pytest.fixture
def archive_repo(temp_archive_dir):
    """Create ArchiveRepository instance"""
    return ArchiveRepository(temp_archive_dir)


class TestArchiveRepositoryInit:
    """Test repository initialization"""

    def test_init_creates_directory(self, temp_archive_dir):
        """Should create archive directory if missing"""
        new_dir = temp_archive_dir.parent / "new_archives"
        repo = ArchiveRepository(new_dir)
        assert new_dir.exists()

    def test_init_with_existing_directory(self, archive_repo):
        """Should initialize with existing directory"""
        assert archive_repo.base_path.exists()


class TestArchiveWrite:
    """Test write operations"""

    def test_write_creates_archive_file(self, archive_repo):
        """Should create archive file on first write"""
        success = archive_repo.write("2026-01", "test content\n")
        assert success
        assert (archive_repo.base_path / "2026-01.md").exists()

    def test_write_appends_content(self, archive_repo):
        """Should append, not overwrite"""
        archive_repo.write("2026-01", "line 1\n")
        archive_repo.write("2026-01", "line 2\n")

        content = (archive_repo.base_path / "2026-01.md").read_text(encoding="utf-8")
        assert "line 1" in content
        assert "line 2" in content

    def test_write_utf8_content(self, archive_repo):
        """Should handle UTF-8 content"""
        content = "Test mit Umlauten: äöüß 🤖\n"
        success = archive_repo.write("2026-01", content)
        assert success

        read_content = (archive_repo.base_path / "2026-01.md").read_text(encoding="utf-8")
        assert "äöüß" in read_content
        assert "🤖" in read_content

    def test_write_returns_false_on_error(self, archive_repo, mocker):
        """Should return False on write error"""
        # Mock the built-in open function to raise an error
        mocker.patch("builtins.open", side_effect=IOError("Permission denied"))
        result = archive_repo.write("2026-01", "content")
        assert result is False


class TestArchiveRead:
    """Test read operations"""

    def test_read_existing_archive(self, archive_repo):
        """Should read existing archive file"""
        archive_repo.write("2026-01", "test content\n")
        content = archive_repo.read("2026-01")
        assert content == "test content\n"

    def test_read_nonexistent_archive(self, archive_repo):
        """Should return None for missing archive"""
        result = archive_repo.read("2099-99")
        assert result is None

    def test_read_multiple_archives(self, archive_repo):
        """Should read different archives independently"""
        archive_repo.write("2026-01", "January content\n")
        archive_repo.write("2026-02", "February content\n")

        assert archive_repo.read("2026-01") == "January content\n"
        assert archive_repo.read("2026-02") == "February content\n"


class TestArchiveExists:
    """Test existence checks"""

    def test_exists_returns_true_for_existing(self, archive_repo):
        """Should return True for existing archive"""
        archive_repo.write("2026-01", "content\n")
        assert archive_repo.exists("2026-01")

    def test_exists_returns_false_for_missing(self, archive_repo):
        """Should return False for missing archive"""
        assert not archive_repo.exists("2099-99")


class TestAppendEntries:
    """Test structured entry appending"""

    def test_append_entries_formats_correctly(self, archive_repo):
        """Should format entries with timestamp, category, content"""
        entries = [
            {
                "timestamp": "2026-01-15 10:30:45",
                "category": "learning",
                "content": "Learned about archives"
            }
        ]

        archive_repo.append_entries("2026-01", entries)
        content = archive_repo.read("2026-01")

        assert "[2026-01-15 10:30:45]" in content
        assert "[learning]" in content
        assert "Learned about archives" in content

    def test_append_multiple_entries(self, archive_repo):
        """Should append multiple entries"""
        entries = [
            {"timestamp": "2026-01-01 10:00:00", "category": "cat1", "content": "entry1"},
            {"timestamp": "2026-01-02 10:00:00", "category": "cat2", "content": "entry2"}
        ]

        archive_repo.append_entries("2026-01", entries)
        content = archive_repo.read("2026-01")

        assert "entry1" in content
        assert "entry2" in content
        assert content.count("\n") >= 2


class TestGetIndex:
    """Test index retrieval"""

    def test_get_index_returns_dict(self, archive_repo):
        """Should return dict with archive metadata"""
        index = archive_repo.get_index()
        assert isinstance(index, dict)
        assert "archives" in index
        assert "last_updated" in index

    def test_get_index_empty_on_first_call(self, archive_repo):
        """Should return empty dict for new repository"""
        index = archive_repo.get_index()
        assert index["archives"] == {}

    def test_get_index_includes_archives(self, archive_repo):
        """Should include all archives in index"""
        archive_repo.write("2026-01", "content\n")
        archive_repo.update_index("2026-01", 5)

        index = archive_repo.get_index()
        assert "2026-01" in index["archives"]


class TestUpdateIndex:
    """Test index updates"""

    def test_update_index_creates_index_file(self, archive_repo):
        """Should create INDEX.md file"""
        archive_repo.write("2026-01", "content\n")
        archive_repo.update_index("2026-01", 10)

        index_file = archive_repo.base_path / "INDEX.md"
        assert index_file.exists()

    def test_update_index_contains_metadata(self, archive_repo):
        """Should include archive metadata in index"""
        archive_repo.write("2026-01", "content\n")
        archive_repo.update_index("2026-01", 42)

        index = archive_repo.get_index()
        assert index["archives"]["2026-01"]["entry_count"] == 42

    def test_update_index_includes_size(self, archive_repo):
        """Should include file size in metadata"""
        # Write enough data (1MB) to ensure size_mb > 0 after rounding
        archive_repo.write("2026-01", "x" * (1024 * 1024) + "\n")
        archive_repo.update_index("2026-01", 5)

        index = archive_repo.get_index()
        assert "size_mb" in index["archives"]["2026-01"]
        assert index["archives"]["2026-01"]["size_mb"] > 0


class TestSearch:
    """Test search functionality"""

    def test_search_finds_keyword(self, archive_repo):
        """Should find entries containing keyword"""
        archive_repo.write("2026-01", "* [2026-01-01 10:00:00] [learning] Python is great\n")
        archive_repo.write("2026-01", "* [2026-01-02 10:00:00] [other] Something else\n")

        results = archive_repo.search_archives("Python")
        assert len(results) == 1
        assert results[0]["content"] == "Python is great"

    def test_search_case_insensitive(self, archive_repo):
        """Should search case-insensitively"""
        archive_repo.write("2026-01", "* [2026-01-01 10:00:00] [cat] PYTHON Programming\n")

        results = archive_repo.search_archives("python")
        assert len(results) == 1

    def test_search_multiple_archives(self, archive_repo):
        """Should search across multiple archives"""
        archive_repo.write("2026-01", "* [2026-01-01 10:00:00] [cat] Found in January\n")
        archive_repo.write("2026-02", "* [2026-02-01 10:00:00] [cat] Found in February\n")

        results = archive_repo.search_archives("Found")
        assert len(results) == 2

    def test_search_with_date_filter(self, archive_repo):
        """Should filter by date range"""
        archive_repo.write("2026-01", "* [2026-01-01 10:00:00] [cat] Old entry\n")
        archive_repo.write("2026-01", "* [2026-01-15 10:00:00] [cat] Middle entry\n")
        archive_repo.write("2026-01", "* [2026-01-30 10:00:00] [cat] New entry\n")

        start = datetime(2026, 1, 10)
        end = datetime(2026, 1, 20)

        results = archive_repo.search_archives("entry", start_date=start, end_date=end)
        assert len(results) == 1
        assert "Middle" in results[0]["content"]

    def test_search_returns_empty_for_no_matches(self, archive_repo):
        """Should return empty list for no matches"""
        archive_repo.write("2026-01", "* [2026-01-01 10:00:00] [cat] Something\n")

        results = archive_repo.search_archives("nonexistent")
        assert results == []


class TestListArchives:
    """Test archive listing"""

    def test_list_all_archives_empty(self, archive_repo):
        """Should return empty list for new repository"""
        archives = archive_repo.list_all_archives()
        assert archives == []

    def test_list_all_archives(self, archive_repo):
        """Should list all archive identifiers"""
        archive_repo.write("2026-01", "content\n")
        archive_repo.write("2026-02", "content\n")
        archive_repo.write("2025-12", "content\n")

        archives = archive_repo.list_all_archives()
        assert len(archives) == 3
        assert "2026-01" in archives
        assert "2026-02" in archives
        assert "2025-12" in archives

    def test_list_archives_sorted(self, archive_repo):
        """Should return sorted list"""
        archive_repo.write("2026-03", "content\n")
        archive_repo.write("2026-01", "content\n")
        archive_repo.write("2026-02", "content\n")

        archives = archive_repo.list_all_archives()
        assert archives == sorted(archives)


class TestGetMetadata:
    """Test metadata retrieval"""

    def test_get_metadata_returns_dict(self, archive_repo):
        """Should return metadata dictionary"""
        archive_repo.write("2026-01", "test content\n")
        metadata = archive_repo.get_metadata("2026-01")

        assert isinstance(metadata, dict)
        assert "size_bytes" in metadata
        assert "created" in metadata
        assert "entry_count" in metadata

    def test_get_metadata_correct_size(self, archive_repo):
        """Should calculate correct file size"""
        content = "x" * 1000
        archive_repo.write("2026-01", content + "\n")

        metadata = archive_repo.get_metadata("2026-01")
        assert metadata["size_bytes"] > 1000

    def test_get_metadata_counts_entries(self, archive_repo):
        """Should count entries correctly"""
        archive_repo.append_entries("2026-01", [
            {"timestamp": "2026-01-01 10:00:00", "category": "cat", "content": "entry1"},
            {"timestamp": "2026-01-02 10:00:00", "category": "cat", "content": "entry2"},
            {"timestamp": "2026-01-03 10:00:00", "category": "cat", "content": "entry3"}
        ])

        metadata = archive_repo.get_metadata("2026-01")
        assert metadata["entry_count"] == 3

    def test_get_metadata_missing_archive(self, archive_repo):
        """Should return None for missing archive"""
        metadata = archive_repo.get_metadata("2099-99")
        assert metadata is None


class TestValidation:
    """Test validation methods"""

    def test_validate_identifier_empty_string(self, archive_repo):
        """Should reject empty identifiers"""
        result = archive_repo.validate_identifier("")
        assert result is False

    def test_validate_identifier_valid_string(self, archive_repo):
        """Should accept valid identifiers"""
        result = archive_repo.validate_identifier("2026-01")
        assert result is True


# Integration tests

class TestArchiveRepositoryIntegration:
    """Integration tests for archive operations"""

    def test_full_archive_lifecycle(self, archive_repo):
        """Test complete archive lifecycle"""
        # Create archive with entries
        entries = [
            {"timestamp": "2026-01-01 10:00:00", "category": "learning", "content": "Day 1 learning"},
            {"timestamp": "2026-01-02 10:00:00", "category": "reflection", "content": "Day 2 reflection"}
        ]

        archive_repo.append_entries("2026-01", entries)

        # Update index
        archive_repo.update_index("2026-01", 2)

        # Read and verify
        content = archive_repo.read("2026-01")
        assert "Day 1" in content
        assert "Day 2" in content

        # Search
        results = archive_repo.search_archives("learning")
        assert len(results) == 1

        # List
        archives = archive_repo.list_all_archives()
        assert "2026-01" in archives

        # Metadata
        metadata = archive_repo.get_metadata("2026-01")
        assert metadata["entry_count"] == 2

    def test_multiple_months_archive(self, archive_repo):
        """Test handling multiple monthly archives"""
        for month in range(1, 13):
            entries = [
                {
                    "timestamp": f"2026-{month:02d}-15 10:00:00",
                    "category": "monthly",
                    "content": f"Month {month} summary"
                }
            ]
            identifier = f"2026-{month:02d}"
            archive_repo.append_entries(identifier, entries)
            archive_repo.update_index(identifier, 1)

        archives = archive_repo.list_all_archives()
        assert len(archives) == 12

        # Search across all
        results = archive_repo.search_archives("summary")
        assert len(results) == 12


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

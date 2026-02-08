"""Tests for Memory Manager Service"""

import pytest
from pathlib import Path
from src.services.memory.manager import MemoryManager
from src.core.errors import MemoryError


class TestMemoryManager:
    """Test Memory Manager operations"""

    @pytest.fixture
    def temp_body_path(self, tmp_path):
        """Create temporary body directory"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        # Create initial MEMORY.md
        memory_file = body_path / "MEMORY.md"
        memory_file.write_text("# MEMORY\n\n* [2025-02-07] Test entry\n", encoding="utf-8")

        return body_path

    def test_write_entry(self, temp_body_path):
        """Should write memory entry with timestamp"""
        manager = MemoryManager(temp_body_path)
        timestamp = manager.write_entry("learning", "Learned Python basics")

        assert timestamp is not None
        content = manager.read_memory()
        assert "Learned Python basics" in content

    def test_write_entry_empty_fails(self, temp_body_path):
        """Should reject empty entries"""
        manager = MemoryManager(temp_body_path)

        with pytest.raises(ValueError):
            manager.write_entry("test", "")

    def test_write_entry_whitespace_fails(self, temp_body_path):
        """Should reject whitespace-only entries"""
        manager = MemoryManager(temp_body_path)

        with pytest.raises(ValueError):
            manager.write_entry("test", "   ")

    def test_read_memory(self, temp_body_path):
        """Should read memory content"""
        manager = MemoryManager(temp_body_path)
        content = manager.read_memory()

        assert "MEMORY" in content
        assert "Test entry" in content

    def test_read_memory_compressed(self, temp_body_path):
        """Should read compressed memory"""
        manager = MemoryManager(temp_body_path)

        # Create compressed version
        compressed = "# COMPRESSED\n\nArchived entries"
        manager.repository.write_compressed(compressed)

        content = manager.read_memory(compressed=True)
        assert "COMPRESSED" in content

    def test_get_memory_entries(self, temp_body_path):
        """Should parse memory entries"""
        manager = MemoryManager(temp_body_path)
        entries = manager.get_memory_entries()

        assert len(entries) >= 1
        assert entries[0]["date"] == "2025-02-07"
        assert "Test entry" in entries[0]["content"]

    def test_search_memory(self, temp_body_path):
        """Should search memory entries"""
        manager = MemoryManager(temp_body_path)

        manager.write_entry("default", "Python programming")
        manager.write_entry("default", "JavaScript learning")

        results = manager.search_memory("python")
        assert len(results) >= 1

    def test_search_memory_empty_keyword_fails(self, temp_body_path):
        """Should reject empty search keywords"""
        manager = MemoryManager(temp_body_path)

        with pytest.raises(ValueError):
            manager.search_memory("")

    def test_get_stats(self, temp_body_path):
        """Should return memory statistics"""
        manager = MemoryManager(temp_body_path)
        stats = manager.get_stats()

        assert "entry_count" in stats
        assert "file_size_mb" in stats
        assert "modified" in stats
        assert "file" in stats
        # file can be MEMORY.md or None depending on metadata availability
        assert isinstance(stats["file_size_mb"], float)

    def test_get_stats_empty(self, tmp_path):
        """Should return zero stats for empty memory"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = MemoryManager(body_path)
        stats = manager.get_stats()

        assert stats["entry_count"] == 0
        assert stats["file_size_mb"] == 0

    def test_exists_true(self, temp_body_path):
        """Should check memory existence"""
        manager = MemoryManager(temp_body_path)
        assert manager.exists() is True

    def test_exists_false(self, tmp_path):
        """Should return False if memory doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = MemoryManager(body_path)
        assert manager.exists() is False

    def test_get_entry_count(self, temp_body_path):
        """Should count memory entries"""
        manager = MemoryManager(temp_body_path)
        count = manager.get_entry_count()

        assert count >= 1

    def test_clear_memory(self, temp_body_path):
        """Should clear memory file"""
        manager = MemoryManager(temp_body_path)

        result = manager.clear_memory()
        assert result is True

        # Check file was cleared
        content = manager.read_memory()
        assert "MEMORY" in content
        # Should be mostly empty except header

    def test_multiple_entries(self, temp_body_path):
        """Should handle multiple entries"""
        manager = MemoryManager(temp_body_path)

        manager.write_entry("learning", "Entry 1")
        manager.write_entry("debug", "Entry 2")
        manager.write_entry("success", "Entry 3")

        count = manager.get_entry_count()
        assert count >= 3

    def test_custom_timestamp(self, temp_body_path):
        """Should accept custom timestamp"""
        manager = MemoryManager(temp_body_path)
        timestamp = manager.write_entry("test", "Content", timestamp="2025-01-01")

        assert timestamp == "2025-01-01"


class TestMemoryManagerErrors:
    """Test error handling"""

    def test_read_nonexistent_returns_empty(self, tmp_path):
        """Should return empty string if memory doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = MemoryManager(body_path)
        content = manager.read_memory()

        assert content == ""

    def test_get_entry_count_handles_error(self, tmp_path):
        """Should return 0 if entry parsing fails"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = MemoryManager(body_path)
        # Should not crash even if parsing fails
        count = manager.get_entry_count()
        assert count == 0

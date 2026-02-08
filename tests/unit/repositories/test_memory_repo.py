"""Tests for Memory Repository"""

import pytest
from pathlib import Path
from src.repositories.memory_repo import MemoryRepository


class TestMemoryRepository:
    """Test Memory Repository operations"""

    @pytest.fixture
    def temp_body_path(self, tmp_path):
        """Create temporary body directory with MEMORY.md"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        memory_file = body_path / "MEMORY.md"
        memory_file.write_text("# MEMORY\n\n* [2025-02-07] Test entry\n")

        return body_path

    def test_read_memory(self, temp_body_path):
        """Should read MEMORY.md file"""
        repo = MemoryRepository(temp_body_path)
        content = repo.read()
        assert "Test entry" in content
        assert "MEMORY" in content

    def test_write_memory(self, temp_body_path):
        """Should append entry to memory"""
        repo = MemoryRepository(temp_body_path)
        repo.write("default", "New learning")

        content = repo.read()
        assert "New learning" in content

    def test_memory_file_created(self, tmp_path):
        """Should create MEMORY.md if not exists"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        repo = MemoryRepository(body_path)
        repo.write("default", "First entry")

        assert (body_path / "MEMORY.md").exists()

    def test_parse_entries(self, temp_body_path):
        """Should parse memory entries into structured data"""
        repo = MemoryRepository(temp_body_path)
        entries = repo.parse_entries()

        assert len(entries) >= 1
        assert entries[0]["date"] == "2025-02-07"
        assert "Test entry" in entries[0]["content"]

    def test_compressed_file_operations(self, temp_body_path):
        """Should handle compressed memory"""
        repo = MemoryRepository(temp_body_path)

        # Write compressed
        compressed = "# COMPRESSED\n\n=== HOT ===\nTest"
        repo.write_compressed(compressed)

        # Read compressed
        content = repo.read("compressed")
        assert "COMPRESSED" in content

    def test_get_metadata(self, temp_body_path):
        """Should return memory file metadata"""
        repo = MemoryRepository(temp_body_path)
        metadata = repo.get_metadata()

        assert metadata is not None
        assert "size_bytes" in metadata
        assert "modified" in metadata
        assert metadata["entry_count"] >= 1

    def test_search_entries(self, temp_body_path):
        """Should search for keyword in entries"""
        repo = MemoryRepository(temp_body_path)
        repo.write("default", "Python programming")
        repo.write("default", "JavaScript learning")

        results = repo.search_entries("python")
        assert len(results) >= 1
        assert any("python" in e["content"].lower() for e in results)

    def test_empty_memory_read(self, tmp_path):
        """Should return empty string if file doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        repo = MemoryRepository(body_path)
        content = repo.read()
        assert content == ""

    def test_exists_check(self, temp_body_path):
        """Should check if memory file exists"""
        repo = MemoryRepository(temp_body_path)
        assert repo.exists() is True
        assert repo.exists("compressed") is False


class TestMemoryRepositoryErrors:
    """Test error handling"""

    def test_read_invalid_path(self, tmp_path):
        """Should handle invalid path gracefully"""
        bad_path = tmp_path / "nonexistent" / "body"
        repo = MemoryRepository(bad_path)

        # Should create directory
        assert bad_path.exists()
        assert repo.read() == ""

    def test_write_creates_directory(self, tmp_path):
        """Should create base directory if needed"""
        body_path = tmp_path / "new_body"
        repo = MemoryRepository(body_path)

        repo.write("default", "Test")
        assert (body_path / "MEMORY.md").exists()

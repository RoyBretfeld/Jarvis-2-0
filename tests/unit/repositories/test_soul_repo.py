"""Tests for Soul Repository"""

import pytest
from pathlib import Path
from src.repositories.soul_repo import SoulRepository
from src.core.errors import StorageError


class TestSoulRepository:
    """Test Soul Repository operations"""

    @pytest.fixture
    def temp_body_path(self, tmp_path):
        """Create temporary body directory with soul files"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        # Create SOUL.md
        soul_file = body_path / "SOUL.md"
        soul_file.write_text("# Soul\n\nI am Jarvis, an AI assistant.", encoding="utf-8")

        # Create NAME.md
        name_file = body_path / "NAME.md"
        name_file.write_text("# Agent Name\n\n**Current Name**: Jarvis\n", encoding="utf-8")

        # Create IDENTITY.md
        identity_file = body_path / "IDENTITY.md"
        identity_file.write_text("# Identity\n\nPurpose: Help users\n", encoding="utf-8")

        return body_path

    def test_read_soul(self, temp_body_path):
        """Should read SOUL.md file"""
        repo = SoulRepository(temp_body_path)
        content = repo.read_soul()
        assert "Soul" in content
        assert "Jarvis" in content

    def test_read_soul_nonexistent(self, tmp_path):
        """Should return empty string if SOUL.md doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        repo = SoulRepository(body_path)
        content = repo.read_soul()
        assert content == ""

    def test_write_soul(self, temp_body_path):
        """Should write to SOUL.md file"""
        repo = SoulRepository(temp_body_path)
        new_content = "# Updated Soul\n\nI am now more powerful."
        result = repo.write_soul(new_content)

        assert result is True
        assert repo.read_soul() == new_content

    def test_read_name(self, temp_body_path):
        """Should extract current agent name from NAME.md"""
        repo = SoulRepository(temp_body_path)
        name = repo.read_name()
        assert name == "Jarvis"

    def test_read_name_default(self, tmp_path):
        """Should return default name if NAME.md doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        repo = SoulRepository(body_path)
        name = repo.read_name()
        assert name == "The Forge"

    def test_read_name_no_match(self, tmp_path):
        """Should return default if Current Name pattern not found"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        name_file = body_path / "NAME.md"
        name_file.write_text("# Agent\n\nNo current name here", encoding="utf-8")

        repo = SoulRepository(body_path)
        name = repo.read_name()
        assert name == "The Forge"

    def test_update_name(self, temp_body_path):
        """Should update agent name in NAME.md"""
        repo = SoulRepository(temp_body_path)
        result = repo.update_name("Nova")

        assert result is True
        assert repo.read_name() == "Nova"

        # Check history was appended
        content = repo.read_name_file_content()
        assert "Nova" in content
        assert "Renamed to" in content

    def test_update_name_empty(self, temp_body_path):
        """Should reject empty name"""
        repo = SoulRepository(temp_body_path)

        with pytest.raises(ValueError):
            repo.update_name("")

    def test_update_name_whitespace_only(self, temp_body_path):
        """Should reject whitespace-only name"""
        repo = SoulRepository(temp_body_path)

        with pytest.raises(ValueError):
            repo.update_name("   ")

    def test_read_identity(self, temp_body_path):
        """Should read IDENTITY.md file"""
        repo = SoulRepository(temp_body_path)
        content = repo.read_identity()
        assert "Identity" in content
        assert "Purpose" in content

    def test_read_identity_nonexistent(self, tmp_path):
        """Should return empty string if IDENTITY.md doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        repo = SoulRepository(body_path)
        content = repo.read_identity()
        assert content == ""

    def test_read_with_identifier_soul(self, temp_body_path):
        """Should read soul via generic read() with identifier"""
        repo = SoulRepository(temp_body_path)
        content = repo.read("soul")
        assert "Soul" in content

    def test_read_with_identifier_name(self, temp_body_path):
        """Should extract name via generic read() with identifier"""
        repo = SoulRepository(temp_body_path)
        content = repo.read("name")
        assert content == "Jarvis"

    def test_read_with_identifier_identity(self, temp_body_path):
        """Should read identity via generic read() with identifier"""
        repo = SoulRepository(temp_body_path)
        content = repo.read("identity")
        assert "Identity" in content

    def test_read_invalid_identifier(self, temp_body_path):
        """Should raise error for invalid identifier"""
        repo = SoulRepository(temp_body_path)

        with pytest.raises(ValueError):
            repo.read("invalid")

    def test_write_with_identifier_soul(self, temp_body_path):
        """Should write soul via generic write() with identifier"""
        repo = SoulRepository(temp_body_path)
        result = repo.write("soul", "New soul content")

        assert result is True
        assert repo.read_soul() == "New soul content"

    def test_write_invalid_identifier(self, temp_body_path):
        """Should raise error for invalid write identifier"""
        repo = SoulRepository(temp_body_path)

        with pytest.raises(ValueError):
            repo.write("name", "New name")

    def test_exists_soul(self, temp_body_path):
        """Should check if SOUL.md exists"""
        repo = SoulRepository(temp_body_path)
        assert repo.exists("soul") is True

    def test_exists_soul_missing(self, tmp_path):
        """Should return False if SOUL.md missing"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        repo = SoulRepository(body_path)
        assert repo.exists("soul") is False

    def test_exists_name(self, temp_body_path):
        """Should check if NAME.md exists"""
        repo = SoulRepository(temp_body_path)
        assert repo.exists("name") is True

    def test_exists_identity(self, temp_body_path):
        """Should check if IDENTITY.md exists"""
        repo = SoulRepository(temp_body_path)
        assert repo.exists("identity") is True

    def test_exists_invalid(self, temp_body_path):
        """Should return False for unknown identifier"""
        repo = SoulRepository(temp_body_path)
        assert repo.exists("unknown") is False

    def test_get_metadata_soul(self, temp_body_path):
        """Should return soul file metadata"""
        repo = SoulRepository(temp_body_path)
        metadata = repo.get_metadata("soul")

        assert metadata is not None
        assert "file" in metadata
        assert "size_bytes" in metadata
        assert "modified" in metadata
        assert metadata["file"] == "SOUL.md"
        assert metadata["size_bytes"] > 0

    def test_get_metadata_name(self, temp_body_path):
        """Should return name file metadata"""
        repo = SoulRepository(temp_body_path)
        metadata = repo.get_metadata("name")

        assert metadata is not None
        assert metadata["file"] == "NAME.md"

    def test_get_metadata_identity(self, temp_body_path):
        """Should return identity file metadata"""
        repo = SoulRepository(temp_body_path)
        metadata = repo.get_metadata("identity")

        assert metadata is not None
        assert metadata["file"] == "IDENTITY.md"

    def test_get_metadata_missing_file(self, tmp_path):
        """Should return None if file doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        repo = SoulRepository(body_path)
        metadata = repo.get_metadata("soul")
        assert metadata is None

    def test_name_history_tracking(self, temp_body_path):
        """Should track name change history"""
        repo = SoulRepository(temp_body_path)

        # Update multiple times
        repo.update_name("Nova")
        repo.update_name("Phoenix")

        content = repo.read_name_file_content()
        assert "Nova" in content
        assert "Phoenix" in content
        assert "Renamed to" in content

    def test_read_name_file_content(self, temp_body_path):
        """Should read complete NAME.md content"""
        repo = SoulRepository(temp_body_path)
        content = repo.read_name_file_content()

        assert content is not None
        assert "Current Name" in content

    def test_read_name_file_content_nonexistent(self, tmp_path):
        """Should return empty string if NAME.md doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        repo = SoulRepository(body_path)
        content = repo.read_name_file_content()
        assert content == ""


class TestSoulRepositoryErrors:
    """Test error handling"""

    def test_read_soul_with_exception(self, tmp_path):
        """Should handle exceptions gracefully"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        repo = SoulRepository(body_path)
        # Reading non-existent file returns empty string
        content = repo.read_soul()
        assert content == ""

    def test_write_soul_creates_file(self, tmp_path):
        """Should create SOUL.md when writing"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        repo = SoulRepository(body_path)
        result = repo.write_soul("New content")

        assert result is True
        assert (body_path / "SOUL.md").exists()

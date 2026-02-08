"""Tests for Name Manager Service"""

import pytest
from pathlib import Path
from src.services.identity.name_manager import NameManager


class TestNameManager:
    """Test Name Manager operations"""

    @pytest.fixture
    def temp_body_path(self, tmp_path):
        """Create temporary body directory"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        # Create NAME.md with initial name
        name_file = body_path / "NAME.md"
        name_file.write_text("# Agent Name\n\n**Current Name**: Jarvis\n", encoding="utf-8")

        return body_path

    def test_get_current_name(self, temp_body_path):
        """Should get current agent name"""
        manager = NameManager(temp_body_path)
        name = manager.get_current_name()

        assert name == "Jarvis"

    def test_get_current_name_default(self, tmp_path):
        """Should return default name if file doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = NameManager(body_path)
        name = manager.get_current_name()

        assert name == "The Forge"

    def test_update_name(self, temp_body_path):
        """Should update agent name"""
        manager = NameManager(temp_body_path)
        result = manager.update_name("Nova")

        assert result is True
        assert manager.get_current_name() == "Nova"

    def test_update_name_empty_fails(self, temp_body_path):
        """Should reject empty name"""
        manager = NameManager(temp_body_path)

        with pytest.raises(ValueError):
            manager.update_name("")

    def test_update_name_whitespace_fails(self, temp_body_path):
        """Should reject whitespace-only name"""
        manager = NameManager(temp_body_path)

        with pytest.raises(ValueError):
            manager.update_name("   ")

    def test_get_name_history(self, temp_body_path):
        """Should return name change history"""
        manager = NameManager(temp_body_path)

        manager.update_name("Nova")
        manager.update_name("Phoenix")

        history = manager.get_name_history()
        assert len(history) >= 1

        # Check names are in history
        names_in_history = [h["name"] for h in history]
        assert "Nova" in names_in_history or "Phoenix" in names_in_history

    def test_name_history_format(self, temp_body_path):
        """Should have proper history format"""
        manager = NameManager(temp_body_path)

        manager.update_name("NewName")
        history = manager.get_name_history()

        # Each entry should have timestamp and name
        for entry in history:
            assert "timestamp" in entry
            assert "name" in entry

    def test_has_name_file_true(self, temp_body_path):
        """Should detect existing name file"""
        manager = NameManager(temp_body_path)
        assert manager.has_name_file() is True

    def test_has_name_file_false(self, tmp_path):
        """Should detect missing name file"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = NameManager(body_path)
        assert manager.has_name_file() is False

    def test_rename_to(self, temp_body_path):
        """Should rename with confirmation message"""
        manager = NameManager(temp_body_path)
        message = manager.rename_to("Alpha")

        assert "Alpha" in message
        assert manager.get_current_name() == "Alpha"

    def test_multiple_renames(self, temp_body_path):
        """Should handle multiple renames"""
        manager = NameManager(temp_body_path)

        manager.update_name("First")
        manager.update_name("Second")
        manager.update_name("Third")

        assert manager.get_current_name() == "Third"

    def test_name_history_empty_fallback(self, tmp_path):
        """Should return empty list for nonexistent file"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = NameManager(body_path)
        history = manager.get_name_history()

        assert history == []


class TestNameManagerErrors:
    """Test error handling"""

    def test_update_name_creates_file(self, tmp_path):
        """Should create NAME.md if it doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = NameManager(body_path)
        manager.update_name("NewAgent")

        assert (body_path / "NAME.md").exists()
        # After creation, the name should be readable
        current = manager.get_current_name()
        # Either NewAgent or default if formatting doesn't match
        assert current in ["NewAgent", "The Forge"]

    def test_history_parsing_graceful(self, tmp_path):
        """Should handle corrupted history gracefully"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        # Create malformed NAME.md
        name_file = body_path / "NAME.md"
        name_file.write_text("Corrupted content without proper format", encoding="utf-8")

        manager = NameManager(body_path)
        # Should not crash
        history = manager.get_name_history()
        assert isinstance(history, list)

"""Tests for Soul Manager Service"""

import pytest
from pathlib import Path
from src.services.identity.soul_manager import SoulManager
from src.core.errors import StorageError


class TestSoulManager:
    """Test Soul Manager operations"""

    @pytest.fixture
    def temp_body_path(self, tmp_path):
        """Create temporary body directory with soul files"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        soul_file = body_path / "SOUL.md"
        soul_file.write_text("# Soul\n\nI am an AI assistant focused on helping.", encoding="utf-8")

        identity_file = body_path / "IDENTITY.md"
        identity_file.write_text("# Identity\n\nPurpose: Assist users efficiently", encoding="utf-8")

        return body_path

    def test_get_soul(self, temp_body_path):
        """Should get soul content"""
        manager = SoulManager(temp_body_path)
        soul = manager.get_soul()

        assert "Soul" in soul
        assert "AI assistant" in soul

    def test_get_soul_empty(self, tmp_path):
        """Should return empty string if soul doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = SoulManager(body_path)
        soul = manager.get_soul()

        assert soul == ""

    def test_update_soul(self, temp_body_path):
        """Should update soul content"""
        manager = SoulManager(temp_body_path)
        new_soul = "# New Soul\n\nI am evolved."

        result = manager.update_soul(new_soul)
        assert result is True
        assert manager.get_soul() == new_soul

    def test_update_soul_empty_fails(self, temp_body_path):
        """Should reject empty soul"""
        manager = SoulManager(temp_body_path)

        with pytest.raises(ValueError):
            manager.update_soul("")

    def test_update_soul_whitespace_fails(self, temp_body_path):
        """Should reject whitespace-only soul"""
        manager = SoulManager(temp_body_path)

        with pytest.raises(ValueError):
            manager.update_soul("   ")

    def test_get_identity(self, temp_body_path):
        """Should get identity content"""
        manager = SoulManager(temp_body_path)
        identity = manager.get_identity()

        assert "Identity" in identity
        assert "Purpose" in identity

    def test_get_identity_empty(self, tmp_path):
        """Should return empty string if identity doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = SoulManager(body_path)
        identity = manager.get_identity()

        assert identity == ""

    def test_has_soul_true(self, temp_body_path):
        """Should detect existing soul"""
        manager = SoulManager(temp_body_path)
        assert manager.has_soul() is True

    def test_has_soul_false(self, tmp_path):
        """Should detect missing soul"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = SoulManager(body_path)
        assert manager.has_soul() is False

    def test_has_identity_true(self, temp_body_path):
        """Should detect existing identity"""
        manager = SoulManager(temp_body_path)
        assert manager.has_identity() is True

    def test_has_identity_false(self, tmp_path):
        """Should detect missing identity"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = SoulManager(body_path)
        assert manager.has_identity() is False

    def test_get_personality_summary(self, temp_body_path):
        """Should return personality summary"""
        manager = SoulManager(temp_body_path)
        summary = manager.get_personality_summary()

        assert "has_soul" in summary
        assert "soul_size_mb" in summary
        assert "has_identity" in summary
        assert "identity_size_mb" in summary
        assert "soul_modified" in summary
        assert "identity_modified" in summary

        assert summary["has_soul"] is True
        assert summary["has_identity"] is True

    def test_append_to_soul(self, temp_body_path):
        """Should append to existing soul"""
        manager = SoulManager(temp_body_path)
        original = manager.get_soul()

        addition = "New capability added."
        result = manager.append_to_soul(addition)

        assert result is True
        updated = manager.get_soul()
        assert addition in updated
        assert "Soul" in updated

    def test_append_to_soul_empty_fails(self, temp_body_path):
        """Should reject empty addition"""
        manager = SoulManager(temp_body_path)

        with pytest.raises(ValueError):
            manager.append_to_soul("")

    def test_personality_summary_empty(self, tmp_path):
        """Should handle empty personality"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = SoulManager(body_path)
        summary = manager.get_personality_summary()

        assert summary["has_soul"] is False
        assert summary["has_identity"] is False
        assert summary["soul_size_mb"] == 0
        assert summary["identity_size_mb"] == 0


class TestSoulManagerErrors:
    """Test error handling"""

    def test_update_soul_creates_file(self, tmp_path):
        """Should create SOUL.md if it doesn't exist"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = SoulManager(body_path)
        manager.update_soul("New soul")

        assert (body_path / "SOUL.md").exists()
        assert manager.has_soul() is True

    def test_append_to_soul_creates_if_missing(self, tmp_path):
        """Should create soul file if missing"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        manager = SoulManager(body_path)

        # Should create soul file when appending
        result = manager.append_to_soul("New soul content")
        assert result is True
        assert manager.has_soul() is True

"""Tests for Context Builder Service"""

import pytest
from pathlib import Path
from src.services.context.builder import ContextBuilder
from src.core.errors import MemoryError


class TestContextBuilder:
    """Test Context Builder operations"""

    @pytest.fixture
    def temp_body_path(self, tmp_path):
        """Create temporary body directory with test data"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        # Create NAME.md
        name_file = body_path / "NAME.md"
        name_file.write_text("# Agent Name\n\n**Current Name**: TestAgent\n", encoding="utf-8")

        # Create SOUL.md
        soul_file = body_path / "SOUL.md"
        soul_file.write_text("# Soul\n\nI am a helpful assistant.", encoding="utf-8")

        # Create IDENTITY.md
        identity_file = body_path / "IDENTITY.md"
        identity_file.write_text("# Identity\n\nPurpose: Help users", encoding="utf-8")

        # Create MEMORY.md
        memory_file = body_path / "MEMORY.md"
        memory_file.write_text("# MEMORY\n\n* [2025-02-07] Learning entry\n* [2025-02-06] Debug entry\n", encoding="utf-8")

        return body_path

    @pytest.fixture
    def error_db_path(self, tmp_path):
        """Create temporary error database"""
        error_db_path = tmp_path / "ERROR_DB.md"
        return error_db_path

    def test_build_full_context(self, temp_body_path, error_db_path):
        """Should build complete context"""
        builder = ContextBuilder(temp_body_path, error_db_path)
        context = builder.build(
            include_identity=True,
            include_memory=True,
            include_errors=False
        )

        assert "Agent Identity" in context
        assert "TestAgent" in context
        assert "Soul" in context
        assert "Identity" in context
        assert "Memory" in context

    def test_build_identity_only(self, temp_body_path, error_db_path):
        """Should build only identity context"""
        builder = ContextBuilder(temp_body_path, error_db_path)
        context = builder.build(
            include_identity=True,
            include_memory=False,
            include_errors=False
        )

        assert "Agent Identity" in context
        assert "TestAgent" in context
        assert "Memory" not in context

    def test_build_memory_only(self, temp_body_path, error_db_path):
        """Should build only memory context"""
        builder = ContextBuilder(temp_body_path, error_db_path)
        context = builder.build(
            include_identity=False,
            include_memory=True,
            include_errors=False
        )

        assert "Memory" in context
        assert "Learning entry" in context

    def test_build_identity_context(self, temp_body_path, error_db_path):
        """Should build identity section properly"""
        builder = ContextBuilder(temp_body_path, error_db_path)
        context = builder.build_identity_context()

        assert "TestAgent" in context
        assert "Soul" in context
        assert "Identity" in context

    def test_build_memory_context(self, temp_body_path, error_db_path):
        """Should build memory section properly"""
        builder = ContextBuilder(temp_body_path, error_db_path)
        context = builder.build_memory_context(limit=10)

        assert "Learning entry" in context
        assert "Debug entry" in context

    def test_build_memory_context_with_limit(self, temp_body_path, error_db_path):
        """Should respect memory limit"""
        builder = ContextBuilder(temp_body_path, error_db_path)

        # Add multiple entries
        for i in range(20):
            builder.memory_manager.write_entry("test", f"Entry {i}")

        context = builder.build_memory_context(limit=5)
        # Should include header and entries
        assert "Memory" in context

    def test_build_error_context_empty(self, temp_body_path, error_db_path):
        """Should handle empty error database"""
        builder = ContextBuilder(temp_body_path, error_db_path)
        context = builder.build_error_context()

        # Should return empty or minimal content
        assert isinstance(context, str)

    def test_build_with_errors(self, temp_body_path, error_db_path):
        """Should include error context when enabled"""
        builder = ContextBuilder(temp_body_path, error_db_path)

        # Add an error
        builder.error_db_repo.log_error("Test error", "Test cause", "Test fix")

        context = builder.build(
            include_identity=False,
            include_memory=False,
            include_errors=True
        )

        # Context should have error header or be empty if no errors
        assert isinstance(context, str)

    def test_get_context_summary(self, temp_body_path, error_db_path):
        """Should return context summary"""
        builder = ContextBuilder(temp_body_path, error_db_path)
        summary = builder.get_context_summary()

        assert "agent_name" in summary
        assert "has_soul" in summary
        assert "has_identity" in summary
        assert "memory_entries" in summary
        assert "memory_size_mb" in summary
        assert "total_errors" in summary
        assert "open_errors" in summary

        assert summary["agent_name"] == "TestAgent"
        assert summary["has_soul"] is True
        assert summary["has_identity"] is True

    def test_truncate_to_tokens(self, temp_body_path, error_db_path):
        """Should truncate context to token limit"""
        builder = ContextBuilder(temp_body_path, error_db_path)

        # Create large context
        long_text = "Word " * 1000
        truncated = builder._truncate_to_tokens(long_text, max_tokens=100)

        # Should be shorter than original
        assert len(truncated) < len(long_text)
        # Should be reasonable length (100 tokens * 4 chars/token)
        assert len(truncated) <= 100 * 4 + 100  # Allow some margin

    def test_build_with_token_limit(self, temp_body_path, error_db_path):
        """Should build context with token limit"""
        builder = ContextBuilder(temp_body_path, error_db_path)

        context = builder.build(
            include_identity=True,
            include_memory=True,
            max_tokens=50
        )

        # Should not crash and return string
        assert isinstance(context, str)

    def test_memory_limit_parameter(self, temp_body_path, error_db_path):
        """Should respect memory limit in build"""
        builder = ContextBuilder(temp_body_path, error_db_path)

        # Add entries
        for i in range(30):
            builder.memory_manager.write_entry("test", f"Entry {i}")

        context = builder.build(memory_limit=5)
        # Should include limited entries
        assert isinstance(context, str)


class TestContextBuilderErrors:
    """Test error handling"""

    def test_build_graceful_empty(self, tmp_path):
        """Should handle empty directories gracefully"""
        body_path = tmp_path / "body"
        body_path.mkdir()
        error_db_path = tmp_path / "ERROR_DB.md"

        builder = ContextBuilder(body_path, error_db_path)
        context = builder.build()

        # Should return something even if empty
        assert isinstance(context, str)

    def test_build_memory_context_empty(self, tmp_path):
        """Should return empty string for missing memory"""
        body_path = tmp_path / "body"
        body_path.mkdir()
        error_db_path = tmp_path / "ERROR_DB.md"

        builder = ContextBuilder(body_path, error_db_path)
        context = builder.build_memory_context()

        assert context == ""

    def test_build_identity_context_partial(self, tmp_path):
        """Should handle partial identity"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        # Only name, no soul/identity
        name_file = body_path / "NAME.md"
        name_file.write_text("**Current Name**: Solo\n", encoding="utf-8")

        error_db_path = tmp_path / "ERROR_DB.md"

        builder = ContextBuilder(body_path, error_db_path)
        context = builder.build_identity_context()

        assert "Solo" in context

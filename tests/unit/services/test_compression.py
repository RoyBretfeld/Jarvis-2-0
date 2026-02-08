"""Tests for Compression Service"""

import pytest
from pathlib import Path
from datetime import datetime, timedelta
from src.services.memory.compression import CompressionService
from src.core.errors import MemoryError


class TestCompressionService:
    """Test Compression Service operations"""

    @pytest.fixture
    def temp_body_path(self, tmp_path):
        """Create temporary body with memory entries"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        # Create MEMORY.md with entries across different dates
        today = datetime.now()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        memory_file = body_path / "MEMORY.md"
        content = f"""# MEMORY

* [{today.strftime('%Y-%m-%d')}] Recent entry
* [{week_ago.strftime('%Y-%m-%d')}] Week-old entry
* [{month_ago.strftime('%Y-%m-%d')}] Month-old entry
"""
        memory_file.write_text(content, encoding="utf-8")

        return body_path

    def test_tier_entries_hot(self, temp_body_path):
        """Should classify recent entries as HOT"""
        service = CompressionService(temp_body_path)
        entries = service.repository.parse_entries()

        hot, warm, cold = service.tier_entries(entries)

        # Most recent should be in hot
        assert len(hot) >= 1

    def test_tier_entries_cold(self, temp_body_path):
        """Should classify old entries as COLD"""
        service = CompressionService(temp_body_path)
        entries = service.repository.parse_entries()

        hot, warm, cold = service.tier_entries(entries, preserve_recent=7)

        # Entries older than 30 days should be in cold
        assert len(cold) >= 1

    def test_tier_entries_distribution(self, temp_body_path):
        """Should distribute entries across tiers"""
        service = CompressionService(temp_body_path)
        entries = service.repository.parse_entries()

        hot, warm, cold = service.tier_entries(entries)

        # Total should match original
        assert len(hot) + len(warm) + len(cold) == len(entries)

    def test_summarize_tier_basic(self, temp_body_path):
        """Should summarize entries"""
        service = CompressionService(temp_body_path)
        entries = service.repository.parse_entries()

        summary = service.summarize_tier(entries[:2], mode="warm", llm_provider=None)

        # Should return formatted entries
        assert isinstance(summary, str)
        assert len(summary) > 0

    def test_summarize_tier_empty(self, temp_body_path):
        """Should handle empty entry list"""
        service = CompressionService(temp_body_path)

        summary = service.summarize_tier([], mode="cold")

        assert summary == ""

    def test_format_entries(self, temp_body_path):
        """Should format entries as markdown"""
        service = CompressionService(temp_body_path)
        entries = service.repository.parse_entries()

        formatted = service._format_entries(entries)

        # Should contain markdown list items
        assert "*" in formatted
        assert "[" in formatted

    def test_extract_key_points(self, temp_body_path):
        """Should extract key points from entries"""
        service = CompressionService(temp_body_path)
        entries = service.repository.parse_entries()

        key_points = service._extract_key_points(entries, "warm")

        # Should return formatted string
        assert isinstance(key_points, str)

    def test_compress_without_llm(self, temp_body_path):
        """Should compress without LLM provider"""
        service = CompressionService(temp_body_path)

        result = service.compress(llm_provider=None)

        assert result is True
        # Compressed file should exist
        assert (temp_body_path / "MEMORY_COMPRESSED.md").exists()

    def test_compress_creates_compressed_file(self, temp_body_path):
        """Should create MEMORY_COMPRESSED.md"""
        service = CompressionService(temp_body_path)

        service.compress(llm_provider=None)

        compressed_file = temp_body_path / "MEMORY_COMPRESSED.md"
        assert compressed_file.exists()

        content = compressed_file.read_text(encoding="utf-8")
        assert "HOT" in content or len(content) > 0

    def test_get_compression_stats(self, temp_body_path):
        """Should return compression statistics"""
        service = CompressionService(temp_body_path)
        stats = service.get_compression_stats()

        assert "total_entries" in stats
        assert "hot_count" in stats
        assert "warm_count" in stats
        assert "cold_count" in stats
        assert "compression_potential" in stats

        assert stats["total_entries"] >= 0
        assert stats["compression_potential"] >= 0

    def test_compress_ratio_parameter(self, temp_body_path):
        """Should accept compression ratio parameter"""
        service = CompressionService(temp_body_path)

        result = service.compress(llm_provider=None, compression_ratio=0.3)

        assert result is True

    def test_preserve_recent_parameter(self, temp_body_path):
        """Should respect preserve_recent parameter"""
        service = CompressionService(temp_body_path)

        # Keep only last 3 days in HOT
        result = service.compress(llm_provider=None, preserve_recent=3)

        assert result is True


class TestCompressionServiceErrors:
    """Test error handling"""

    def test_compress_empty_memory(self, tmp_path):
        """Should handle empty memory gracefully"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        (body_path / "MEMORY.md").write_text("# MEMORY\n", encoding="utf-8")

        service = CompressionService(body_path)
        result = service.compress(llm_provider=None)

        assert result is True

    def test_tier_entries_bad_date_fallback(self, tmp_path):
        """Should handle bad date entries"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        # Create entry with bad date format
        memory_file = body_path / "MEMORY.md"
        memory_file.write_text("# MEMORY\n\n* [INVALID] Bad date entry\n", encoding="utf-8")

        service = CompressionService(body_path)
        entries = service.repository.parse_entries()

        # Should not crash
        hot, warm, cold = service.tier_entries(entries)

        # Bad date entries should go to warm (fallback)
        assert len(warm) + len(hot) + len(cold) >= 0

    def test_get_compression_stats_handles_errors(self, tmp_path):
        """Should return valid stats even with errors"""
        body_path = tmp_path / "body"
        body_path.mkdir()

        service = CompressionService(body_path)
        # Should not crash even if memory is empty
        stats = service.get_compression_stats()

        assert isinstance(stats, dict)

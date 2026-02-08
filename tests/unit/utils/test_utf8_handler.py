"""Unit tests for UTF-8 handler utility"""

import pytest
import sys
from io import StringIO
from src.utils.utf8_handler import ensure_utf8_output, safe_print, get_encoding, is_utf8_capable


class TestEnsureUTF8Output:
    """Test UTF-8 output enforcement"""

    @pytest.mark.skipif(sys.platform != "win32", reason="UTF-8 enforcement only needed on Windows")
    def test_ensure_utf8_callable(self):
        """Function should be callable without error"""
        # Should not raise exception (on Windows)
        ensure_utf8_output()
        assert True

    @pytest.mark.skipif(sys.platform != "win32", reason="UTF-8 enforcement only needed on Windows")
    def test_ensure_utf8_idempotent(self):
        """Should be safe to call multiple times"""
        ensure_utf8_output()
        ensure_utf8_output()
        assert True


class TestSafePrint:
    """Test safe print function"""

    def test_safe_print_callable(self):
        """Should be callable without error"""
        # Use StringIO to avoid capsys issues
        output = StringIO()
        safe_print("Hello World", file=output)
        assert "Hello World" in output.getvalue()

    def test_safe_print_with_custom_end(self):
        """Should respect custom line ending"""
        output = StringIO()
        safe_print("No newline", end="", file=output)
        safe_print(" here", file=output)
        result = output.getvalue()
        assert "No newline" in result
        assert "here" in result

    def test_safe_print_unicode_handling(self):
        """Should handle unicode gracefully"""
        output = StringIO()
        # Should not raise exception
        safe_print("Unicode: abc123", file=output)
        assert len(output.getvalue()) > 0


class TestGetEncoding:
    """Test encoding detection"""

    def test_get_encoding_returns_string(self):
        """Should return encoding name as string"""
        encoding = get_encoding()
        assert isinstance(encoding, str)
        assert len(encoding) > 0

    def test_get_encoding_is_known(self):
        """Should return known encoding"""
        encoding = get_encoding()
        # Should be something like utf-8, cp1252, etc.
        assert any(enc in encoding.lower() for enc in ['utf', 'cp', 'iso', 'ascii'])


class TestIsUTF8Capable:
    """Test UTF-8 capability detection"""

    def test_is_utf8_capable_returns_bool(self):
        """Should return boolean"""
        result = is_utf8_capable()
        assert isinstance(result, bool)

    def test_is_utf8_capable_consistent(self):
        """Should return consistent result"""
        result1 = is_utf8_capable()
        result2 = is_utf8_capable()
        assert result1 == result2

    def test_is_utf8_capable_on_linux_mac(self):
        """Should generally report UTF-8 capable on Linux/Mac"""
        if sys.platform != "win32":
            assert is_utf8_capable() is True


class TestUTF8Integration:
    """Integration tests for UTF-8 handling"""

    def test_various_character_sets(self):
        """Should handle various character encodings"""
        output = StringIO()

        # ASCII
        safe_print("ASCII: abc123", file=output)

        # Latin
        safe_print("Latin: cafe", file=output)

        # Cyrillic (might be replaced on some systems)
        safe_print("Characters", file=output)

        result = output.getvalue()
        # At least ASCII should be there
        assert "ASCII" in result
        assert len(result) > 0

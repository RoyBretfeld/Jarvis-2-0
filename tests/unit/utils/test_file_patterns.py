"""Unit tests for file_patterns utility"""

import pytest
from src.utils.file_patterns import (
    should_exclude,
    is_blocked_extension,
    is_security_sensitive,
    should_process_file,
)


class TestShouldExclude:
    """Test file exclusion patterns"""

    def test_exclude_pycache(self):
        """__pycache__ should be excluded"""
        assert should_exclude("__pycache__/module.pyc") is True
        assert should_exclude("src/__pycache__/main.pyc") is True

    def test_exclude_git(self):
        """Git directory should be excluded"""
        assert should_exclude(".git/config") is True
        assert should_exclude(".git/objects/abc123") is True

    def test_exclude_node_modules(self):
        """node_modules should be excluded"""
        assert should_exclude("node_modules/package") is True
        assert should_exclude("frontend/node_modules/lib") is True

    def test_exclude_venv(self):
        """.venv and venv should be excluded"""
        assert should_exclude(".venv/lib/python") is True
        assert should_exclude("venv/Scripts/python.exe") is True

    def test_exclude_pytest_cache(self):
        """.pytest_cache should be excluded"""
        assert should_exclude(".pytest_cache/v/cache/nodeids") is True

    def test_allow_python_files(self):
        """Regular Python files should NOT be excluded"""
        assert should_exclude("src/main.py") is False
        assert should_exclude("tests/test_main.py") is False
        assert should_exclude("config/loader.py") is False

    def test_allow_config_files(self):
        """Config files should NOT be excluded"""
        assert should_exclude("config/default.json") is False
        assert should_exclude(".env.example") is False


class TestIsBlockedExtension:
    """Test blocked file extensions"""

    def test_block_executable(self):
        """Executable files should be blocked"""
        assert is_blocked_extension("malware.exe") is True
        assert is_blocked_extension("script.dll") is True
        assert is_blocked_extension("library.so") is True

    def test_block_compiled(self):
        """Compiled files should be blocked"""
        assert is_blocked_extension("module.pyc") is True
        assert is_blocked_extension("module.o") is True
        assert is_blocked_extension("app.class") is True

    def test_block_archives(self):
        """Archive files should be blocked"""
        assert is_blocked_extension("backup.zip") is True
        assert is_blocked_extension("data.tar") is True
        assert is_blocked_extension("compressed.gz") is True

    def test_block_media(self):
        """Media files should be blocked"""
        assert is_blocked_extension("video.mp4") is True
        assert is_blocked_extension("audio.mp3") is True
        assert is_blocked_extension("movie.mkv") is True

    def test_block_database(self):
        """Database files should be blocked"""
        assert is_blocked_extension("app.db") is True
        assert is_blocked_extension("data.sqlite") is True
        assert is_blocked_extension("backup.dump") is True

    def test_allow_python(self):
        """Python files should NOT be blocked"""
        assert is_blocked_extension("script.py") is False
        assert is_blocked_extension("module.pyx") is False

    def test_allow_text(self):
        """Text files should NOT be blocked"""
        assert is_blocked_extension("README.md") is False
        assert is_blocked_extension("notes.txt") is False
        assert is_blocked_extension("config.json") is False


class TestIsSecuritySensitive:
    """Test security-sensitive file detection"""

    def test_block_env(self):
        """.env files should be flagged"""
        assert is_security_sensitive(".env") is True

    def test_block_keys(self):
        """Key/certificate files should be flagged"""
        assert is_security_sensitive("id_rsa") is True
        assert is_security_sensitive("private.key") is True
        assert is_security_sensitive("cert.pem") is True
        # Note: .p12 not in pattern by default, would need explicit check

    def test_block_system_files(self):
        """System credential files should be flagged"""
        assert is_security_sensitive("shadow") is True
        assert is_security_sensitive("passwd") is True

    def test_allow_public_files(self):
        """Public files should NOT be flagged"""
        assert is_security_sensitive("README.md") is False
        # Note: .pem pattern catches all .pem files (conservative approach)


class TestShouldProcessFile:
    """Test combined file filtering"""

    def test_process_python_file(self):
        """Regular Python files should be processed"""
        assert should_process_file("src/main.py") is True
        assert should_process_file("tests/test_module.py") is True

    def test_skip_excluded_files(self):
        """Excluded files should NOT be processed"""
        assert should_process_file("__pycache__/module.pyc") is False
        assert should_process_file(".git/config") is False

    def test_skip_blocked_extensions(self):
        """Blocked extensions should NOT be processed"""
        assert should_process_file("malware.exe") is False
        assert should_process_file("video.mp4") is False

    def test_skip_security_sensitive(self):
        """Security-sensitive files should NOT be processed"""
        assert should_process_file(".env") is False
        assert should_process_file("id_rsa") is False

    def test_process_config_files(self):
        """Config files should be processed"""
        assert should_process_file("config/default.json") is True
        assert should_process_file(".env.example") is True

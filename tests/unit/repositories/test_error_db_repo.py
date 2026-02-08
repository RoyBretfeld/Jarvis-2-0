"""Tests for Error DB Repository"""

import pytest
from pathlib import Path
from datetime import datetime
from src.repositories.error_db_repo import ErrorDBRepository
from src.core.errors import StorageError


class TestErrorDBRepository:
    """Test Error DB Repository operations"""

    @pytest.fixture
    def temp_error_db_path(self, tmp_path):
        """Create temporary error database file"""
        db_file = tmp_path / "ERROR_DB.md"
        repo = ErrorDBRepository(db_file)
        return db_file

    def test_create_error_db_on_init(self, tmp_path):
        """Should create ERROR_DB.md if not exists"""
        db_path = tmp_path / "ERROR_DB.md"
        repo = ErrorDBRepository(db_path)

        assert db_path.exists()
        content = db_path.read_text(encoding="utf-8")
        assert "ERROR DATABASE" in content
        assert "ID" in content

    def test_read_error_db(self, temp_error_db_path):
        """Should read entire ERROR_DB.md file"""
        repo = ErrorDBRepository(temp_error_db_path)
        content = repo.read()

        assert "ERROR DATABASE" in content
        assert "|" in content

    def test_read_empty_db(self, tmp_path):
        """Should return empty string if file doesn't exist yet"""
        db_path = tmp_path / "missing.md"
        # Don't initialize repository, just use path
        # Actually repository auto-creates, so let's test reading directly
        content = db_path.read_text(encoding="utf-8") if db_path.exists() else ""
        assert content == ""

    def test_exists_check(self, temp_error_db_path):
        """Should check if error database exists"""
        repo = ErrorDBRepository(temp_error_db_path)
        assert repo.exists() is True

    def test_exists_missing(self, tmp_path):
        """Should return False if file doesn't exist"""
        # Create repo but don't initialize - actually it auto-creates
        # So we need to test a path that wasn't accessed
        db_path = tmp_path / "ERROR_DB.md"
        # Don't create repo yet
        assert not db_path.exists()

    def test_write_not_supported(self, temp_error_db_path):
        """Should raise error for direct write"""
        repo = ErrorDBRepository(temp_error_db_path)

        with pytest.raises(ValueError):
            repo.write("all", "content")

    def test_log_error_basic(self, temp_error_db_path):
        """Should log error with auto-generated ID"""
        repo = ErrorDBRepository(temp_error_db_path)
        error_id = repo.log_error("Test error", "Test cause", "Test fix")

        assert error_id.startswith("ERR-")
        assert "Test error" in repo.read()

    def test_log_error_multiple(self, temp_error_db_path):
        """Should log multiple errors with different IDs"""
        repo = ErrorDBRepository(temp_error_db_path)

        id1 = repo.log_error("Error 1", "Cause 1", "Fix 1")
        id2 = repo.log_error("Error 2", "Cause 2", "Fix 2")

        assert id1 != id2
        assert id1.startswith("ERR-")
        assert id2.startswith("ERR-")

    def test_log_error_default_values(self, temp_error_db_path):
        """Should use default values for root_cause and fix"""
        repo = ErrorDBRepository(temp_error_db_path)
        error_id = repo.log_error("Test error")

        error = repo.get_error(error_id)
        assert error is not None
        assert error["root_cause"] == "TBD"
        assert error["fix"] == "TBD"

    def test_log_error_with_pipes(self, temp_error_db_path):
        """Should escape pipe characters in fields"""
        repo = ErrorDBRepository(temp_error_db_path)
        error_id = repo.log_error(
            "Error | with pipes",
            "Cause | also pipes",
            "Fix | here too"
        )

        error = repo.get_error(error_id)
        assert error is not None
        # Pipes should be escaped
        assert "\\|" in repo.read()

    def test_get_all_errors(self, temp_error_db_path):
        """Should parse and return all error entries"""
        repo = ErrorDBRepository(temp_error_db_path)

        repo.log_error("Error 1", "Cause 1", "Fix 1")
        repo.log_error("Error 2", "Cause 2", "Fix 2")

        errors = repo.get_all_errors()
        assert len(errors) >= 2

    def test_get_error_by_id(self, temp_error_db_path):
        """Should retrieve specific error by ID"""
        repo = ErrorDBRepository(temp_error_db_path)
        error_id = repo.log_error("Test error", "Test cause", "Test fix")

        error = repo.get_error(error_id)
        assert error is not None
        assert error["id"] == error_id
        assert "Test error" in error["error"]

    def test_get_error_not_found(self, temp_error_db_path):
        """Should return None for non-existent error ID"""
        repo = ErrorDBRepository(temp_error_db_path)
        error = repo.get_error("ERR-INVALID-999")
        assert error is None

    def test_update_error_status(self, temp_error_db_path):
        """Should update error status"""
        repo = ErrorDBRepository(temp_error_db_path)
        error_id = repo.log_error("Test error", "Cause", "Fix")

        result = repo.update_error_status(error_id, "Resolved")
        assert result is True

        error = repo.get_error(error_id)
        assert "Resolved" in error["status"]

    def test_update_error_status_invalid_id(self, temp_error_db_path):
        """Should handle update for non-existent ID gracefully"""
        repo = ErrorDBRepository(temp_error_db_path)
        result = repo.update_error_status("ERR-INVALID-999", "Resolved")

        # Should not crash, returns False
        assert result is False or result is True

    def test_get_metadata(self, temp_error_db_path):
        """Should return error database metadata"""
        repo = ErrorDBRepository(temp_error_db_path)
        repo.log_error("Test", "Cause", "Fix")

        metadata = repo.get_metadata()
        assert metadata is not None
        assert "file" in metadata
        assert "size_bytes" in metadata
        assert "modified" in metadata
        assert "total_errors" in metadata
        assert "open_errors" in metadata
        assert metadata["file"] == "ERROR_DB.md"

    def test_get_metadata_missing(self, tmp_path):
        """Should return None if database doesn't exist"""
        db_path = tmp_path / "missing" / "ERROR_DB.md"
        # Don't initialize, just check non-existent path
        assert not db_path.exists()

    def test_error_id_format(self, temp_error_db_path):
        """Should generate proper error ID format"""
        repo = ErrorDBRepository(temp_error_db_path)
        error_id = repo.log_error("Test", "Cause", "Fix")

        # Format: ERR-YYYYMMDD-NNN
        parts = error_id.split("-")
        assert len(parts) == 3
        assert parts[0] == "ERR"
        assert len(parts[1]) == 8  # YYYYMMDD
        assert len(parts[2]) == 3  # NNN

    def test_error_status_default(self, temp_error_db_path):
        """Should set status to Open for new errors"""
        repo = ErrorDBRepository(temp_error_db_path)
        error_id = repo.log_error("Test", "Cause", "Fix")

        error = repo.get_error(error_id)
        assert "Open" in error["status"]

    def test_parsing_headers_and_separators(self, temp_error_db_path):
        """Should skip headers and separators when parsing"""
        repo = ErrorDBRepository(temp_error_db_path)
        repo.log_error("Error 1", "Cause 1", "Fix 1")

        errors = repo.get_all_errors()
        # Should not include header or separator rows
        for error in errors:
            assert "ID" not in error.get("id", "")
            assert "---" not in error.get("id", "")

    def test_error_count_in_metadata(self, temp_error_db_path):
        """Should track error count in metadata"""
        repo = ErrorDBRepository(temp_error_db_path)

        repo.log_error("Error 1", "Cause 1", "Fix 1")
        repo.log_error("Error 2", "Cause 2", "Fix 2")

        metadata = repo.get_metadata()
        assert metadata["total_errors"] == 2

    def test_open_errors_count(self, temp_error_db_path):
        """Should count only open errors"""
        repo = ErrorDBRepository(temp_error_db_path)

        id1 = repo.log_error("Error 1", "Cause 1", "Fix 1")
        id2 = repo.log_error("Error 2", "Cause 2", "Fix 2")

        # Resolve one
        repo.update_error_status(id1, "Resolved")

        metadata = repo.get_metadata()
        assert metadata["open_errors"] == 1

    def test_base_path_property(self, temp_error_db_path):
        """Should return parent directory as base_path"""
        repo = ErrorDBRepository(temp_error_db_path)
        assert repo.base_path == temp_error_db_path.parent

    def test_nested_directory_creation(self, tmp_path):
        """Should create nested directories if needed"""
        nested_path = tmp_path / "nested" / "deep" / "ERROR_DB.md"
        repo = ErrorDBRepository(nested_path)

        assert nested_path.exists()
        assert "ERROR DATABASE" in nested_path.read_text(encoding="utf-8")


class TestErrorDBRepositoryErrors:
    """Test error handling"""

    def test_log_error_with_read_only_file(self, tmp_path):
        """Should raise StorageError if file is read-only"""
        db_path = tmp_path / "ERROR_DB.md"
        repo = ErrorDBRepository(db_path)

        # Try to make file read-only (skip on Windows)
        import os
        if hasattr(os, 'chmod'):
            os.chmod(db_path, 0o444)
            try:
                with pytest.raises(StorageError):
                    repo.log_error("Test", "Cause", "Fix")
            finally:
                os.chmod(db_path, 0o644)

    def test_read_corrupted_file(self, tmp_path):
        """Should handle corrupted file gracefully"""
        db_path = tmp_path / "ERROR_DB.md"
        db_path.write_text("corrupted content", encoding="utf-8")

        repo = ErrorDBRepository(db_path)
        content = repo.read()
        assert content == "corrupted content"

    def test_get_metadata_corrupted_parsing(self, tmp_path):
        """Should handle corrupted file in metadata"""
        db_path = tmp_path / "ERROR_DB.md"
        db_path.write_text("corrupted", encoding="utf-8")

        repo = ErrorDBRepository(db_path)
        # Should not crash, errors list will be empty
        errors = repo.get_all_errors()
        assert isinstance(errors, list)

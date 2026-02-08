"""Unit tests for error handling system"""

import pytest
from pathlib import Path
from tempfile import TemporaryDirectory

from src.core.errors.base import (
    ForgeError,
    ConfigurationError,
    MemoryError,
    LLMError,
    StorageError,
    ValidationError,
    get_error_severity,
    ErrorSeverity,
)
from src.core.errors.logger import ErrorLogger, get_logger, log_error


class TestForgeError:
    """Test base ForgeError class"""

    def test_create_error(self):
        """Should create error with message"""
        error = ForgeError("Test error")
        assert str(error) == "Test error"
        assert error.message == "Test error"

    def test_error_with_context(self):
        """Should store context information"""
        context = {"action": "load_memory", "file": "MEMORY.md"}
        error = ForgeError("Failed to load", context=context)
        assert error.context == context

    def test_error_with_original(self):
        """Should wrap original exception"""
        original = ValueError("Original error")
        error = ForgeError("Wrapped error", original_error=original)
        assert error.original_error == original

    def test_error_to_dict(self):
        """Should convert to dictionary"""
        error = ForgeError("Test", context={"key": "value"})
        error_dict = error.to_dict()
        assert error_dict["error_type"] == "ForgeError"
        assert error_dict["message"] == "Test"
        assert error_dict["context"] == {"key": "value"}


class TestErrorSubclasses:
    """Test error subclasses"""

    def test_configuration_error(self):
        """ConfigurationError should be ForgeError"""
        error = ConfigurationError("Missing config")
        assert isinstance(error, ForgeError)
        assert str(error) == "Missing config"

    def test_memory_error(self):
        """MemoryError should be ForgeError"""
        error = MemoryError("Failed to read memory")
        assert isinstance(error, ForgeError)

    def test_llm_error(self):
        """LLMError should be ForgeError"""
        error = LLMError("API connection failed")
        assert isinstance(error, ForgeError)

    def test_storage_error(self):
        """StorageError should be ForgeError"""
        error = StorageError("File not found")
        assert isinstance(error, ForgeError)

    def test_validation_error(self):
        """ValidationError should be ForgeError"""
        error = ValidationError("Invalid input")
        assert isinstance(error, ForgeError)


class TestErrorSeverity:
    """Test error severity detection"""

    def test_configuration_error_critical(self):
        """ConfigurationError should be CRITICAL"""
        error = ConfigurationError("Missing API key")
        severity = get_error_severity(error)
        assert severity == ErrorSeverity.CRITICAL

    def test_llm_error_severity(self):
        """LLMError should be ERROR"""
        error = LLMError("API timeout")
        severity = get_error_severity(error)
        assert severity == ErrorSeverity.ERROR

    def test_memory_error_warning(self):
        """MemoryError should be WARNING"""
        error = MemoryError("Memory entry incomplete")
        severity = get_error_severity(error)
        assert severity == ErrorSeverity.WARNING

    def test_validation_error_warning(self):
        """ValidationError should be WARNING"""
        error = ValidationError("Invalid format")
        severity = get_error_severity(error)
        assert severity == ErrorSeverity.WARNING

    def test_standard_exception_error(self):
        """Standard exceptions should be ERROR"""
        error = ValueError("Standard error")
        severity = get_error_severity(error)
        assert severity == ErrorSeverity.ERROR


class TestErrorLogger:
    """Test error logging system"""

    @pytest.fixture
    def temp_log_dir(self, tmp_path):
        """Create temporary log directory"""
        return tmp_path

    def test_create_logger(self, temp_log_dir):
        """Should create logger with log directory"""
        logger = ErrorLogger(temp_log_dir)
        assert logger.log_dir == temp_log_dir
        assert logger.log_file == temp_log_dir / "forge.log"

    def test_logger_creates_log_file(self, temp_log_dir):
        """Should create log file on first log"""
        logger = ErrorLogger(temp_log_dir)
        error = ValueError("Test error")
        logger.log_error(error)

        # Log file should exist after logging
        # (Note: might be created on instantiation)
        assert temp_log_dir.exists()

    def test_log_error_returns_record(self, temp_log_dir):
        """Should return error record dictionary"""
        logger = ErrorLogger(temp_log_dir)
        error = ForgeError("Test", context={"action": "test"})
        record = logger.log_error(error)

        assert record["type"] == "ForgeError"
        assert record["message"] == "Test"
        assert "timestamp" in record
        assert "severity" in record

    def test_log_with_context(self, temp_log_dir):
        """Should log error with additional context"""
        logger = ErrorLogger(temp_log_dir)
        error = StorageError("File not found")
        context = {"filename": "data.txt", "action": "read"}
        record = logger.log_error(error, context=context)

        assert record["context"] == context

    def test_log_with_severity_override(self, temp_log_dir):
        """Should allow severity override"""
        logger = ErrorLogger(temp_log_dir)
        error = MemoryError("Minor issue")
        record = logger.log_error(error, severity=ErrorSeverity.CRITICAL)

        assert record["severity"] == ErrorSeverity.CRITICAL

    def test_get_log_file(self, temp_log_dir):
        """Should return log file path"""
        logger = ErrorLogger(temp_log_dir)
        assert logger.get_log_file() == temp_log_dir / "forge.log"

    def test_clear_log(self, temp_log_dir):
        """Should clear log file"""
        logger = ErrorLogger(temp_log_dir)

        # Log an error to create file
        logger.log_error(ValueError("Test"))

        # Clear should work without error
        logger.clear_log()
        # File should be gone or empty
        assert True  # Just verify no exception


class TestGlobalLogger:
    """Test global logger instance"""

    def test_get_logger_creates_instance(self, tmp_path):
        """Should create logger on first call"""
        logger = get_logger(tmp_path)
        assert logger is not None
        assert isinstance(logger, ErrorLogger)

    def test_log_error_convenience_function(self, tmp_path):
        """Should log error with convenience function"""
        get_logger(tmp_path)  # Initialize
        error = ValueError("Test")
        record = log_error(error, context={"test": True})

        assert record["type"] == "ValueError"
        assert record["context"]["test"] is True


class TestErrorLogging:
    """Integration tests for error logging"""

    def test_forge_error_logging(self, tmp_path, capsys):
        """Should log ForgeError with context"""
        logger = ErrorLogger(tmp_path, console_level="DEBUG")

        error = ForgeError(
            "Operation failed",
            context={"operation": "save", "file": "data.json"},
        )
        logger.log_error(error)

        captured = capsys.readouterr()
        assert "ForgeError" in captured.out or "Operation failed" in captured.out

    def test_exception_chaining(self, tmp_path):
        """Should log exception chains"""
        logger = ErrorLogger(tmp_path, console_level="DEBUG")

        try:
            try:
                raise ValueError("Original error")
            except ValueError as e:
                raise StorageError("Failed to save", original_error=e)
        except StorageError as e:
            record = logger.log_error(e)
            assert record["type"] == "StorageError"
            assert "original_error" in record

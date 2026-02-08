"""Centralized Error Logging System"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

from .base import ForgeError, get_error_severity, ErrorSeverity


class ErrorLogger:
    """
    Centralized error logging system for The Forge

    Features:
    - File and console logging
    - Structured logging with context
    - Error categorization by severity
    - Integration with ERROR_DB.md
    """

    def __init__(
        self,
        log_dir: Path,
        log_file: str = "forge.log",
        console_level: str = "INFO",
        file_level: str = "DEBUG",
    ):
        """
        Initialize error logger

        Args:
            log_dir: Directory for log files
            log_file: Log filename
            console_level: Console logging level
            file_level: File logging level
        """
        self.log_dir = Path(log_dir)
        self.log_file = self.log_dir / log_file
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Create logger
        self.logger = logging.getLogger("TheForge")
        self.logger.setLevel(logging.DEBUG)

        # Remove existing handlers
        self.logger.handlers = []

        # File handler
        file_handler = logging.FileHandler(self.log_file, encoding="utf-8")
        file_handler.setLevel(getattr(logging, file_level.upper(), logging.DEBUG))
        file_formatter = logging.Formatter(
            "[%(asctime)s] %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        file_handler.setFormatter(file_formatter)
        self.logger.addHandler(file_handler)

        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, console_level.upper(), logging.INFO))
        console_formatter = logging.Formatter(
            "%(levelname)-8s | %(message)s",
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)

    def log_error(
        self,
        error: Exception,
        context: Optional[Dict[str, Any]] = None,
        severity: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Log an error with context

        Args:
            error: Exception to log
            context: Additional context information
            severity: Optional severity override

        Returns:
            Error record dictionary
        """
        # Determine severity
        if severity is None:
            severity = get_error_severity(error)

        # Build error record
        error_record = {
            "timestamp": datetime.now().isoformat(),
            "type": type(error).__name__,
            "message": str(error),
            "severity": severity,
            "context": context or {},
        }

        # Add ForgeError context
        if isinstance(error, ForgeError):
            error_record["forge_context"] = error.context
            if error.original_error:
                error_record["original_error"] = str(error.original_error)

        # Log with appropriate level
        level = severity.upper()
        log_level = getattr(logging, level, logging.ERROR)
        self.logger.log(log_level, f"{error_record['type']}: {error_record['message']}")

        return error_record

    def log_exception(self, error: Exception, context: Optional[Dict[str, Any]] = None):
        """
        Log an exception with full traceback

        Args:
            error: Exception to log
            context: Additional context information
        """
        self.log_error(error, context=context)
        self.logger.exception(f"Exception details: {error}")

    def get_log_file(self) -> Path:
        """Get path to log file"""
        return self.log_file

    def get_recent_errors(self, limit: int = 10) -> list:
        """
        Get recent error entries from log file

        Args:
            limit: Maximum number of entries to return

        Returns:
            List of recent error log lines
        """
        if not self.log_file.exists():
            return []

        try:
            with open(self.log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()

            # Filter error lines
            error_lines = [
                line.strip()
                for line in lines
                if any(level in line for level in ["ERROR", "CRITICAL", "WARNING"])
            ]

            return error_lines[-limit:]
        except Exception as e:
            self.logger.error(f"Failed to read error logs: {e}")
            return []

    def clear_log(self):
        """Clear log file"""
        try:
            self.log_file.unlink()
        except Exception as e:
            self.logger.warning(f"Failed to clear log: {e}")


# Global logger instance
_logger_instance: Optional[ErrorLogger] = None


def get_logger(log_dir: Optional[Path] = None) -> ErrorLogger:
    """
    Get or create global error logger

    Args:
        log_dir: Optional log directory (used on first call)

    Returns:
        ErrorLogger instance
    """
    global _logger_instance

    if _logger_instance is None:
        if log_dir is None:
            log_dir = Path.cwd() / "logs"
        _logger_instance = ErrorLogger(log_dir)

    return _logger_instance


def log_error(
    error: Exception,
    context: Optional[Dict[str, Any]] = None,
    severity: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Convenience function to log error using global logger

    Args:
        error: Exception to log
        context: Additional context
        severity: Optional severity override

    Returns:
        Error record dictionary
    """
    logger = get_logger()
    return logger.log_error(error, context=context, severity=severity)

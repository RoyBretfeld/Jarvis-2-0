"""Custom Exception Classes for The Forge"""

from typing import Optional, Dict, Any


class ForgeError(Exception):
    """
    Base exception class for The Forge application

    All custom exceptions in The Forge inherit from this class,
    allowing for easy distinction from standard Python exceptions.

    Attributes:
        message: Human-readable error message
        context: Additional context information (dict)
        original_error: The original exception if this is a wrapper

    Example:
        >>> try:
        ...     raise ForgeError("Something went wrong", context={"action": "load_memory"})
        ... except ForgeError as e:
        ...     print(f"{e.message}: {e.context}")
    """

    def __init__(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        original_error: Optional[Exception] = None,
    ):
        """
        Initialize ForgeError

        Args:
            message: Error message
            context: Additional context information
            original_error: Original exception being wrapped
        """
        self.message = message
        self.context = context or {}
        self.original_error = original_error

        # Build full error message
        full_message = message
        if context:
            context_str = ", ".join(f"{k}={v}" for k, v in context.items())
            full_message = f"{message} [{context_str}]"

        super().__init__(full_message)

    def __str__(self) -> str:
        return self.message

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(message={self.message!r}, context={self.context!r})"

    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary for logging/serialization"""
        return {
            "error_type": self.__class__.__name__,
            "message": self.message,
            "context": self.context,
            "original_error": str(self.original_error) if self.original_error else None,
        }


class ConfigurationError(ForgeError):
    """
    Raised when configuration is invalid or missing

    Examples:
        - Missing required configuration keys
        - Invalid configuration values
        - Schema validation failures
    """

    pass


class MemoryError(ForgeError):
    """
    Raised when memory operations fail

    Examples:
        - Failed to read MEMORY.md
        - Failed to write to memory
        - Compression errors
        - Memory parsing errors
    """

    pass


class LLMError(ForgeError):
    """
    Raised when LLM provider operations fail

    Examples:
        - API connection errors
        - Invalid API responses
        - Model loading failures
        - Token limit exceeded
    """

    pass


class StorageError(ForgeError):
    """
    Raised when file/storage operations fail

    Examples:
        - File read/write errors
        - Directory creation failures
        - Permission errors
        - Path resolution failures
    """

    pass


class ValidationError(ForgeError):
    """
    Raised when data validation fails

    Examples:
        - Invalid input format
        - Missing required fields
        - Type mismatches
        - Range violations
    """

    pass


# Error severity levels
class ErrorSeverity:
    """Error severity constants"""

    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


def get_error_severity(error: Exception) -> str:
    """
    Determine severity level of an error

    Args:
        error: Exception instance

    Returns:
        Severity level string
    """
    if isinstance(error, ConfigurationError):
        return ErrorSeverity.CRITICAL
    elif isinstance(error, LLMError):
        return ErrorSeverity.ERROR
    elif isinstance(error, StorageError):
        return ErrorSeverity.ERROR
    elif isinstance(error, MemoryError):
        return ErrorSeverity.WARNING
    elif isinstance(error, ValidationError):
        return ErrorSeverity.WARNING
    else:
        return ErrorSeverity.ERROR

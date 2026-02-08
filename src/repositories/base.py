"""Base Repository Class - Abstract Interface for Data Access"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Any, Dict


class BaseRepository(ABC):
    """
    Abstract base class for all repositories

    The Repository Pattern provides an abstraction layer between
    business logic and data access logic. Subclasses implement
    specific storage mechanisms (files, databases, APIs, etc.)

    Key Responsibilities:
    - Read/Write operations
    - Data persistence
    - Error handling
    - Data validation

    Example:
        >>> class UserRepository(BaseRepository):
        ...     def read(self, identifier: str) -> Optional[str]:
        ...         # Implementation specific to users
        ...         pass
    """

    def __init__(self, base_path: Path):
        """
        Initialize repository with base path

        Args:
            base_path: Base directory for data storage
        """
        self.base_path = Path(base_path)
        self._ensure_base_path()

    def _ensure_base_path(self) -> None:
        """Create base path if it doesn't exist"""
        self.base_path.mkdir(parents=True, exist_ok=True)

    @abstractmethod
    def read(self, identifier: str) -> Optional[str]:
        """
        Read data from storage

        Args:
            identifier: Unique identifier for data (e.g., filename, ID)

        Returns:
            Data content as string, or None if not found

        Raises:
            StorageError: If read operation fails
        """
        pass

    @abstractmethod
    def write(self, identifier: str, content: str) -> bool:
        """
        Write data to storage

        Args:
            identifier: Unique identifier for data
            content: Data content to write

        Returns:
            True if successful, False otherwise

        Raises:
            StorageError: If write operation fails
        """
        pass

    @abstractmethod
    def exists(self, identifier: str) -> bool:
        """
        Check if data exists in storage

        Args:
            identifier: Unique identifier for data

        Returns:
            True if data exists, False otherwise
        """
        pass

    def delete(self, identifier: str) -> bool:
        """
        Delete data from storage (optional)

        Default implementation does nothing.
        Subclasses can override if deletion is supported.

        Args:
            identifier: Unique identifier for data

        Returns:
            True if successful, False otherwise
        """
        return False

    def list_all(self) -> list:
        """
        List all identifiers in repository (optional)

        Default implementation returns empty list.
        Subclasses can override to list stored items.

        Returns:
            List of identifiers
        """
        return []

    def get_metadata(self, identifier: str) -> Optional[Dict[str, Any]]:
        """
        Get metadata for stored data (optional)

        Args:
            identifier: Unique identifier for data

        Returns:
            Dictionary with metadata (size, date, etc.) or None
        """
        return None

    def validate_identifier(self, identifier: str) -> bool:
        """
        Validate identifier format

        Default implementation checks for non-empty string.
        Subclasses can override with stricter validation.

        Args:
            identifier: Identifier to validate

        Returns:
            True if valid, False otherwise
        """
        return isinstance(identifier, str) and len(identifier) > 0

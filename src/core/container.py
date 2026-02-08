"""Service Container - Dependency Injection for The Forge"""

from pathlib import Path
from typing import Optional, Dict, Any

from src.repositories.memory_repo import MemoryRepository
from src.repositories.soul_repo import SoulRepository
from src.repositories.error_db_repo import ErrorDBRepository


class ServiceContainer:
    """
    Service Container for dependency injection

    Manages singleton instances of repositories and services.
    Provides lazy-loading and consistent initialization.

    Example:
        config = ConfigLoader().load()
        container = ServiceContainer(config)
        memory_repo = container.get_memory_repository()
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize service container

        Args:
            config: Configuration dictionary
        """
        self.config = config
        self._repositories: Dict[str, Any] = {}
        self._services: Dict[str, Any] = {}

    def _get_body_path(self) -> Path:
        """Get body directory path from config"""
        body_dir = self.config.get("paths", {}).get("body", "body")
        return Path(body_dir).resolve()

    def _get_error_db_path(self) -> Path:
        """Get error database path from config"""
        error_db = self.config.get("paths", {}).get("error_db", "ERROR_DB.md")
        return Path(error_db).resolve()

    # Repository Getters

    def get_memory_repository(self) -> MemoryRepository:
        """
        Get or create MemoryRepository singleton

        Returns:
            MemoryRepository instance
        """
        if "memory_repo" not in self._repositories:
            body_path = self._get_body_path()
            self._repositories["memory_repo"] = MemoryRepository(body_path)
        return self._repositories["memory_repo"]

    def get_soul_repository(self) -> SoulRepository:
        """
        Get or create SoulRepository singleton

        Returns:
            SoulRepository instance
        """
        if "soul_repo" not in self._repositories:
            body_path = self._get_body_path()
            self._repositories["soul_repo"] = SoulRepository(body_path)
        return self._repositories["soul_repo"]

    def get_error_db_repository(self) -> ErrorDBRepository:
        """
        Get or create ErrorDBRepository singleton

        Returns:
            ErrorDBRepository instance
        """
        if "error_db_repo" not in self._repositories:
            error_db_path = self._get_error_db_path()
            self._repositories["error_db_repo"] = ErrorDBRepository(error_db_path)
        return self._repositories["error_db_repo"]

    # Utility Methods

    def reset_repositories(self) -> None:
        """Reset all repository instances (useful for testing)"""
        self._repositories.clear()

    def reset_services(self) -> None:
        """Reset all service instances (useful for testing)"""
        self._services.clear()

    def reset_all(self) -> None:
        """Reset all instances"""
        self.reset_repositories()
        self.reset_services()

    def get_config(self) -> Dict[str, Any]:
        """Get configuration dictionary"""
        return self.config

    def get_config_value(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value by dot notation

        Args:
            key: Configuration key (e.g., "paths.body", "llm.provider")
            default: Default value if key not found

        Returns:
            Configuration value
        """
        parts = key.split(".")
        value = self.config

        for part in parts:
            if isinstance(value, dict):
                value = value.get(part, default)
            else:
                return default

        return value

"""Soul Manager Service - Agent soul/personality management"""

from pathlib import Path
from typing import Optional

from src.repositories.soul_repo import SoulRepository
from src.core.errors import StorageError


class SoulManager:
    """
    Soul Manager Service

    Manages agent soul, personality, and identity.

    Methods:
        get_soul() - Get agent soul/personality
        update_soul(content) - Update soul
        get_identity() - Get agent identity
        get_personality_summary() - Get personality overview
    """

    def __init__(self, body_path: Path):
        """
        Initialize Soul Manager

        Args:
            body_path: Path to body/ directory
        """
        self.body_path = Path(body_path)
        self.repository = SoulRepository(self.body_path)

    def get_soul(self) -> str:
        """
        Get agent soul/personality

        Returns:
            Soul content from SOUL.md
        """
        return self.repository.read_soul()

    def update_soul(self, content: str) -> bool:
        """
        Update agent soul

        Args:
            content: New soul content

        Returns:
            True if successful

        Raises:
            ValueError: If content is empty
            StorageError: If update fails
        """
        if not content or not content.strip():
            raise ValueError("Soul content cannot be empty")

        return self.repository.write_soul(content)

    def get_identity(self) -> str:
        """
        Get agent identity

        Returns:
            Identity content from IDENTITY.md
        """
        return self.repository.read_identity()

    def has_soul(self) -> bool:
        """Check if SOUL.md file exists"""
        return self.repository.exists("soul")

    def has_identity(self) -> bool:
        """Check if IDENTITY.md file exists"""
        return self.repository.exists("identity")

    def get_personality_summary(self) -> dict:
        """
        Get personality summary with metadata

        Returns:
            Dictionary with soul and identity info
        """
        return {
            "has_soul": self.has_soul(),
            "soul_size_mb": self._get_file_size("soul") / (1024 * 1024),
            "has_identity": self.has_identity(),
            "identity_size_mb": self._get_file_size("identity") / (1024 * 1024),
            "soul_modified": self._get_file_modified("soul"),
            "identity_modified": self._get_file_modified("identity"),
        }

    def _get_file_size(self, identifier: str) -> int:
        """Get file size in bytes"""
        try:
            metadata = self.repository.get_metadata(identifier)
            if metadata:
                return metadata.get("size_bytes", 0)
        except Exception:
            pass
        return 0

    def _get_file_modified(self, identifier: str) -> Optional[str]:
        """Get file modification timestamp"""
        try:
            metadata = self.repository.get_metadata(identifier)
            if metadata:
                return metadata.get("modified")
        except Exception:
            pass
        return None

    def append_to_soul(self, addition: str) -> bool:
        """
        Append content to existing soul

        Args:
            addition: Content to append

        Returns:
            True if successful
        """
        if not addition or not addition.strip():
            raise ValueError("Addition cannot be empty")

        try:
            current = self.get_soul()
            updated = current + "\n\n" + addition
            return self.update_soul(updated)
        except Exception as e:
            raise StorageError(f"Failed to append to soul: {e}")

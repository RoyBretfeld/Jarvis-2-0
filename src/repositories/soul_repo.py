"""Soul Repository - Abstraction for Soul/Identity Operations"""

from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
import re

from .base import BaseRepository
from src.core.errors import StorageError


class SoulRepository(BaseRepository):
    """
    Repository for Soul/Identity file operations

    Manages SOUL.md, NAME.md, and IDENTITY.md files.
    Provides operations for reading/updating agent identity and personality.

    Attributes:
        soul_file: Path to SOUL.md
        name_file: Path to NAME.md
        identity_file: Path to IDENTITY.md
    """

    def __init__(self, body_path: Path):
        """
        Initialize Soul Repository

        Args:
            body_path: Path to body/ directory
        """
        super().__init__(body_path)
        self.soul_file = self.base_path / "SOUL.md"
        self.name_file = self.base_path / "NAME.md"
        self.identity_file = self.base_path / "IDENTITY.md"

    def read(self, identifier: str) -> str:
        """
        Read soul-related file

        Args:
            identifier: "soul", "name", or "identity"

        Returns:
            File content

        Raises:
            StorageError: If read fails
            ValueError: If identifier unknown
        """
        if identifier == "soul":
            return self.read_soul()
        elif identifier == "name":
            return self.read_name()
        elif identifier == "identity":
            return self.read_identity()
        else:
            raise ValueError(f"Unknown identifier: {identifier}")

    def write(self, identifier: str, content: str) -> bool:
        """
        Write to soul file (limited support)

        Args:
            identifier: Target file identifier
            content: Content to write

        Returns:
            True if successful

        Raises:
            ValueError: If write not supported for this identifier
        """
        if identifier == "soul":
            return self.write_soul(content)
        else:
            raise ValueError(f"Cannot write to: {identifier}")

    def exists(self, identifier: str) -> bool:
        """
        Check if soul file exists

        Args:
            identifier: "soul", "name", or "identity"

        Returns:
            True if file exists
        """
        if identifier == "soul":
            return self.soul_file.exists()
        elif identifier == "name":
            return self.name_file.exists()
        elif identifier == "identity":
            return self.identity_file.exists()
        return False

    def read_soul(self) -> str:
        """
        Read SOUL.md file

        Returns:
            Soul content
        """
        try:
            if self.soul_file.exists():
                return self.soul_file.read_text(encoding="utf-8")
            return ""
        except Exception as e:
            raise StorageError(f"Failed to read soul: {e}")

    def write_soul(self, content: str) -> bool:
        """
        Write SOUL.md file

        Args:
            content: Soul content

        Returns:
            True if successful
        """
        try:
            self.soul_file.write_text(content, encoding="utf-8")
            return True
        except Exception as e:
            raise StorageError(f"Failed to write soul: {e}")

    def read_name(self) -> str:
        """
        Extract current agent name from NAME.md

        Returns:
            Agent name, or "The Forge" as default
        """
        try:
            if not self.name_file.exists():
                return "The Forge"

            content = self.name_file.read_text(encoding="utf-8")
            # Pattern: **Current Name**: AgentName
            match = re.search(r"\*\*Current Name\*\*:\s*(.+?)(?:\n|$)", content)
            return match.group(1).strip() if match else "The Forge"
        except Exception:
            return "The Forge"

    def update_name(self, new_name: str) -> bool:
        """
        Update agent name in NAME.md

        Args:
            new_name: New name for agent

        Returns:
            True if successful

        Raises:
            StorageError: If update fails
            ValueError: If name is empty
        """
        if not new_name or not new_name.strip():
            raise ValueError("Name cannot be empty")

        timestamp = datetime.now().strftime("%Y-%m-%d")

        try:
            # Read current content
            content = self.read_name_file_content()

            # Update Current Name line
            content = re.sub(
                r"\*\*Current Name\*\*:\s*.+",
                f"**Current Name**: {new_name}",
                content
            )

            # Append to history
            content += f"\n* [{timestamp}] Renamed to: \"{new_name}\""

            # Write back
            self.name_file.write_text(content, encoding="utf-8")
            return True
        except Exception as e:
            raise StorageError(f"Failed to update name: {e}")

    def read_name_file_content(self) -> str:
        """Read complete NAME.md file content"""
        try:
            return self.name_file.read_text(encoding="utf-8")
        except Exception:
            return ""

    def read_identity(self) -> str:
        """
        Read IDENTITY.md file

        Returns:
            Identity content
        """
        try:
            if self.identity_file.exists():
                return self.identity_file.read_text(encoding="utf-8")
            return ""
        except Exception as e:
            raise StorageError(f"Failed to read identity: {e}")

    def get_metadata(self, identifier: str = "soul") -> Optional[Dict[str, Any]]:
        """
        Get metadata about soul files

        Args:
            identifier: "soul", "name", or "identity"

        Returns:
            Dictionary with file metadata
        """
        file_map = {
            "soul": self.soul_file,
            "name": self.name_file,
            "identity": self.identity_file,
        }

        file_path = file_map.get(identifier)
        if not file_path or not file_path.exists():
            return None

        try:
            stat = file_path.stat()
            return {
                "file": file_path.name,
                "size_bytes": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            }
        except Exception:
            return None

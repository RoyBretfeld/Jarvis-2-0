"""Name Manager Service - Agent name management"""

from pathlib import Path
from typing import Optional

from src.repositories.soul_repo import SoulRepository
from src.core.errors import StorageError


class NameManager:
    """
    Name Manager Service

    Manages agent name operations with history tracking.

    Methods:
        get_current_name() - Get current agent name
        update_name(new_name) - Update agent name with history
        get_name_history() - Get all name changes
    """

    def __init__(self, body_path: Path):
        """
        Initialize Name Manager

        Args:
            body_path: Path to body/ directory
        """
        self.body_path = Path(body_path)
        self.repository = SoulRepository(self.body_path)

    def get_current_name(self) -> str:
        """
        Get current agent name

        Returns:
            Agent name (default: "The Forge")
        """
        return self.repository.read_name()

    def update_name(self, new_name: str) -> bool:
        """
        Update agent name with history tracking

        Args:
            new_name: New name for agent

        Returns:
            True if successful

        Raises:
            ValueError: If name is empty/invalid
            StorageError: If update fails
        """
        if not new_name or not new_name.strip():
            raise ValueError("Name cannot be empty")

        return self.repository.update_name(new_name)

    def get_name_history(self) -> list:
        """
        Get all name changes from history

        Returns:
            List of name changes with timestamps
        """
        try:
            content = self.repository.read_name_file_content()
            if not content:
                return []

            history = []
            for line in content.split("\n"):
                line = line.strip()
                if line.startswith("* [") and "Renamed to:" in line:
                    # Extract timestamp and name
                    try:
                        # Format: * [YYYY-MM-DD] Renamed to: "Name"
                        parts = line.split("] ")
                        if len(parts) >= 2:
                            timestamp = parts[0].replace("* [", "")
                            name_part = parts[1].replace('Renamed to: "', "").rstrip('"')
                            history.append({
                                "timestamp": timestamp,
                                "name": name_part
                            })
                    except Exception:
                        pass

            return history
        except Exception:
            return []

    def has_name_file(self) -> bool:
        """Check if NAME.md file exists"""
        return self.repository.exists("name")

    def rename_to(self, new_name: str) -> str:
        """
        Rename agent (alias for update_name with return value)

        Args:
            new_name: New name

        Returns:
            Confirmation message with new name

        Raises:
            ValueError: If name invalid
            StorageError: If update fails
        """
        self.update_name(new_name)
        return f"Agent renamed to: {new_name}"

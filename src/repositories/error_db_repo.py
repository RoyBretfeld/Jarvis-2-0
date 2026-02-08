"""Error DB Repository - Abstraction for ERROR_DB.md Operations"""

from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List

from .base import BaseRepository
from src.core.errors import StorageError


class ErrorDBRepository(BaseRepository):
    """
    Repository for Error Database operations

    Manages ERROR_DB.md file which stores system errors and fixes.
    Provides structured access to error entries for learning/debugging.

    Attributes:
        error_db_path: Path to ERROR_DB.md file
    """

    def __init__(self, error_db_path: Path):
        """
        Initialize Error DB Repository

        Args:
            error_db_path: Path to ERROR_DB.md file (may be in external location)
        """
        # Don't call super().__init__ since error_db_path might not be a directory
        self.error_db_path = Path(error_db_path)
        self._ensure_file()

    def _ensure_file(self) -> None:
        """Create ERROR_DB.md with header if not exists"""
        if not self.error_db_path.exists():
            self.error_db_path.parent.mkdir(parents=True, exist_ok=True)
            header = "# ERROR DATABASE\n\n| ID | Error | Root Cause | Fix | Status |\n|---|---|---|---|---|\n"
            self.error_db_path.write_text(header, encoding="utf-8")

    @property
    def base_path(self) -> Path:
        """Return parent directory of error db file"""
        return self.error_db_path.parent

    def read(self, identifier: str = "all") -> str:
        """
        Read entire ERROR_DB.md file

        Args:
            identifier: Unused, always returns full content

        Returns:
            Complete ERROR_DB.md content
        """
        try:
            if self.error_db_path.exists():
                return self.error_db_path.read_text(encoding="utf-8")
            return ""
        except Exception as e:
            raise StorageError(f"Failed to read error database: {e}")

    def write(self, identifier: str, content: str) -> bool:
        """
        Write to ERROR_DB (not directly supported)

        Use log_error() instead for structured error logging.

        Args:
            identifier: Unused
            content: Unused

        Raises:
            ValueError: Always, use log_error() instead
        """
        raise ValueError("Use log_error() to add entries. Direct write not supported.")

    def exists(self, identifier: str = "all") -> bool:
        """
        Check if error database exists

        Args:
            identifier: Unused

        Returns:
            True if ERROR_DB.md exists
        """
        return self.error_db_path.exists()

    def log_error(self, error_message: str, root_cause: str = "TBD", fix: str = "TBD") -> str:
        """
        Log a new error entry to ERROR_DB

        Args:
            error_message: Error description
            root_cause: Root cause (default: TBD)
            fix: Suggested fix (default: TBD)

        Returns:
            Error ID assigned

        Raises:
            StorageError: If write fails
        """
        date = datetime.now().strftime("%Y%m%d")
        error_count = len(self.get_all_errors())
        error_id = f"ERR-{date}-{error_count + 1:03d}"

        # Escape pipe characters in fields
        error_msg = error_message.replace("|", "\\|")
        root_cause = root_cause.replace("|", "\\|")
        fix = fix.replace("|", "\\|")

        line = f"\n| {error_id} | {error_msg} | {root_cause} | {fix} | Open |"

        try:
            with open(self.error_db_path, "a", encoding="utf-8") as f:
                f.write(line)
            return error_id
        except Exception as e:
            raise StorageError(f"Failed to log error: {e}")

    def get_all_errors(self) -> List[Dict[str, str]]:
        """
        Parse and return all error entries

        Returns:
            List of error entry dictionaries
        """
        content = self.read()
        errors = []

        for line in content.split("\n"):
            line = line.strip()
            # Skip header and empty lines
            if not line or line.startswith("#") or line.startswith("|"):
                if "|" in line and "ID" not in line and "---" not in line:
                    parts = [p.strip() for p in line.split("|")]
                    if len(parts) >= 6:
                        errors.append({
                            "id": parts[1],
                            "error": parts[2],
                            "root_cause": parts[3],
                            "fix": parts[4],
                            "status": parts[5],
                        })

        return errors

    def get_error(self, error_id: str) -> Optional[Dict[str, str]]:
        """
        Get specific error by ID

        Args:
            error_id: Error ID to retrieve

        Returns:
            Error entry dictionary or None
        """
        for error in self.get_all_errors():
            if error["id"] == error_id:
                return error
        return None

    def update_error_status(self, error_id: str, new_status: str) -> bool:
        """
        Update status of error entry

        Args:
            error_id: Error ID to update
            new_status: New status (e.g., "Resolved", "Investigating")

        Returns:
            True if successful
        """
        try:
            content = self.read()
            # Simple replace of status column for this error
            # This is a simplification; full parsing would be more robust
            old_line = f"| {error_id} |"
            lines = content.split("\n")

            for i, line in enumerate(lines):
                if old_line in line:
                    # Replace last column (status)
                    parts = line.split("|")
                    if len(parts) >= 6:
                        parts[-2] = f" {new_status} "
                        lines[i] = "|".join(parts)

            self.error_db_path.write_text("\n".join(lines), encoding="utf-8")
            return True
        except Exception:
            return False

    def get_metadata(self, identifier: str = "all") -> Optional[Dict[str, Any]]:
        """
        Get metadata about error database

        Args:
            identifier: Unused

        Returns:
            Dictionary with stats
        """
        if not self.exists():
            return None

        try:
            stat = self.error_db_path.stat()
            errors = self.get_all_errors()
            open_count = sum(1 for e in errors if e.get("status", "").lower() != "resolved")

            return {
                "file": self.error_db_path.name,
                "size_bytes": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "total_errors": len(errors),
                "open_errors": open_count,
            }
        except Exception:
            return None

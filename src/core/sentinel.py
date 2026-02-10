"""
Sentinel Gatekeeper - Security Layer for TAIA Agent

Prevents unauthorized actions:
- ✅ body/ — TAIA can create/modify knowledge (markdown, JSON, logs)
- ❌ src/ — Code changes require explicit user approval
- ❌ Dangerous operations (rm, chmod, execution) always blocked

This creates safe autonomy boundaries.
"""

import logging
import os
from typing import Tuple, List, Optional
from pathlib import Path
from enum import Enum

logger = logging.getLogger(__name__)


class AccessLevel(Enum):
    """Security access levels"""
    ALLOW = "allow"        # Safe to execute
    WARN = "warn"          # Proceed with caution
    REQUIRE_APPROVAL = "require_approval"  # Need user consent
    DENY = "deny"          # Block entirely


class FileCategory(Enum):
    """File type categories"""
    KNOWLEDGE = "knowledge"        # Markdown, JSON (safe)
    CODE = "code"                  # Python, JS, etc. (requires approval)
    EXECUTABLE = "executable"      # Binaries, scripts (blocked)
    CONFIG = "config"              # .env, secrets (requires approval)
    SYSTEM = "system"              # OS files (blocked)


class SentinelGatekeeper:
    """
    Security gatekeeper for TAIA autonomous actions

    Rule Set:
    - body/ directory: Full knowledge autonomy
    - src/ directory: Code-change approval required
    - Dangerous patterns: Immediately blocked
    """

    # Safe extensions for autonomous creation (body/)
    SAFE_EXTENSIONS = {".md", ".json", ".txt", ".csv", ".yaml", ".yml"}

    # Restricted extensions requiring approval (src/)
    RESTRICTED_EXTENSIONS = {".py", ".js", ".ts", ".sh", ".exe", ".dll", ".bin"}

    # Completely blocked patterns
    BLOCKED_PATTERNS = {
        "rm -rf",
        "rmdir",
        "del /s",
        "sudo",
        "chmod",
        "__import__",
        "eval(",
        "exec(",
        "subprocess.run",
        "os.system",
    }

    def __init__(self, base_path: Path):
        """
        Initialize Sentinel Gatekeeper

        Args:
            base_path: Project root directory
        """
        self.base_path = Path(base_path)
        self.body_path = self.base_path / "body"
        self.src_path = self.base_path / "src"

        # Audit log
        self.denied_actions: List[dict] = []
        self.approved_actions: List[dict] = []

    def check_file_access(
        self,
        file_path: str,
        operation: str = "write",  # read, write, delete, execute
    ) -> Tuple[AccessLevel, str]:
        """
        Check if file operation is allowed

        Args:
            file_path: Path to file
            operation: Operation type (read, write, delete, execute)

        Returns:
            Tuple of (AccessLevel, reason)
        """
        path = Path(file_path)
        reason = ""

        # Get relative path
        try:
            rel_path = path.relative_to(self.base_path)
        except ValueError:
            # Path outside project
            return AccessLevel.DENY, "Path outside project directory"

        # Block absolute/external paths
        if path.is_absolute() and not str(path).startswith(str(self.base_path)):
            return AccessLevel.DENY, "External paths blocked"

        # Determine category
        category = self._categorize_file(path)

        # Apply rules
        if self._is_in_body(path):
            # body/ is safe for knowledge files
            if category == FileCategory.KNOWLEDGE:
                return AccessLevel.ALLOW, f"✓ Safe operation in body/: {category.value}"
            elif category == FileCategory.CODE:
                return AccessLevel.REQUIRE_APPROVAL, f"Code file in body/: {rel_path}"
            else:
                return AccessLevel.WARN, f"Unusual file type in body/: {category.value}"

        elif self._is_in_src(path):
            # src/ requires approval for code changes
            if category == FileCategory.CODE:
                return AccessLevel.REQUIRE_APPROVAL, f"Code change requires approval: {rel_path}"
            elif category == FileCategory.KNOWLEDGE:
                return AccessLevel.ALLOW, f"Documentation in src/: {rel_path}"
            else:
                return AccessLevel.DENY, f"Dangerous file type in src/: {category.value}"

        else:
            # Other directories: stricter rules
            if category == FileCategory.KNOWLEDGE:
                return AccessLevel.WARN, f"Knowledge file outside body/: {rel_path}"
            elif category == FileCategory.CODE:
                return AccessLevel.REQUIRE_APPROVAL, f"Code file outside src/: {rel_path}"
            else:
                return AccessLevel.DENY, f"Dangerous operation: {category.value}"

    def check_operation(self, operation_string: str) -> Tuple[AccessLevel, str]:
        """
        Check if operation contains dangerous patterns

        Args:
            operation_string: Command or operation string

        Returns:
            Tuple of (AccessLevel, reason)
        """
        # Check for blocked patterns
        for pattern in self.BLOCKED_PATTERNS:
            if pattern.lower() in operation_string.lower():
                return AccessLevel.DENY, f"Blocked pattern: {pattern}"

        return AccessLevel.ALLOW, "Operation allowed"

    def _categorize_file(self, path: Path) -> FileCategory:
        """Determine file category"""
        suffix = path.suffix.lower()

        if suffix in self.SAFE_EXTENSIONS:
            return FileCategory.KNOWLEDGE
        elif suffix in self.RESTRICTED_EXTENSIONS:
            return FileCategory.CODE
        elif suffix in {".env", ".key", ".secret"}:
            return FileCategory.CONFIG
        elif suffix in {".exe", ".dll", ".so", ".bin"}:
            return FileCategory.EXECUTABLE
        elif suffix in {".sh", ".bat", ".cmd"}:
            return FileCategory.EXECUTABLE
        else:
            return FileCategory.SYSTEM

    def _is_in_body(self, path: Path) -> bool:
        """Check if path is in body/ directory"""
        try:
            path.relative_to(self.body_path)
            return True
        except ValueError:
            return False

    def _is_in_src(self, path: Path) -> bool:
        """Check if path is in src/ directory"""
        try:
            path.relative_to(self.src_path)
            return True
        except ValueError:
            return False

    def audit_action(
        self,
        action: str,
        file_path: str,
        access_level: AccessLevel,
        approved: bool = False,
    ):
        """Log an action for audit trail"""
        audit_entry = {
            "action": action,
            "file": file_path,
            "access_level": access_level.value,
            "approved": approved,
            "timestamp": __import__("datetime").datetime.now().isoformat(),
        }

        if access_level == AccessLevel.DENY:
            self.denied_actions.append(audit_entry)
            logger.warning(f"🚫 DENIED: {action} on {file_path}")
        else:
            self.approved_actions.append(audit_entry)
            logger.info(f"✓ ALLOWED: {action} on {file_path}")

    def get_audit_report(self) -> dict:
        """Get security audit report"""
        return {
            "denied_count": len(self.denied_actions),
            "approved_count": len(self.approved_actions),
            "denied_actions": self.denied_actions[-10:],  # Last 10
            "approved_actions": self.approved_actions[-10:],  # Last 10
        }

    def get_safe_path(self, name: str, extension: str = ".md") -> Path:
        """
        Get a safe file path in body/ for autonomous writing

        Args:
            name: File name (without extension)
            extension: File extension

        Returns:
            Safe path in body/ directory
        """
        if extension not in self.SAFE_EXTENSIONS:
            raise ValueError(f"Extension {extension} not allowed for autonomous writing")

        path = self.body_path / f"{name}{extension}"
        return path

    def can_write(self, file_path: str) -> bool:
        """
        TAIA's physical write permission check for skill autonomy.

        ✅ ALWAYS allows entire body/ directory (.md, .json, .txt, .csv, .yaml)
        ✅ ALWAYS allows brain/archives/ for memory archival (Phase D)
        ✅ Creates missing subdirectories automatically
        ❌ Denies src/ code changes without approval
        ❌ Blocks dangerous operations entirely

        Args:
            file_path: Path to file

        Returns:
            True if write is allowed, False if denied
        """
        path = Path(file_path)

        # 1. HARD RULE: Entire body/ is writable autonomy zone
        try:
            rel_path = path.relative_to(self.base_path)
            rel_str = str(rel_path).replace("\\", "/")  # Normalize path separators

            if rel_str.startswith("body/"):
                # Check file extension safety
                extension = path.suffix.lower()
                if extension in self.SAFE_EXTENSIONS or extension == "":
                    logger.info(f"✅ Body write allowed: {file_path}")
                    return True
                else:
                    logger.warning(f"❌ Unsafe extension in body/: {file_path}")
                    return False
        except ValueError:
            pass

        # 1.5 HARD RULE: brain/archives/ is writable for autonomous archival (Phase D)
        try:
            rel_path = path.relative_to(self.base_path)
            rel_str = str(rel_path).replace("\\", "/")  # Normalize path separators

            if rel_str.startswith("brain/archives/"):
                # Check file extension safety
                extension = path.suffix.lower()
                if extension in self.SAFE_EXTENSIONS or extension == "":
                    logger.info(f"✅ Archive write allowed: {file_path}")
                    return True
                else:
                    logger.warning(f"❌ Unsafe extension in archives/: {file_path}")
                    return False
        except ValueError:
            pass

        # 2. Block access outside body/ without explicit approval
        try:
            rel_path = path.relative_to(self.base_path)
            rel_str = str(rel_path).replace("\\", "/")
            if rel_str.startswith("src/"):
                logger.warning(f"❌ Code write denied (requires approval): {file_path}")
                return False
        except ValueError:
            pass

        # 3. Use standard access check for edge cases
        access_level, reason = self.check_file_access(file_path, "write")
        allowed = access_level in {AccessLevel.ALLOW, AccessLevel.WARN}

        if allowed:
            logger.info(f"✅ Write allowed: {file_path}")
        else:
            logger.warning(f"❌ Write denied: {file_path} ({reason})")

        return allowed

    def __call__(
        self,
        file_path: str,
        operation: str = "write",
    ) -> bool:
        """
        Quick access check

        Returns:
            True if allowed, False otherwise
        """
        access_level, _ = self.check_file_access(file_path, operation)
        return access_level in {AccessLevel.ALLOW, AccessLevel.WARN}


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    sentinel = SentinelGatekeeper(Path("."))

    # Test various paths
    test_cases = [
        ("body/MEMORY.md", "write"),
        ("body/logs/app.log", "write"),
        ("src/core/agent.py", "write"),
        ("src/core/README.md", "write"),
        (".env", "read"),
        ("/etc/passwd", "read"),
    ]

    for path, op in test_cases:
        access, reason = sentinel.check_file_access(path, op)
        print(f"{path}: {access.value} - {reason}")

"""
Temporary File Cleaner Module
Removes application-specific temporary files and caches.
"""
import os
import shutil
from pathlib import Path
from typing import Dict, Any, Optional

from src.core.base_cleaner import BaseCleaner, ScanResult


class TempCleaner(BaseCleaner):
    """Cleans application temporary files and caches."""

    APP_CACHE_PATTERNS = {
        "Python": [".pyc", ".pyo", "__pycache__", ".egg-info", "*.egg"],
        "Node": ["node_modules", ".npm", "package-lock.json"],
        "Build": ["dist", "build", "out", ".gradle", "target"],
        "IDE": [".vscode", ".idea", "*.swp", "*.swo", ".DS_Store"],
    }

    def get_name(self) -> str:
        return "Temporary File Cleaner"

    def scan(self) -> ScanResult:
        """Scan for application temporary files."""
        files_to_delete = []
        bytes_to_free = 0
        details = {}

        # Scan current directory and subdirectories
        root_path = Path.cwd()

        for category, patterns in self.APP_CACHE_PATTERNS.items():
            category_files = 0

            for pattern in patterns:
                if "*" in pattern:
                    # Glob pattern
                    for match in root_path.rglob(pattern):
                        if self._should_delete(match):
                            try:
                                size = self._get_size(match)
                                files_to_delete.append(str(match))
                                bytes_to_free += size
                                category_files += 1
                            except (OSError, IOError):
                                pass
                else:
                    # Exact name or directory
                    for match in root_path.rglob(pattern):
                        if match.name == pattern or match.name.endswith(pattern):
                            if self._should_delete(match):
                                try:
                                    size = self._get_size(match)
                                    files_to_delete.append(str(match))
                                    bytes_to_free += size
                                    category_files += 1
                                except (OSError, IOError):
                                    pass

            if category_files > 0:
                details[category] = category_files

        return ScanResult(
            files_to_delete=files_to_delete,
            bytes_to_free=bytes_to_free,
            details=details
        )

    def clean(self, scan_result: ScanResult) -> bool:
        """Delete identified temporary files."""
        success_count = 0
        failed_count = 0

        for file_path in scan_result.files_to_delete:
            try:
                path = Path(file_path)
                if path.is_dir():
                    shutil.rmtree(path, ignore_errors=True)
                else:
                    path.unlink()
                success_count += 1
            except (OSError, PermissionError) as e:
                print(f"⚠️  Could not delete {file_path}: {e}")
                failed_count += 1

        if success_count > 0:
            mb_freed = scan_result.bytes_to_free / (1024 * 1024)
            print(f"✅ Cleaned {success_count} temp files ({mb_freed:.2f} MB)")

        return failed_count == 0

    @staticmethod
    def _should_delete(path: Path) -> bool:
        """Check if path should be deleted."""
        # Don't delete .git or other critical directories
        if ".git" in path.parts or ".github" in path.parts:
            return False
        return True

    @staticmethod
    def _get_size(path: Path) -> int:
        """Get total size of a file or directory."""
        if path.is_dir():
            return sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
        return path.stat().st_size

"""
System Cleaner Module
Removes system temporary files, cache, and unused artifacts.
"""
import os
import shutil
from pathlib import Path
from typing import Dict, Any, Optional

from src.core.base_cleaner import BaseCleaner, ScanResult


class SystemCleaner(BaseCleaner):
    """Cleans system-level temporary files and caches."""

    SYSTEM_CLEANUP_PATHS = {
        "Windows": [
            "%TEMP%",
            "%WINDIR%\\Temp",
            "%APPDATA%\\Local\\Temp",
            "%LOCALAPPDATA%\\Temp",
        ],
        "Unix": [
            "/tmp",
            "/var/tmp",
            "/var/cache",
        ]
    }

    def get_name(self) -> str:
        return "System Cleaner"

    def scan(self) -> ScanResult:
        """Scan for system temporary files."""
        files_to_delete = []
        bytes_to_free = 0
        details = {}

        platform = "Windows" if os.name == "nt" else "Unix"
        cleanup_paths = self.SYSTEM_CLEANUP_PATHS.get(platform, [])

        for path_template in cleanup_paths:
            # Expand environment variables
            path = os.path.expandvars(path_template)

            if not os.path.exists(path):
                continue

            try:
                for root, dirs, files in os.walk(path):
                    # Skip protected directories
                    dirs[:] = [d for d in dirs if not d.startswith('.')]

                    for file in files:
                        file_path = os.path.join(root, file)
                        try:
                            file_size = os.path.getsize(file_path)
                            files_to_delete.append(file_path)
                            bytes_to_free += file_size
                        except (OSError, IOError):
                            pass
            except (OSError, PermissionError):
                pass

        details["platform"] = platform
        details["paths_scanned"] = len(cleanup_paths)
        details["file_count"] = len(files_to_delete)

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
                if os.path.isdir(file_path):
                    shutil.rmtree(file_path, ignore_errors=True)
                else:
                    os.remove(file_path)
                success_count += 1
            except (OSError, PermissionError) as e:
                print(f"⚠️  Could not delete {file_path}: {e}")
                failed_count += 1

        if success_count > 0:
            mb_freed = scan_result.bytes_to_free / (1024 * 1024)
            print(f"✅ Cleaned {success_count} files ({mb_freed:.2f} MB)")

        return failed_count == 0

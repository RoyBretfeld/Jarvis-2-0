"""
Browser Cache Cleaner Module
Removes browser caches, cookies, and temporary data.
"""
import os
import shutil
from pathlib import Path
from typing import Dict, Any, Optional

from src.core.base_cleaner import BaseCleaner, ScanResult


class BrowserCleaner(BaseCleaner):
    """Cleans browser caches, cookies, and temporary data."""

    BROWSER_CACHE_LOCATIONS = {
        "Chrome": [
            "%APPDATA%\\Google\\Chrome\\User Data\\Default\\Cache",
            "%APPDATA%\\Google\\Chrome\\User Data\\Default\\Code Cache",
            "%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cache",
        ],
        "Firefox": [
            "%APPDATA%\\Mozilla\\Firefox\\Profiles",
            "%LOCALAPPDATA%\\Mozilla\\Firefox\\Profiles",
        ],
        "Edge": [
            "%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Cache",
        ],
        "Opera": [
            "%APPDATA%\\Opera\\Opera\\profile\\cache",
        ],
    }

    def get_name(self) -> str:
        return "Browser Cache Cleaner"

    def scan(self) -> ScanResult:
        """Scan for browser caches and temporary files."""
        files_to_delete = []
        bytes_to_free = 0
        details = {}

        for browser, paths in self.BROWSER_CACHE_LOCATIONS.items():
            browser_files = 0

            for path_template in paths:
                path = os.path.expandvars(path_template)

                if not os.path.exists(path):
                    continue

                try:
                    for root, dirs, files in os.walk(path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            try:
                                file_size = os.path.getsize(file_path)
                                files_to_delete.append(file_path)
                                bytes_to_free += file_size
                                browser_files += 1
                            except (OSError, IOError):
                                pass
                except (OSError, PermissionError):
                    pass

            if browser_files > 0:
                details[browser] = browser_files

        return ScanResult(
            files_to_delete=files_to_delete,
            bytes_to_free=bytes_to_free,
            details=details
        )

    def clean(self, scan_result: ScanResult) -> bool:
        """Delete browser cache files."""
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
            print(f"✅ Cleaned {success_count} browser cache files ({mb_freed:.2f} MB)")

        return failed_count == 0

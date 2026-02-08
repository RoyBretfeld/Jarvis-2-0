"""File Pattern Matching and Filtering Utilities"""

import fnmatch
from pathlib import Path
from typing import List, Union


# Unified file exclusion patterns
EXCLUDED_FILE_PATTERNS = [
    "*.pyc",
    "*.pyo",
    "*.pyd",
    "__pycache__",
    ".git",
    ".pytest_cache",
    ".venv",
    "venv",
    "node_modules",
    ".DS_Store",
    "Thumbs.db",
    "*.egg-info",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "vendor",
    ".idea",
    ".vscode",
    "coverage",
]

# Unified excluded directories
EXCLUDED_DIRS = {
    ".git",
    "docs/_archive",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "vendor",
    ".pytest_cache",
    "coverage",
    ".idea",
    ".vscode",
    ".rb_dumps",
}

# File extensions that are blocked (security + size concerns)
BLOCKED_EXTENSIONS = [
    # Binaries
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".msi",
    ".app",
    # Compiled/Cache
    ".pyc",
    ".pyo",
    ".o",
    ".class",
    ".jar",
    # Archives
    ".zip",
    ".tar",
    ".gz",
    ".7z",
    ".rar",
    # Media (large files)
    ".mp4",
    ".avi",
    ".mov",
    ".mkv",
    ".m4a",
    ".mp3",
    ".wav",
    # Database dumps
    ".db",
    ".sqlite",
    ".sqlite3",
    ".dump",
]

# Security-sensitive file patterns
SECURITY_PATTERNS = [
    ".env",
    ".key",
    ".pem",
    ".pfx",
    ".p12",
    "id_rsa",
    "id_dsa",
    "id_ed25519",
    "*.key",
    "*.pem",
    "shadow",
    "passwd",
]


def should_exclude(path: Union[str, Path]) -> bool:
    """
    Check if a file path should be excluded from processing

    Args:
        path: File path to check

    Returns:
        True if path should be excluded, False otherwise

    Example:
        >>> should_exclude("__pycache__/module.pyc")
        True
        >>> should_exclude("src/main.py")
        False
    """
    path_str = str(path)

    # Check against exclusion patterns
    for pattern in EXCLUDED_FILE_PATTERNS:
        if fnmatch.fnmatch(path_str, pattern):
            return True
        if fnmatch.fnmatch(path_str, f"*/{pattern}"):
            return True

    # Check if any part of the path is an excluded directory
    path_obj = Path(path_str)
    for part in path_obj.parts:
        if part in EXCLUDED_DIRS:
            return True

    return False


def is_blocked_extension(path: Union[str, Path]) -> bool:
    """
    Check if file has a blocked extension

    Args:
        path: File path to check

    Returns:
        True if extension is blocked, False otherwise

    Example:
        >>> is_blocked_extension("malware.exe")
        True
        >>> is_blocked_extension("document.py")
        False
    """
    path_str = str(path).lower()

    for ext in BLOCKED_EXTENSIONS:
        if path_str.endswith(ext):
            return True

    return False


def is_security_sensitive(path: Union[str, Path]) -> bool:
    """
    Check if file is security-sensitive (credentials, keys, etc.)

    Args:
        path: File path to check

    Returns:
        True if file should be considered security-sensitive, False otherwise

    Example:
        >>> is_security_sensitive(".env")
        True
        >>> is_security_sensitive("id_rsa")
        True
    """
    path_str = str(path)

    for pattern in SECURITY_PATTERNS:
        if fnmatch.fnmatch(path_str, pattern):
            return True
        if fnmatch.fnmatch(path_str, f"*/{pattern}"):
            return True

    return False


def should_process_file(path: Union[str, Path]) -> bool:
    """
    Determine if a file should be processed

    Returns True only if:
    - Not excluded
    - Not blocked extension
    - Not security-sensitive

    Args:
        path: File path to check

    Returns:
        True if file should be processed, False otherwise

    Example:
        >>> should_process_file("src/main.py")
        True
        >>> should_process_file(".env")
        False
    """
    return (
        not should_exclude(path)
        and not is_blocked_extension(path)
        and not is_security_sensitive(path)
    )


def get_exclude_pattern_summary() -> str:
    """Get human-readable summary of exclude patterns"""
    return f"""
File Exclusion Patterns: {len(EXCLUDED_FILE_PATTERNS)}
Blocked Extensions: {len(BLOCKED_EXTENSIONS)}
Security Patterns: {len(SECURITY_PATTERNS)}
Excluded Directories: {len(EXCLUDED_DIRS)}
"""

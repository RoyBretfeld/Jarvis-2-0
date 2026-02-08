"""Shared Utilities Module for The Forge"""

from .utf8_handler import ensure_utf8_output, safe_print
from .file_patterns import EXCLUDED_FILE_PATTERNS, BLOCKED_EXTENSIONS, should_exclude, is_blocked_extension
from .path_resolver import get_project_root, resolve_body_path, resolve_brain_path, normalize_path

__all__ = [
    "ensure_utf8_output",
    "safe_print",
    "EXCLUDED_FILE_PATTERNS",
    "BLOCKED_EXTENSIONS",
    "should_exclude",
    "is_blocked_extension",
    "get_project_root",
    "resolve_body_path",
    "resolve_brain_path",
    "normalize_path",
]

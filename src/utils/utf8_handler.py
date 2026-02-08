"""UTF-8 Output Handler for Cross-Platform Support"""

import sys
import io
from typing import Optional


def ensure_utf8_output() -> None:
    """
    Ensure UTF-8 encoding for stdout/stderr on Windows

    This fixes the issue where Windows CMD uses cp1252 encoding
    by default, causing UnicodeEncodeError when printing UTF-8 characters
    (emojis, special characters, etc.)

    Call this at the start of any script that needs UTF-8 output.
    Safe to call on Linux/Mac (does nothing).

    Example:
        >>> ensure_utf8_output()
        >>> print("Hello 世界 🌍")  # Will work on Windows now
    """
    if sys.platform == "win32":
        # Force UTF-8 output on Windows
        sys.stdout = io.TextIOWrapper(
            sys.stdout.buffer,
            encoding="utf-8",
            errors="replace",
            newline=""
        )
        sys.stderr = io.TextIOWrapper(
            sys.stderr.buffer,
            encoding="utf-8",
            errors="replace",
            newline=""
        )


def safe_print(
    text: str,
    color: Optional[str] = None,
    end: str = "\n",
    file=None
) -> None:
    """
    Print text safely with UTF-8 encoding and optional coloring

    Args:
        text: Text to print
        color: Optional color (not implemented yet, for future use)
        end: Line ending (default: newline)
        file: File object (default: stdout)

    Example:
        >>> safe_print("Success! 🎉")
        >>> safe_print("Error!", color="red")  # Color support TBD
    """
    if file is None:
        file = sys.stdout

    try:
        print(text, end=end, file=file)
    except UnicodeEncodeError:
        # Fallback: encode and decode to replace unmappable characters
        safe_text = text.encode("utf-8", errors="replace").decode("utf-8")
        print(safe_text, end=end, file=file)


def get_encoding() -> str:
    """Get current stdout encoding"""
    return sys.stdout.encoding or "utf-8"


def is_utf8_capable() -> bool:
    """Check if current environment supports UTF-8"""
    encoding = get_encoding()
    return "utf" in encoding.lower() or sys.platform != "win32"

"""Cross-Platform Path Resolution Utilities"""

from pathlib import Path
from typing import Optional, Union


def get_project_root(start_path: Optional[Path] = None) -> Path:
    """
    Get the absolute project root directory

    Attempts to find project root by looking for:
    1. Explicit parameter
    2. Current working directory if it contains src/, config/, etc.
    3. Parent directories up to filesystem root

    Args:
        start_path: Optional starting path to search from

    Returns:
        Path object pointing to project root

    Raises:
        RuntimeError: If project root cannot be determined

    Example:
        >>> root = get_project_root()
        >>> print(root)
        /path/to/The Forge
    """
    if start_path is None:
        start_path = Path.cwd()

    current = Path(start_path).resolve()

    # Check if current directory looks like project root
    # (contains src/, config/, .env.example, etc.)
    root_markers = {"src", "config", "tests", ".env.example", ".gitignore"}
    current_markers = {item.name for item in current.iterdir() if item.exists()}

    if any(marker in current_markers for marker in root_markers):
        return current

    # Search parent directories
    for parent in current.parents:
        parent_items = {item.name for item in parent.iterdir() if item.exists()}
        if any(marker in parent_items for marker in root_markers):
            return parent

    # Fallback: return current if no markers found
    return current


def resolve_body_path(project_root: Optional[Path] = None) -> Path:
    """
    Resolve path to body/ directory

    Args:
        project_root: Optional project root (auto-detected if None)

    Returns:
        Path to body/ directory

    Example:
        >>> body = resolve_body_path()
        >>> memory_file = body / "MEMORY.md"
    """
    if project_root is None:
        project_root = get_project_root()

    return (project_root / "body").resolve()


def resolve_brain_path(project_root: Optional[Path] = None) -> Path:
    """
    Resolve path to brain/ directory

    Args:
        project_root: Optional project root (auto-detected if None)

    Returns:
        Path to brain/ directory

    Example:
        >>> brain = resolve_brain_path()
        >>> chroma_db = brain / "chroma"
    """
    if project_root is None:
        project_root = get_project_root()

    return (project_root / "brain").resolve()


def resolve_config_path(project_root: Optional[Path] = None) -> Path:
    """
    Resolve path to config/ directory

    Args:
        project_root: Optional project root (auto-detected if None)

    Returns:
        Path to config/ directory
    """
    if project_root is None:
        project_root = get_project_root()

    return (project_root / "config").resolve()


def resolve_logs_path(project_root: Optional[Path] = None) -> Path:
    """
    Resolve path to logs/ directory (creates if doesn't exist)

    Args:
        project_root: Optional project root (auto-detected if None)

    Returns:
        Path to logs/ directory
    """
    if project_root is None:
        project_root = get_project_root()

    logs_dir = (project_root / "logs").resolve()
    logs_dir.mkdir(exist_ok=True)
    return logs_dir


def normalize_path(path: Union[str, Path]) -> Path:
    """
    Normalize a path string to absolute Path object

    Handles:
    - Relative paths
    - Windows/Linux path separators
    - Trailing slashes
    - ~ expansion

    Args:
        path: Path string or Path object

    Returns:
        Absolute Path object

    Example:
        >>> norm = normalize_path("./body/MEMORY.md")
        >>> print(norm.is_absolute())
        True
    """
    if isinstance(path, Path):
        return path.expanduser().resolve()

    return Path(path).expanduser().resolve()


def make_relative(path: Union[str, Path], base: Optional[Union[str, Path]] = None) -> Path:
    """
    Make path relative to base directory

    Args:
        path: Path to make relative
        base: Base directory (default: project root)

    Returns:
        Relative Path

    Example:
        >>> rel = make_relative("/path/to/The Forge/body/MEMORY.md")
        >>> print(rel)
        body/MEMORY.md
    """
    path = normalize_path(path)

    if base is None:
        base = get_project_root()
    else:
        base = normalize_path(base)

    try:
        return path.relative_to(base)
    except ValueError:
        # Path is not relative to base
        return path


def ensure_directory_exists(path: Union[str, Path]) -> Path:
    """
    Ensure directory exists, create if necessary

    Args:
        path: Directory path

    Returns:
        Path object (created and resolved)

    Example:
        >>> logs = ensure_directory_exists("./logs")
        >>> log_file = logs / "app.log"
    """
    path = normalize_path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_path_size(path: Union[str, Path]) -> int:
    """
    Get total size of file or directory in bytes

    Args:
        path: File or directory path

    Returns:
        Size in bytes

    Example:
        >>> size = get_path_size("./body/MEMORY.md")
        >>> print(f"{size / 1024:.2f} KB")
    """
    path = normalize_path(path)

    if path.is_file():
        return path.stat().st_size

    total = 0
    for item in path.rglob("*"):
        if item.is_file():
            total += item.stat().st_size

    return total

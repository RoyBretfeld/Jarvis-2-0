"""Repository Pattern Implementation for The Forge

The Repository Pattern abstracts data access logic, providing a clean
separation between I/O operations and business logic.
"""

from .base import BaseRepository
from .memory_repo import MemoryRepository
from .soul_repo import SoulRepository
from .error_db_repo import ErrorDBRepository

__all__ = [
    "BaseRepository",
    "MemoryRepository",
    "SoulRepository",
    "ErrorDBRepository",
]

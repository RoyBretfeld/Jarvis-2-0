from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Optional

@dataclass
class ScanResult:
    files_to_delete: List[str]
    bytes_to_free: int
    details: Dict[str, Any]

class BaseCleaner(ABC):
    """
    Abstract base class for all Antigravity cleaner modules.
    Enforces strict separation between Scanning and Action.
    """

    def __init__(self, options: Optional[Dict[str, Any]] = None):
        self.options = options or {}
        self.name = self.get_name()

    @abstractmethod
    def get_name(self) -> str:
        """Return the friendly name of this cleaner."""
        pass

    @abstractmethod
    def scan(self) -> ScanResult:
        """
        Analyze the system and return what WOULD be done.
        NO core-side effects allowed here.
        """
        pass

    @abstractmethod
    def clean(self, scan_result: ScanResult) -> bool:
        """
        Execute the cleanup based on the scan result.
        MUST NOT delete anything not in scan_result.
        """
        pass

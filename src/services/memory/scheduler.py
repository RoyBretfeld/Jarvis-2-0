"""Memory Scheduler - Automatic Memory Tiering & Archival with JARVIS Integration

Implements autonomous scheduling for memory compression and archival using APScheduler.
Integrates with JARVIS Priority Engine for autonomous execution at specified priorities.

Author: TAIA (Phase D - Tiered Memory System)
Version: 1.0.0
"""

import logging
from pathlib import Path
from typing import Optional, Dict, Any, Callable
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from src.services.memory.compression import CompressionService
from src.services.memory.archive import ArchiveService

logger = logging.getLogger(__name__)


class MemoryScheduler:
    """
    Memory Scheduler - Autonomous tiering and archival

    Manages automatic memory compression and archival using APScheduler.
    Operates at low JARVIS priorities (3-4) for autonomous execution without
    interrupting the user.

    Responsibilities:
    - Daily compression (4 AM, Priority 3-4)
    - Weekly archival (Sunday 3 AM, Priority 3)
    - Hourly threshold monitoring (Priority 6 if exceeded)
    - Manual trigger methods for immediate execution
    """

    def __init__(
        self,
        body_path: Path,
        archive_path: Path,
        compression_service: CompressionService,
        archive_service: ArchiveService,
        jarvis_callback: Optional[Callable[[int, str], None]] = None,
    ):
        """
        Initialize Memory Scheduler

        Args:
            body_path: Path to body/ directory
            archive_path: Path to archives/ directory
            compression_service: CompressionService instance
            archive_service: ArchiveService instance
            jarvis_callback: Optional callback for JARVIS priority routing
                           Signature: jarvis_callback(priority: int, action: str)
        """
        self.body_path = Path(body_path)
        self.archive_path = Path(archive_path)
        self.compression_service = compression_service
        self.archive_service = archive_service
        self.jarvis_callback = jarvis_callback

        self.scheduler = BackgroundScheduler()
        self.is_running = False

        # Configuration (can be customized)
        self.compression_hour = 4  # 4 AM daily
        self.compression_minute = 0
        self.compression_priority = 3  # JARVIS Priority

        self.archival_day = "sun"  # Sunday
        self.archival_hour = 3  # 3 AM
        self.archival_minute = 0
        self.archival_priority = 3  # JARVIS Priority

        self.threshold_interval_hours = 1  # Check every hour
        self.threshold_priority = 6  # Alert if exceeded
        self.memory_size_threshold_mb = 5.0

        logger.info("[MemoryScheduler] Initialized")
        logger.info(f"  Compression: Daily at {self.compression_hour:02d}:{self.compression_minute:02d} (Priority {self.compression_priority})")
        logger.info(f"  Archival: {self.archival_day.upper()} at {self.archival_hour:02d}:{self.archival_minute:02d} (Priority {self.archival_priority})")
        logger.info(f"  Threshold check: Every {self.threshold_interval_hours}h (Alert if > {self.memory_size_threshold_mb}MB)")

    def start(self) -> bool:
        """
        Start the scheduler

        Returns:
            True if successful
        """
        try:
            if self.is_running:
                logger.warning("[MemoryScheduler] Already running, skipping start")
                return False

            # Register jobs
            self.scheduler.add_job(
                self._run_compression,
                CronTrigger(hour=self.compression_hour, minute=self.compression_minute),
                id="daily_compression",
                name="Daily Memory Compression"
            )

            self.scheduler.add_job(
                self._run_archival,
                CronTrigger(day_of_week=self.archival_day, hour=self.archival_hour, minute=self.archival_minute),
                id="weekly_archival",
                name="Weekly Memory Archival"
            )

            self.scheduler.add_job(
                self._check_thresholds,
                IntervalTrigger(hours=self.threshold_interval_hours),
                id="threshold_check",
                name="Memory Threshold Monitor"
            )

            # Start scheduler
            self.scheduler.start()
            self.is_running = True

            logger.info("[MemoryScheduler] Scheduler started successfully")
            return True

        except Exception as e:
            logger.error(f"[MemoryScheduler] Failed to start: {e}")
            return False

    def stop(self) -> bool:
        """
        Stop the scheduler

        Returns:
            True if successful
        """
        try:
            if not self.is_running:
                return False

            self.scheduler.shutdown(wait=False)
            self.is_running = False

            logger.info("[MemoryScheduler] Scheduler stopped")
            return True

        except Exception as e:
            logger.error(f"[MemoryScheduler] Failed to stop: {e}")
            return False

    def trigger_compression_now(self) -> Dict[str, Any]:
        """
        Trigger compression immediately (manual)

        Returns:
            Compression result dictionary
        """
        logger.info("[MemoryScheduler] Manual compression trigger")
        return self._run_compression()

    def trigger_archival_now(self) -> Dict[str, Any]:
        """
        Trigger archival immediately (manual)

        Returns:
            Archival result dictionary
        """
        logger.info("[MemoryScheduler] Manual archival trigger")
        return self._run_archival()

    def get_status(self) -> Dict[str, Any]:
        """
        Get scheduler status

        Returns:
            Status dictionary with running state and job info
        """
        jobs = []
        if self.is_running and self.scheduler.running:
            for job in self.scheduler.get_jobs():
                jobs.append({
                    "id": job.id,
                    "name": job.name,
                    "next_run": job.next_run_time.isoformat() if job.next_run_time else None
                })

        return {
            "is_running": self.is_running,
            "scheduler_running": self.scheduler.running if hasattr(self.scheduler, 'running') else False,
            "jobs": jobs,
            "job_count": len(jobs)
        }

    # Private Methods

    def _run_compression(self) -> Dict[str, Any]:
        """
        Execute compression job (autonomous Priority 3-4)

        Returns:
            Compression result
        """
        try:
            logger.info("[MemoryScheduler] Starting compression job")

            # Tier memory entries (JARVIS Priority 3-4)
            if self.jarvis_callback:
                self.jarvis_callback(3, "Compression: tiering memory entries")

            result = self.compression_service.tier_entries()

            logger.info(f"[MemoryScheduler] Compression complete: {result}")
            return result

        except Exception as e:
            logger.error(f"[MemoryScheduler] Compression failed: {e}")
            return {"status": "ERROR", "error": str(e)}

    def _run_archival(self) -> Dict[str, Any]:
        """
        Execute archival job (autonomous Priority 3)

        Returns:
            Archival result
        """
        try:
            logger.info("[MemoryScheduler] Starting archival job")

            # Archive entries older than 21 days (JARVIS Priority 3)
            if self.jarvis_callback:
                self.jarvis_callback(3, "Archival: moving entries older than 21 days")

            result = self.archive_service.archive_old_entries(older_than_days=21)

            if result.get("archived_count", 0) > 0:
                logger.info(f"[MemoryScheduler] Archived {result['archived_count']} entries to {len(result.get('files_created', []))} month files")
            else:
                logger.info("[MemoryScheduler] No entries to archive")

            return result

        except Exception as e:
            logger.error(f"[MemoryScheduler] Archival failed: {e}")
            return {"status": "ERROR", "error": str(e)}

    def _check_thresholds(self) -> Dict[str, Any]:
        """
        Check memory size thresholds (Priority 6 if exceeded)

        Returns:
            Threshold check result
        """
        try:
            # Get archive stats
            stats = self.archive_service.get_archive_stats()
            memory_file = self.body_path / "MEMORY.md"

            memory_size_mb = 0.0
            if memory_file.exists():
                memory_size_mb = memory_file.stat().st_size / (1024 * 1024)

            total_size_mb = memory_size_mb + stats.get("total_size_mb", 0.0)

            if total_size_mb > self.memory_size_threshold_mb:
                logger.warning(
                    f"[MemoryScheduler] Memory threshold exceeded: {total_size_mb:.2f}MB > {self.memory_size_threshold_mb}MB"
                )

                # Alert via JARVIS (Priority 6 - suggestion)
                if self.jarvis_callback:
                    self.jarvis_callback(
                        6,
                        f"Memory size {total_size_mb:.2f}MB exceeds threshold {self.memory_size_threshold_mb}MB"
                    )

                return {
                    "status": "THRESHOLD_EXCEEDED",
                    "memory_size_mb": round(memory_size_mb, 2),
                    "archive_size_mb": stats.get("total_size_mb", 0.0),
                    "total_size_mb": round(total_size_mb, 2),
                    "threshold_mb": self.memory_size_threshold_mb
                }

            return {
                "status": "OK",
                "memory_size_mb": round(memory_size_mb, 2),
                "archive_size_mb": stats.get("total_size_mb", 0.0),
                "total_size_mb": round(total_size_mb, 2),
                "threshold_mb": self.memory_size_threshold_mb
            }

        except Exception as e:
            logger.error(f"[MemoryScheduler] Threshold check failed: {e}")
            return {"status": "ERROR", "error": str(e)}

    def reconfigure(self, **kwargs) -> bool:
        """
        Reconfigure scheduler parameters

        Args:
            compression_hour: Hour for daily compression (0-23)
            compression_minute: Minute for daily compression (0-59)
            compression_priority: JARVIS priority (1-10)
            archival_day: Day of week for archival ('mon', 'tue', etc.)
            archival_hour: Hour for weekly archival
            archival_minute: Minute for weekly archival
            archival_priority: JARVIS priority for archival
            threshold_interval_hours: Hours between threshold checks
            threshold_priority: JARVIS priority for threshold alerts
            memory_size_threshold_mb: Size threshold in MB

        Returns:
            True if reconfiguration successful
        """
        try:
            was_running = self.is_running

            if was_running:
                self.stop()

            # Update configuration
            if 'compression_hour' in kwargs:
                self.compression_hour = kwargs['compression_hour']
            if 'compression_minute' in kwargs:
                self.compression_minute = kwargs['compression_minute']
            if 'compression_priority' in kwargs:
                self.compression_priority = kwargs['compression_priority']

            if 'archival_day' in kwargs:
                self.archival_day = kwargs['archival_day']
            if 'archival_hour' in kwargs:
                self.archival_hour = kwargs['archival_hour']
            if 'archival_minute' in kwargs:
                self.archival_minute = kwargs['archival_minute']
            if 'archival_priority' in kwargs:
                self.archival_priority = kwargs['archival_priority']

            if 'threshold_interval_hours' in kwargs:
                self.threshold_interval_hours = kwargs['threshold_interval_hours']
            if 'threshold_priority' in kwargs:
                self.threshold_priority = kwargs['threshold_priority']
            if 'memory_size_threshold_mb' in kwargs:
                self.memory_size_threshold_mb = kwargs['memory_size_threshold_mb']

            logger.info(f"[MemoryScheduler] Reconfigured with {len(kwargs)} parameters")

            if was_running:
                return self.start()

            return True

        except Exception as e:
            logger.error(f"[MemoryScheduler] Reconfiguration failed: {e}")
            return False

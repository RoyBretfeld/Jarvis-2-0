"""Tests for Memory Scheduler

Unit tests for src/services/memory/scheduler.py

Test Coverage:
- Initialization and configuration
- Scheduler start/stop
- Job registration
- Manual triggers
- Status reporting
- Threshold monitoring
- Error handling
"""

import pytest
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import Mock, MagicMock, patch, call
from apscheduler.schedulers.background import BackgroundScheduler

from src.services.memory.scheduler import MemoryScheduler
from src.services.memory.compression import CompressionService
from src.services.memory.archive import ArchiveService
from src.repositories.memory_repo import MemoryRepository
from src.repositories.archive_repo import ArchiveRepository


@pytest.fixture
def temp_memory_path(tmp_path):
    """Create temporary memory directory"""
    memory_dir = tmp_path / "body"
    memory_dir.mkdir()
    return memory_dir


@pytest.fixture
def temp_archive_path(tmp_path):
    """Create temporary archive directory"""
    archive_dir = tmp_path / "archives"
    archive_dir.mkdir()
    return archive_dir


@pytest.fixture
def compression_service(temp_memory_path):
    """Create mock CompressionService"""
    service = Mock(spec=CompressionService)
    service.tier_entries = Mock(return_value={"status": "SUCCESS", "tiered_count": 0})
    return service


@pytest.fixture
def archive_service(temp_memory_path, temp_archive_path):
    """Create ArchiveService instance"""
    return ArchiveService(temp_memory_path, temp_archive_path)


@pytest.fixture
def scheduler(compression_service, archive_service, temp_memory_path):
    """Create MemoryScheduler instance"""
    return MemoryScheduler(
        body_path=temp_memory_path,
        archive_path=temp_memory_path.parent / "archives",
        compression_service=compression_service,
        archive_service=archive_service
    )


class TestMemorySchedulerInit:
    """Test scheduler initialization"""

    def test_init_creates_scheduler(self, scheduler):
        """Should create scheduler instance"""
        assert scheduler is not None
        assert isinstance(scheduler.scheduler, BackgroundScheduler)

    def test_init_sets_default_config(self, scheduler):
        """Should set default configuration"""
        assert scheduler.compression_hour == 4
        assert scheduler.compression_minute == 0
        assert scheduler.archival_hour == 3
        assert scheduler.archival_day == "sun"

    def test_init_with_jarvis_callback(self, compression_service, archive_service, temp_memory_path):
        """Should accept JARVIS callback"""
        callback = Mock()
        scheduler = MemoryScheduler(
            body_path=temp_memory_path,
            archive_path=temp_memory_path.parent / "archives",
            compression_service=compression_service,
            archive_service=archive_service,
            jarvis_callback=callback
        )
        assert scheduler.jarvis_callback == callback

    def test_init_not_running(self, scheduler):
        """Should start in stopped state"""
        assert scheduler.is_running is False


class TestSchedulerStartStop:
    """Test scheduler start and stop operations"""

    def test_start_scheduler(self, scheduler):
        """Should start scheduler successfully"""
        result = scheduler.start()
        assert result is True
        assert scheduler.is_running is True
        scheduler.stop()

    def test_stop_scheduler(self, scheduler):
        """Should stop running scheduler"""
        scheduler.start()
        result = scheduler.stop()
        assert result is True
        assert scheduler.is_running is False

    def test_start_twice_returns_false(self, scheduler):
        """Should not start twice"""
        scheduler.start()
        result = scheduler.start()
        assert result is False
        scheduler.stop()

    def test_stop_not_running_returns_false(self, scheduler):
        """Should return False when stopping non-running scheduler"""
        result = scheduler.stop()
        assert result is False

    def test_scheduler_registers_jobs(self, scheduler):
        """Should register jobs on start"""
        scheduler.start()

        jobs = scheduler.scheduler.get_jobs()
        assert len(jobs) == 3  # compression, archival, threshold

        job_ids = [job.id for job in jobs]
        assert "daily_compression" in job_ids
        assert "weekly_archival" in job_ids
        assert "threshold_check" in job_ids

        scheduler.stop()


class TestManualTriggers:
    """Test manual trigger methods"""

    def test_trigger_compression_now(self, scheduler, compression_service):
        """Should trigger compression immediately"""
        compression_service.tier_entries.return_value = {"status": "SUCCESS"}

        result = scheduler.trigger_compression_now()

        assert result["status"] == "SUCCESS"
        compression_service.tier_entries.assert_called_once()

    def test_trigger_archival_now(self, scheduler):
        """Should trigger archival immediately"""
        result = scheduler.trigger_archival_now()

        assert "status" in result
        assert result["archived_count"] == 0  # No entries to archive

    def test_trigger_compression_calls_jarvis(self, compression_service, archive_service, temp_memory_path):
        """Should call JARVIS callback on compression"""
        jarvis_mock = Mock()
        scheduler = MemoryScheduler(
            body_path=temp_memory_path,
            archive_path=temp_memory_path.parent / "archives",
            compression_service=compression_service,
            archive_service=archive_service,
            jarvis_callback=jarvis_mock
        )

        compression_service.tier_entries.return_value = {"status": "SUCCESS"}
        scheduler.trigger_compression_now()

        jarvis_mock.assert_called()
        args = jarvis_mock.call_args[0]
        assert args[0] == 3  # Priority 3-4


class TestThresholdMonitoring:
    """Test threshold monitoring"""

    def test_check_thresholds_ok(self, scheduler, temp_memory_path):
        """Should report OK when below threshold"""
        result = scheduler._check_thresholds()

        assert result["status"] == "OK"
        assert "total_size_mb" in result
        assert result["total_size_mb"] <= 5.0

    def test_check_thresholds_exceeded(self, scheduler, temp_memory_path):
        """Should report exceeded when size exceeds threshold"""
        # Create large memory file
        memory_file = temp_memory_path / "MEMORY.md"
        memory_file.write_text("x" * (6 * 1024 * 1024))  # 6 MB

        result = scheduler._check_thresholds()

        assert result["status"] == "THRESHOLD_EXCEEDED"
        assert result["total_size_mb"] > 5.0

    def test_check_thresholds_calls_jarvis_on_exceed(self, compression_service, archive_service, temp_memory_path):
        """Should call JARVIS when threshold exceeded"""
        jarvis_mock = Mock()
        scheduler = MemoryScheduler(
            body_path=temp_memory_path,
            archive_path=temp_memory_path.parent / "archives",
            compression_service=compression_service,
            archive_service=archive_service,
            jarvis_callback=jarvis_mock
        )

        # Create large memory file
        memory_file = temp_memory_path / "MEMORY.md"
        memory_file.write_text("x" * (6 * 1024 * 1024))

        scheduler._check_thresholds()

        jarvis_mock.assert_called()
        args = jarvis_mock.call_args[0]
        assert args[0] == 6  # Priority 6


class TestSchedulerStatus:
    """Test status reporting"""

    def test_get_status_not_running(self, scheduler):
        """Should report status when not running"""
        status = scheduler.get_status()

        assert status["is_running"] is False
        assert len(status["jobs"]) == 0

    def test_get_status_running(self, scheduler):
        """Should report jobs when running"""
        scheduler.start()

        status = scheduler.get_status()

        assert status["is_running"] is True
        assert len(status["jobs"]) == 3

        scheduler.stop()

    def test_status_includes_next_run(self, scheduler):
        """Should include next run time"""
        scheduler.start()

        status = scheduler.get_status()

        for job in status["jobs"]:
            assert "next_run" in job
            assert job["next_run"] is not None

        scheduler.stop()


class TestSchedulerReconfiguration:
    """Test scheduler reconfiguration"""

    def test_reconfigure_compression_time(self, scheduler):
        """Should reconfigure compression time"""
        result = scheduler.reconfigure(compression_hour=5, compression_minute=30)

        assert result is True
        assert scheduler.compression_hour == 5
        assert scheduler.compression_minute == 30

    def test_reconfigure_archival_day(self, scheduler):
        """Should reconfigure archival day"""
        result = scheduler.reconfigure(archival_day="mon", archival_hour=2)

        assert result is True
        assert scheduler.archival_day == "mon"
        assert scheduler.archival_hour == 2

    def test_reconfigure_threshold(self, scheduler):
        """Should reconfigure threshold settings"""
        result = scheduler.reconfigure(
            threshold_interval_hours=2,
            memory_size_threshold_mb=10.0
        )

        assert result is True
        assert scheduler.threshold_interval_hours == 2
        assert scheduler.memory_size_threshold_mb == 10.0

    def test_reconfigure_restarts_if_running(self, scheduler):
        """Should restart scheduler if it was running"""
        scheduler.start()

        # Mock stop to track it
        original_stop = scheduler.stop
        stop_called = []

        def mock_stop():
            stop_called.append(True)
            return original_stop()

        scheduler.stop = mock_stop
        scheduler.reconfigure(compression_hour=6)

        assert len(stop_called) > 0

        scheduler.stop()

    def test_reconfigure_multiple_params(self, scheduler):
        """Should handle multiple reconfigurations"""
        result = scheduler.reconfigure(
            compression_hour=10,
            archival_hour=8,
            threshold_interval_hours=3,
            memory_size_threshold_mb=8.0,
            compression_priority=4,
            archival_priority=4
        )

        assert result is True
        assert scheduler.compression_hour == 10
        assert scheduler.archival_hour == 8
        assert scheduler.threshold_interval_hours == 3
        assert scheduler.memory_size_threshold_mb == 8.0
        assert scheduler.compression_priority == 4
        assert scheduler.archival_priority == 4


class TestErrorHandling:
    """Test error handling"""

    def test_compression_error_handling(self, scheduler, compression_service):
        """Should handle compression errors"""
        compression_service.tier_entries.side_effect = Exception("Compression failed")

        result = scheduler._run_compression()

        assert result["status"] == "ERROR"
        assert "error" in result

    def test_archival_error_handling(self, scheduler):
        """Should handle archival errors"""
        with patch.object(scheduler.archive_service, 'archive_old_entries', side_effect=Exception("Archive error")):
            result = scheduler._run_archival()

            assert result["status"] == "ERROR"
            assert "error" in result

    def test_threshold_check_error_handling(self, scheduler):
        """Should handle threshold check errors"""
        with patch.object(scheduler.archive_service, 'get_archive_stats', side_effect=Exception("Stats error")):
            result = scheduler._check_thresholds()

            assert result["status"] == "ERROR"
            assert "error" in result


class TestJobIntegration:
    """Integration tests for job execution"""

    def test_compression_job_execution(self, scheduler, compression_service):
        """Should execute compression job"""
        compression_service.tier_entries.return_value = {"status": "SUCCESS"}

        result = scheduler._run_compression()

        assert result["status"] == "SUCCESS"
        compression_service.tier_entries.assert_called_once()

    def test_archival_job_execution(self, scheduler, temp_memory_path):
        """Should execute archival job"""
        # Add old entry
        memory_file = temp_memory_path / "MEMORY.md"
        old_date = datetime.now() - timedelta(days=30)
        memory_file.write_text("# MEMORY\n\n")
        with open(memory_file, "a", encoding="utf-8") as f:
            f.write(f"* [{old_date.isoformat()}] [cat] Old entry\n")

        result = scheduler._run_archival()

        assert result["status"] in ["OK", "SUCCESS"]
        if result.get("archived_count", 0) > 0:
            assert result["archived_count"] == 1

    def test_threshold_monitoring_integration(self, scheduler, temp_memory_path):
        """Should monitor thresholds correctly"""
        result = scheduler._check_thresholds()

        assert "status" in result
        assert "total_size_mb" in result
        assert result["status"] in ["OK", "THRESHOLD_EXCEEDED"]


class TestSchedulerConfiguration:
    """Test scheduler configuration"""

    def test_default_compression_priority(self, scheduler):
        """Should have default compression priority"""
        assert scheduler.compression_priority == 3

    def test_default_archival_priority(self, scheduler):
        """Should have default archival priority"""
        assert scheduler.archival_priority == 3

    def test_default_threshold_priority(self, scheduler):
        """Should have default threshold priority"""
        assert scheduler.threshold_priority == 6

    def test_default_memory_threshold(self, scheduler):
        """Should have default memory threshold"""
        assert scheduler.memory_size_threshold_mb == 5.0

    def test_threshold_interval_default(self, scheduler):
        """Should check thresholds hourly by default"""
        assert scheduler.threshold_interval_hours == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

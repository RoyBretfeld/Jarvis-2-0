# HEARTBEAT.md - The Biological Rhythm

**Interval:** 60s (Check every minute)

## Vital Signs (Rules)

### 1. System Health
- **Rule:** IF `disk_usage > 90%` THEN `ALARM` (Critical)
- **Rule:** IF `memory_usage > 95%` THEN `WARNING` (High Load)

### 2. Kubernetes Health
- **Rule:** IF `pod_status == CrashLoopBackOff` THEN `WARNING` (Unstable)
- **Rule:** IF `pod_restarts > 5` THEN `ALARM` (Degraded)

## Responses
- **ALARM:** Immediate write to `MEMORY.md` AND `ERROR_DB.md`.
- **WARNING:** Write to `MEMORY.md` (Short-term).

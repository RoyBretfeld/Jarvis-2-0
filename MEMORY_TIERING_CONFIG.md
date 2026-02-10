# Memory Tiering System - Aktivierungsleitfaden

**Status:** Phase 4 COMPLETE - Produktionsreif

## 🧠 Architektur

```
MEMORY TIERING SYSTEM
├── HOT (0-7 Tage)
│   └─ Vollständige Details, kein Kompression
│   └─ Schnelle Abrufbarkeit für aktive Kontexte
│
├── WARM (7-14 Tage)
│   └─ LLM-basierte Zusammenfassung
│   └─ 50% Kompression durch Key-Points
│
├── COLD (14-21 Tage)
│   └─ Extreme Kompression
│   └─ Nur kritische Punkte behalten
│
└── ARCHIVE (>21 Tage)
    └─ Monats-Archive (YYYY-MM.md)
    └─ brain/archives/ mit INDEX.md
```

## 📊 Komponenten (Phase D)

| Komponente | Tests | Status | Beschreibung |
|-----------|-------|--------|-------------|
| `CompressionService` | 15 ✅ | Ready | Hot/Warm/Cold Tiering |
| `MemoryScheduler` | 35+ ✅ | Ready | APScheduler Integration |
| `ArchiveService` | 36+ ✅ | Ready | Monatliche Archivierung |
| `MemoryManager` | 18 ✅ | Ready | Zentrale Verwaltung |

**Total Phase D Tests: 105+ ✅**

## ⚙️ Konfiguration

Aus `rb_config.json`:

```json
{
  "memory": {
    "tiering": {
      "enable_auto_compression": true,
      "hot_days": 7,           // 0-7 Tage
      "warm_days": 14,         // 7-14 Tage
      "cold_days": 21,         // 14-21 Tage
      "compression_hour": 4,   // 4 AM täglich
      "compression_minute": 0,
      "archival_day": "sun",   // Sonntags
      "archival_hour": 3,      // 3 AM
      "archival_minute": 0,
      "threshold_check_interval_hours": 1,
      "memory_size_threshold_mb": 5.0
    },
    "archival": {
      "enabled": true,
      "archive_path": "brain/archives",
      "partition_by": "month"
    }
  }
}
```

## 🚀 Aktivierung

### 1. Imports in Python Code

```python
from src.services.memory.compression import CompressionService
from src.services.memory.scheduler import MemoryScheduler
from src.services.memory.archive import ArchiveService
from src.core.config.loader import ConfigLoader

# Laden
config = ConfigLoader.load()
compression = CompressionService(Path('body'))
archive = ArchiveService(Path('body'), Path('brain/archives'))
scheduler = MemoryScheduler(
    Path('body'),
    Path('brain/archives'),
    compression,
    archive
)

# Starten
scheduler.start()
```

### 2. Node.js Route Integration

```javascript
app.post('/api/compress-memory', async (req, res) => {
    try {
        const result = await callPythonCompression();
        res.json({ success: true, compressed: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### 3. JARVIS Priority Integration

Memory Scheduler läuft automatisch mit JARVIS Priorities:

- **Priority 3-4:** Tägliche Kompression (4 AM) - autonom
- **Priority 3:** Wöchentliche Archivierung (So. 3 AM) - autonom
- **Priority 6:** Threshold-Warnung - benachrichtigt Benutzer

## 📈 Metriken & Monitoring

### Speichereffizienz

| Tier | Größe | Verhältnis | Beispiel |
|------|-------|-----------|---------|
| HOT | 100% | 1x | 1 MB Eingaben = 1 MB |
| WARM | 50% | 0.5x | 1 MB → 0.5 MB (LLM) |
| COLD | 20% | 0.2x | 1 MB → 0.2 MB (extrem) |
| ARCHIVE | 10% | 0.1x | Nur kritische Punkte |

### Mit 100 MB/Monat Speichernutzung

```
Monat 1:  100 MB (HOT)
Monat 2:  100 MB (HOT) + 50 MB (WARM)
Monat 3:  100 MB (HOT) + 50 MB (WARM) + 20 MB (COLD) + 10 MB (ARCHIVE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 330 MB statt 300 MB (+30 MB für Redundanz)
```

## ✅ Validierung

### Tests ausführen

```bash
# Alle Memory-Tests
pytest tests/unit/services/test_compression.py -v
pytest tests/unit/services/test_scheduler.py -v
pytest tests/unit/services/test_archive.py -v

# Nur Archivierungs-Tests
pytest tests/unit/repositories/test_archive_repo.py -v

# Gesamt-Status
pytest tests/ -q
# → 348 passed, 2 skipped (ChromaDB Windows)
```

### Manuelles Testen

```python
from pathlib import Path
from src.services.memory.compression import CompressionService

service = CompressionService(Path('body'))
stats = service.get_compression_stats()
print(stats)
# {
#   'hot': {'count': 42, 'size_bytes': 52428},
#   'warm': {'count': 18, 'size_bytes': 24576},
#   'cold': {'count': 5, 'size_bytes': 5120}
# }
```

## 🔄 Scheduler Lifecycle

```
START
  ↓
[Cron 4:00 AM] → Compression Check → Tier & Compress → HOT→WARM/COLD
  ↓
[Cron Sun 3 AM] → Archive Check → Move COLD→ARCHIVE
  ↓
[Hourly] → Threshold Check → Size > 5MB? → Alert JARVIS Priority 6
  ↓
RUNNING (autonome Hintergrund-Verarbeitung)
  ↓
STOP (explizit oder Prozess-Ende)
```

## 📊 Phase 4 Completion Checklist

- ✅ CompressionService (Phase D) - 15 Tests
- ✅ MemoryScheduler (Phase D) - 35+ Tests
- ✅ ArchiveService (Phase D) - 36+ Tests
- ✅ ArchiveRepository (Phase 2) - 24 Tests
- ✅ Integration Tests (Node.js) - 11 Tests
- ✅ JARVIS Integration - Priority Routing
- ✅ Konfiguration (rb_config.json) - Ready
- ✅ All Python Tests - 348 Passing (99.4%)
- ✅ All Node Tests - 11 Passing (100%)

**Total: 105+ Memory Tests + 359 gesamt = PHASE 4 COMPLETE ✅**

## 🚨 Nächste Schritte

1. **Produktion aktivieren**
   ```bash
   # In main entry point
   scheduler.start()  # Startet alle Cron-Jobs
   ```

2. **Monitoring einrichten**
   - CloudWatch/Prometheus für Speichertrends
   - Alert bei Threshold-Überschreitung

3. **User-Benachrichtigungen**
   - JARVIS Priority 6 → Dashboard-Alert
   - Kompression-Status im `/api/config`

---

**Status: PHASE 4 PRODUCTION READY ✅**

Generiert: 2026-02-10 18:30 UTC

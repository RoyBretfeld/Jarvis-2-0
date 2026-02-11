# The Forge Dashboard - Quick Start Guide

**Status:** Phase 5B - Live Monitoring
**Updated:** 2026-02-10

---

## 🚀 Quick Start (2 Minuten)

### Terminal 1: Start Ollama (Optional, fallback auf default)
```bash
ollama serve
# Lädt qwen2.5-coder:14b
```

### Terminal 2: Start Phase 5 Server
```bash
cd e:\_____1111____Projekte-Programmierung\Antigravity\The Forge
npm start
# Startet Express auf Port 3000
# http://localhost:3000/api/chat
```

### Terminal 3: Start Dashboard
```bash
node src/dashboard.js
# Dashboard läuft auf http://localhost:3001
```

---

## 📊 Dashboard Features

### Real-Time Metrics
- **Memory Tiering** - Hot/Warm/Cold/Archive Verteilung
- **Security Audit** - Findings, Blockings, Tool Calls
- **System Health** - CPU, Memory, Uptime
- **Phase Status** - Aktuelle Phase + Progress

### API Endpoints
```bash
# JSON Metrics
curl http://localhost:3001/api/metrics | jq

# Markdown Report
curl http://localhost:3001/api/metrics/markdown

# Health Check
curl http://localhost:3001/health
```

---

## 🧪 Test-Workflow

### 1. Chat senden
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hallo, wie geht es dir?"}'
```

### 2. Dashboard aktualisieren
```
http://localhost:3001
# Auto-refresh: 5 Sekunden
```

### 3. Metriken prüfen
```bash
# Memory sollte wachsen
curl http://localhost:3001/api/metrics | jq '.memory'

# Audit Trail sollte Entries zeigen
curl http://localhost:3001/api/metrics | jq '.audit'
```

---

## 🔍 Debugging

### Metrics nicht sichtbar?
```bash
# Prüfe, dass brain/ Dateien existieren
ls -la brain/

# Prüfe Audit Trail
cat brain/SENTINEL_AUDIT.md | head -20
```

### Server nicht erreichbar?
```bash
# Prüfe Port
lsof -i :3000
lsof -i :3001

# Prüfe Logs
npm start 2>&1 | grep ERROR
```

### Memory-Metriken falsch?
```bash
# Erzwinge Neusammlung
curl http://localhost:3001/api/metrics?force=true
```

---

## 📈 Performance Baseline

Nach dem ersten Chat solltest du sehen:

| Metrik | Expected | Status |
|--------|----------|--------|
| Hot Memory | 10-50 KB | ✅ |
| Audit Entries | 5+ | ✅ |
| Tool Calls | 1+ | ✅ |
| Node Memory | < 100 MB | ✅ |
| Uptime | > 10s | ✅ |

---

## 🛡️ Security Monitoring

Das Dashboard zeigt **TAIA-Sentinel Integration**:

- 🟢 **Green** = Operational, no findings
- 🟡 **Yellow** = Warnings, monitor
- 🔴 **Red** = Blocked actions, investigate

### Findings interpretieren
```bash
# Zeige alle Findings
curl http://localhost:3001/api/metrics | jq '.audit.findingsCount'

# Lese Audit Log
cat brain/SENTINEL_AUDIT.md | grep "SECURITY_FINDING"
```

---

## 📝 Nächste Schritte

1. **Live Testing**: Sende mehrere Chats, beobachte Metriken
2. **Load Testing**: Nutze `tests/performance/load.test.js`
3. **Archive Testing**: Warte auf tägliche Kompression (oder trigger manuell)
4. **Integration**: Verbinde mit Production Dashboard

---

## 🚀 Commands Reference

```bash
# Dashboard starten
node src/dashboard.js

# Server starten
npm start

# Tests ausführen
npm test

# Performance testen
npm test -- tests/performance/load.test.js

# Metrics exportieren
curl http://localhost:3001/api/metrics/markdown > metrics.md

# Health check (Scripting)
curl -s http://localhost:3001/health | jq '.status'
```

---

**Status: LIVE MONITORING ACTIVE ✅**

Willkommen zu The Forge Production Dashboard!

🎯 **Das ist Glass-Box in Aktion**: Alles was der Agent tut, siehst du live.

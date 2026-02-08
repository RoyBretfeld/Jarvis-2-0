# The Forge 🔨 - TAIA Agent Architecture

**TAIA** = True Artificial Intelligence Agent

A modular AI agent framework with full sensory integration, autonomous decision-making, and reflexive command handling.

---

## 📊 Project Status

### ✅ Completed Phases

| Phase | Component | Status | Tests |
|-------|-----------|--------|-------|
| 0 | Security & Config | ✅ | 9 |
| 1 | Utils & Infrastructure | ✅ | 69 |
| 2 | Repository Pattern | ✅ | 69 |
| 3 | Service Layer | ✅ | 79 |
| 4 | API Refactoring | ✅ | - |

**Total:** 226 tests passing ✅

### 🚀 Current Phase: TAIA Senses Integration

**Focus:** Audio Input (Speech-to-Text) + Voice Output

#### What We're Building:
- `src/senses/ears.py` - Local speech recognition (Faster-Whisper)
- `src/senses/voice.py` - Text-to-speech feedback
- Hard-wired reflexive commands (Status, Sentinel-Check, Sleep/Wake)
- Streamlit GUI with audio feedback

#### Status:
- ⏳ Ears (Speech-to-Text) - IN PROGRESS
- ⏳ Voice (Text-to-Speech) - PLANNED
- ⏳ Streamlit integration - PLANNED

---

## 🏗️ Architecture

```
TAIA Agent
├── 🎯 Core (src/core/)
│   ├── agent.py - Main intelligence
│   ├── llm.py - Language model interface
│   ├── config/ - Configuration system
│   └── container.py - Dependency injection
│
├── 👁️ Senses (src/senses/)
│   ├── ears.py - Speech input [WIP]
│   ├── voice.py - Speech output [PLANNED]
│   ├── vision.py - Image processing
│   ├── k8s.py - System monitoring
│   └── collector.py - Data collection
│
├── 🧠 Repositories (src/repositories/)
│   ├── base.py - Abstract interface
│   ├── memory.py - MEMORY.md operations
│   ├── soul.py - Agent personality
│   └── error_db.py - Error tracking
│
└── 📡 API (src/api/)
    ├── routes/ - Modular endpoints
    │   ├── chat.js
    │   ├── config.js
    │   ├── memory.js
    │   └── vision.js
    └── server-refactored.js - Express server
```

---

## 🚀 Quick Start

### Prerequisites
```bash
python 3.10+
node 18+
```

### Installation
```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies
npm install
```

### Run Agent
```bash
streamlit run src/core/agent.py
```

### Run Tests
```bash
pytest
```

---

## 🎤 Current Sprint: Ears Implementation

### Tasks
1. [ ] Update requirements.txt with audio libraries
2. [ ] Implement src/senses/ears.py (ForgeEars class)
3. [ ] Implement src/senses/voice.py (ForgeVoice class)
4. [ ] Integrate with src/core/agent.py
5. [ ] Add Streamlit GUI feedback

### Dependencies (To Install)
- `faster-whisper>=0.10.0` - Local speech-to-text
- `openWakeWord>=0.1.0` - Wake-word detection ("TAIA")
- `pyttsx3>=2.90` - Text-to-speech
- `pyaudio` - Microphone input

---

## 📝 Documentation

- **[SESSION_LOG.md](SESSION_LOG.md)** - Active work log (live updates)
- **[src/senses/README.md](src/senses/README.md)** - Senses subsystem
- **[MEMORY.md](../../../.claude/projects/e-------1111----Projekte-Programmierung-Antigravity-The-Forge/memory/MEMORY.md)** - Global project memory

---

## 🔗 Key Files

| File | Purpose |
|------|---------|
| `src/core/agent.py` | Main TAIA agent |
| `src/senses/ears.py` | Speech recognition [WIP] |
| `src/senses/voice.py` | Speech output [PLANNED] |
| `src/api/server-refactored.js` | API server |
| `requirements.txt` | Python dependencies |
| `SESSION_LOG.md` | Active work checkpoint |

---

## 🎯 Next Milestone

**Goal:** TAIA responds to voice commands with local speech-to-text

**Timeline:**
- Day 1-2: Audio libraries + ears.py
- Day 2-3: Voice.py + integration
- Day 3-4: Streamlit GUI + testing

---

## 🛡️ Security Notes

- ✅ All audio processing is local (no cloud APIs)
- ✅ No API keys stored in git
- ✅ Credentials managed via .env

---

**Last Updated:** 2026-02-08
**Contributor:** Claude (Haiku 4.5)

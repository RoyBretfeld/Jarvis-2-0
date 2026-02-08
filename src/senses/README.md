# TAIA Senses Subsystem 👁️👂🗣️

The sensory input/output layer for the TAIA agent. Processes external stimuli and generates responses.

---

## 📂 Components

### 👂 Ears (ears.py) - [IN PROGRESS]
**Purpose:** Audio input & speech recognition

**Features:**
- Local speech-to-text (Faster-Whisper)
- Wake-word detection ("TAIA")
- Transcription after wake-word activation
- Audio stream monitoring

**Dependencies:**
- `faster-whisper>=0.10.0`
- `openWakeWord>=0.1.0`
- `pyaudio`

**Hard-Wired Commands:**
```
"TAIA, Status-Bericht" → agent.get_system_status()
"TAIA, Sentinel-Check" → audit_system()
"TAIA, Ruhemodus" → ears.listening = False
"TAIA, Aufwachen" → ears.listening = True
```

---

### 🗣️ Voice (voice.py) - [PLANNED]
**Purpose:** Audio output & speech synthesis

**Features:**
- Text-to-speech feedback
- Natural voice confirmation
- Error announcements

**Dependencies:**
- `pyttsx3>=2.90`

**Example Responses:**
```
"Ich höre, Sir" → After wake-word
"Status-Bericht wird erstellt" → Status command
"Sentinel-Check aktiv" → Security audit
```

---

### 👁️ Vision (vision.py) - [COMPLETE]
**Purpose:** Image processing and analysis

**Current Implementation:**
- Image loading
- Format validation
- Preprocessing

---

### 📊 K8s (k8s.py) - [COMPLETE]
**Purpose:** Kubernetes & system monitoring

**Features:**
- Pod status monitoring
- Resource tracking
- Cluster health

---

### 📦 Collector (collector.py) - [COMPLETE]
**Purpose:** Data collection & aggregation

**Features:**
- Multi-source data gathering
- Event streaming
- Data normalization

---

### 👁️ Eye (eye.js) - [LEGACY]
**Purpose:** Frontend vision display

**Status:** Archived (replaced by vision.py)

---

## 🔄 Signal Flow

```
Microphone
    ↓
ears.py (Faster-Whisper)
    ↓
Wake-Word Detection ("TAIA")
    ↓
Transcription
    ↓
Hard-Wired Command Check
    ├─→ Direct Execution (Status, Sentinel, etc.)
    └─→ OR LLM Routing (agent.py)
    ↓
Response Generation
    ↓
voice.py (TTS)
    ↓
Speaker
```

---

## 📋 Implementation Progress

| Component | Status | Tests | Notes |
|-----------|--------|-------|-------|
| ears.py | ⏳ WIP | - | Faster-Whisper + OpenWakeWord |
| voice.py | ⏳ PLANNED | - | pyttsx3 TTS |
| vision.py | ✅ DONE | - | Image processing |
| k8s.py | ✅ DONE | - | System monitoring |
| collector.py | ✅ DONE | - | Data aggregation |

---

## 🚀 Next Steps

### Phase 1: Audio Input (This Sprint)
- [ ] Implement ears.py
- [ ] Test wake-word detection
- [ ] Integrate with agent.py
- [ ] Add Streamlit visualization

### Phase 2: Audio Output (Next Sprint)
- [ ] Implement voice.py
- [ ] Test TTS quality
- [ ] Add voice preference settings
- [ ] Performance optimization

### Phase 3: Integration (Future)
- [ ] Multi-modal routing (text + voice)
- [ ] Emotion detection (audio analysis)
- [ ] Voice recognition (speaker identification)
- [ ] Acoustic feedback loop

---

## 🛠️ Development Notes

### Local Audio Processing
- All speech processing happens on-device (no cloud APIs)
- Faster-Whisper runs on CPU efficiently
- OpenWakeWord optimized for low latency

### Wake-Word Philosophy
The wake-word "TAIA" acts as a neurological reflex:
- Instant recognition (no LLM delay)
- Always listening for agent name
- Triggers transcription phase
- Then routes to agent for interpretation

---

**Last Updated:** 2026-02-08
**Phase:** TAIA Senses Integration - Ears

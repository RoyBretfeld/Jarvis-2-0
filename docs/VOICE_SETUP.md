# TAIA Voice Engine Setup Guide

## Overview

TAIA Voice Engine provides text-to-speech (TTS) capabilities with multiple backends for flexibility and reliability.

### Supported Backends

| Backend | Type | Installation | Notes |
|---------|------|--------------|-------|
| **Piper** | Offline | `pip install piper-tts` | ⭐ Recommended - Fast, local, no internet required |
| **gTTS** | Cloud | `pip install gtts` | Google TTS, requires internet, good quality |
| **eSpeak** | System | `sudo apt-get install espeak-ng` | Fallback, always available on Linux |

---

## Quick Start on Proxmox/Linux

### Step 1: Install Piper (Recommended)

```bash
# Install Python TTS tooling
pip install piper-tts

# Verify installation
which piper
piper --help
```

### Step 2: Test Voice Engine

```bash
cd "e:\_____1111____Projekte-Programmierung\Antigravity\The Forge"
node src/test-voice.js
```

Expected output:
```
🔊 TAIA Voice Engine Test
═══════════════════════════════════════════════

📊 Voice Engine Status:
  Primary Backend: piper
  Available Backends:
    ✅ piper: Piper TTS (Offline)
    ❌ gtts: gTTS (Google)
    ❌ espeak: eSpeak NG (System)
  Language: de
```

### Step 3: Enable Voice in Agent

Integrate voice into agent-core (coming in Phase 8):

```javascript
import { VoiceEngine } from './senses/voice-engine.js';

class AgentCoreWithVoice extends AgentCore {
  constructor(config = {}) {
    super(config);
    this.voice = new VoiceEngine({ language: 'de' });
  }

  async generateResponse(prompt, context = {}) {
    // Get response from Groq
    const response = await super.generateResponse(prompt, context);

    // Speak the response
    if (context.speakResponse) {
      await this.voice.speak(response);
    }

    return response;
  }
}
```

---

## Installation Guides by Platform

### Ubuntu/Debian (Proxmox)

```bash
# Update package manager
sudo apt update

# Install audio support (if headless)
sudo apt install -y alsa-utils pulseaudio

# Install Piper
pip install piper-tts

# Install fallback TTS
sudo apt install -y espeak-ng

# Verify
piper --help
espeak-ng --help
```

### For Proxmox Headless VMs

If running on a headless Proxmox VM without audio device:

```bash
# Use PulseAudio or direct file output
# Voice Engine will save audio files to brain/audio/ directory
# You can then transfer and play them on your host

# Or enable audio passthrough in Proxmox:
# 1. VM Settings → Hardware → Add Audio Device
# 2. Device: Spice (if using Spice console)
```

---

## Configuration

### Default Config

```javascript
const voice = new VoiceEngine({
  enabled: true,
  backend: 'piper',      // Primary TTS engine
  language: 'de',        // German
  audioDir: 'brain/audio', // Where audio files are saved
  speakAloud: true,      // Actually play audio
  debug: false           // Verbose logging
});
```

### Switch Backends at Runtime

```javascript
// Use gTTS for a specific utterance
await voice.speak('Hello', { backend: 'gtts' });

// Use different language
await voice.speak('Привет', { language: 'ru' });
```

---

## Language Support

### Piper Languages
- German (de): `de_DE`
- English (en): `en_US`, `en_GB`
- French (fr): `fr_FR`
- Spanish (es): `es_ES`
- Italian (it): `it_IT`
- Portuguese (pt): `pt_PT`
- Dutch (nl): `nl_NL`

### gTTS Languages
- Full list: 100+ languages supported

---

## Troubleshooting

### "Piper not found"
```bash
# Check if installed
which piper

# Reinstall if needed
pip install --upgrade piper-tts
```

### "mpg123 not found" (for gTTS)
```bash
sudo apt install -y mpg123
```

### "No audio device" (headless)
Voice Engine will:
1. Save audio files to `brain/audio/`
2. Skip playback if no device available
3. Log file location for manual playback

### "Python module not found"
```bash
# Ensure Python packages installed in system Python
pip list | grep piper

# Or use specific Python version
python3 -m pip install piper-tts
```

---

## Integration with TAIA Agent

### Phase 8 Roadmap

- [ ] Create `AgentCoreWithVoice` wrapper
- [ ] Add voice output to `generateResponse()`
- [ ] Implement voice recognition (Ears)
- [ ] Add voice logging to audit trail
- [ ] Create interactive voice mode

### Testing Voice Output

```bash
# Run diagnostic + voice
node src/test-brain.js     # Brain check
node src/test-voice.js     # Voice check
```

---

## Files Reference

- **Voice Engine**: `src/senses/voice-engine.js` (353 lines, ES6 module)
- **Voice Test**: `src/test-voice.js` (test script)
- **Audio Output**: `brain/audio/` (auto-created)

---

## Next Steps

1. ✅ Voice Engine implemented
2. ⏳ Voice output integration in AgentCore
3. ⏳ Speech recognition (Ears) - Whisper API
4. ⏳ Real-time conversation mode
5. ⏳ Multi-language support

---

**Status**: 🟢 READY for integration | Production Code

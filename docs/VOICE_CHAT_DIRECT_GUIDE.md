# 🎤 Voice-Chat-Direct (VCD) - Daily Driver Guide

**Status:** ✅ PRODUCTION READY
**Version:** v1.0 (Phase 9)
**Purpose:** Voice Integration im Terminal für tägliche TAIA-Interaktion

---

## 🎯 Was ist VCD?

**Voice-Chat-Direct** ist das **Daily Driver Tool** für Voice-Interaktion mit TAIA.

Statt:
- ❌ "Ich schreibe Text, bekomme Text zurück"
- ❌ "Voice ist in API versteckt"
- ❌ "Latenz zwischen Eingabe und Feedback"

Jetzt:
- ✅ "Ich spreche, TAIA antwortet mit Stimme"
- ✅ "Voice ist STANDARD-Interface"
- ✅ "Reflective Thinking hörbar"
- ✅ "Text + Voice synchronisiert"

---

## 🚀 Quick Start

### Installation
```bash
cd "e:\_____1111____Projekte-Programmierung\Antigravity\The Forge"
npm install
```

### Starten
```bash
# Option 1: npm script
npm run voice

# Option 2: node direktly
node src/voice-chat-direct.js

# Option 3: Alias
npm run vcd
```

### Erstes Mal: Initialization
```
✅ TAIA Ready (v2.2.0)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 Start typing or press [SPACEBAR] for voice input
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> _
```

---

## 💻 Verwendung

### Methode 1: Text Input (Normal Typing)
```
> Hallo TAIA, wie heißt du?

🧠 [Denkvorgang]: Ich analysiere die Anfrage...
[VOICE] Speaking (powershell): "Ich analysiere..."

🤖 TAIA: Ich bin TAIA, ein True Artificial Intelligence Agent...
[VOICE] Speaking (powershell): "Ich bin TAIA..."

>
```

### Methode 2: Voice Input (Push-to-Talk)
```
> [Drücke LEERTASTE]

🎤 Listening...

[Warte 3-5 Sekunden, spreche ins Mikrofon]

📝 You: Hallo TAIA, wie geht es dir?

🧠 [Denkvorgang]: Ich prüfe die Registry...
[VOICE] Speaking (powershell): "Ich prüfe..."

🤖 TAIA: Mir geht es gut! Ich bin TAIA und...
[VOICE] Speaking (powershell): "Mir geht es gut..."

>
```

---

## 🎮 Keyboard Controls

| Taste | Aktion |
|-------|--------|
| **LEERTASTE** | Push-to-Talk aktivieren |
| **Text + Enter** | Text-Input senden |
| **Ctrl+C** | Exit + Session speichern |

---

## 🔊 Voice Features in VCD

### 1. Reflective Thinking (mit Voice)
TAIA **denkt laut** bevor Groq antwortet:
```
🧠 [Denkvorgang]: Ich analysiere die Anfrage...
```
- Hörbar: PowerShell TTS spricht den Gedanken
- Während: Groq verarbeitet im Hintergrund
- Effekt: Fühlt sich präsenter an

### 2. Voice Output (Synchronized)
Response wird **gleichzeitig** gesprochen + angezeigt:
```
🤖 TAIA: [Antwortext erscheint UND wird gesprochen]
```
- Keine Verzögerung
- Text + Voice parallel
- Native Windows TTS (PowerShell SAPI)

### 3. Session Logging
Jede Interaktion wird geloggt:
```
brain/voice-sessions/vcd-1707585600000.json
```

Inhalt:
```json
[
  {
    "type": "voice_input",
    "timestamp": "2026-02-11T...",
    "text": "Hallo TAIA"
  },
  {
    "type": "response",
    "timestamp": "2026-02-11T...",
    "input": "Hallo TAIA",
    "output": "Hallo! Ich bin TAIA..."
  }
]
```

---

## 🔧 Konfiguration

### Voice Settings ändern
In `src/voice-chat-direct.js` (Constructor):

```javascript
this.taia = new AgentCore({
  voiceOutput: true,        // ✅ Voice An/Aus
  reflectAloud: true,       // ✅ Denken laut sprechen
  reflectiveDelay: 200,     // ms vor Groq call
  debug: false              // Logging detail
});
```

### Language Settings
```javascript
// In AgentCore v2.2:
this.voice = new VoiceEngine({
  language: 'de',    // German
  rate: -1,          // Slower = clearer
  volume: 85         // Optimal volume
});

this.ears = new EarsEngine({
  language: 'de',
  recordDuration: 5  // Seconds
});
```

---

## 🎯 Workflow Beispiele

### Example 1: Daily Status Check
```bash
npm run voice
```
```
> Guten Morgen, Status?

🧠 [Denkvorgang]: Ich prüfe die Registry...
🤖 TAIA: Guten Morgen! Der Status ist optimal...

> [LEERTASTE] Systemauslastung?

📝 You: Systemauslastung?
🤖 TAIA: Die CPU-Auslastung beträgt...
```

### Example 2: Hands-Free Operation
```
[Im Office, Hände voll]
> [LEERTASTE]
🎤 Listening...
[Sprich]: "Was ist die aktuelle Uhrzeit?"
🤖 TAIA: [Spricht]: "Es ist 14:32 Uhr."
```

### Example 3: Mixed Input (Text + Voice)
```
> Erkläre mir die Registry

🤖 TAIA: [Erklärt mit Voice+Text]

> [LEERTASTE]
📝 You: Und wie funktioniert die Veritas-Ebene?

🤖 TAIA: [Antwortet nur per Voice+Text]
```

---

## 🔍 Troubleshooting

### Problem: Mikrofon wird nicht erkannt

**Lösung:**
```bash
# Überprüfe Systemlautstärke
# Windows: Sound Settings → Input device
# Check volume mixer
```

### Problem: Voice zu laut / zu leise

**Lösung in agent-core.js:**
```javascript
this.voice = new VoiceEngine({
  volume: 50,  // Leiser (0-100)
  // oder
  volume: 100  // Lauter
});
```

### Problem: Spreche, aber TAIA antwortet nicht

**Lösung:**
1. Überprüfe GROQ_API_KEY in `.env`
2. Test mit Text-Input: `> Hallo`
3. Überprüfe Internet-Connection

### Problem: Text wird angezeigt, aber nicht gesprochen

**Lösung:**
```javascript
// In VCD Constructor:
voiceOutput: true,  // Muss true sein
reflectAloud: true  // Für Denken-laut-sprechen
```

---

## 📊 Performance

| Aktion | Latenz |
|--------|--------|
| Text-Input → Response | 1-2s |
| Voice-Input Aufnahme | 3-5s |
| Groq Processing | ~1s |
| Voice Output (TTS) | <1s |
| **Gesamt (Voice Loop)** | **5-7s** |

---

## 🎙️ Audio Quality

### Input (STT)
- **API:** Groq Whisper
- **Sample Rate:** 16000 Hz (CD-Qualität)
- **Format:** LPCM WAV
- **Language:** Deutsch (konfigurierbar)

### Output (TTS)
- **Engine:** Windows PowerShell SAPI (native)
- **Language:** Deutsch
- **Rate:** -1 (slow for clarity)
- **Volume:** 85% (optimized)

---

## 💾 Session Management

### Session speichert:
- Alle Text-Inputs
- Alle Voice-Inputs
- Alle Responses
- Timestamps
- Error Messages

### Session-Dateien:
```
brain/voice-sessions/
├── vcd-1707585600000.json    # Session 1
├── vcd-1707586000000.json    # Session 2
└── ...
```

### Session auswerten:
```bash
# Letzte Session anschauen
cat brain/voice-sessions/$(ls -t brain/voice-sessions | head -1)
```

---

## 🔐 Security & Privacy

### Audio-Dateien:
- Nur während Recording im RAM
- Wird zu Groq Whisper geschickt (encrypted HTTPS)
- Wird nicht lokal gespeichert (nur Transkription)

### Logs:
- Sessions speichern **nur Text**, nicht Audio
- Dateien im `brain/voice-sessions/` Verzeichnis
- Git ignoriert diese Dateien automatisch

### API Keys:
- GROQ_API_KEY aus `.env` geladen
- Nicht in Logs oder Output
- Nicht in Sessions gespeichert

---

## 🚀 Advanced Usage

### Bash Integration
```bash
#!/bin/bash
# voice-daily.sh - Täglicher Voice-Check
npm run voice << EOF
Status?
Speicher?
Backup-Status?
exit
EOF
```

### Docker (geplant für Phase 9.5)
```bash
docker run -it --device /dev/snd taia-voice npm run voice
```

### CI/CD Pipeline (geplant)
```yaml
- name: Voice System Test
  run: npm run voice -- --test
```

---

## 📝 Changelog

### v1.0 (2026-02-11)
- ✅ Push-to-Talk im Terminal
- ✅ Synchronized Voice Output
- ✅ Session Logging
- ✅ Reflective Thinking mit Voice
- ✅ Text + Voice Input/Output

### v1.1 (Geplant)
- [ ] Multi-language support
- [ ] Voice profiles (different voices)
- [ ] Audio file input
- [ ] Session playback

### v2.0 (Geplant)
- [ ] WebSocket streaming
- [ ] Real-time transcription
- [ ] Voice emotion detection
- [ ] Advanced session analytics

---

## 🎯 Next Steps

Nach VCD:

1. **Phase 9.2:** Voice Personality (different voices)
2. **Phase 9.3:** Wake-word detection ("TAIA...")
3. **Phase 9.4:** Production Deployment (Docker)
4. **Phase 9.5:** Advanced Analytics

---

## 📞 Support

### Häufige Fragen:

**Q: Kann ich mehrere Sessions parallel haben?**
A: Nein, VCD ist single-session. Aber Sessions können geöffnet und analysiert werden.

**Q: Kann ich Voice Output abschalten?**
A: Ja:
```javascript
voiceOutput: false,  // Nur Text
```

**Q: Funktioniert das auf Linux/macOS?**
A: Ja, aber TTS verwendet Piper statt PowerShell SAPI. Text-Input funktioniert überall.

**Q: Kann ich Audio-Dateien als Input nutzen?**
A: Ja, über `/api/voice/transcribe` endpoint (Phase 8.5). In VCD noch nicht, geplant für v1.1.

---

## 🎉 Summary

**Voice-Chat-Direct macht TAIA zur Stimme in deinem Terminal.**

Von hier aus:
- ✅ Spreche normal, TAIA hört zu
- ✅ TAIA denkt laut, während sie verarbeitet
- ✅ TAIA antwortet mit Stimme + Text
- ✅ Sessions werden protokolliert
- ✅ Alles funktioniert offline (außer Groq)

**Das ist die Zukunft der Agent-Interaction.**

---

**Dokumentation:** 2026-02-11
**Build:** TAIA v2.2.0 + VCD v1.0
**Status:** 🟢 PRODUCTION READY

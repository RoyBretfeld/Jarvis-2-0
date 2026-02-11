# 🎤 Voice API Reference (Phase 8.5)

**Status:** ✅ PRODUCTION READY
**Date:** 2026-02-11
**Version:** v1.0

---

## Überblick

Die Voice API integriert Groq Whisper (STT) und PowerShell/Piper TTS in einen HTTP REST API. Ermöglicht Voice Input/Output über Standard HTTP Requests.

**Base URL:** `http://localhost:3000/api/voice`

---

## Endpoints

### 1. POST /api/voice/listen
**Audioaufnahme und Transkription**

Startet eine 3-5 Sekunde Audioaufnahme vom Mikrofon und transkribiert sie via Groq Whisper API.

**Request:**
```bash
curl -X POST http://localhost:3000/api/voice/listen
```

**Response (200):**
```json
{
  "success": true,
  "transcription": "Hallo, wie heißt du?",
  "language": "de",
  "duration": 3.2,
  "confidence": 0.95
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Failed to capture audio"
}
```

---

### 2. POST /api/voice/respond
**Text verarbeiten und mit Voice antworten**

Nimmt Text entgegen, verarbeitet über Groq Llama, spricht Antwort über TTS.

**Request:**
```bash
curl -X POST http://localhost:3000/api/voice/respond \
  -H "Content-Type: application/json" \
  -d '{"text":"Hallo TAIA, wie geht es dir?", "voiceOutput": true}'
```

**Body Parameter:**
- `text` (required): User input text
- `voiceOutput` (optional, default: true): Enable voice output

**Response (200):**
```json
{
  "success": true,
  "input": "Hallo TAIA, wie geht es dir?",
  "response": "Mir geht es gut! Ich bin TAIA und helfe gerne...",
  "voiceOutput": true
}
```

---

### 3. POST /api/voice/transcribe
**Audio-Datei transkribieren**

Lädt eine Audio-Datei hoch und transkribiert sie.

**Request:**
```bash
curl -X POST http://localhost:3000/api/voice/transcribe \
  -F "file=@audio.wav"
```

**Supported Formats:** `.wav`, `.mp3`, `.m4a`, `.ogg`, `.flac`

**Response (200):**
```json
{
  "success": true,
  "transcription": "Hallo TAIA",
  "language": "de",
  "confidence": 0.95,
  "file": "upload_1707585600000.wav"
}
```

---

### 4. POST /api/voice/listen-and-respond
**Komplette Voice Loop (Ohr → Hirn → Stimme)**

Startet eine komplette Voice Schleife: Aufnahme → Transkription → Processing → Response mit Voice Output.

**Request:**
```bash
curl -X POST http://localhost:3000/api/voice/listen-and-respond
```

**Response (200):**
```json
{
  "success": true,
  "input": "Was ist deine Funktion?",
  "response": "Ich bin TAIA und meine Hauptaufgabe ist..."
}
```

**Use Case:** Push-to-Talk über API, ideal für Voice UI Clients.

---

### 5. GET /api/voice/status
**Voice System Status**

Überprüft Status von Voice Input/Output Komponenten.

**Request:**
```bash
curl http://localhost:3000/api/voice/status
```

**Response (200):**
```json
{
  "success": true,
  "agent": {
    "name": "TAIA",
    "version": "2.2.0",
    "capabilities": [
      "proactive_priority_management",
      "tiered_memory_control",
      "sentinel_security",
      "speech_output",
      "speech_input",
      ...
    ]
  },
  "voice": {
    "enabled": true,
    "primaryBackend": "powershell",
    "audioDirectory": "E:\\...\\brain\\audio",
    "language": "de"
  },
  "ears": {
    "enabled": true,
    "recording": false,
    "language": "de",
    "sampleRate": 16000,
    "recordDuration": 5,
    "audioDirectory": "E:\\...\\brain\\audio"
  }
}
```

---

### 6. POST /api/voice/speak
**Nur TTS: Text zu Sprache (ohne Processing)**

Spricht Text direkt aus, ohne Groq Processing.

**Request:**
```bash
curl -X POST http://localhost:3000/api/voice/speak \
  -H "Content-Type: application/json" \
  -d '{"text":"Guten Tag", "language":"de"}'
```

**Body Parameter:**
- `text` (required): Text to speak
- `language` (optional, default: "de"): Language code

**Response (200):**
```json
{
  "success": true,
  "backend": "powershell",
  "rate": -1,
  "volume": 85
}
```

---

## 🔄 Workflow Beispiele

### Beispiel 1: Push-to-Talk Conversation
```javascript
// Frontend (React/Vue/etc)
const response = await fetch('http://localhost:3000/api/voice/listen-and-respond', {
  method: 'POST'
});
const result = await response.json();
console.log('User said:', result.input);
console.log('TAIA responded:', result.response);
```

### Beispiel 2: Voice Command Processing
```bash
# User spricht: "Was ist die aktuelle Zeit?"
curl -X POST http://localhost:3000/api/voice/listen \
  | jq -r '.transcription' \
  | xargs -I {} curl -X POST http://localhost:3000/api/voice/respond \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"{}\"}"
```

### Beispiel 3: TTS-Only Notifications
```javascript
// Server sendet Notification mit Voice
await fetch('http://localhost:3000/api/voice/speak', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'File downloaded successfully' })
});
```

### Beispiel 4: Audio File Batch Processing
```bash
# Transkribiere multiple Audio-Dateien
for file in *.wav; do
  curl -X POST http://localhost:3000/api/voice/transcribe \
    -F "file=@$file" \
    | jq '.transcription'
done
```

---

## 🔧 Konfiguration

### Environment Variables
```bash
# .env
GROQ_API_KEY=gsk_xxxxx          # Required for voice
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3000
```

### Voice Engine Settings
Können per Request oder in AgentCore konfiguriert werden:

```javascript
// In AgentCore constructor
this.voice = new VoiceEngine({
  language: 'de',           // German
  rate: -1,                 // Slower = clearer (-10 to 10)
  volume: 85,               // Optimal volume (0-100)
  speakAloud: true          // Enable output
});

this.ears = new EarsEngine({
  language: 'de',
  recordDuration: 5,        // Seconds
  groqApiKey: process.env.GROQ_API_KEY
});
```

---

## 📊 Performance Metrics

| Endpoint | Latency | Bottleneck |
|----------|---------|-----------|
| /listen | 3-5s | Audio recording |
| /respond | 1-2s | Groq API |
| /transcribe | 2-4s | Audio file size + Groq |
| /listen-and-respond | 5-7s | Combined |
| /speak | <1s | TTS backend |
| /status | <100ms | Local only |

---

## 🚨 Error Handling

### Common Errors

**401 - Missing API Key**
```json
{
  "success": false,
  "error": "GROQ_API_KEY not configured"
}
```

**400 - Invalid Input**
```json
{
  "success": false,
  "error": "Text input required"
}
```

**413 - File Too Large**
```json
{
  "success": false,
  "error": "File size exceeds limit"
}
```

**503 - Service Unavailable**
```json
{
  "success": false,
  "error": "Groq API temporarily unavailable"
}
```

---

## 🔐 Security Considerations

1. **API Key Protection**
   - GROQ_API_KEY stored in .env (not in code)
   - Never expose in client-side code

2. **Audio File Handling**
   - Uploaded files stored in `brain/audio/uploads/`
   - Auto-deleted after processing (optional)
   - File size limits enforced

3. **Rate Limiting** (recommended for production)
   - Implement per-IP rate limiting
   - Groq API has its own rate limits

4. **HTTPS Required** (production)
   - Use HTTPS to protect audio transmission
   - Groq API requires HTTPS anyway

---

## 📡 WebSocket Mode (Future)

Geplant für Phase 9:
```javascript
// Bidirektionale Voice Konversation ohne Polling
ws://localhost:3000/api/voice/stream
```

---

## 🧪 Testing

### Curl Tests
```bash
# Test 1: Status
curl http://localhost:3000/api/voice/status | jq

# Test 2: TTS Only
curl -X POST http://localhost:3000/api/voice/speak \
  -H "Content-Type: application/json" \
  -d '{"text":"Test"}' | jq

# Test 3: Full Loop
curl -X POST http://localhost:3000/api/voice/listen-and-respond | jq
```

### JavaScript Tests
```javascript
// test-voice-api.js
const BASE_URL = 'http://localhost:3000/api/voice';

async function testVoiceAPI() {
  console.log('Testing Voice API...');

  // Test status
  const status = await fetch(`${BASE_URL}/status`).then(r => r.json());
  console.log('Status:', status);

  // Test speak
  const speak = await fetch(`${BASE_URL}/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'API test successful' })
  }).then(r => r.json());
  console.log('Speak:', speak);
}

testVoiceAPI();
```

---

## 🎯 Integration Examples

### Frontend (React)
```jsx
function VoiceComponent() {
  const [transcript, setTranscript] = useState('');

  const handleVoice = async () => {
    const res = await fetch('/api/voice/listen-and-respond', {
      method: 'POST'
    });
    const data = await res.json();
    setTranscript(data.input);
  };

  return (
    <button onClick={handleVoice}>
      🎤 Speak
    </button>
  );
}
```

### Backend (Node.js)
```javascript
import voiceRouter from './api/routes/voice.js';

app.use('/api/voice', voiceRouter);

// Custom integration
app.post('/custom/voice-reply', async (req, res) => {
  const { message } = req.body;

  const response = await fetch('http://localhost:3000/api/voice/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  }).then(r => r.json());

  res.json(response);
});
```

---

## 📝 Changelog

### v1.0 (2026-02-11)
- ✅ Initial release
- ✅ 6 endpoints (listen, respond, transcribe, listen-and-respond, status, speak)
- ✅ Groq Whisper integration
- ✅ PowerShell/Piper TTS support
- ✅ Audio file upload handling

### Planned (Phase 9)
- [ ] WebSocket streaming
- [ ] Multi-language support (en, es, fr)
- [ ] Voice personality profiles
- [ ] Audio generation caching

---

**Generated:** 2026-02-11
**Status:** 🟢 PRODUCTION READY
**Support:** TAIA v2.2.0

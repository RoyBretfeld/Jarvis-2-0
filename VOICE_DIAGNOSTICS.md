# 🔧 Voice Diagnostics - Step-by-Step

**Ziel:** Lokale Voice-Ausgabe testen und beheben

---

## 🎯 Phase 1: Ultra-Einfacher Test

### Schritt 1: speak_now.js ausführen
```bash
cd "e:\_____1111____Projekte-Programmierung\Antigravity\The Forge"
node speak_now.js
```

### Was du sehen wirst:
```
🧪 TAIA Voice Test - Einfachst-Version

Erstelle VoiceEngine...
✅ VoiceEngine erstellt

🔊 Spreche Test-Nachricht...
📢 Spreche: "Hallo! Ich bin TAIA..."
[VOICE] Speaking (powershell): "Hallo..."
```

### Was du HÖREN wirst:
- ✅ **Wenn alles funktioniert:** Deutsche Stimme spricht die Nachrichtet
- ❌ **Wenn nichts passiert:** Siehe Troubleshooting

---

## 🔊 Phase 2: Audio-Routing überprüfen

Falls du NICHTS hörst, überprüfe diese Punkte:

### Windows Sound Settings
1. **Systemlautstärke überprüfen:**
   - Windows 11: Einstellungen → Lautstärke
   - Stelle sicher: Nicht stummgeschaltet, mind. 50%

2. **Speaker aktiviert:**
   - Sound-Einstellungen → Ausgabegerät
   - Wähle deine Boxen/Kopfhörer

3. **PowerShell SAPI Test:**
   ```powershell
   # Direkter PowerShell Test (ohne Node)
   $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
   $synth.Volume = 85
   $synth.Rate = -1
   $synth.Speak("Direkter Test")
   ```
   **Das sollte funktionieren, wenn PowerShell-TTS funktioniert!**

4. **Volume Mixer überprüfen:**
   - Einstellungen → Sound → Volume Mixer
   - Stelle sicher, dass Node.js nicht stummgeschaltet ist

---

## 🚀 Phase 3: Wenn speak_now.js funktioniert

**Das bedeutet:** Voice-Engine funktioniert! ✅

Jetzt müssen wir agent-core.js verknüpfen.

### In agent-core.js nach dieser Zeile suchen:
```javascript
async generateResponse(prompt, context = {}) {
```

### Nach dieser Zeile hinzufügen:
```javascript
// Trigger Voice Output für JEDE Antwort
async generateResponse(prompt, context = {}) {
  try {
    // ... existing code ...

    // E. VOICE OUTPUT: Spreche die Antwort
    if (this.config.voiceOutput && this.voice) {
      try {
        await this.voice.speak(response);
      } catch (voiceErr) {
        if (this.config.debug) {
          console.warn(`[VOICE] Error: ${voiceErr.message}`);
        }
      }
    }

    return response;
  } catch (error) {
    // ... error handling ...
  }
}
```

---

## 🧪 Phase 4: Kompletter Test mit Voice-Chat-Direct

```bash
npm run voice
```

Dann:
1. Tippe: `Hallo TAIA`
2. Enter drücken
3. **Du solltest HÖREN:**
   - 🧠 "Ich analysiere die Anfrage..." (Denken)
   - 🤖 "Hallo! Ich bin TAIA..." (Antwort)

---

## 📊 Diagnostics-Checkliste

| Punkt | Status | Aktion |
|-------|--------|--------|
| Windows Sound | ✅/❌ | Überprüfe Systemlautstärke |
| PowerShell SAPI | ✅/❌ | Führe `$synth.Speak("Test")` aus |
| speak_now.js | ✅/❌ | Führe `node speak_now.js` aus |
| VoiceEngine init | ✅/❌ | Überprüfe Logs |
| AgentCore verknüpft | ✅/❌ | Überprüfe generateResponse() |
| Voice-Chat-Direct | ✅/❌ | Führe `npm run voice` aus |

---

## 🔍 Häufige Probleme

### Problem 1: "speak_now.js startet, aber kein Ton"

**Lösung:**
```powershell
# Überprüfe Volume Mixer
# Settings > Sound > App volume and device preferences
# Node.js sollte nicht stummgeschaltet sein

# Oder direkter PowerShell Test:
Add-Type -AssemblyName System.Speech
(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak("Test")
```

### Problem 2: "node: command not found"

**Lösung:**
```bash
# Node global installieren oder vollständigen Pfad nutzen
"C:\Program Files\nodejs\node.exe" speak_now.js
```

### Problem 3: "VoiceEngine startet, aber sprechen funktioniert nicht"

**Lösung in speak_now.js:**
```javascript
// Überprüfe diese Parameter
debug: true,    // Zeige alle Details
rate: -1,       // Slower speech
volume: 85      // Medium laut
```

### Problem 4: "Agent-Core spricht nicht, obwohl speak_now.js funktioniert"

**Lösung:**
1. Überprüfe, dass `voiceOutput: true` in AgentCore gesetzt ist
2. Überprüfe, dass `this.voice` nicht undefined ist
3. Überprüfe, dass die speakAndLog() methode aufgerufen wird

---

## ✅ Erfolgs-Checkliste

Wenn folgende Punkte alle ✅ sind, funktioniert alles:

- [ ] speak_now.js läuft und du hörst Stimme
- [ ] PowerShell-Test funktioniert
- [ ] voice-engine.js zeigt debug-Output
- [ ] agent-core.js hat voiceOutput: true
- [ ] npm run voice startet ohne Fehler
- [ ] Tippen + Enter = TAIA spricht

---

## 🎯 Nächster Schritt nach Erfolg

Wenn alles funktioniert:

1. Starte Voice-Chat-Direct:
   ```bash
   npm run voice
   ```

2. Tippe eine Frage:
   ```
   > Hallo, wie funktionierst du?
   ```

3. TAIA antwortet mit **Text UND Stimme**

4. Sessions werden gespeichert:
   ```
   brain/voice-sessions/vcd-*.json
   ```

---

## 📞 Support

**Wenn nothing funktioniert:**

1. Überprüfe Windows Sound (Systemlautstärke)
2. Führe PowerShell-Test aus
3. Führe speak_now.js aus
4. Überprüfe Logs (debug: true)
5. Schau in browser console nach Fehlern

**Wenn Fragen:**
Dokumentation: docs/VOICE_CHAT_DIRECT_GUIDE.md
API Reference: docs/VOICE_API_REFERENCE.md

---

**Status:** 🟢 Ready for Diagnostic
**Generated:** 2026-02-11

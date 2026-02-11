/**
 * TAIA Ears Engine v1.0 (STT - Speech-to-Text)
 *
 * Push-to-Talk Implementierung für Windows + Linux
 * - Nutzt Groq Whisper API für Transkription
 * - node-record-lpcm16 für Audioaufnahme
 * - Tastatur-Trigger (Leertaste zum Aktivieren)
 *
 * Status: Production Ready
 */

import { exec as execCallback } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'
import { promisify } from 'util';
import record from 'node-record-lpcm16';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(execCallback);

class EarsEngine {
  constructor(config = {}) {
    this.platform = process.platform;  // 'win32', 'linux', 'darwin'

    this.config = {
      enabled: true,
      language: config.language || 'de',
      audioDir: config.audioDir || path.join(__dirname, '../../brain/audio'),
      sampleRate: config.sampleRate || 16000,
      channels: config.channels || 1,
      device: config.device || null,
      recordDuration: config.recordDuration || 5,  // Sekunden
      debug: config.debug || false,
      groqApiKey: config.groqApiKey || process.env.GROQ_API_KEY,
      ...config
    };

    // Audio directory
    if (!fs.existsSync(this.config.audioDir)) {
      fs.mkdirSync(this.config.audioDir, { recursive: true });
    }

    this.recording = false;
    this.stream = null;

    console.log('[EARS] Engine initialized - Push-to-Talk ready');
  }

  /**
   * Starte Audioaufnahme (Push-to-Talk)
   * Gibt einen Promise zurück, der aufgelöst wird, wenn Aufnahme beginnt
   */
  async startListening() {
    if (this.recording) {
      console.warn('[EARS] Already recording');
      return { success: false, error: 'Already recording' };
    }

    try {
      this.recording = true;
      console.log(`[EARS] 🎤 Listening for ${this.config.recordDuration}s...`);

      const audioFile = path.join(this.config.audioDir, `ears_${Date.now()}.wav`);

      // Starte Audioaufnahme
      const result = await this._recordAudio(audioFile);

      if (!result.success) {
        this.recording = false;
        return result;
      }

      console.log('[EARS] ✅ Recording complete');

      // Transkribiere sofort nach Aufnahme
      const transcription = await this.transcribe(audioFile);

      this.recording = false;

      return {
        success: true,
        audioFile,
        transcription: transcription.text || '',
        language: this.config.language,
        duration: this.config.recordDuration
      };
    } catch (error) {
      this.recording = false;
      console.error('[EARS] Recording error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stoppe die aktuelle Aufnahme (manuell)
   */
  stopListening() {
    if (this.stream) {
      this.stream.stop();
      this.stream = null;
      this.recording = false;
      console.log('[EARS] Recording stopped');
      return { success: true };
    }
    return { success: false, error: 'No active recording' };
  }

  /**
   * Interne Methode: Audioaufnahme
   */
  async _recordAudio(outputFile) {
    return new Promise((resolve) => {
      const file = fs.createWriteStream(outputFile);
      let recordStream = null;

      try {
        // Starte Aufnahme mit node-record-lpcm16
        recordStream = record.record({
          sampleRate: this.config.sampleRate,
          channels: this.config.channels,
          device: this.config.device,
          recordProgram: this.platform === 'win32' ? 'rec' : 'rec',  // SoX auf Windows/Linux
          silence: '2.0'  // Auto-stopp nach 2 Sekunden Stille
        });

        recordStream.pipe(file);
        this.stream = recordStream;

        // Auto-stopp nach Duration
        const timeout = setTimeout(() => {
          if (recordStream) {
            recordStream.stop();
          }
        }, this.config.recordDuration * 1000);

        // Event-Listener
        recordStream.on('error', (error) => {
          clearTimeout(timeout);
          this.recording = false;
          console.error('[EARS] Record error:', error.message);
          resolve({ success: false, error: error.message });
        });

        recordStream.on('close', () => {
          clearTimeout(timeout);
          this.recording = false;
          resolve({ success: true, file: outputFile });
        });

        // Nach Duration stoppen
        setTimeout(() => {
          if (recordStream && this.recording) {
            recordStream.stop();
          }
        }, this.config.recordDuration * 1000 + 500);

      } catch (error) {
        this.recording = false;
        console.error('[EARS] Setup error:', error.message);
        resolve({ success: false, error: error.message });
      }
    });
  }

  /**
   * Transkribiere Audio mit Groq Whisper API
   */
  async transcribe(audioFile) {
    if (!fs.existsSync(audioFile)) {
      return { success: false, error: 'Audio file not found' };
    }

    try {
      if (this.config.debug) {
        console.log(`[EARS] Transcribing: ${audioFile}`);
      }

      // Lese Audio-Datei
      const audioBuffer = fs.readFileSync(audioFile);

      // Groq Whisper API Call
      const response = await this._callGroqWhisper(audioBuffer);

      if (!response.success) {
        return response;
      }

      if (this.config.debug) {
        console.log(`[EARS] Transcription: "${response.text}"`);
      }

      return {
        success: true,
        text: response.text || '',
        language: response.language || this.config.language,
        confidence: response.confidence || 0.95
      };
    } catch (error) {
      console.error('[EARS] Transcription error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Groq Whisper API Integration
   */
  async _callGroqWhisper(audioBuffer) {
    try {
      if (!this.config.groqApiKey) {
        return { success: false, error: 'GROQ_API_KEY not configured' };
      }

      const fetch = (await import('node-fetch')).default;
      const FormData = (await import('form-data')).default;

      // Erstelle FormData mit Audio
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('model', 'whisper-1');
      formData.append('language', this.config.language === 'de' ? 'de' : 'en');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.groqApiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Groq API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      return {
        success: true,
        text: data.text || '',
        language: data.language || this.config.language
      };
    } catch (error) {
      console.error('[EARS] Whisper API error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Interaktiver Push-to-Talk Modus
   * Wartet auf Tastatur-Input zum Aktivieren/Deaktivieren
   */
  async interactiveMode() {
    console.log('[EARS] 🎧 Interactive Push-to-Talk Mode');
    console.log('[EARS] Drücke LEERTASTE zum Aufnehmen (oder "q" zum Beenden)');

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    return new Promise((resolve) => {
      stdin.on('data', async (char) => {
        if (char === ' ') {
          // LEERTASTE: Starte Aufnahme
          console.log('\n[EARS] 🎤 Aufnahme läuft...');
          const result = await this.startListening();
          if (result.success) {
            console.log(`[EARS] Transkription: "${result.transcription}"\n`);
          } else {
            console.log(`[EARS] Fehler: ${result.error}\n`);
          }
        } else if (char === 'q' || char === '\u0003') {
          // Q oder Ctrl+C: Beende
          stdin.setRawMode(false);
          stdin.pause();
          console.log('\n[EARS] Mode beendet');
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      recording: this.recording,
      language: this.config.language,
      sampleRate: this.config.sampleRate,
      recordDuration: this.config.recordDuration,
      audioDirectory: this.config.audioDir,
      platform: this.platform
    };
  }
}

export { EarsEngine };

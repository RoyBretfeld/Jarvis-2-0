/**
 * TAIA Voice Engine v1.0 (TTS - Text-to-Speech)
 *
 * Provides speech synthesis for TAIA using multiple backends:
 * - Piper (local, fast, offline)
 * - gTTS (Google, requires internet)
 * - Native system TTS (fallback)
 *
 * Status: Production Ready
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

class VoiceEngine {
  constructor(config = {}) {
    this.config = {
      enabled: true,
      backend: config.backend || 'piper',  // 'piper', 'gtts', or 'espeak'
      language: config.language || 'de',
      audioDir: config.audioDir || path.join(__dirname, '../../brain/audio'),
      speakAloud: config.speakAloud !== false,
      debug: config.debug || false,
      ...config
    };

    this.supportedBackends = {
      piper: { name: 'Piper TTS (Offline)', installed: false },
      gtts: { name: 'gTTS (Google)', installed: false },
      espeak: { name: 'eSpeak NG (System)', installed: false }
    };

    // Initialize audio directory
    if (!fs.existsSync(this.config.audioDir)) {
      fs.mkdirSync(this.config.audioDir, { recursive: true });
    }

    this.initialize();
  }

  /**
   * Initialize and detect available TTS backends
   */
  async initialize() {
    try {
      // Check for available backends
      await this._checkPiper();
      await this._checkGTTS();
      await this._checkESpeak();

      // Set primary backend if configured one is not available
      if (this.supportedBackends[this.config.backend]?.installed === false) {
        // Find first available
        for (const [name, info] of Object.entries(this.supportedBackends)) {
          if (info.installed) {
            console.log(`[VOICE] Primary backend ${this.config.backend} not found. Using ${name} instead.`);
            this.config.backend = name;
            break;
          }
        }
      }

      console.log(`[VOICE] Engine initialized: ${this.config.backend}`);
    } catch (error) {
      console.warn(`[VOICE] Initialization warning: ${error.message}`);
      this.config.enabled = false;
    }
  }

  /**
   * Main speak method - converts text to speech
   */
  async speak(text, options = {}) {
    if (!this.config.enabled || !this.config.speakAloud) {
      if (this.config.debug) console.log(`[VOICE] Speak disabled`);
      return { success: true, message: 'Voice disabled' };
    }

    if (!text || typeof text !== 'string') {
      return { success: false, error: 'Invalid text input' };
    }

    // Truncate very long texts
    const maxLength = 500;
    if (text.length > maxLength) {
      console.warn(`[VOICE] Text truncated from ${text.length} to ${maxLength} chars`);
      text = text.substring(0, maxLength) + '...';
    }

    try {
      const backend = options.backend || this.config.backend;
      const language = options.language || this.config.language;

      console.log(`[VOICE] Speaking (${backend}): "${text.substring(0, 50)}..."`);

      switch (backend) {
        case 'piper':
          return await this._speakWithPiper(text, language);
        case 'gtts':
          return await this._speakWithGTTS(text, language);
        case 'espeak':
          return await this._speakWithESpeak(text, language);
        default:
          return { success: false, error: `Unknown backend: ${backend}` };
      }
    } catch (error) {
      console.error(`[VOICE] Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Piper TTS - Local, Fast, Offline
   * Installation: pip install piper-tts
   */
  async _speakWithPiper(text, language) {
    try {
      const audioFile = path.join(this.config.audioDir, `piper_${Date.now()}.wav`);

      // Piper command: echo "text" | piper --model de_DE --output_file output.wav && aplay output.wav
      const langModel = language === 'de' ? 'de_DE' : language;
      const cmd = `echo "${text}" | piper --model ${langModel} --output_file "${audioFile}"`;

      if (this.config.debug) console.log(`[VOICE] Piper command: ${cmd}`);

      await execAsync(cmd);

      // Play the audio
      if (process.platform !== 'win32') {
        await execAsync(`aplay "${audioFile}"`);
      } else {
        console.log(`[VOICE] Audio generated (play manually): ${audioFile}`);
      }

      return { success: true, backend: 'piper', audioFile };
    } catch (error) {
      return { success: false, error: error.message, backend: 'piper' };
    }
  }

  /**
   * gTTS - Google Text-to-Speech (requires internet)
   * Installation: pip install gtts
   */
  async _speakWithGTTS(text, language) {
    try {
      const audioFile = path.join(this.config.audioDir, `gtts_${Date.now()}.mp3`);

      // gtts-cli command
      const cmd = `gtts-cli "${text}" --lang ${language} --output "${audioFile}" && mpg123 "${audioFile}"`;

      if (this.config.debug) console.log(`[VOICE] gTTS command: ${cmd}`);

      await execAsync(cmd);

      return { success: true, backend: 'gtts', audioFile };
    } catch (error) {
      return { success: false, error: error.message, backend: 'gtts' };
    }
  }

  /**
   * eSpeak NG - System TTS (always available as fallback)
   * Installation: sudo apt-get install espeak-ng
   */
  async _speakWithESpeak(text, language) {
    try {
      const voiceCode = language === 'de' ? '+de' : language;
      const cmd = `espeak-ng -v${voiceCode} "${text}"`;

      if (this.config.debug) console.log(`[VOICE] eSpeak command: ${cmd}`);

      await execAsync(cmd);

      return { success: true, backend: 'espeak' };
    } catch (error) {
      return { success: false, error: error.message, backend: 'espeak' };
    }
  }

  /**
   * Check if Piper is installed
   */
  async _checkPiper() {
    try {
      await execAsync('which piper', { timeout: 1000 });
      this.supportedBackends.piper.installed = true;
    } catch {
      this.supportedBackends.piper.installed = false;
    }
  }

  /**
   * Check if gTTS is installed
   */
  async _checkGTTS() {
    try {
      await execAsync('which gtts-cli', { timeout: 1000 });
      this.supportedBackends.gtts.installed = true;
    } catch {
      this.supportedBackends.gtts.installed = false;
    }
  }

  /**
   * Check if eSpeak is installed
   */
  async _checkESpeak() {
    try {
      await execAsync('which espeak-ng', { timeout: 1000 });
      this.supportedBackends.espeak.installed = true;
    } catch {
      this.supportedBackends.espeak.installed = false;
    }
  }

  /**
   * Get status of all backends
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      primaryBackend: this.config.backend,
      backends: this.supportedBackends,
      audioDirectory: this.config.audioDir,
      language: this.config.language
    };
  }

  /**
   * Speak with inline metadata (for debugging)
   */
  async speakDebug(text, metadata = {}) {
    console.log('\n[VOICE-DEBUG] Speaking with metadata:');
    console.log('  Text:', text);
    console.log('  Metadata:', metadata);
    const result = await this.speak(text, metadata);
    console.log('  Result:', result);
    return result;
  }
}

export { VoiceEngine };

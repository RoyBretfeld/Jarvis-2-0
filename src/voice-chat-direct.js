#!/usr/bin/env node
/**
 * TAIA Voice-Chat-Direct (VCD) v1.0
 *
 * Vollständige Voice Integration ins Terminal
 * - Push-to-Talk (Leertaste triggert Aufnahme)
 * - Synchronized Voice Output (Sprechen + Text gleichzeitig)
 * - Session Management
 * - Reflective Thinking (mit Voice)
 *
 * DAILY DRIVER: Das Tool für tägliche Voice-Interaktion mit TAIA
 */

import readline from 'readline';
import { AgentCore } from './agent-core.js';
import { config as loadEnv } from 'dotenv';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnv();

class VoiceChatDirect {
  constructor() {
    this.taia = new AgentCore({
      voiceOutput: true,
      reflectAloud: true,
      reflectiveDelay: 200,
      debug: false
    });

    this.sessionId = `vcd-${Date.now()}`;
    this.sessionLog = [];
    this.isListening = false;
    this.inputMode = 'text'; // 'text' or 'voice'

    console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     🎤 TAIA VOICE-CHAT-DIRECT (VCD) v1.0                     ║
║     Vollständige Voice Integration im Terminal                ║
║                                                                ║
║     🎤 [LEERTASTE] = Push-to-Talk (Mikrofon)                 ║
║     ⌨️  [TEXT]      = Normales Tippen                          ║
║     🛑 [Ctrl+C]    = Exit                                      ║
║                                                                ║
║     Session: ${this.sessionId}                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `));

    this.setupReadline();
    this.setupKeypress();
  }

  /**
   * Setup Interactive Readline
   */
  setupReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.rl.on('line', async (input) => {
      if (this.inputMode === 'text' && input.trim()) {
        await this.handleInput(input);
      }
    });

    this.rl.on('close', () => {
      this.saveSession();
      process.exit(0);
    });
  }

  /**
   * Setup Keypress Listener für Push-to-Talk
   */
  setupKeypress() {
    // Raw mode für Tastatur-Events
    const stdin = process.stdin;

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    stdin.on('data', async (char) => {
      // LEERTASTE = Push-to-Talk
      if (char === ' ') {
        if (!this.isListening) {
          await this.voiceInput();
        }
      }
      // Ctrl+C = Exit
      else if (char === '\u0003') {
        process.exit(0);
      }
    });
  }

  /**
   * Voice Input: Microphone → Transcription
   */
  async voiceInput() {
    if (this.isListening) return;

    this.isListening = true;
    console.log('\n' + chalk.green('🎤 Listening...'));

    try {
      const audioResult = await this.taia.ears.startListening();

      if (!audioResult.success) {
        console.log(chalk.red(`❌ Error: ${audioResult.error}`));
        this.isListening = false;
        return;
      }

      const transcript = audioResult.transcription;
      console.log(chalk.blue(`📝 You: ${transcript}\n`));

      // Log zur Session
      this.sessionLog.push({
        type: 'voice_input',
        timestamp: new Date().toISOString(),
        text: transcript
      });

      // Verarbeite Input
      await this.handleInput(transcript);
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
    } finally {
      this.isListening = false;
      this.promptInput();
    }
  }

  /**
   * Handle Input: Text oder Voice
   * - Reflective Thinking (mit Voice)
   * - Groq Processing
   * - Voice Output
   */
  async handleInput(input) {
    if (!input || !input.trim()) return;

    console.log(chalk.dim(`[Processing...]\n`));

    try {
      // Generiere Response mit vollständigem Voice-Loop
      const response = await this.taia.generateResponse(input, {
        sessionId: this.sessionId,
        channel: 'voice-chat-direct'
      });

      // Anzeige mit formatierung
      console.log(chalk.yellow(`🤖 TAIA: ${response}\n`));

      // Log zur Session
      this.sessionLog.push({
        type: 'response',
        timestamp: new Date().toISOString(),
        input: input,
        output: response
      });
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}\n`));
      this.sessionLog.push({
        type: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  /**
   * Prompt für nächsten Input
   */
  promptInput() {
    if (!this.isListening) {
      process.stdout.write(chalk.cyan('> '));
    }
  }

  /**
   * Session speichern
   */
  saveSession() {
    const logsDir = path.join(process.cwd(), 'brain', 'voice-sessions');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFile = path.join(logsDir, `${this.sessionId}.json`);
    fs.writeFileSync(logFile, JSON.stringify(this.sessionLog, null, 2), 'utf8');

    console.log(chalk.green(`\n✅ Session saved: ${logFile}`));
  }

  /**
   * Start the interactive chat
   */
  async start() {
    // Initialize TAIA
    try {
      await this.taia.initialize();
      console.log(chalk.green(`✅ TAIA Ready (v${this.taia.identity.version})\n`));
    } catch (error) {
      console.log(chalk.red(`❌ Initialization failed: ${error.message}`));
      process.exit(1);
    }

    // Welcome message
    console.log(chalk.cyan('━'.repeat(64)));
    console.log(chalk.yellow('💬 Start typing or press [SPACEBAR] for voice input'));
    console.log(chalk.cyan('━'.repeat(64)));
    console.log();

    this.promptInput();
  }
}

/**
 * Main Entry Point
 */
(async () => {
  try {
    const vcd = new VoiceChatDirect();
    await vcd.start();
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
})();

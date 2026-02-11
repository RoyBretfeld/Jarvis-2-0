/**
 * TAIA Agent Core v2.1 - ES6 Edition with Voice Integration
 *
 * Intelligent agent system using Groq Llama 3.3 Versatile
 * Based on RB-Protokoll with JARVIS Priority Engine
 * Enhanced with Security (Sentinel), Voice (Output), and Senses
 */

import EventEmitter from 'events';
import { fileURLToPath } from 'url';
import path from 'path';
import MarkdownManagerModule from './markdown-manager.cjs';
import { VoiceEngine } from './senses/voice-engine.js';
import { EarsEngine } from './senses/ears-engine.js';

const MarkdownManager = MarkdownManagerModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AgentCore extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      modelProvider: 'groq',
      model: 'llama-3.3-70b-versatile',
      apiKey: process.env.GROQ_API_KEY,
      temperature: 0.7,
      maxTokens: 2048,
      // Voice settings
      voiceOutput: true,           // Enable voice output
      reflectAloud: true,          // Speak thoughts aloud
      reflectiveDelay: 200,        // Delay before starting Groq call (ms)
      ...config
    };

    // Agent Identity
    this.identity = {
      name: 'TAIA',
      version: '2.2.0',
      description: 'True Artificial Intelligence Agent - Proactive System Enabler',
      capabilities: [
        'proactive_priority_management',
        'tiered_memory_control',
        'sentinel_security',
        'speech_output',              // Voice synthesis (TTS)
        'speech_input',               // NEW: Voice recognition (STT)
        'autonomous_skill_execution',
        'intelligent_routing',
        'memory_persistence',
        'multi_channel_communication',
        'reflective_thinking'         // Voice reflection
      ]
    };

    // Memory System (Soul)
    this.memory = {
      shortTerm: new Map(),     // Current conversation
      longTerm: new Map(),      // User history
      semantic: new Map(),      // Knowledge embeddings
      episodic: new Map()       // Event memories
    };

    // Session Management
    this.sessions = new Map();

    // Channel Integration
    this.channels = new Map();

    // Knowledge Base Manager
    this.knowledgeManager = new MarkdownManager();

    // Voice Engine (TTS) - with Windows optimization
    this.voice = new VoiceEngine({
      language: 'de',
      speakAloud: this.config.voiceOutput,
      debug: false,
      // Windows voice clarity optimization
      rate: -1,      // Slower speech (-10 to 10, lower = slower = clearer)
      volume: 85     // Slightly reduced to avoid clipping (0-100)
    });

    // Ears Engine (STT) - NEW Push-to-Talk
    this.ears = new EarsEngine({
      language: 'de',
      recordDuration: 5,  // 5 seconds max per recording
      groqApiKey: this.config.apiKey,
      debug: false
    });

    // Initialize Groq client
    this.initializeGroqClient();
  }

  /**
   * Load knowledge base
   */
  async loadKnowledgeBase() {
    return await this.knowledgeManager.loadKnowledgeBase();
  }

  /**
   * Initialize Groq API client
   */
  initializeGroqClient() {
    try {
      if (!this.config.apiKey) {
        throw new Error('GROQ_API_KEY environment variable not set');
      }

      this.groqClient = {
        apiKey: this.config.apiKey,
        apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
        model: this.config.model
      };

      console.log('✅ Groq client initialized');
      this.emit('groq:ready', { model: this.config.model });
    } catch (error) {
      console.error('❌ Groq initialization failed:', error.message);
      this.emit('error', error);
    }
  }

  /**
   * DUAL-CHANNEL OUTPUT: Speak and log simultaneously
   * NEW in v2.1
   */
  async speakAndLog(text, isThought = false) {
    const prefix = isThought ? '🧠 [Denkvorgang]:' : '🤖 [Antwort]:';
    console.log(`${prefix} ${text}`);

    // Parallel voice output if enabled
    if (this.config.voiceOutput && this.voice) {
      try {
        await this.voice.speak(text, { backend: undefined }); // Auto-select best backend
      } catch (error) {
        if (this.config.debug) {
          console.warn(`[VOICE] Error speaking: ${error.message}`);
        }
      }
    }
  }

  /**
   * REFLECTIVE THINKING: Speak out loud before processing
   * Provides audible feedback during Groq latency
   * NEW in v2.1
   */
  async thoughtReflection(prompt) {
    if (!this.config.reflectAloud || !this.voice) {
      return;
    }

    // Analyze prompt and generate thought
    const thoughts = this._generateThought(prompt);

    // Speak the thought (non-blocking)
    await this.speakAndLog(thoughts, true);

    // Give Groq time to process in parallel
    if (this.config.reflectiveDelay > 0) {
      await new Promise(r => setTimeout(r, this.config.reflectiveDelay));
    }
  }

  /**
   * Generate reflection text based on input
   */
  _generateThought(prompt) {
    const thoughts = [
      'Ich analysiere die Anfrage und greife auf mein Wissenssystem zu.',
      'Ich prüfe die Registry und synchronisiere die Veritas-Ebene.',
      'Ich verarbeite die Anfrage durch die föderierte Architektur.',
      'Ich aktiviere die kognitiven Prozesse für eine präzise Antwort.',
      'Ich führe den logischen Abgleich durch meine Soul-Definition durch.'
    ];

    // Simple selection based on prompt length (can be enhanced with ML)
    const index = prompt.length % thoughts.length;
    return thoughts[index];
  }

  /**
   * PUSH-TO-TALK: Listen to user input and generate response
   * Komplette Voice I/O Schleife (Ears → Brain → Voice)
   * NEW in v2.2
   */
  async listenAndRespond(context = {}) {
    try {
      // A. CAPTURE AUDIO: Push-to-Talk
      console.log('[VOICE-LOOP] 🎤 Listening...');
      const audioResult = await this.ears.startListening();

      if (!audioResult.success) {
        await this.speakAndLog(`Fehler beim Aufnehmen: ${audioResult.error}`, false);
        return { success: false, error: audioResult.error };
      }

      const userInput = audioResult.transcription;
      console.log(`[VOICE-LOOP] 📝 Transkription: "${userInput}"`);

      // B. PROCESS: Generate response with reflective thinking
      const response = await this.generateResponse(userInput, context);

      // C. OUTPUT: Voice already spoken in generateResponse(), just return
      return {
        success: true,
        input: userInput,
        response: response
      };
    } catch (error) {
      console.error('[VOICE-LOOP] Error:', error.message);
      await this.speakAndLog(`Fehler in der Voice-Schleife: ${error.message}`, false);
      return { success: false, error: error.message };
    }
  }

  /**
   * Interactive Voice Mode
   * Push-to-Talk mit Tastatur-Steuerung (Leertaste = Aufnehmen)
   * NEW in v2.2
   */
  async interactiveVoiceMode() {
    console.log('\n[VOICE-LOOP] 🎧 Interaktiver Voice Mode gestartet');
    console.log('[VOICE-LOOP] Drücke LEERTASTE zum Aufnehmen (q = Beenden)\n');

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let running = true;

    return new Promise((resolve) => {
      stdin.on('data', async (char) => {
        if (char === ' ') {
          // LEERTASTE: Starte Voice-Loop
          console.log('\n[VOICE-LOOP] 🎤 Aufnahme läuft...');
          const result = await this.listenAndRespond({
            sessionId: 'voice-interactive',
            channel: 'voice'
          });

          if (result.success) {
            console.log(`\n[VOICE-LOOP] ✅ Verarbeitet\n`);
          } else {
            console.log(`\n[VOICE-LOOP] ❌ Fehler: ${result.error}\n`);
          }
        } else if (char === 'q' || char === '\u0003') {
          // Q oder Ctrl+C: Beende
          running = false;
          stdin.setRawMode(false);
          stdin.pause();
          console.log('\n[VOICE-LOOP] 🛑 Mode beendet');
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Generate intelligent response using Groq LLM
   * Enhanced with voice reflection (v2.1)
   */
  async generateResponse(prompt, context = {}) {
    try {
      // A. REFLECTIVE THINKING: Speak thought while Groq processes
      await this.thoughtReflection(prompt);

      // B. BUILD SYSTEM PROMPT
      const systemPrompt = this.buildSystemPrompt(context);

      // C. CALL GROQ API
      const response = await this.callGroqAPI(
        systemPrompt,
        prompt,
        this.config.temperature,
        this.config.maxTokens
      );

      // D. STORE IN MEMORY
      this.memory.shortTerm.set(
        `response_${Date.now()}`,
        { prompt, response, timestamp: new Date() }
      );

      // E. DUAL-CHANNEL OUTPUT: Speak + log response
      await this.speakAndLog(response, false);

      return response;
    } catch (error) {
      console.error('Response generation failed:', error);
      await this.speakAndLog(`Fehler: ${error.message}`, false);
      throw error;
    }
  }

  /**
   * Call Groq API with retry logic
   */
  async callGroqAPI(systemPrompt, userPrompt, temperature = 0.7, maxTokens = 2048) {
    const fetch = (await import('node-fetch')).default;

    const payload = {
      model: this.groqClient.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false
    };

    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        const response = await fetch(this.groqClient.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.groqClient.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`API Error: ${error.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          console.log(`⏳ Retry attempt ${4 - retries}/3...`);
          await new Promise(r => setTimeout(r, 1000 * (4 - retries)));
        }
      }
    }

    throw lastError;
  }

  /**
   * Build system prompt with context
   */
  buildSystemPrompt(context = {}) {
    const timestamp = new Date().toISOString();

    // Get ALL knowledge base content - embed directly into system prompt
    const allMDContent = this.knowledgeManager.getCompactKnowledgeBase();

    // Build comprehensive system prompt with all MD files
    const systemPrompt = `${allMDContent}

═══════════════════════════════════════════════════════════
CURRENT EXECUTION CONTEXT (v2.1 with Voice Integration)
═══════════════════════════════════════════════════════════
Timestamp: ${timestamp}
User ID: ${context.userId || 'unknown'}
Session ID: ${context.sessionId || 'default'}
Channel: ${context.channel || 'console'}
Temperature: ${context.temperature || 0.7}
Max Tokens: ${context.maxTokens || 2048}
Voice Output: ${this.config.voiceOutput ? '✅ ENABLED' : '❌ DISABLED'}

IMPORTANT REMINDERS:
1. You are TAIA (True Artificial Intelligence Agent) - always act according to your Soul definition
2. Follow the JARVIS Priority System (1-10 scale) for all decisions
3. Respond in German (Deutsch) always unless explicitly asked otherwise
4. Use your Memory & Soul system for context
5. Reference your Knowledge Base when needed
6. Be precise, helpful, transparent, and proactive
7. Act within Sentinel security boundaries (body/ autonomy, src/ requires approval)
8. Coordinate with the Federation system (Registry, Bus, Audit logs)

═══════════════════════════════════════════════════════════`;

    return systemPrompt;
  }

  /**
   * Create or get session
   */
  getOrCreateSession(sessionId, config = {}) {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId);
    }

    const session = {
      id: sessionId,
      created: new Date(),
      lastActivity: new Date(),
      messages: [],
      context: {},
      metadata: config
    };

    this.sessions.set(sessionId, session);
    this.emit('session:created', session);

    return session;
  }

  /**
   * Add message to session
   */
  addMessageToSession(sessionId, message, role = 'user') {
    const session = this.getOrCreateSession(sessionId);

    session.messages.push({
      role,
      content: message,
      timestamp: new Date(),
      id: `msg_${Date.now()}`
    });

    session.lastActivity = new Date();
    this.emit('message:added', { sessionId, message: session.messages[session.messages.length - 1] });

    return session;
  }

  /**
   * Store in long-term memory
   */
  storeLongTermMemory(key, value, ttl = null) {
    const data = {
      value,
      stored: new Date(),
      ttl: ttl ? new Date(Date.now() + ttl) : null
    };

    this.memory.longTerm.set(key, data);
    this.emit('memory:stored', { key, ttl });
  }

  /**
   * Retrieve from long-term memory
   */
  retrieveLongTermMemory(key) {
    const data = this.memory.longTerm.get(key);

    if (!data) return null;

    // Check TTL
    if (data.ttl && data.ttl < new Date()) {
      this.memory.longTerm.delete(key);
      return null;
    }

    return data.value;
  }

  /**
   * Register channel handler
   */
  registerChannel(channelName, handler) {
    this.channels.set(channelName, handler);
    console.log(`✅ Channel registered: ${channelName}`);
    this.emit('channel:registered', { channel: channelName });
  }

  /**
   * Route message through channels
   */
  async routeMessage(message, targetChannel) {
    const handler = this.channels.get(targetChannel);

    if (!handler) {
      throw new Error(`Channel not found: ${targetChannel}`);
    }

    try {
      return await handler(message);
    } catch (error) {
      console.error(`Channel error (${targetChannel}):`, error);
      throw error;
    }
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      identity: this.identity,
      status: 'OPERATIONAL',
      config: {
        model: this.config.model,
        temperature: this.config.temperature,
        voiceOutput: this.config.voiceOutput,
        reflectAloud: this.config.reflectAloud
      },
      memory: {
        shortTerm: this.memory.shortTerm.size,
        longTerm: this.memory.longTerm.size,
        semantic: this.memory.semantic.size,
        episodic: this.memory.episodic.size
      },
      sessions: this.sessions.size,
      channels: this.channels.size,
      voice: this.voice?.getStatus(),
      ears: this.ears?.getStatus()     // NEW: Voice input status
    };
  }

  /**
   * Initialize agent
   */
  async initialize() {
    console.log('🚀 Initializing TAIA Agent (v2.2 with Full Voice I/O)...');
    console.log(`🤖 Agent: ${this.identity.name} v${this.identity.version}`);
    console.log(`🔊 Voice Output: ${this.config.voiceOutput ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`🎤 Voice Input: ✅ ENABLED (Push-to-Talk)`);

    this.emit('agent:initializing');

    // Verify Groq connection
    try {
      await this.callGroqAPI(
        'You are a helpful assistant',
        'Hello, respond with just "Ready" to confirm connection.',
        0.3,
        10
      );
      console.log('✅ Agent initialization complete');
      this.emit('agent:ready');
    } catch (error) {
      console.error('❌ Agent initialization failed:', error);
      this.emit('agent:error', error);
      throw error;
    }
  }
}

export { AgentCore };

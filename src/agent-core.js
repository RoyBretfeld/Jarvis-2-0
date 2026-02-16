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
import ollama from 'ollama';
import MarkdownManagerModule from './markdown-manager.cjs';
import { VoiceEngine } from './senses/voice-engine.js';
import { EarsEngine } from './senses/ears-engine.js';

const MarkdownManager = MarkdownManagerModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AgentCore extends EventEmitter {
  constructor(config = {}) {
    super();

    const envProvider = process.env.MODEL_PROVIDER;
    const defaultProvider = envProvider === 'groq' || envProvider === 'ollama'
      ? envProvider
      : (process.env.GROQ_API_KEY ? 'groq' : 'ollama');
    const defaultModel = defaultProvider === 'groq'
      ? (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
      : (process.env.OLLAMA_MODEL || 'qwen3:14b');
    const defaultCoderModel = defaultProvider === 'groq'
      ? (process.env.CODER_MODEL || process.env.GROQ_CODER_MODEL || defaultModel)
      : (process.env.CODER_MODEL || process.env.OLLAMA_CODER_MODEL || 'qwen2.5-coder:14b');
    const defaultWorldModel = process.env.WORLD_MODEL || defaultModel;

    this.config = {
      modelProvider: defaultProvider,
      model: defaultWorldModel, // Legacy alias -> world model
      worldModel: defaultWorldModel,
      coderModel: defaultCoderModel,
      apiKey: process.env.GROQ_API_KEY,
      ollamaHost: process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
      temperature: 0.7,
      maxTokens: 2048,
      // Voice settings
      voiceOutput: true,           // Enable voice output
      reflectAloud: true,          // Speak thoughts aloud
      reflectiveDelay: 200,        // Delay before starting LLM call (ms)
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

    // Voice Mutex: Prevent echo (only ONE voice output per response)
    this.isSpeaking = false;
    this.routerStats = {
      lastRoute: null,
      fallbackCount: 0
    };

    // Initialize active LLM client (env-driven provider)
    this.initializeLLMClient();
  }

  /**
   * Load knowledge base
   */
  async loadKnowledgeBase() {
    return await this.knowledgeManager.loadKnowledgeBase();
  }

  /**
   * Initialize active LLM provider
   */
  initializeLLMClient() {
    if (this.config.modelProvider === 'groq') {
      const initialized = this.initializeGroqClient();
      if (!initialized) {
        console.warn('⚠️ Groq unavailable, falling back to Ollama');
        this.config.modelProvider = 'ollama';
        this.config.worldModel = process.env.WORLD_MODEL || process.env.OLLAMA_MODEL || 'qwen3:14b';
        this.config.coderModel = process.env.CODER_MODEL || process.env.OLLAMA_CODER_MODEL || 'qwen2.5-coder:14b';
        this.config.model = this.config.worldModel;
        this.initializeOllamaClient();
      } else {
        // Warm-standby: initialize fallback provider best-effort
        this.initializeProviderBestEffort('ollama');
      }
      return;
    }

    this.initializeOllamaClient();
    // Warm-standby: initialize fallback provider best-effort
    this.initializeProviderBestEffort('groq');
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
        model: this.config.worldModel,
        worldModel: this.config.worldModel,
        coderModel: this.config.coderModel
      };

      console.log('✅ Groq client initialized');
      this.emit('groq:ready', { model: this.config.worldModel });
      this.emit('llm:ready', { provider: 'groq', worldModel: this.config.worldModel, coderModel: this.config.coderModel });
      return true;
    } catch (error) {
      console.error('❌ Groq initialization failed:', error.message);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Initialize Ollama client
   */
  initializeOllamaClient() {
    this.ollamaClient = {
      host: this.config.ollamaHost,
      model: this.config.worldModel,
      worldModel: this.config.worldModel,
      coderModel: this.config.coderModel
    };
    console.log(`✅ Ollama client initialized (world=${this.ollamaClient.worldModel}, coder=${this.ollamaClient.coderModel})`);
    this.emit('llm:ready', { provider: 'ollama', worldModel: this.config.worldModel, coderModel: this.config.coderModel });
  }

  initializeProviderBestEffort(provider) {
    if (provider === 'groq') {
      if (!this.config.apiKey) {
        console.warn('⚠️ Groq fallback disabled (missing GROQ_API_KEY)');
        return false;
      }
      if (!this.groqClient) {
        return this.initializeGroqClient();
      }
      return true;
    }

    if (provider === 'ollama') {
      if (!this.ollamaClient) {
        this.initializeOllamaClient();
      }
      return true;
    }

    return false;
  }

  ensureProviderReady(provider) {
    if (provider === 'groq') {
      if (!this.groqClient) {
        return this.initializeProviderBestEffort('groq');
      }
      return true;
    }

    if (!this.ollamaClient) {
      return this.initializeProviderBestEffort('ollama');
    }
    return true;
  }

  /**
   * DUAL-CHANNEL OUTPUT: Speak and log simultaneously
   * CRITICAL: Voice Mutex prevents echo (only ONE voice output per response)
   */
  async speakAndLog(text, isThought = false) {
    const prefix = isThought ? '🧠 [Denkvorgang]:' : '🤖 [Antwort]:';
    console.log(`${prefix} ${text}`);

    // MUTEX: Prevent double speaking (echo problem)
    if (this.isSpeaking) {
      if (this.config.debug) {
        console.log('[VOICE] Skipping (already speaking)');
      }
      return;
    }

    // VOICE OUTPUT: Only speak if enabled AND not already speaking
    if (this.config.voiceOutput && this.voice && !isThought) {
      try {
        this.isSpeaking = true;
        await this.voice.speak(text, { backend: undefined });
      } catch (error) {
        console.warn(`[VOICE] Error: ${error.message}`);
      } finally {
        this.isSpeaking = false;
      }
    }
  }

  /**
   * REFLECTIVE THINKING: Show processing status
   * TEXT-ONLY by default (to prevent echo)
   * Can be enabled with reflectAloud:true if needed
   */
  async thoughtReflection(prompt) {
    // Analyze prompt and generate thought
    const thoughts = this._generateThought(prompt);

    // Show thought in console (TEXT ONLY)
    console.log(`🧠 [Denkvorgang]: ${thoughts}`);

    // Optional: Speak the thought ONLY if explicitly enabled AND not in dual-output mode
    if (this.config.reflectAloud && this.voice && !this.isSpeaking) {
      try {
        // Use shorter voice for thinking (doesn't block final response)
        await this.voice.speak(thoughts, { backend: undefined });
      } catch (error) {
        if (this.config.debug) {
          console.warn(`[VOICE] Reflection speak failed: ${error.message}`);
        }
      }
    }

    // Give LLM time to process in parallel
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
   * Generate intelligent response using active LLM provider
   * Enhanced with voice reflection (v2.1)
   */
  async generateResponse(prompt, context = {}) {
    try {
      // A. REFLECTIVE THINKING: Speak thought while LLM processes
      await this.thoughtReflection(prompt);

      // B. BUILD SYSTEM PROMPT
      const systemPrompt = this.buildSystemPrompt(context);

      // C. CALL ACTIVE LLM API
      const response = await this.callActiveLLMAPI(
        systemPrompt,
        prompt,
        this.config.temperature,
        this.config.maxTokens,
        context
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
  async callGroqAPI(systemPrompt, userPrompt, temperature = 0.7, maxTokens = 2048, context = {}) {
    const selectedModel = this.selectModelForPrompt(userPrompt, context);
    const fetch = (await import('node-fetch')).default;

    const payload = {
      model: selectedModel,
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
   * Call Ollama API
   */
  async callOllamaAPI(systemPrompt, userPrompt, temperature = 0.7, maxTokens = 2048, context = {}) {
    const selectedModel = this.selectModelForPrompt(userPrompt, context);
    const response = await ollama.chat({
      host: this.ollamaClient.host,
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      options: {
        temperature,
        num_predict: maxTokens
      }
    });

    if (!response?.message?.content) {
      throw new Error('Ollama response is empty');
    }

    return response.message.content;
  }

  /**
   * Dispatch call to active provider
   */
  async callActiveLLMAPI(systemPrompt, userPrompt, temperature = 0.7, maxTokens = 2048, context = {}) {
    const primaryProvider = this.config.modelProvider === 'groq' ? 'groq' : 'ollama';
    const fallbackProvider = primaryProvider === 'ollama' ? 'groq' : 'ollama';

    try {
      console.log(`🧭 [TAIA Router] Primary=${primaryProvider} | model=${this.selectModelForPrompt(userPrompt, context)}`);
      const primaryResponse = await this.callProvider(
        primaryProvider,
        systemPrompt,
        userPrompt,
        temperature,
        maxTokens,
        context
      );
      this.routerStats.lastRoute = {
        timestamp: new Date().toISOString(),
        primaryProvider,
        fallbackProvider,
        usedProvider: primaryProvider,
        fallbackUsed: false
      };
      this.emit('llm:routed', this.routerStats.lastRoute);
      return primaryResponse;
    } catch (primaryError) {
      console.warn(`🚨 [TAIA Router] Primary provider failed (${primaryProvider}): ${primaryError.message}`);
      if (!this.ensureProviderReady(fallbackProvider)) {
        console.error(`❌ [TAIA Router] Fallback provider not ready (${fallbackProvider})`);
        throw new Error(`System Offline: LLM fallback unavailable (${fallbackProvider}). Primary=${primaryError.message}`);
      }
      console.warn(`🔁 [TAIA Router] Initiating fallback to ${fallbackProvider} (§1 Transparenz)`);
      this.emit('llm:fallback', {
        timestamp: new Date().toISOString(),
        primaryProvider,
        fallbackProvider,
        primaryError: primaryError.message
      });

      try {
        const fallbackResponse = await this.callProvider(
          fallbackProvider,
          systemPrompt,
          userPrompt,
          temperature,
          maxTokens,
          context
        );
        this.routerStats.fallbackCount += 1;
        this.routerStats.lastRoute = {
          timestamp: new Date().toISOString(),
          primaryProvider,
          fallbackProvider,
          usedProvider: fallbackProvider,
          fallbackUsed: true,
          primaryError: primaryError.message
        };
        this.emit('llm:routed', this.routerStats.lastRoute);
        return fallbackResponse;
      } catch (fallbackError) {
        console.error(`❌ [TAIA Router] CRITICAL: both providers failed (${primaryProvider} and ${fallbackProvider})`);
        this.routerStats.lastRoute = {
          timestamp: new Date().toISOString(),
          primaryProvider,
          fallbackProvider,
          usedProvider: null,
          fallbackUsed: true,
          primaryError: primaryError.message,
          fallbackError: fallbackError.message
        };
        this.emit('llm:critical', this.routerStats.lastRoute);
        throw new Error(`System Offline: LLM unreachable. Primary=${primaryError.message}; Fallback=${fallbackError.message}`);
      }
    }
  }

  /**
   * Provider dispatcher
   */
  async callProvider(provider, systemPrompt, userPrompt, temperature, maxTokens, context = {}) {
    if (!this.ensureProviderReady(provider)) {
      throw new Error(`Provider not configured or unavailable: ${provider}`);
    }

    if (provider === 'groq') {
      return this.callGroqAPI(systemPrompt, userPrompt, temperature, maxTokens, context);
    }
    return this.callOllamaAPI(systemPrompt, userPrompt, temperature, maxTokens, context);
  }

  /**
   * Decide whether to use world model or coder model
   */
  selectModelForPrompt(userPrompt = '', context = {}) {
    if (context.forceModel) {
      return context.forceModel;
    }

    if (context.useCoderModel === true || this.isCodingPrompt(userPrompt)) {
      return this.config.coderModel;
    }

    return this.config.worldModel;
  }

  /**
   * Apply runtime LLM selection (provider + models)
   */
  applyLLMSelection(selection = {}) {
    const nextProvider = selection.provider || this.config.modelProvider;
    const nextWorldModel = selection.worldModel || this.config.worldModel;
    const nextCoderModel = selection.coderModel || this.config.coderModel;

    this.config.modelProvider = nextProvider === 'groq' ? 'groq' : 'ollama';
    this.config.worldModel = nextWorldModel;
    this.config.coderModel = nextCoderModel;
    this.config.model = this.config.worldModel; // Keep legacy alias synchronized

    // Reinitialize clients with new routing config.
    this.groqClient = null;
    this.ollamaClient = null;
    this.initializeLLMClient();

    const state = {
      provider: this.config.modelProvider,
      worldModel: this.config.worldModel,
      coderModel: this.config.coderModel
    };
    this.emit('llm:selection', state);
    return state;
  }

  /**
   * Lightweight classifier for coding prompts
   */
  isCodingPrompt(prompt = '') {
    const text = String(prompt || '').toLowerCase();
    if (!text.trim()) return false;

    const markers = [
      'code', 'refactor', 'bug', 'fix', 'debug', 'stacktrace', 'exception',
      'function', 'class', 'api', 'endpoint', 'test', 'unit test', 'integration test',
      'javascript', 'typescript', 'python', 'node', 'json', 'yaml', 'sql',
      'implement', 'patch', 'git diff', 'compile', 'lint'
    ];

    const containsMarker = markers.some((marker) => text.includes(marker));
    const hasCodeFence = text.includes('```');
    const looksLikePath = /[a-z0-9_-]+\.(js|ts|py|json|yaml|yml|sql|md|cjs)/i.test(text);

    return containsMarker || hasCodeFence || looksLikePath;
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
9. Before creating new tools or skills, consult brain/knowledge/ first and follow matching patterns

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
   * NOTAUS: Stop all voice output immediately
   * Kills hanging PowerShell processes (anti-echo)
   */
  async stopVoice() {
    if (this.voice && this.voice.stop) {
      await this.voice.stop();
    }
    this.isSpeaking = false;
    console.log('[VOICE] All voice processes stopped');
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      identity: this.identity,
      status: 'OPERATIONAL',
      config: {
        provider: this.config.modelProvider,
        model: this.config.worldModel,
        worldModel: this.config.worldModel,
        coderModel: this.config.coderModel,
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
      router: {
        fallbackCount: this.routerStats.fallbackCount,
        lastRoute: this.routerStats.lastRoute
      },
      providers: {
        primary: this.config.modelProvider,
        fallback: this.config.modelProvider === 'ollama' ? 'groq' : 'ollama',
        groqConfigured: !!this.config.apiKey,
        groqReady: !!this.groqClient,
        ollamaReady: !!this.ollamaClient
      },
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

    // Verify active provider connection
    try {
      await this.callActiveLLMAPI(
        'You are a helpful assistant',
        'Hello, respond with just "Ready" to confirm connection.',
        0.3,
        10,
        { useCoderModel: false }
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

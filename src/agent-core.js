/**
 * GEM Configuration Manager - Agent Core
 *
 * Intelligent agent system using Groq Llama 3.3 Versatile
 * Based on OpenClaw architecture with Memory & Soul System
 * Enhanced with Knowledge Base Management
 */

const EventEmitter = require('events');
const MarkdownManager = require('./markdown-manager');

class AgentCore extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      modelProvider: 'groq',
      model: 'llama-3.3-70b-versatile',
      apiKey: process.env.GROQ_API_KEY,
      temperature: 0.7,
      maxTokens: 2048,
      ...config
    };

    // Agent Identity
    this.identity = {
      name: 'GEM-Configurator',
      version: '1.0.0',
      description: 'Intelligent GEM Configuration Agent',
      capabilities: [
        'configuration_management',
        'gem_analysis',
        'memory_persistence',
        'multi_channel_communication',
        'intelligent_routing'
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
   * Generate intelligent response using Groq LLM
   */
  async generateResponse(prompt, context = {}) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);

      const response = await this.callGroqAPI(
        systemPrompt,
        prompt,
        this.config.temperature,
        this.config.maxTokens
      );

      // Store in short-term memory
      this.memory.shortTerm.set(
        `response_${Date.now()}`,
        { prompt, response, timestamp: new Date() }
      );

      return response;
    } catch (error) {
      console.error('Response generation failed:', error);
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
CURRENT EXECUTION CONTEXT
═══════════════════════════════════════════════════════════
Timestamp: ${timestamp}
User ID: ${context.userId || 'unknown'}
Session ID: ${context.sessionId || 'default'}
Channel: ${context.channel || 'console'}
Temperature: ${context.temperature || 0.7}
Max Tokens: ${context.maxTokens || 2048}

IMPORTANT REMINDERS:
1. You are GEM-Configurator - always act according to your Soul definition
2. All above documentation is YOUR instruction set
3. Respond in German (Deutsch) always unless explicitly asked otherwise
4. Use your Memory & Soul system for context
5. Reference your Knowledge Base when needed
6. Be precise, helpful, and transparent

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
      const result = await handler(message);
      this.emit('message:routed', { channel: targetChannel, success: true });
      return result;
    } catch (error) {
      this.emit('message:routed', { channel: targetChannel, success: false, error });
      throw error;
    }
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      identity: this.identity,
      groqClient: {
        model: this.groqClient.model,
        status: 'connected'
      },
      sessions: {
        count: this.sessions.size,
        active: Array.from(this.sessions.values())
          .filter(s => (Date.now() - s.lastActivity.getTime()) < 3600000)
          .length
      },
      memory: {
        shortTerm: this.memory.shortTerm.size,
        longTerm: this.memory.longTerm.size,
        semantic: this.memory.semantic.size,
        episodic: this.memory.episodic.size
      },
      channels: {
        registered: Array.from(this.channels.keys()),
        count: this.channels.size
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initialize agent
   */
  async initialize() {
    console.log('🚀 Initializing GEM Configuration Agent...');
    console.log(`Agent: ${this.identity.name} v${this.identity.version}`);

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

module.exports = AgentCore;

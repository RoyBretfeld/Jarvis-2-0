/**
 * Memory & Soul System Manager
 *
 * Implements persistent learning and agent personality
 * Inspired by RB-Protokoll Memory + Soul System concept
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class MemorySoulManager extends EventEmitter {
  constructor(agentCore, config = {}) {
    super();

    this.agent = agentCore;
    this.config = {
      storageBackend: 'filesystem', // 'filesystem', 'sqlite', 'postgresql'
      dataDir: path.join(process.cwd(), '.agent-data'),
      persistenceEnabled: true,
      autosaveInterval: 60000, // 1 minute
      ...config
    };

    // Soul representation
    this.soul = {
      identity: agentCore.identity.name,
      created: new Date().toISOString(),
      version: '1.0.0',
      personality: {
        tone: 'professional_helpful',
        expertise: ['gem_configuration', 'agent_management', 'system_architecture'],
        quirks: []
      },
      growth: {
        conversations: 0,
        learnings: 0,
        updates: 0
      },
      beliefs: {
        core: [
          'Intelligent systems should be transparent and explainable',
          'Persistent memory enables better service',
          'Configuration management is an art and science'
        ],
        learned: []
      }
    };

    // Memory layers
    this.memory = {
      observations: [],
      patterns: new Map(),
      connections: new Map(),
      insights: []
    };

    // Auto-save mechanism
    this.autoSaveTimer = null;
  }

  /**
   * Initialize Memory & Soul System
   */
  async initialize() {
    console.log('🧠 Initializing Memory & Soul System...');

    try {
      // Ensure data directory exists
      await this.ensureDataDirectory();

      // Load existing soul state
      await this.loadSoulState();

      // Load persistent memories
      await this.loadMemories();

      // Setup auto-save
      this.setupAutoSave();

      // Subscribe to agent events for learning
      this.setupLearning();

      console.log('✅ Memory & Soul System Initialized');
      this.emit('memory:ready');
    } catch (error) {
      console.error('❌ Memory initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Ensure data directory exists
   */
  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.config.dataDir, { recursive: true });
      await fs.mkdir(path.join(this.config.dataDir, 'memories'), { recursive: true });
      await fs.mkdir(path.join(this.config.dataDir, 'souls'), { recursive: true });
    } catch (error) {
      console.error('Error creating data directory:', error);
      throw error;
    }
  }

  /**
   * Setup learning from agent events
   */
  setupLearning() {
    this.agent.on('message:added', (data) => {
      this.recordObservation('message', data);
    });

    this.agent.on('session:created', (session) => {
      this.recordObservation('session', { sessionId: session.id });
      this.soul.growth.conversations++;
    });

    this.agent.on('memory:stored', (data) => {
      this.soul.growth.updates++;
    });
  }

  /**
   * Record observations
   */
  recordObservation(type, data) {
    this.memory.observations.push({
      type,
      data,
      timestamp: new Date().toISOString(),
      id: `obs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Analyze patterns
    this.analyzePatterns();
  }

  /**
   * Analyze patterns in observations
   */
  analyzePatterns() {
    // Look for recurring patterns
    const messageObservations = this.memory.observations
      .filter(obs => obs.type === 'message')
      .slice(-100); // Last 100

    if (messageObservations.length > 0) {
      const patterns = {};

      for (const obs of messageObservations) {
        const pattern = `${obs.type}_observed`;
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      }

      // Update memory patterns
      for (const [pattern, count] of Object.entries(patterns)) {
        this.memory.patterns.set(pattern, count);
      }
    }
  }

  /**
   * Record learning/insight
   */
  recordLearning(insight, category = 'general') {
    this.memory.insights.push({
      insight,
      category,
      timestamp: new Date().toISOString(),
      confidence: 0.8
    });

    this.soul.growth.learnings++;
    this.soul.beliefs.learned.push(insight);

    this.emit('learning:recorded', { insight, category });
  }

  /**
   * Make connection between concepts
   */
  makeConnection(concept1, concept2, relationship) {
    const connectionId = `${concept1}_${concept2}`;

    this.memory.connections.set(connectionId, {
      concept1,
      concept2,
      relationship,
      strength: 0.8,
      discovered: new Date().toISOString()
    });

    this.emit('connection:made', { concept1, concept2, relationship });
  }

  /**
   * Save soul state to persistent storage
   */
  async saveSoulState() {
    try {
      const soulFile = path.join(
        this.config.dataDir,
        'souls',
        `soul_${new Date().toISOString().split('T')[0]}.json`
      );

      const soulData = {
        ...this.soul,
        lastUpdated: new Date().toISOString(),
        observations: this.memory.observations.length,
        insights: this.memory.insights.length,
        connections: this.memory.connections.size
      };

      await fs.writeFile(soulFile, JSON.stringify(soulData, null, 2));
      console.log(`💾 Soul state saved: ${soulFile}`);
    } catch (error) {
      console.error('Error saving soul state:', error);
    }
  }

  /**
   * Load soul state from persistent storage
   */
  async loadSoulState() {
    try {
      const soupsDir = path.join(this.config.dataDir, 'souls');
      const files = await fs.readdir(soupsDir).catch(() => []);

      if (files.length === 0) {
        console.log('ℹ️  No previous soul state found. Starting fresh.');
        return;
      }

      // Load most recent soul state
      const latestFile = files.sort().reverse()[0];
      const soulPath = path.join(soupsDir, latestFile);
      const data = await fs.readFile(soulPath, 'utf-8');
      const loaded = JSON.parse(data);

      // Merge with existing soul
      this.soul = {
        ...this.soul,
        growth: loaded.growth || this.soul.growth,
        beliefs: {
          core: this.soul.beliefs.core,
          learned: loaded.beliefs?.learned || []
        }
      };

      console.log(`✅ Soul state loaded from ${latestFile}`);
    } catch (error) {
      console.warn('Warning: Could not load soul state:', error.message);
    }
  }

  /**
   * Save memories to persistent storage
   */
  async saveMemories() {
    try {
      const memoryFile = path.join(this.config.dataDir, 'memories', 'memories.json');

      const memoryData = {
        observations: this.memory.observations,
        insights: this.memory.insights,
        connections: Array.from(this.memory.connections.entries()),
        patterns: Array.from(this.memory.patterns.entries()),
        savedAt: new Date().toISOString()
      };

      await fs.writeFile(memoryFile, JSON.stringify(memoryData, null, 2));
    } catch (error) {
      console.error('Error saving memories:', error);
    }
  }

  /**
   * Load memories from persistent storage
   */
  async loadMemories() {
    try {
      const memoryFile = path.join(this.config.dataDir, 'memories', 'memories.json');

      const data = await fs.readFile(memoryFile, 'utf-8');
      const loaded = JSON.parse(data);

      this.memory.observations = loaded.observations || [];
      this.memory.insights = loaded.insights || [];
      this.memory.patterns = new Map(loaded.patterns || []);
      this.memory.connections = new Map(loaded.connections || []);

      console.log(`✅ Loaded ${this.memory.observations.length} observations`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️  No previous memories found. Starting fresh.');
      } else {
        console.warn('Warning: Could not load memories:', error.message);
      }
    }
  }

  /**
   * Setup automatic saving
   */
  setupAutoSave() {
    this.autoSaveTimer = setInterval(async () => {
      await this.saveMemories();
      await this.saveSoulState();
    }, this.config.autosaveInterval);

    console.log(`✅ Auto-save enabled (${this.config.autosaveInterval / 1000}s interval)`);
  }

  /**
   * Manual save of all state
   */
  async saveState() {
    await Promise.all([
      this.saveMemories(),
      this.saveSoulState()
    ]);
    console.log('✅ All state saved');
  }

  /**
   * Retrieve memory by query
   */
  queryMemory(query) {
    const results = {
      observations: this.memory.observations.filter(obs =>
        obs.type.includes(query) || JSON.stringify(obs.data).includes(query)
      ),
      insights: this.memory.insights.filter(ins =>
        ins.insight.includes(query) || ins.category.includes(query)
      ),
      connections: Array.from(this.memory.connections.values()).filter(conn =>
        conn.concept1.includes(query) || conn.concept2.includes(query) || conn.relationship.includes(query)
      )
    };

    return results;
  }

  /**
   * Get memory summary
   */
  getMemorySummary() {
    return {
      observationCount: this.memory.observations.length,
      insightCount: this.memory.insights.length,
      connectionCount: this.memory.connections.size,
      patternCount: this.memory.patterns.size,
      recentObservations: this.memory.observations.slice(-5),
      topInsights: this.memory.insights.slice(-3)
    };
  }

  /**
   * Get soul status
   */
  getSoulStatus() {
    return {
      identity: this.soul.identity,
      personality: this.soul.personality,
      growth: this.soul.growth,
      beliefCount: this.soul.beliefs.learned.length
    };
  }

  /**
   * Get complete status
   */
  getStatus() {
    return {
      persistence: {
        enabled: this.config.persistenceEnabled,
        backend: this.config.storageBackend,
        dataDir: this.config.dataDir,
        autosaveInterval: this.config.autosaveInterval
      },
      soul: this.getSoulStatus(),
      memory: this.getMemorySummary()
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    await this.saveState();
    console.log('🧠 Memory & Soul System shutdown complete');
  }
}

module.exports = MemorySoulManager;

#!/usr/bin/env node

/**
 * GEM Configuration Manager - Setup Wizard
 *
 * First-time initialization that:
 * 1. Checks if system is new
 * 2. Creates necessary directories
 * 3. Feeds MD documentation to LLM for understanding
 * 4. Validates agent comprehension
 * 5. Initializes persistent storage
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class SetupWizard extends EventEmitter {
  constructor(agentCore, knowledgeManager, options = {}) {
    super();
    this.agentCore = agentCore;
    this.knowledgeManager = knowledgeManager;
    this.dataDir = options.dataDir || path.join(__dirname, '../.agent-data');
    this.setupFile = path.join(this.dataDir, '.setup-complete');
    this.isNewSystem = !fs.existsSync(this.setupFile);
  }

  /**
   * Run setup wizard if needed
   */
  async runIfNeeded() {
    if (!this.isNewSystem) {
      console.log('✓ System already initialized (skipping setup)');
      return true;
    }

    return await this.runSetupWizard();
  }

  /**
   * Execute full setup wizard
   */
  async runSetupWizard() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║      🚀 GEM Configuration Manager     ║');
    console.log('║          FIRST-TIME SETUP WIZARD       ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
      // Step 1: Check environment
      console.log('📋 Step 1: Checking environment...');
      await this.checkEnvironment();
      console.log('   ✅ Environment OK\n');

      // Step 2: Create directories
      console.log('📁 Step 2: Creating data directories...');
      await this.createDirectories();
      console.log('   ✅ Directories created\n');

      // Step 3: Feed MD files to LLM
      console.log('📚 Step 3: Teaching LLM about MD documentation...');
      await this.teachLLMaboutMD();
      console.log('   ✅ MD files loaded into LLM context\n');

      // Step 4: Initialize agent identity
      console.log('🤖 Step 4: Initializing agent identity...');
      await this.initializeAgentIdentity();
      console.log('   ✅ Agent identity initialized\n');

      // Step 5: Create initial memory structure
      console.log('🧠 Step 5: Setting up memory structure...');
      await this.initializeMemoryStructure();
      console.log('   ✅ Memory structure created\n');

      // Step 6: Mark setup complete
      console.log('✨ Step 6: Finalizing setup...');
      await this.markSetupComplete();
      console.log('   ✅ Setup complete\n');

      console.log('╔════════════════════════════════════════╗');
      console.log('║  🎉 Setup Wizard Complete!            ║');
      console.log('║  Agent is ready to serve!             ║');
      console.log('╚════════════════════════════════════════╝\n');

      this.emit('setup:complete');
      return true;

    } catch (error) {
      console.error('\n❌ Setup wizard failed:', error.message);
      this.emit('setup:error', error);
      return false;
    }
  }

  /**
   * Check environment setup
   */
  async checkEnvironment() {
    // Check required env variables
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable not set');
    }

    // Check Node version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    if (majorVersion < 18) {
      throw new Error(`Node.js v18+ required (you have ${nodeVersion})`);
    }

    return true;
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    const dirs = [
      this.dataDir,
      path.join(this.dataDir, 'memory'),
      path.join(this.dataDir, 'soul'),
      path.join(this.dataDir, 'identity'),
      path.join(this.dataDir, 'compressed'),
      path.join(this.dataDir, 'backups'),
      path.join(this.dataDir, 'sessions'),
      path.join(this.dataDir, 'logs')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    return true;
  }

  /**
   * Teach LLM about MD documentation
   */
  async teachLLMaboutMD() {
    const kbContent = this.knowledgeManager.getCompactKnowledgeBase();

    // Get MD file list with descriptions
    const mdFiles = this.knowledgeManager.getStats();

    console.log(`   📖 Loading ${mdFiles.files} documentation files...`);

    // Create initial learning prompt
    const learningPrompt = `Du wirst jetzt mit deiner Dokumentation vertraut gemacht. Dies sind deine Betriebsanweisungen:

${kbContent}

Bestätige, dass du folgende Punkte verstanden hast:
1. Dein Name, Version und Zweck
2. Deine Persönlichkeit und dein Ton
3. Dein Gedächtnis-System (4 Ebenen, 14-Tage-Fenster)
4. Deine Soul (Rollen, Überzeugungen, Weisheiten)
5. Deine Konfigurationsoptionen

Antworte kurz mit: "Verstanden" wenn du alles internalisiert hast.`;

    try {
      const response = await this.agentCore.generateResponse(learningPrompt, {
        sessionId: 'setup-wizard-learning',
        temperature: 0.3
      });

      if (response.toLowerCase().includes('verstanden')) {
        console.log(`   📖 LLM acknowledges: "${response.substring(0, 50)}..."`);
        return true;
      } else {
        console.warn(`   ⚠️  LLM response: "${response.substring(0, 50)}..."`);
        return true; // Continue anyway
      }
    } catch (error) {
      throw new Error(`Failed to teach LLM: ${error.message}`);
    }
  }

  /**
   * Initialize agent identity
   */
  async initializeAgentIdentity() {
    const agentStatus = this.agentCore.getStatus();

    const identity = {
      created: new Date().toISOString(),
      name: agentStatus.identity.name,
      version: agentStatus.identity.version,
      model: agentStatus.groqClient.model,
      language: 'de',
      personality: {
        tone: 'professional',
        helpfulness: 'high',
        transparency: 'always'
      },
      capabilities: [
        'Configuration Management',
        'Memory Persistence',
        'Intelligent Analysis',
        'Documentation Generation',
        'Multi-Channel Communication'
      ],
      status: 'active',
      learningMode: 'enabled'
    };

    const identityFile = path.join(this.dataDir, 'identity', 'agent-identity.json');
    fs.writeFileSync(identityFile, JSON.stringify(identity, null, 2));

    return true;
  }

  /**
   * Initialize memory structure
   */
  async initializeMemoryStructure() {
    const memoryStructure = {
      initialized: new Date().toISOString(),
      windowDays: 14,
      currentDay: new Date().toISOString().split('T')[0],
      sessions: {
        active: [],
        archived: []
      },
      memories: {
        observations: [],
        insights: [],
        connections: []
      },
      stats: {
        totalSessions: 0,
        totalObservations: 0,
        totalInsights: 0
      }
    };

    const memoryFile = path.join(this.dataDir, 'memory', 'memory-index.json');
    fs.writeFileSync(memoryFile, JSON.stringify(memoryStructure, null, 2));

    // Create empty daily rotation file
    const dailyFile = path.join(this.dataDir, 'memory', 'daily-rotation.json');
    const dailyStructure = {
      currentWindow: [],
      lastRotation: new Date().toISOString()
    };
    fs.writeFileSync(dailyFile, JSON.stringify(dailyStructure, null, 2));

    return true;
  }

  /**
   * Mark setup as complete
   */
  async markSetupComplete() {
    const setupData = {
      completedAt: new Date().toISOString(),
      version: '1.0.0',
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    fs.writeFileSync(this.setupFile, JSON.stringify(setupData, null, 2));
    return true;
  }

  /**
   * Get setup status
   */
  getStatus() {
    return {
      isNewSystem: this.isNewSystem,
      setupComplete: fs.existsSync(this.setupFile),
      setupFile: this.setupFile,
      dataDir: this.dataDir
    };
  }

  /**
   * Reset setup (for development)
   */
  async reset() {
    if (fs.existsSync(this.setupFile)) {
      fs.unlinkSync(this.setupFile);
      console.log('Setup reset - system will re-run wizard on next start');
      return true;
    }
    return false;
  }
}

module.exports = SetupWizard;

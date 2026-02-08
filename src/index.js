#!/usr/bin/env node

/**
 * GEM Configuration Manager - Main Entry Point
 *
 * Intelligent agent system combining:
 * - Groq Llama 3.3 Versatile LLM (Agent Brain)
 * - Memory & Soul system for persistence and learning
 * - Web API Server for UI integration
 * - RB-Protokoll guidelines
 */

require('dotenv').config();

const path = require('path');
const AgentCore = require('./agent-core');
const MemorySoulManager = require('./memory-soul-manager');
const APIServer = require('./api-server');
const CompressionManager = require('./compression-manager');
const MDComprehension = require('./md-comprehension');
const SetupWizard = require('./setup-wizard');

class GEMConfigurationAgent {
  constructor() {
    this.agentCore = null;
    this.memorySoul = null;
    this.apiServer = null;
    this.compressionManager = null;
    this.mdComprehension = null;
    this.setupWizard = null;
  }

  /**
   * Initialize the complete system
   */
  async initialize() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  GEM Configuration Manager Agent      ║');
    console.log('║  Powered by Groq Llama 3.3 Versatile ║');
    console.log('║  Memory & Soul System                ║');
    console.log('║  Web Chat Interface                  ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
      // Step 0: Initialize Compression Manager
      console.log('\n📍 Step 0: Initializing Compression Manager...');
      this.compressionManager = new CompressionManager({
        compressionThreshold: process.env.COMPRESSION_THRESHOLD || 1024 * 100, // 100KB
        compressionLevel: parseInt(process.env.COMPRESSION_LEVEL) || 6,
        enableAutoCompress: process.env.AUTO_COMPRESS !== 'false'
      });
      await this.compressionManager.initialize();

      // Step 1: Initialize Agent Core
      console.log('\n📍 Step 1: Initializing Agent Core...');
      this.agentCore = new AgentCore({
        modelProvider: 'groq',
        model: 'llama-3.3-70b-versatile',
        apiKey: process.env.GROQ_API_KEY,
        temperature: 0.7,
        maxTokens: 2048
      });

      await this.agentCore.initialize();

      // Step 1b: Load Knowledge Base
      console.log('\n📍 Step 1b: Loading Knowledge Base...');
      const kbLoaded = await this.agentCore.loadKnowledgeBase();
      if (kbLoaded) {
        const kbStats = this.agentCore.knowledgeManager.getStats();
        console.log(`✅ Knowledge Base loaded: ${kbStats.files} files`);
      }

      // Step 1b-Setup: Run Setup Wizard if needed
      console.log('\n📍 Step 1b-Setup: Checking first-time setup...');
      this.setupWizard = new SetupWizard(this.agentCore, this.agentCore.knowledgeManager, {
        dataDir: process.env.DATA_DIR || path.join(__dirname, '../.agent-data')
      });
      const setupStatus = this.setupWizard.getStatus();
      if (setupStatus.isNewSystem) {
        await this.setupWizard.runSetupWizard();
      } else {
        console.log('✓ System already initialized (skipping setup wizard)');
      }

      // Step 1c: Test MD Comprehension
      console.log('\n📍 Step 1c: Testing MD Comprehension...');
      this.mdComprehension = new MDComprehension(this.agentCore, this.agentCore.knowledgeManager);
      const comprehensionPassed = await this.mdComprehension.initialize();
      if (comprehensionPassed) {
        console.log('✅ Agent fully understands all MD documentation');
      } else {
        console.log('⚠️  Some comprehension tests failed - review knowledge base');
      }

      // Step 2: Initialize Memory & Soul Manager
      console.log('\n📍 Step 2: Initializing Memory & Soul Manager...');
      this.memorySoul = new MemorySoulManager(this.agentCore);
      await this.memorySoul.initialize();

      // Step 3: Initialize Web API Server
      console.log('\n📍 Step 3: Initializing Web API Server...');
      this.apiServer = new APIServer(this.agentCore, {
        port: process.env.API_PORT || 8080,
        host: process.env.API_HOST || 'localhost'
      });
      await this.apiServer.initialize();

      // Setup event listeners
      this.setupEventListeners();

      console.log('\n✅ Complete System Initialization Successful!\n');
      this.printStatus();

      return true;
    } catch (error) {
      console.error('\n❌ System initialization failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Agent events
    this.agentCore.on('groq:ready', (data) => {
      console.log(`✅ Groq API Ready: ${data.model}`);
    });

    this.agentCore.on('agent:ready', () => {
      console.log('✅ Agent Core Ready');
    });

    this.agentCore.on('message:added', ({ sessionId, message }) => {
      console.log(`💬 Message added to ${sessionId}: ${message.role}`);
    });

    // Memory events
    this.memorySoul.on('memory:ready', () => {
      console.log('✅ Memory System Ready');
    });

    // Compression events
    this.compressionManager.on('compression:complete', (result) => {
      console.log(`📦 Compressed: ${path.basename(result.originalPath)} (${result.compressionRatio} reduction)`);
    });

    this.compressionManager.on('decompression:complete', (result) => {
      console.log(`📦 Decompressed: ${path.basename(result.outputPath)}`);
    });
  }

  /**
   * Print system status
   */
  printStatus() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║         System Status Report          ║');
    console.log('╚════════════════════════════════════════╝\n');

    const setupStatus = this.setupWizard.getStatus();
    console.log('⚙️  System Setup:');
    console.log(`   Setup Complete: ${setupStatus.setupComplete ? '✅ YES' : '❌ NO'}`);
    console.log(`   Data Directory: ${setupStatus.dataDir}`);

    const agentStatus = this.agentCore.getStatus();
    console.log('\n🤖 Agent Core:');
    console.log(`   Name: ${agentStatus.identity.name}`);
    console.log(`   Version: ${agentStatus.identity.version}`);
    console.log(`   Model: ${agentStatus.groqClient.model}`);
    console.log(`   Language: Deutsch 🇩🇪`);
    console.log(`   Sessions: ${agentStatus.sessions.count}`);

    const memorySoulStatus = this.memorySoul.getStatus();
    console.log('\n🧠 Memory & Soul:');
    console.log(`   Persistence: ${memorySoulStatus.persistence.enabled}`);
    console.log(`   Storage: ${memorySoulStatus.persistence.backend}`);
    console.log(`   Soul Updates: ${memorySoulStatus.soul.updates}`);
    console.log(`   Memory Window: 14 days`);

    const comprehensionStatus = this.mdComprehension.getStatus();
    console.log('\n📚 MD Comprehension:');
    console.log(`   Tests Passed: ${comprehensionStatus.testsSummary.passedTests}/${comprehensionStatus.testsSummary.totalTests}`);
    console.log(`   Success Rate: ${comprehensionStatus.testsSummary.successRate}`);
    console.log(`   All Tests Passed: ${comprehensionStatus.allTestsPassed ? '✅ YES' : '❌ NO'}`);

    const compressionStatus = this.compressionManager.getStatus();
    console.log('\n📦 Compression Manager:');
    console.log(`   Enabled: ${compressionStatus.compression.autoCompress}`);
    console.log(`   Threshold: ${(compressionStatus.compression.threshold / 1024).toFixed(0)} KB`);
    console.log(`   Compression Level: ${compressionStatus.compression.level}/9`);
    console.log(`   Files Compressed: ${compressionStatus.metrics.filesCompressed}`);
    console.log(`   Bytes Saved: ${(compressionStatus.metrics.bytesSaved / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n💻 Web API Server:');
    console.log(`   Access: http://localhost:${process.env.API_PORT || 8080}`);
    console.log(`   Chat UI: http://localhost:${process.env.API_PORT || 8080}/chat.html`);
    console.log(`   Dashboard: http://localhost:${process.env.API_PORT || 8080}/dashboard.html`);
    console.log(`   Knowledge Base: http://localhost:${process.env.API_PORT || 8080}/knowledge-base-viewer.html`);

    console.log('\n' + '='.repeat(40));
    console.log('✅ System Ready for Interaction!\n');
  }

  /**
   * Send message to agent
   */
  async processUserMessage(message, context = {}) {
    try {
      const response = await this.agentCore.generateResponse(message, context);
      return {
        success: true,
        response,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      agent: this.agentCore.getStatus(),
      memory: this.memorySoul.getStatus(),
      comprehension: this.mdComprehension.getStatus(),
      compression: this.compressionManager.getStatus(),
      api: {
        url: `http://localhost:${process.env.API_PORT || 8080}`,
        endpoints: ['/api/chat', '/api/agent/status', '/api/agent/info', '/api/health']
      },
      environment: {
        groq_api_key: process.env.GROQ_API_KEY ? '***configured***' : 'NOT SET',
        node_version: process.version,
        platform: process.platform
      }
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('\n🛑 Shutting down system gracefully...');

    try {
      // Stop API Server
      if (this.apiServer) {
        await this.apiServer.stop();
      }

      // Save memory state
      if (this.memorySoul) {
        await this.memorySoul.saveState();
      }

      console.log('✅ System shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const system = new GEMConfigurationAgent();

  // Setup graceful shutdown
  process.on('SIGINT', () => system.shutdown());
  process.on('SIGTERM', () => system.shutdown());

  // Initialize system
  await system.initialize();

  // Export for use as module
  module.exports = system;

  // CLI Interface (if running directly)
  if (require.main === module) {
    // Keep process alive
    console.log('\n🎯 System running. Press Ctrl+C to exit.\n');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

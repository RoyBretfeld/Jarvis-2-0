#!/usr/bin/env node
/**
 * TAIA Brain Diagnostic v1.0
 * Isolierter Test der Groq-Integration + Identity-Check
 *
 * Purpose: Verifiziere dass TAIA:
 * 1. API-Key korrekt aus .env liest
 * 2. Antwort von Llama 3.3 bekommt
 * 3. TAIA-Identität beibehält (kein Halluzinieren)
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

loadEnv();

// Import CommonJS AgentCore using createRequire
const AgentCore = require('./agent-core.cjs');

class BrainDiagnostic {
  constructor(AgentCoreClass) {
    this.AgentCore = AgentCoreClass;
    this.results = [];
    this.startTime = Date.now();
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const icons = {
      info: 'ℹ️ ',
      success: '✅',
      warning: '⚠️ ',
      error: '❌'
    };

    const prefix = icons[level] || '→ ';
    console.log(`${prefix} [${timestamp}] ${message}`);

    if (data) {
      console.log(`   ${JSON.stringify(data, null, 2)}`);
    }

    this.results.push({ level, message, data, timestamp });
  }

  async checkEnvironment() {
    this.log('info', '═══════════════════════════════════════════════');
    this.log('info', '🧠 TAIA BRAIN DIAGNOSTIC v1.0');
    this.log('info', '═══════════════════════════════════════════════');
    this.log('info', '');

    // Check 1: .env file exists
    this.log('info', 'Check 1: Environment Configuration');
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      this.log('error', '.env file not found. Create with GROQ_API_KEY=...');
      return false;
    }
    this.log('success', '.env file found');

    // Check 2: GROQ_API_KEY is set
    if (!process.env.GROQ_API_KEY) {
      this.log('error', 'GROQ_API_KEY not set in environment');
      return false;
    }

    const keyPreview = process.env.GROQ_API_KEY.substring(0, 10) + '...';
    this.log('success', `GROQ_API_KEY configured: ${keyPreview}`);

    return true;
  }

  async initializeAgent() {
    this.log('info', '');
    this.log('info', 'Check 2: Agent Initialization');

    try {
      this.taia = new this.AgentCore({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5  // Lower temp for identity stability
      });

      this.log('success', 'AgentCore instantiated');

      // Check identity
      this.log('success', `Agent Name: ${this.taia.identity.name}`);
      this.log('success', `Agent Version: ${this.taia.identity.version}`);
      this.log('success', `Capabilities: ${this.taia.identity.capabilities.length}`);

      return true;
    } catch (error) {
      this.log('error', `Initialization failed: ${error.message}`);
      return false;
    }
  }

  async testIdentity() {
    this.log('info', '');
    this.log('info', 'Check 3: Identity & Response Test');
    this.log('info', 'Sending test prompt to Groq...');

    try {
      const testPrompt = 'Du bist TAIA. Antworte kurz (max 2 Sätze): Wer bist du und was ist deine Hauptaufgabe?';

      const response = await this.taia.generateResponse(testPrompt, {
        userId: 'diagnostic',
        sessionId: 'test-brain',
        channel: 'diagnostic'
      });

      this.log('success', 'Response received from Groq');

      // Analyze response
      console.log('\n--- TAIA RESPONSE ---');
      console.log(response);
      console.log('---------------------\n');

      // Check 3a: Identity preservation
      const identityKeywords = ['taia', 'TAIA', 'agent', 'Agent'];
      const hasIdentity = identityKeywords.some(keyword =>
        response.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasIdentity) {
        this.log('success', 'Identity preserved in response');
      } else {
        this.log('warning', 'Identity keywords not detected - check response above');
      }

      // Check 3b: Response length
      const wordCount = response.split(/\s+/).length;
      this.log('success', `Response length: ${wordCount} words`);

      // Check 3c: Language detection (should be German)
      const germanKeywords = ['bin', 'bin ich', 'meine', 'aufgabe', 'ist', 'helfe'];
      const hasGerman = germanKeywords.some(keyword =>
        response.toLowerCase().includes(keyword)
      );

      if (hasGerman) {
        this.log('success', 'Response is in German (as expected)');
      } else {
        this.log('warning', 'Could not detect German keywords');
      }

      return true;
    } catch (error) {
      this.log('error', `Test failed: ${error.message}`);
      if (error.message.includes('API Error')) {
        this.log('error', 'Groq API call failed - check your API key');
      }
      return false;
    }
  }

  async testMemory() {
    this.log('info', '');
    this.log('info', 'Check 4: Memory System');

    try {
      // Check short-term memory
      const shortTermSize = this.taia.memory.shortTerm.size;
      this.log('success', `Short-term memory entries: ${shortTermSize}`);

      // Check memory structure
      const memoryTypes = Object.keys(this.taia.memory);
      this.log('success', `Memory types available: ${memoryTypes.join(', ')}`);

      return true;
    } catch (error) {
      this.log('error', `Memory check failed: ${error.message}`);
      return false;
    }
  }

  async testSenses() {
    this.log('info', '');
    this.log('info', 'Check 5: Senses (Voice I/O) Setup');

    // Check if senses directory exists
    const sensesDir = path.join(process.cwd(), 'src/senses');
    if (fs.existsSync(sensesDir)) {
      const senseFiles = fs.readdirSync(sensesDir);
      this.log('success', `Senses directory found with ${senseFiles.length} components`);
      this.log('info', `Available senses: ${senseFiles.join(', ')}`);
    } else {
      this.log('warning', 'Senses directory not found - will be created in next phase');
    }

    return true;
  }

  async generateReport() {
    const elapsed = (Date.now() - this.startTime) / 1000;

    this.log('info', '');
    this.log('info', '═══════════════════════════════════════════════');
    this.log('info', '📊 DIAGNOSTIC REPORT');
    this.log('info', '═══════════════════════════════════════════════');

    const successCount = this.results.filter(r => r.level === 'success').length;
    const errorCount = this.results.filter(r => r.level === 'error').length;
    const warningCount = this.results.filter(r => r.level === 'warning').length;

    console.log(`
Summary:
  ✅ Successes: ${successCount}
  ⚠️  Warnings: ${warningCount}
  ❌ Errors: ${errorCount}
  ⏱️  Duration: ${elapsed.toFixed(2)}s

Status: ${errorCount === 0 ? '🟢 OPERATIONAL' : '🔴 FAILED'}
`);

    // Save report
    const reportPath = path.join(process.cwd(), 'brain', 'BRAIN_DIAGNOSTIC.md');
    const reportContent = this.generateMarkdownReport();

    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, reportContent, 'utf8');
    this.log('success', `Report saved to: brain/BRAIN_DIAGNOSTIC.md`);

    return errorCount === 0;
  }

  generateMarkdownReport() {
    const timestamp = new Date().toISOString();
    let report = `# TAIA Brain Diagnostic Report\n\n`;
    report += `**Generated:** ${timestamp}\n`;
    report += `**Duration:** ${(Date.now() - this.startTime) / 1000}s\n\n`;

    report += `## Checklist\n\n`;

    for (const result of this.results) {
      const icon = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      }[result.level] || '→';

      report += `- ${icon} ${result.message}\n`;
    }

    report += `\n## Details\n\n`;

    const successResults = this.results.filter(r => r.level === 'success');
    report += `### ✅ Passed Checks (${successResults.length})\n`;
    for (const result of successResults) {
      report += `- ${result.message}\n`;
    }

    const errorResults = this.results.filter(r => r.level === 'error');
    if (errorResults.length > 0) {
      report += `\n### ❌ Failed Checks (${errorResults.length})\n`;
      for (const result of errorResults) {
        report += `- ${result.message}\n`;
      }
    }

    return report;
  }

  async run() {
    try {
      // Run all checks
      const envOk = await this.checkEnvironment();
      if (!envOk) return false;

      const initOk = await this.initializeAgent();
      if (!initOk) return false;

      const identityOk = await this.testIdentity();
      await this.testMemory();
      await this.testSenses();

      const reportOk = await this.generateReport();

      return identityOk && reportOk;
    } catch (error) {
      this.log('error', `Diagnostic failed: ${error.message}`);
      console.error(error);
      return false;
    }
  }
}

// Run diagnostic (async wrapper)
(async () => {
  try {
    const diagnostic = new BrainDiagnostic(AgentCore);
    const success = await diagnostic.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
})();

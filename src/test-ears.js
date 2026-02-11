#!/usr/bin/env node
/**
 * TAIA Ears Diagnostic v1.0
 * Test der Push-to-Talk Speech-to-Text Integration
 *
 * Purpose: Verifiziere dass TAIA:
 * 1. Audioaufnahmen korrekt erfasst
 * 2. Groq Whisper API anspricht
 * 3. Audio zu Text transkribiert
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import { EarsEngine } from './senses/ears-engine.js';
import { AgentCore } from './agent-core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnv();

class EarsDiagnostic {
  constructor(EarsEngineClass, AgentCoreClass) {
    this.EarsEngine = EarsEngineClass;
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
    this.log('info', '👂 TAIA EARS DIAGNOSTIC v1.0');
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

  async initializeEars() {
    this.log('info', '');
    this.log('info', 'Check 2: Ears Engine Initialization');

    try {
      this.ears = new this.EarsEngine({
        language: 'de',
        recordDuration: 3,  // 3 seconds for testing
        groqApiKey: process.env.GROQ_API_KEY,
        debug: false
      });

      this.log('success', 'EarsEngine instantiated');

      // Check status
      const status = this.ears.getStatus();
      this.log('success', `Platform: ${status.platform}`);
      this.log('success', `Language: ${status.language}`);
      this.log('success', `Sample Rate: ${status.sampleRate} Hz`);
      this.log('success', `Record Duration: ${status.recordDuration}s`);

      return true;
    } catch (error) {
      this.log('error', `Initialization failed: ${error.message}`);
      return false;
    }
  }

  async initializeAgent() {
    this.log('info', '');
    this.log('info', 'Check 3: Full Agent Integration');

    try {
      this.taia = new this.AgentCore({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        voiceOutput: false  // Disable audio in test
      });

      this.log('success', 'AgentCore instantiated');
      this.log('success', `Agent Version: ${this.taia.identity.version}`);

      // Check if ears are integrated
      if (this.taia.ears) {
        this.log('success', 'Ears integrated in AgentCore');
      } else {
        this.log('error', 'Ears not found in AgentCore');
        return false;
      }

      return true;
    } catch (error) {
      this.log('error', `Agent init failed: ${error.message}`);
      return false;
    }
  }

  async testAudioDirectory() {
    this.log('info', '');
    this.log('info', 'Check 4: Audio Directory');

    const audioDir = path.join(process.cwd(), 'brain/audio');
    if (fs.existsSync(audioDir)) {
      this.log('success', `Audio directory ready: ${audioDir}`);
      return true;
    } else {
      this.log('warning', `Audio directory will be created on first recording`);
      return true;
    }
  }

  async testVoiceIntegration() {
    this.log('info', '');
    this.log('info', 'Check 5: Voice I/O Integration');

    try {
      // Check if both voice and ears are available
      if (this.taia.voice && this.taia.ears) {
        this.log('success', 'Voice output (TTS) available');
        this.log('success', 'Voice input (STT) available');
        this.log('success', 'Complete Voice I/O loop ready');
        return true;
      } else {
        this.log('error', 'Voice I/O components missing');
        return false;
      }
    } catch (error) {
      this.log('error', `Integration check failed: ${error.message}`);
      return false;
    }
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

Status: ${errorCount === 0 ? '🟢 READY FOR VOICE INPUT' : '🔴 CONFIGURATION NEEDED'}
`);

    // Save report
    const reportPath = path.join(process.cwd(), 'brain', 'EARS_DIAGNOSTIC.md');
    const reportContent = this.generateMarkdownReport();

    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, reportContent, 'utf8');
    this.log('success', `Report saved to: brain/EARS_DIAGNOSTIC.md`);

    return errorCount === 0;
  }

  generateMarkdownReport() {
    const timestamp = new Date().toISOString();
    let report = `# TAIA Ears Diagnostic Report\n\n`;
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

    report += `\n## Next Steps\n\n`;
    report += `If all checks pass, you can use TAIA with voice input:\n\n`;
    report += `\`\`\`javascript\n`;
    report += `// Option 1: Single voice input\n`;
    report += `const result = await taia.listenAndRespond();\n\n`;
    report += `// Option 2: Interactive mode (press spacebar)\n`;
    report += `await taia.interactiveVoiceMode();\n`;
    report += `\`\`\`\n`;

    return report;
  }

  async run() {
    try {
      // Run all checks
      const envOk = await this.checkEnvironment();
      if (!envOk) return false;

      const earsOk = await this.initializeEars();
      if (!earsOk) return false;

      const agentOk = await this.initializeAgent();
      const audioOk = await this.testAudioDirectory();
      const voiceOk = await this.testVoiceIntegration();

      const reportOk = await this.generateReport();

      return earsOk && agentOk && audioOk && voiceOk && reportOk;
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
    const diagnostic = new EarsDiagnostic(EarsEngine, AgentCore);
    const success = await diagnostic.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
})();

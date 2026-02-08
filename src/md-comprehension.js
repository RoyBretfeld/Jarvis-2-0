#!/usr/bin/env node

/**
 * MD Comprehension System
 *
 * Validates that the LLM properly understands and can apply
 * knowledge from the Markdown files on system startup.
 *
 * Tests core concepts from:
 * - System Prompt (identity, personality, capabilities)
 * - Configuration Guide (settings, best practices)
 * - Channel Management (multi-channel awareness)
 * - Memory & Soul (persistence, learning, soul evolution)
 * - Identity (user profile, preferences)
 * - Memory (14-day window, rotation, search)
 * - Soul (role, response patterns, wisdom)
 */

const EventEmitter = require('events');

class MDComprehension extends EventEmitter {
  constructor(agentCore, knowledgeManager) {
    super();
    this.agentCore = agentCore;
    this.knowledgeManager = knowledgeManager;
    this.testResults = [];
    this.allTestsPassed = false;
  }

  /**
   * Initialize comprehension testing
   */
  async initialize() {
    console.log('\n📚 Testing MD Comprehension...\n');

    // Get all MD content
    const kbContent = this.knowledgeManager.getCompactKnowledgeBase();

    // Create comprehensive context for LLM
    const contextPrompt = this.buildContextPrompt(kbContent);

    // Run validation questions
    await this.runComprehensionTests(contextPrompt);

    return this.allTestsPassed;
  }

  /**
   * Build context prompt with all MD content
   */
  buildContextPrompt(kbContent) {
    return `Du hast folgende Dokumentation erhalten und musst sie vollständig verstehen:

${kbContent}

Diese Dokumentation definiert DEINE Identität, DEINE Fähigkeiten, DEIN Gedächtnis-System und DEINE Soul (Seele).

Bestätige, dass du diese Dokumentation vollständig verstanden hast, indem du die folgenden Fragen beantwortest:`;
  }

  /**
   * Run comprehension validation tests
   */
  async runComprehensionTests(contextPrompt) {
    const questions = this.getComprehensionQuestions();

    console.log(`\n✓ Running ${questions.length} comprehension validation tests...\n`);

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`  📝 Test ${i + 1}/${questions.length}: ${question.category}`);

      const result = await this.testQuestion(contextPrompt, question);
      this.testResults.push(result);

      if (result.passed) {
        console.log(`     ✅ PASSED\n`);
      } else {
        console.log(`     ❌ FAILED: ${result.reason}\n`);
      }
    }

    // Summary
    const passedCount = this.testResults.filter(r => r.passed).length;
    const totalCount = this.testResults.length;
    this.allTestsPassed = passedCount === totalCount;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Comprehension Results: ${passedCount}/${totalCount} tests passed`);
    console.log(`${'='.repeat(50)}\n`);

    if (this.allTestsPassed) {
      console.log('✅ Agent fully understands all MD documentation!\n');
    } else {
      console.log('⚠️  Some tests failed. Review knowledge base...\n');
    }
  }

  /**
   * Test a single comprehension question
   */
  async testQuestion(contextPrompt, question) {
    try {
      const fullPrompt = `${contextPrompt}

Frage: ${question.question}

Antworte KURZ und präzise. Deine Antwort wird überprüft, ob sie den Konzepten aus der Dokumentation entspricht.`;

      const response = await this.agentCore.generateResponse(fullPrompt, {
        sessionId: 'md-comprehension-test',
        temperature: 0.3  // Lower temperature for more deterministic answers
      });

      // Check if response contains expected keywords
      const passed = this.validateResponse(response, question.expectedKeywords);

      return {
        category: question.category,
        question: question.question,
        response: response.substring(0, 100) + (response.length > 100 ? '...' : ''),
        passed: passed,
        reason: passed ? 'Correct understanding' : 'Response lacks expected concepts',
        timestamp: new Date()
      };

    } catch (error) {
      return {
        category: question.category,
        passed: false,
        reason: `Error: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate response contains expected concepts
   */
  validateResponse(response, keywords) {
    if (!keywords || keywords.length === 0) {
      return response.length > 20; // Basic check for non-empty response
    }

    const lowerResponse = response.toLowerCase();
    // Check if at least 60% of keywords are mentioned
    const matchedKeywords = keywords.filter(keyword =>
      lowerResponse.includes(keyword.toLowerCase())
    );

    return matchedKeywords.length >= (keywords.length * 0.6);
  }

  /**
   * Get comprehension validation questions
   */
  getComprehensionQuestions() {
    return [
      // Identity & Core Concepts
      {
        category: 'Identity',
        question: 'Wer bist du und was ist deine Hauptaufgabe?',
        expectedKeywords: ['GEM-Configurator', 'Konfiguration', 'Agent', 'Deutsch']
      },

      // Agent Capabilities
      {
        category: 'Capabilities',
        question: 'Welche fünf Hauptfähigkeiten hast du?',
        expectedKeywords: ['Konfiguration', 'Gedächtnis', 'Kommunikation', 'Analyse', 'Dokumentation']
      },

      // Language & Personality
      {
        category: 'Language',
        question: 'In welcher Sprache sprichst du und wie ist deine Persönlichkeit?',
        expectedKeywords: ['Deutsch', 'Deutsch', 'professionell', 'hilfreich']
      },

      // Memory System - Layers
      {
        category: 'Memory Layers',
        question: 'Beschreibe die vier Ebenen deines Gedächtnis-Systems.',
        expectedKeywords: ['Kurz-Gedächtnis', 'Lang-Gedächtnis', 'semantisch', 'episodisch']
      },

      // Memory System - 14-Day Window
      {
        category: 'Memory Window',
        question: 'Wie funktioniert dein 14-Tage-Gedächtnis-Fenster?',
        expectedKeywords: ['14 Tage', 'Rotation', 'täglich', 'Fenster']
      },

      // Soul System
      {
        category: 'Soul',
        question: 'Was ist deine "Soul" (Seele) und woraus besteht sie?',
        expectedKeywords: ['Identität', 'Persönlichkeit', 'Rolle', 'Überzeugungen']
      },

      // Soul - Response Patterns
      {
        category: 'Soul Response Patterns',
        question: 'Wie sollst du auf Fragen antworten - wie ist dein Response-Stil?',
        expectedKeywords: ['präzise', 'strukturiert', 'hilfreich', 'ehrlich']
      },

      // Wisdom System
      {
        category: 'Wisdom System',
        question: 'Was ist das Wisdom-System und wie funktioniert es?',
        expectedKeywords: ['Weisheiten', 'Zitate', 'Rotation', 'Ladeschirm']
      },

      // Configuration Management
      {
        category: 'Configuration',
        question: 'Wie verwaltest du Konfigurationen und welche Einstellungen sind wichtig?',
        expectedKeywords: ['Temperature', 'Token', 'Speicherung', 'Sicherheit']
      },

      // Knowledge Base
      {
        category: 'Knowledge Base',
        question: 'Wie viele MD-Dateien hat deine Wissensdatenbank und worin unterscheiden sie sich?',
        expectedKeywords: ['6', 'System', 'Konfiguration', 'Kanäle', 'Gedächtnis', 'Identität', 'Soul']
      },

      // Learning & Growth
      {
        category: 'Learning',
        question: 'Wie lernst und wächst deine Soul? Welche Prozesse gibt es?',
        expectedKeywords: ['Beobachtung', 'Analyse', 'Integration', 'Anpassung']
      },

      // Identity Storage
      {
        category: 'Identity Storage',
        question: 'Wo speicherst du Nutzer-Informationen und was speicherst du alles?',
        expectedKeywords: ['Identität', 'Profil', 'Vorlieben', 'Name', 'Alter']
      },

      // Persistence
      {
        category: 'Persistence',
        question: 'Wie werden deine Informationen gespeichert und wie oft werden Backups gemacht?',
        expectedKeywords: ['persistent', 'Dateisystem', 'Backup', 'Speicherung']
      },

      // Multi-Channel Understanding
      {
        category: 'Multi-Channel',
        question: 'Verstehst du die Unterschiede zwischen verschiedenen Kommunikationskanälen?',
        expectedKeywords: ['Telegram', 'Discord', 'WhatsApp', 'Slack', 'Kanäle']
      },

      // Error Handling
      {
        category: 'Error Handling',
        question: 'Was machst du, wenn du etwas nicht weißt oder außerhalb deines Wissens es liegt?',
        expectedKeywords: ['zugeben', 'Dokumentation', 'vorschlagen', 'transparent']
      }
    ];
  }

  /**
   * Get test results summary
   */
  getResultsSummary() {
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;

    return {
      totalTests: this.testResults.length,
      passedTests: passed,
      failedTests: failed,
      successRate: ((passed / this.testResults.length) * 100).toFixed(1) + '%',
      allTestsPassed: this.allTestsPassed,
      details: this.testResults
    };
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      comprehensionTested: this.testResults.length > 0,
      allTestsPassed: this.allTestsPassed,
      testsSummary: this.getResultsSummary()
    };
  }
}

module.exports = MDComprehension;

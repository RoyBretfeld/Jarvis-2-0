/**
 * Markdown Manager - Knowledge Base System
 *
 * Loads and manages MD files as knowledge base
 * Integrates with Agent for context-aware responses
 */

const fs = require('fs');
const path = require('path');

class MarkdownManager {
  constructor(knowledgeBaseDir = null) {
    this.knowledgeBaseDir = knowledgeBaseDir || path.join(process.cwd(), 'knowledge-base');
    this.knowledgeBase = new Map();
    this.metadata = {
      loaded: false,
      files: 0,
      totalSize: 0,
      lastUpdated: null
    };
  }

  /**
   * Load all markdown files from knowledge base directory
   */
  async loadKnowledgeBase() {
    console.log('📚 Loading Knowledge Base...');

    try {
      // Ensure directory exists
      if (!fs.existsSync(this.knowledgeBaseDir)) {
        console.warn(`⚠️  Knowledge base directory not found: ${this.knowledgeBaseDir}`);
        return false;
      }

      const files = fs.readdirSync(this.knowledgeBaseDir)
        .filter(file => file.endsWith('.md'))
        .sort();

      console.log(`📋 Found ${files.length} knowledge base files`);

      // Load each markdown file
      for (const file of files) {
        const filePath = path.join(this.knowledgeBaseDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const key = file.replace('.md', '');

          this.knowledgeBase.set(key, {
            file,
            content,
            size: content.length,
            loaded: new Date()
          });

          this.metadata.totalSize += content.length;
          console.log(`  ✅ ${file} (${(content.length / 1024).toFixed(1)} KB)`);
        } catch (error) {
          console.error(`  ❌ Failed to load ${file}: ${error.message}`);
        }
      }

      this.metadata.files = this.knowledgeBase.size;
      this.metadata.loaded = true;
      this.metadata.lastUpdated = new Date();

      console.log(`✅ Knowledge Base loaded: ${this.metadata.files} files, ${(this.metadata.totalSize / 1024).toFixed(1)} KB total\n`);
      return true;
    } catch (error) {
      console.error('❌ Error loading knowledge base:', error.message);
      return false;
    }
  }

  /**
   * Get system prompt with knowledge base context
   */
  getSystemPrompt() {
    if (!this.knowledgeBase.has('00_SYSTEM_PROMPT')) {
      return this.getDefaultSystemPrompt();
    }

    const systemPromptFile = this.knowledgeBase.get('00_SYSTEM_PROMPT');
    return systemPromptFile.content;
  }

  /**
   * Get enhanced context for agent
   */
  getEnhancedContext() {
    const context = {
      systemPrompt: this.getSystemPrompt(),
      knowledge: this.getCompactKnowledgeBase(),
      files: Array.from(this.knowledgeBase.keys()),
      metadata: this.metadata
    };

    return context;
  }

  /**
   * Get compact knowledge base (concatenated content)
   */
  getCompactKnowledgeBase() {
    const sections = [];

    // Add system prompt first
    if (this.knowledgeBase.has('00_SYSTEM_PROMPT')) {
      sections.push('\n## SYSTEM GUIDELINES\n');
      sections.push(this.knowledgeBase.get('00_SYSTEM_PROMPT').content);
    }

    // Add other knowledge files
    for (const [key, data] of this.knowledgeBase) {
      if (key !== '00_SYSTEM_PROMPT') {
        sections.push(`\n\n## ${key.toUpperCase()}\n`);
        sections.push(data.content);
      }
    }

    return sections.join('\n');
  }

  /**
   * Get specific knowledge file
   */
  getKnowledge(key) {
    const data = this.knowledgeBase.get(key);
    return data ? data.content : null;
  }

  /**
   * Search knowledge base
   */
  searchKnowledge(query) {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const [key, data] of this.knowledgeBase) {
      const matches = [];
      const lines = data.content.split('\n');

      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(queryLower)) {
          matches.push({ lineNum: idx + 1, line });
        }
      });

      if (matches.length > 0) {
        results.push({
          file: key,
          matches: matches.slice(0, 5) // Limit to 5 matches per file
        });
      }
    }

    return results;
  }

  /**
   * Get knowledge base statistics
   */
  getStats() {
    const stats = {
      loaded: this.metadata.loaded,
      files: this.metadata.files,
      totalSize: `${(this.metadata.totalSize / 1024).toFixed(1)} KB`,
      avgFileSize: `${(this.metadata.totalSize / Math.max(this.metadata.files, 1) / 1024).toFixed(1)} KB`,
      lastUpdated: this.metadata.lastUpdated,
      files: Array.from(this.knowledgeBase.keys()).map(key => ({
        name: key,
        size: `${(this.knowledgeBase.get(key).size / 1024).toFixed(1)} KB`
      }))
    };

    return stats;
  }

  /**
   * Default system prompt if no KB file
   */
  getDefaultSystemPrompt() {
    return `You are GEM-Configurator, an intelligent agent designed to manage GEM configurations with advanced memory and learning capabilities.

Key traits:
- Professional and helpful tone
- Clear, structured responses using markdown
- Accurate and reliable information
- Honest about limitations

You have access to a comprehensive knowledge base with documentation on:
- System configuration
- Channel management
- Memory and learning systems
- Best practices

When responding:
1. Be accurate - use documented information
2. Be clear - structure with headings and bullets
3. Be helpful - provide actionable steps
4. Be honest - admit limitations
5. Be consistent - reference the same concepts uniformly`;
  }

  /**
   * Reload knowledge base
   */
  async reload() {
    console.log('🔄 Reloading Knowledge Base...');
    this.knowledgeBase.clear();
    this.metadata = {
      loaded: false,
      files: 0,
      totalSize: 0,
      lastUpdated: null
    };
    return await this.loadKnowledgeBase();
  }
}

module.exports = MarkdownManager;

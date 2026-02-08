#!/usr/bin/env node

/**
 * TAIA Agent - Web API Server
 *
 * Provides REST API endpoints for the web UI
 * - Chat interface
 * - Agent status (JARVIS Priority Engine, Sentinel, Senses)
 * - Memory management
 * - Skill execution
 */

const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

class APIServer {
  constructor(agentCore, options = {}) {
    this.agentCore = agentCore;
    this.port = options.port || 8080;
    this.host = options.host || 'localhost';
    this.server = null;
    this.sessions = new Map(); // Store chat sessions
  }

  /**
   * Initialize the API server
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`✅ API Server running at http://${this.host}:${this.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        console.error('❌ API Server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Handle incoming HTTP requests
   */
  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS
    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Routing
    if (pathname === '/api/chat' && method === 'POST') {
      await this.handleChatMessage(req, res);
    } else if (pathname === '/api/agent/status' && method === 'GET') {
      this.handleAgentStatus(res);
    } else if (pathname === '/api/agent/info' && method === 'GET') {
      this.handleAgentInfo(res);
    } else if (pathname === '/api/sessions' && method === 'GET') {
      this.handleListSessions(res);
    } else if (pathname === '/api/compression/status' && method === 'GET') {
      this.handleCompressionStatus(res);
    } else if (pathname === '/api/health' && method === 'GET') {
      this.handleHealth(res);
    } else {
      // Try to serve static files
      this.serveStaticFile(pathname, res);
    }
  }

  /**
   * Handle chat message endpoint
   */
  async handleChatMessage(req, res) {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { message, sessionId, settings } = data;

        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Message is required' }));
          return;
        }

        // Create or get session
        const sid = sessionId || 'default-' + Date.now();
        if (!this.sessions.has(sid)) {
          this.sessions.set(sid, {
            id: sid,
            created: new Date(),
            messages: [],
            settings: settings || {}
          });
        }

        const session = this.sessions.get(sid);

        // Add user message to session
        session.messages.push({
          role: 'user',
          content: message,
          timestamp: new Date()
        });

        // Get response from agent
        const startTime = performance.now();

        try {
          const response = await this.agentCore.generateResponse(
            message,
            {
              sessionId: sid,
              temperature: settings?.temperature || 0.7,
              maxTokens: settings?.maxTokens || 2048
            }
          );

          const endTime = performance.now();
          const responseTime = endTime - startTime;

          // Add agent message to session
          session.messages.push({
            role: 'agent',
            content: response,
            timestamp: new Date()
          });

          // Send response
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            response: response,
            sessionId: sid,
            tokens_used: Math.floor(response.split(' ').length * 1.3),
            response_time: responseTime,
            message_count: session.messages.length
          }));
        } catch (error) {
          console.error('Agent error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: error.message || 'Failed to generate response',
            sessionId: sid
          }));
        }

      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }

  /**
   * Handle agent status endpoint
   */
  handleAgentStatus(res) {
    try {
      const status = this.agentCore.getStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        status: status
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Handle agent info endpoint
   */
  handleAgentInfo(res) {
    try {
      const status = this.agentCore.getStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        agent: {
          name: status.identity?.name || 'TAIA',
          version: status.identity?.version || '1.0.0',
          model: status.groqClient?.model || 'llama-3.3-70b-versatile',
          language: 'Deutsch',
          status: 'Active',
          memory_window: '14 days',
          channels: 5
        }
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Handle list sessions endpoint
   */
  handleListSessions(res) {
    const sessions = Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      created: s.created,
      messageCount: s.messages.length
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      sessions: sessions,
      total: sessions.length
    }));
  }

  /**
   * Handle compression status endpoint
   */
  handleCompressionStatus(res) {
    try {
      // Note: compressionManager would need to be passed to APIServer
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        compression: {
          status: 'active',
          note: 'Compression manager can be integrated via constructor'
        }
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  /**
   * Handle health check
   */
  handleHealth(res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      sessions: this.sessions.size
    }));
  }

  /**
   * Serve static files from public directory
   */
  serveStaticFile(pathname, res) {
    // Default to index.html for root
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    const filePath = path.join(__dirname, '../public', pathname);

    // Security: prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.join(__dirname, '../public'))) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath);
      const contentType = this.getContentType(ext);

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  }

  /**
   * Get content type based on file extension
   */
  getContentType(ext) {
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf'
    };
    return types[ext] || 'application/octet-stream';
  }

  /**
   * Stop the server
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }
}

module.exports = APIServer;

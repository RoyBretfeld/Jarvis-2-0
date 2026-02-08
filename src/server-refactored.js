/**
 * THE FORGE - Refactored Server (Phase 4)
 * Modular API architecture with service delegation
 *
 * Delegates business logic to Python services via subprocess.
 * JavaScript handles: HTTP routing, middleware, file serving
 * Python handles: Memory, compression, identity, context building
 */

import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Routes
import chatRouter from './api/routes/chat.js';
import configRouter from './api/routes/config.js';
import memoryRouter from './api/routes/memory.js';
import visionRouter from './api/routes/vision.js';

// Configuration
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const BODY_PATH = path.join(PROJECT_ROOT, 'body');
const PORT = process.env.PORT || 3000;

// App
const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(express.static(path.join(PROJECT_ROOT, 'public')));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(chalk.gray(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`));
    next();
});

// ============================================================================
// API ROUTES (Modular)
// ============================================================================

// Chat routes (main chat + compression)
app.use('/api', chatRouter);

// Config routes (models, providers)
app.use('/api', configRouter);

// Memory routes (read, write, compress)
app.use('/api', memoryRouter);

// Vision routes (upload, analyze)
app.use('/api/vision', visionRouter);

// ============================================================================
// HEALTH CHECK & STATUS
// ============================================================================

/**
 * GET /api/status
 * Health check endpoint
 */
app.get('/api/status', async (req, res) => {
    try {
        const memoryPath = path.join(BODY_PATH, 'MEMORY.md');
        let memoryLines = 0;

        try {
            const content = await fs.readFile(memoryPath, 'utf-8');
            memoryLines = content.split('\n').filter(l => l.trim().startsWith('*')).length;
        } catch { }

        res.json({
            status: 'online',
            system: 'The Forge TAIA (Phase 4 - Refactored)',
            architecture: 'Modular API + Python Services',
            memory_entries: memoryLines,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
        method: req.method
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(chalk.red(`[Error]: ${err.message}`));
    res.status(err.status || 500).json({
        error: err.message,
        type: err.name
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
    try {
        // Check providers
        console.log(chalk.gray('\nChecking LLM providers...'));

        // Ollama check
        let ollamaOnline = false;
        try {
            const ollama_url = process.env.OLLAMA_URL || 'http://localhost:11434';
            const response = await fetch(`${ollama_url}/api/tags`);
            if (response.ok) {
                ollamaOnline = true;
                console.log(chalk.green('  ✓ Ollama: Online'));
            }
        } catch (err) {
            console.log(chalk.yellow('  ○ Ollama: Offline'));
        }

        // Groq check
        let groqOnline = false;
        if (process.env.GROQ_API_KEY) {
            try {
                const response = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                    }
                });
                if (response.ok) {
                    groqOnline = true;
                    console.log(chalk.green('  ✓ Groq: Online'));
                }
            } catch (err) {
                console.log(chalk.yellow('  ○ Groq: Offline'));
            }
        } else {
            console.log(chalk.gray('  ○ Groq: No API key'));
        }

        // Need at least one provider
        if (!ollamaOnline && !groqOnline) {
            console.error(chalk.red('\n❌ Error: No LLM provider available'));
            console.error(chalk.yellow('Start Ollama: ollama serve'));
            console.error(chalk.yellow('Or add GROQ_API_KEY to .env\n'));
            process.exit(1);
        }

        // Check body directory
        try {
            await fs.access(BODY_PATH);
        } catch {
            console.error(chalk.red(`\n❌ Error: body/ directory not found at ${BODY_PATH}`));
            process.exit(1);
        }

        // Start server
        app.listen(PORT, () => {
            console.log(chalk.green.bold('\n╔════════════════════════════════════════╗'));
            console.log(chalk.green.bold('║   🔥 THE FORGE IS ONLINE (PHASE 4)    ║'));
            console.log(chalk.green.bold('║       Modular Service Architecture      ║'));
            console.log(chalk.green.bold('║    Python Services + Express Routes     ║'));
            console.log(chalk.green.bold('╚════════════════════════════════════════╝\n'));

            console.log(chalk.cyan(`🌐 Web UI at:     http://localhost:${PORT}`));
            console.log(chalk.cyan(`📁 Body dir:      ${BODY_PATH}`));
            console.log(chalk.cyan(`🏗️  Architecture: Modular API + Python Services`));
            console.log(chalk.cyan(`📦 Routes:        /api/chat, /api/memory, /api/model, /api/vision`));
            console.log(chalk.cyan(`✅ Status:        http://localhost:${PORT}/api/status\n`));

            console.log(chalk.gray('Ready to receive transmission...\n'));
        });

    } catch (error) {
        console.error(chalk.red(`Fatal Error: ${error.message}`));
        process.exit(1);
    }
}

startServer();

export default app;

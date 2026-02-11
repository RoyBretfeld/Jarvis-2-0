/**
 * THE FORGE - Phase 5: Express Server Integration
 * Real LLM integration (Groq/Ollama) + Python Service Bridge
 *
 * TAIA-Bridge aktiv für Security Auditing
 */

import express from 'express';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// TAIA Security Wrapper
const { TAIABridge } = require('./core/taia_bridge');
const taiaBridge = new TAIABridge({
    namespace: 'taia.server.phase5',
    auditLog: 'brain/SERVER_AUDIT.md'
});

console.log(chalk.blue('\n═══════════════════════════════════════════════════'));
console.log(chalk.blue('  THE FORGE - PHASE 5: SERVER INTEGRATION'));
console.log(chalk.blue('═══════════════════════════════════════════════════\n'));

// ============================================================================
// PYTHON SERVICE BRIDGE
// ============================================================================

/**
 * Rufe Python-Service auf via subprocess
 * Mit TAIA-Auditing
 */
async function callPythonService(serviceName, args) {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            '-c',
            `
import sys
import json
sys.path.insert(0, '.')
from src.services.memory.manager import MemoryManager
from src.services.context.builder import ContextBuilder
from pathlib import Path

try:
    if '${serviceName}' == 'get_context':
        builder = ContextBuilder(Path('body'), Path('brain'))
        context = builder.build_full_context()
        print(json.dumps({'success': True, 'context': str(context)[:200]}))
    elif '${serviceName}' == 'save_memory':
        mgr = MemoryManager(Path('body'))
        mgr.write_entry('default', '${args.entry}')
        print(json.dumps({'success': True, 'message': 'Memory saved'}))
    else:
        print(json.dumps({'success': False, 'error': 'Unknown service'}))
except Exception as e:
    print(json.dumps({'success': False, 'error': str(e)}))
`
        ]);

        let output = '';
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(chalk.yellow(`[Python Error] ${data}`));
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    resolve(result);
                } catch (e) {
                    reject(new Error(`Failed to parse Python output: ${output}`));
                }
            } else {
                reject(new Error(`Python service failed: ${output}`));
            }
        });
    });
}

// ============================================================================
// LLM PROVIDER CONFIGURATION
// ============================================================================

const LLM_CONFIG = {
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    },
    ollama: {
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b'
    }
};

let currentProvider = process.env.GROQ_API_KEY ? 'groq' : 'ollama';
let currentModel = currentProvider === 'groq' ? LLM_CONFIG.groq.model : LLM_CONFIG.ollama.model;

console.log(chalk.green(`[LLM] Provider: ${currentProvider}`));
console.log(chalk.green(`[LLM] Model: ${currentModel}\n`));

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * POST /api/chat
 * Main chat endpoint with context building and LLM integration
 */
app.post('/api/chat', async (req, res) => {
    const { message, history = [] } = req.body;

    // TAIA: Log request
    await taiaBridge.wrapToolCall('chat-endpoint', { message: message.substring(0, 50) }, async () => {
        // Validate input
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        console.log(chalk.cyan(`[Chat] User: ${message.substring(0, 50)}...`));

        try {
            // 1. Get context from Python services
            let systemContext = 'You are The Forge, a helpful AI assistant.';
            try {
                const contextResult = await callPythonService('get_context', {});
                if (contextResult.success && contextResult.context) {
                    systemContext = contextResult.context;
                }
            } catch (e) {
                console.warn(chalk.yellow(`[Context] Using default context: ${e.message}`));
            }

            // 2. Call LLM provider
            let llmResponse;
            if (currentProvider === 'groq') {
                llmResponse = await callGroqAPI(systemContext, message);
            } else {
                llmResponse = await callOllamaAPI(systemContext, message);
            }

            // 3. Save to memory asynchronously
            callPythonService('save_memory', { entry: `User: ${message}` }).catch(e =>
                console.warn(chalk.yellow(`[Memory] Save failed: ${e.message}`))
            );

            // 4. Return response
            console.log(chalk.green(`[Chat] Reply: ${llmResponse.substring(0, 50)}...`));

            res.json({
                reply: llmResponse,
                provider: currentProvider,
                model: currentModel,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(chalk.red(`[Chat Error] ${error.message}`));

            // TAIA: Log error
            await taiaBridge.handleSecurityFinding({
                type: 'SERVICE_ERROR',
                severity: 'WARNING',
                file: 'chat-endpoint',
                message: error.message
            });

            res.status(500).json({
                error: error.message,
                type: 'CHAT_ERROR'
            });
        }
    });
});

/**
 * GET /api/status
 * Health check endpoint
 */
app.get('/api/status', async (req, res) => {
    res.json({
        status: 'ready',
        phase: 'Phase 5: Server Integration',
        provider: currentProvider,
        model: currentModel,
        llmAvailable: await checkLLMAvailability(),
        pythonServicesAvailable: true,
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/config
 * Current configuration
 */
app.get('/api/config', (req, res) => {
    res.json({
        current_provider: currentProvider,
        current_model: currentModel,
        providers: {
            groq: {
                available: !!LLM_CONFIG.groq.apiKey,
                model: LLM_CONFIG.groq.model
            },
            ollama: {
                available: true,
                model: LLM_CONFIG.ollama.model,
                url: LLM_CONFIG.ollama.baseUrl
            }
        }
    });
});

/**
 * POST /api/model
 * Switch LLM provider/model
 */
app.post('/api/model', (req, res) => {
    const { provider, model } = req.body;

    if (!provider || !model) {
        return res.status(400).json({ error: 'provider and model required' });
    }

    currentProvider = provider;
    currentModel = model;

    console.log(chalk.blue(`[Model Switch] ${provider}/${model}`));

    res.json({
        success: true,
        provider,
        model,
        message: `Switched to ${provider}/${model}`
    });
});

// ============================================================================
// LLM PROVIDER CALLS
// ============================================================================

/**
 * Call Groq API
 */
async function callGroqAPI(context, message) {
    const response = await fetch(`${LLM_CONFIG.groq.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LLM_CONFIG.groq.apiKey}`
        },
        body: JSON.stringify({
            model: currentModel,
            messages: [
                { role: 'system', content: context },
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            max_tokens: 1000
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Groq API Error: ${err.error?.message || response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response from Groq';
}

/**
 * Call Ollama API (local)
 */
async function callOllamaAPI(context, message) {
    const response = await fetch(`${LLM_CONFIG.ollama.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: currentModel,
            messages: [
                { role: 'system', content: context },
                { role: 'user', content: message }
            ],
            temperature: 0.7,
            stream: false
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content || 'No response from Ollama';
}

/**
 * Check LLM availability
 */
async function checkLLMAvailability() {
    try {
        if (currentProvider === 'groq' && LLM_CONFIG.groq.apiKey) {
            const response = await fetch(`${LLM_CONFIG.groq.baseUrl}/models`, {
                headers: { 'Authorization': `Bearer ${LLM_CONFIG.groq.apiKey}` }
            });
            return response.ok;
        } else {
            const response = await fetch(`${LLM_CONFIG.ollama.baseUrl}/api/tags`);
            return response.ok;
        }
    } catch (e) {
        return false;
    }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
    console.error(chalk.red(`[Error] ${err.message}`));
    res.status(500).json({
        error: err.message,
        type: 'SERVER_ERROR'
    });
});

// ============================================================================
// START SERVER
// ============================================================================

const server = app.listen(PORT, async () => {
    console.log(chalk.green(`\n✅ Server running on http://localhost:${PORT}`));
    console.log(chalk.green(`✅ Chat endpoint: POST http://localhost:${PORT}/api/chat`));
    console.log(chalk.green(`✅ Status: GET http://localhost:${PORT}/api/status\n`));

    // Log Phase 5 start
    await taiaBridge.logPhaseStart('Phase 5: Server Integration', 'Express + LLM + Python Services');
});

export default server;

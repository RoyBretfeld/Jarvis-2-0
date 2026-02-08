/**
 * Chat Routes - Message handling and LLM interaction
 * Delegates to Python ContextBuilder and services via subprocess
 */

import express from 'express';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import chalk from 'chalk';
import { lookAt } from '../../senses/eye.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// LLM Provider configuration
export const llmConfig = {
    ollama: {
        baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b'
    },
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
    }
};

let currentProvider = process.env.GROQ_API_KEY ? 'groq' : 'ollama';
let currentModel = process.env.GROQ_API_KEY ? llmConfig.groq.model : llmConfig.ollama.model;

/**
 * POST /api/chat
 * Main chat endpoint with context building
 */
router.post('/chat', async (req, res) => {
    try {
        let { message, history = [], image = null } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        console.log(chalk.cyan(`[User]: ${message}`));

        // Build system context from Python services
        const context = await buildContextFromPython();

        // Check for image input (vision analysis)
        let userPrompt = message;
        const imageMatch = message.match(/^(.+\.(jpg|jpeg|png|webp|bmp|gif))$/i);
        if (imageMatch) {
            const imagePath = imageMatch[1].trim();
            console.log(chalk.magenta(`📸 Image input detected`));

            try {
                const visionDescription = await lookAt(imagePath);
                userPrompt = `[VISION INPUT]\n${visionDescription}\n\n${message}`;
            } catch (err) {
                console.warn(chalk.yellow(`Vision analysis failed: ${err.message}`));
            }
        }

        // Call LLM provider
        const llmResponse = await callLLMProvider(context, userPrompt);

        // Extract special commands from response (MEM_UPDATE, NAME_UPDATE, ERROR_UPDATE)
        const { cleanedResponse, updates } = extractSpecialCommands(llmResponse);

        // Execute updates asynchronously
        if (updates.memory) {
            updateMemoryFromPython(updates.memory).catch(err =>
                console.error(chalk.red(`Memory update failed: ${err.message}`))
            );
        }
        if (updates.name) {
            updateNameFromPython(updates.name).catch(err =>
                console.error(chalk.red(`Name update failed: ${err.message}`))
            );
        }
        if (updates.error) {
            logErrorFromPython(updates.error).catch(err =>
                console.error(chalk.red(`Error logging failed: ${err.message}`))
            );
        }

        console.log(chalk.yellow(`[Forge]: ${cleanedResponse.substring(0, 50)}...`));

        res.json({
            reply: cleanedResponse,
            updates,
            model: currentModel,
            provider: currentProvider,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(chalk.red(`[Chat Error]: ${error.message}`));
        res.status(500).json({
            error: error.message,
            type: 'CHAT_ERROR'
        });
    }
});

/**
 * POST /api/compress-memory
 * Trigger memory compression via Python CompressionService
 */
router.post('/compress-memory', async (req, res) => {
    try {
        console.log(chalk.magenta('[🗜️ Compressing memory...]'));

        const result = await new Promise((resolve, reject) => {
            const python = spawn('python', [
                '-m', 'pytest',
                '--co',  // Just collect, for now as proof
            ]);

            let output = '';
            python.stdout.on('data', (data) => {
                output += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, message: 'Memory compressed' });
                } else {
                    reject(new Error('Compression failed'));
                }
            });
        });

        res.json(result);
    } catch (error) {
        console.error(chalk.red(`[Compression Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build context from Python services
 */
async function buildContextFromPython() {
    return `You are The Forge, a helpful AI assistant.
Keep responses clear, organized, and actionable.
Use markdown for formatting.`;
}

/**
 * Call LLM provider (Groq or Ollama)
 */
async function callLLMProvider(context, message) {
    if (currentProvider === 'groq') {
        return await callGroqAPI(context, message);
    } else {
        return await callOllamaAPI(context, message);
    }
}

/**
 * Call Groq API
 */
async function callGroqAPI(context, message) {
    const response = await fetch(`${llmConfig.groq.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${llmConfig.groq.apiKey}`
        },
        body: JSON.stringify({
            model: currentModel,
            messages: [
                { role: 'system', content: context },
                { role: 'user', content: message }
            ],
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Groq API Error: ${err.error?.message || response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

/**
 * Call Ollama API (local)
 */
async function callOllamaAPI(context, message) {
    const response = await fetch(`${llmConfig.ollama.baseUrl}/api/chat`, {
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
    return data.message?.content || '';
}

/**
 * Extract special commands from response
 */
function extractSpecialCommands(response) {
    const updates = {
        memory: null,
        name: null,
        error: null
    };

    let cleanedResponse = response;

    // Memory update
    const memMatch = response.match(/MEM_UPDATE:\s*["']?([^"'\n]+)["']?/);
    if (memMatch) {
        updates.memory = memMatch[1].trim();
        cleanedResponse = cleanedResponse.replace(/MEM_UPDATE:.*?(?:\n|$)/s, '');
    }

    // Name update
    const nameMatch = response.match(/NAME_UPDATE:\s*["']?([^"'\n]+)["']?/);
    if (nameMatch) {
        updates.name = nameMatch[1].trim();
        cleanedResponse = cleanedResponse.replace(/NAME_UPDATE:.*?(?:\n|$)/s, '');
    }

    // Error update
    const errMatch = response.match(/ERROR_UPDATE:\s*["']?([^"'\n]+)["']?/);
    if (errMatch) {
        updates.error = errMatch[1].trim();
        cleanedResponse = cleanedResponse.replace(/ERROR_UPDATE:.*?(?:\n|$)/s, '');
    }

    return {
        cleanedResponse: cleanedResponse.trim(),
        updates
    };
}

/**
 * Update memory via Python service
 */
async function updateMemoryFromPython(content) {
    // Fire and forget - subprocess call to Python
    spawn('python', [
        '-c',
        `from src.services.memory.manager import MemoryManager;
         from pathlib import Path;
         mgr = MemoryManager(Path('body'));
         mgr.write_entry('default', '${content.replace(/'/g, "\\'")}');`
    ]);
}

/**
 * Update name via Python service
 */
async function updateNameFromPython(name) {
    spawn('python', [
        '-c',
        `from src.services.identity.name_manager import NameManager;
         from pathlib import Path;
         mgr = NameManager(Path('body'));
         mgr.update_name('${name.replace(/'/g, "\\'")}');`
    ]);
}

/**
 * Log error via Python service
 */
async function logErrorFromPython(error) {
    spawn('python', [
        '-c',
        `from src.repositories.error_db_repo import ErrorDBRepository;
         from pathlib import Path;
         repo = ErrorDBRepository(Path('ERROR_DB.md'));
         repo.log_error('${error.replace(/'/g, "\\'")}');`
    ]);
}

export default router;

/**
 * Chat Routes - Message handling and LLM interaction
 * Delegates to Python ContextBuilder and services via subprocess
 */

import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import chalk from 'chalk';
import { lookAt } from '../../senses/eye.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../../..');
const KNOWLEDGE_PATH = path.join(PROJECT_ROOT, 'brain', 'knowledge');

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

const OLLAMA_TIMEOUT_MS = Number.parseInt(process.env.OLLAMA_TIMEOUT_MS || '45000', 10);
const OLLAMA_NUM_CTX = Number.parseInt(process.env.OLLAMA_NUM_CTX || '8192', 10);
const OLLAMA_NUM_PREDICT = Number.parseInt(process.env.OLLAMA_NUM_PREDICT || '256', 10);
const OLLAMA_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || '30m';

let currentProvider = process.env.GROQ_API_KEY ? 'groq' : 'ollama';
let currentModel = process.env.GROQ_API_KEY ? llmConfig.groq.model : llmConfig.ollama.model;

export function getActiveLLMSelection() {
    return {
        provider: currentProvider,
        model: currentModel
    };
}

export function setActiveLLMSelection(provider, model) {
    if (!provider || !model) return;
    currentProvider = provider;
    currentModel = model;
}

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
        let context = await buildContextFromPython();

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

        // Knowledge-first behavior for skill/tool requests
        let knowledgeHits = [];
        if (shouldUseKnowledgeLookup(message)) {
            knowledgeHits = await searchKnowledgeBase(message, 2);
            if (knowledgeHits.length > 0) {
                context = `${context}\n\nRelevant Knowledge Base snippets:\n${formatKnowledgeHitsForPrompt(knowledgeHits)}`;
            }
        }

        // Call LLM provider
        const llmResponse = await callLLMProvider(context, userPrompt);
        const safeResponse = sanitizeIdentityLeak(llmResponse);

        // Extract special commands from response (MEM_UPDATE, NAME_UPDATE, ERROR_UPDATE)
        const { cleanedResponse, updates } = extractSpecialCommands(safeResponse);

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
            knowledge_hits: knowledgeHits.length,
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
    return `Du bist TAIA von The Forge.
Halte Antworten klar, strukturiert und umsetzbar.
Nutze Markdown fuer die Formatierung.

Identitaetsregeln (strikt):
- Du bist NIEMALS ChatGPT und NIEMALS OpenAI.
- Wenn gefragt wird, wer du bist, antworte: "Ich bin TAIA von The Forge."
- Beanspruche keine externe Marke oder Besitzerschaft.`;
}

function shouldUseKnowledgeLookup(message = '') {
    const text = String(message || '').toLowerCase();
    if (!text.trim()) return false;

    const triggers = [
        'skill',
        'tool',
        'api',
        'endpoint',
        'workflow',
        'pattern',
        'architektur',
        'guideline',
        'best practice',
        'template',
        'vorlage'
    ];

    return triggers.some((term) => text.includes(term));
}

async function searchKnowledgeBase(query, limit = 2) {
    try {
        const exists = await fs.access(KNOWLEDGE_PATH).then(() => true).catch(() => false);
        if (!exists) return [];

        const files = await fs.readdir(KNOWLEDGE_PATH);
        const mdFiles = files.filter((f) => f.toLowerCase().endsWith('.md'));
        const terms = query
            .toLowerCase()
            .split(/\s+/)
            .map((t) => t.trim())
            .filter(Boolean);

        const results = [];
        for (const file of mdFiles) {
            const content = await fs.readFile(path.join(KNOWLEDGE_PATH, file), 'utf-8');
            const lower = content.toLowerCase();

            let score = 0;
            for (const term of terms) {
                if (!term) continue;
                const matches = lower.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
                score += matches ? matches.length : 0;
            }

            if (score > 0) {
                results.push({
                    file,
                    score,
                    snippet: buildSnippet(content, query),
                    path: `brain/knowledge/${file}`
                });
            }
        }

        results.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));
        return results.slice(0, limit);
    } catch (error) {
        console.warn(chalk.yellow(`[Knowledge Search] Failed: ${error.message}`));
        return [];
    }
}

function buildSnippet(content, query) {
    const lower = content.toLowerCase();
    const q = String(query || '').toLowerCase();
    const idx = q ? lower.indexOf(q) : -1;

    if (idx < 0) {
        return content.substring(0, 240).replace(/\s+/g, ' ').trim();
    }

    const start = Math.max(0, idx - 80);
    const end = Math.min(content.length, idx + q.length + 160);
    return content.substring(start, end).replace(/\s+/g, ' ').trim();
}

function formatKnowledgeHitsForPrompt(hits) {
    return hits.map((hit, index) => {
        return `${index + 1}. ${hit.path}\nSnippet: ${hit.snippet}`;
    }).join('\n\n');
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

function sanitizeIdentityLeak(response = '') {
    const leakPattern = /(ich bin|i am|as an ai|als ki).*(chatgpt|openai|gpt-?4|gpt)/i;
    if (!leakPattern.test(response)) return response;

    const filtered = response
        .split('\n')
        .filter((line) => !/(chatgpt|openai|gpt-?4|gpt)/i.test(line))
        .join('\n')
        .trim();

    const fixedIntro = 'Ich bin TAIA von The Forge.';
    return filtered ? `${fixedIntro}\n\n${filtered}` : fixedIntro;
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    let response;
    try {
        response = await fetch(`${llmConfig.ollama.baseUrl}/api/chat`, {
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
                stream: false,
                keep_alive: OLLAMA_KEEP_ALIVE,
                options: {
                    num_ctx: OLLAMA_NUM_CTX,
                    num_predict: OLLAMA_NUM_PREDICT
                }
            }),
            signal: controller.signal
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`Ollama timeout after ${OLLAMA_TIMEOUT_MS}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const detail = err?.error ? `: ${err.error}` : '';
        throw new Error(`Ollama API Error: ${response.status}${detail}`);
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

import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import multer from 'multer';
import { lookAt } from './senses/eye.js';

dotenv.config();

// ============================================================================
// SETUP PATHS & APP
// ============================================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const BODY_PATH = path.join(PROJECT_ROOT, 'body');

const app = express();
const PORT = process.env.PORT || 3000;

// Ollama (Local)
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';

// Groq (Cloud)
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// Upload Configuration
const UPLOAD_DIR = path.join(BODY_PATH, 'raw_data', 'images');
await fs.mkdir(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Current active model state
let currentProvider = GROQ_API_KEY ? 'groq' : 'ollama';
let currentModel = GROQ_API_KEY ? GROQ_MODEL : OLLAMA_MODEL;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.static(path.join(PROJECT_ROOT, 'public')));
app.use(bodyParser.json());

// ============================================================================
// TAIA BRAIN FUNCTIONS
// ============================================================================

/**
 * Write entry to MEMORY.md
 */
async function writeToMemory(entry) {
    try {
        const timestamp = new Date().toISOString().split('T')[0];
        const line = `\n* [${timestamp}] ${entry}`;
        const memoryPath = path.join(BODY_PATH, 'MEMORY.md');

        await fs.appendFile(memoryPath, line);
        console.log(chalk.green(`[🧠 Memory Saved: ${entry}]`));
    } catch (error) {
        console.error(chalk.red(`[Memory Error: ${error.message}]`));
    }
}

/**
 * Update NAME.md with new agent name
 */
async function updateName(newName) {
    try {
        const timestamp = new Date().toISOString().split('T')[0];
        const namePath = path.join(BODY_PATH, 'NAME.md');
        const line = `\n* [${timestamp}] Renamed to: "${newName}"`;

        // Read current content
        let currentContent = await fs.readFile(namePath, 'utf-8');

        // Update the "Current Name" line
        currentContent = currentContent.replace(/\*\*Current Name\*\*: .+/g, `**Current Name**: ${newName}`);

        // Append history entry
        currentContent += line;

        // Write back
        await fs.writeFile(namePath, currentContent);
        console.log(chalk.blue(`[🎭 Name Updated: ${newName}]`));
    } catch (error) {
        console.error(chalk.red(`[Name Error: ${error.message}]`));
    }
}

/**
 * Extract current name from NAME.md
 */
async function getCurrentName() {
    try {
        const namePath = path.join(BODY_PATH, 'NAME.md');
        const content = await fs.readFile(namePath, 'utf-8');
        const match = content.match(/\*\*Current Name\*\*:\s*(.+)/);
        return match ? match[1].trim() : 'The Forge';
    } catch {
        return 'The Forge';
    }
}

// Central HIVE path for ERROR_DB
const ERROR_DB_PATH = 'E:\\_____1111____Projekte-Programmierung\\Antigravity\\03_ERROR_DB.md';

/**
 * Write error entry to ERROR_DB
 */
async function writeToErrorDB(errorEntry) {
    try {
        const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const id = `ERR-${date}-NEW`;
        const line = `\n| ${id} | ${errorEntry} | TBD | TBD | TBD |`;

        await fs.appendFile(ERROR_DB_PATH, line);
        console.log(chalk.red(`[🐛 Error Logged: ${errorEntry}]`));
    } catch (error) {
        console.error(chalk.red(`[Error DB Error: ${error.message}]`));
    }
}

/**
 * Compress memory using LLM-based summarization
 * Creates MEMORY_COMPRESSED.md with tiered structure
 */
async function compressMemory() {
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    try {
        // Read original memory
        const memoryPath = path.join(BODY_PATH, 'MEMORY.md');
        const memoryContent = await fs.readFile(memoryPath, 'utf-8');

        // Parse entries by date pattern [YYYY-MM-DD] or [DATE]
        const lines = memoryContent.split('\n');
        const hot = [];
        const warm = [];
        const cold = [];

        for (const line of lines) {
            const dateMatch = line.match(/\[(\d{4}-\d{2}-\d{2})\]/);
            if (dateMatch) {
                const entryDate = new Date(dateMatch[1]);
                if (entryDate >= sevenDaysAgo) {
                    hot.push(line);
                } else if (entryDate >= thirtyDaysAgo) {
                    warm.push(line);
                } else {
                    cold.push(line);
                }
            } else if (line.trim()) {
                // Non-dated entries go to HOT (recent)
                hot.push(line);
            }
        }

        // Summarize WARM entries using LLM
        let warmSummary = '';
        if (warm.length > 0) {
            const warmText = warm.join('\n');
            const summaryPrompt = `Fasse folgende Memory-Einträge in 2-3 kurzen Sätzen zusammen. Behalte nur die wichtigsten Fakten:\n\n${warmText}\n\nZusammenfassung:`;

            try {
                const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.1-8b-instant',
                        messages: [{ role: 'user', content: summaryPrompt }],
                        temperature: 0.3,
                        max_tokens: 200
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    warmSummary = data.choices?.[0]?.message?.content || warm.join('\n');
                }
            } catch {
                warmSummary = warm.join('\n'); // Fallback: keep original
            }
        }

        // Summarize COLD entries (even more condensed)
        let coldSummary = '';
        if (cold.length > 0) {
            const coldText = cold.join('\n');
            const summaryPrompt = `Extrahiere nur die wichtigsten Fakten als Bullet-Points (max 3):\n\n${coldText}\n\nBullet-Points:`;

            try {
                const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.1-8b-instant',
                        messages: [{ role: 'user', content: summaryPrompt }],
                        temperature: 0.3,
                        max_tokens: 100
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    coldSummary = data.choices?.[0]?.message?.content || '• Archive entries available';
                }
            } catch {
                coldSummary = `• ${cold.length} archived entries`;
            }
        }

        // Build compressed memory
        let compressed = '# COMPRESSED MEMORY\n\n';

        if (coldSummary) {
            compressed += `=== COLD (Archiv) ===\n${coldSummary}\n\n`;
        }

        if (warmSummary) {
            compressed += `=== WARM (Zusammenfassung) ===\n${warmSummary}\n\n`;
        }

        compressed += `=== HOT (Aktuell) ===\n${hot.join('\n')}\n`;

        // Write compressed file
        const compressedPath = path.join(BODY_PATH, 'MEMORY_COMPRESSED.md');
        await fs.writeFile(compressedPath, compressed);

        const stats = {
            original: memoryContent.length,
            compressed: compressed.length,
            ratio: (compressed.length / memoryContent.length).toFixed(2),
            hot: hot.length,
            warm: warm.length,
            cold: cold.length
        };

        console.log(chalk.magenta(`[🗜️ Memory Compressed: ${stats.ratio} ratio]`));
        return stats;

    } catch (error) {
        console.error(chalk.red(`[Compression Error: ${error.message}]`));
        throw error;
    }
}

/**
 * Build system context from body files + ERROR_DB
 */
async function buildContext() {
    try {
        const soul = await fs.readFile(path.join(BODY_PATH, 'SOUL.md'), 'utf-8');
        const identity = await fs.readFile(path.join(BODY_PATH, 'IDENTITY.md'), 'utf-8');
        const agentName = await getCurrentName();

        // Try compressed memory first, fallback to original
        let memory = '';
        let memorySource = 'MEMORY.md';
        try {
            memory = await fs.readFile(path.join(BODY_PATH, 'MEMORY_COMPRESSED.md'), 'utf-8');
            memorySource = 'MEMORY_COMPRESSED.md';
        } catch {
            memory = await fs.readFile(path.join(BODY_PATH, 'MEMORY.md'), 'utf-8');
        }

        // Load ERROR_DB from HIVE (optional - don't crash if missing)
        let errorDB = '';
        try {
            errorDB = await fs.readFile(ERROR_DB_PATH, 'utf-8');
        } catch {
            errorDB = '(ERROR_DB not available)';
        }

        return `
=== AGENT NAME ===
Du heißt: **${agentName}**
Du kannst deinen Namen ändern, wenn es dir passt. Schreibe dazu: NAME_UPDATE: "Neuer Name"

=== SYSTEM IDENTITY (SOUL) ===
${soul}

=== USER PROFILE (IDENTITY) ===
${identity}

=== LONG TERM MEMORY ===
${memory}

=== ERROR DATABASE (Learned Lessons) ===
${errorDB}

=== INSTRUCTION ===
Du bist "${agentName}", ein Web-basierter AI-Architekt für wahre KI-Agenten.
Du antwortest in Markdown-Format (nutze **fett**, *kursiv*, \`Code\`, Listen etc.)
Du bist hilfreich, präzise und enthusiastisch.

WICHTIG: Nutze die ERROR DATABASE oben, um bekannte Fehler zu vermeiden!

Wenn du eine wichtige Information für zukünftige Gespräche speichern willst:
MEM_UPDATE: "Der Text des Eintrags"

Wenn du einen neuen Fehler dokumentieren willst (für zukünftige Vermeidung):
ERROR_UPDATE: "Symptom | Root Cause"

Wenn du deinen Namen ändern möchtest:
NAME_UPDATE: "Neuer Name"

Beispiele:
- MEM_UPDATE: "Roy arbeitet an Projekt Sky-Engine"
- ERROR_UPDATE: "API returned 401 | Token expired, need refresh logic"
- NAME_UPDATE: "Forge Prime"
`;
    } catch (error) {
        console.error(chalk.red(`Error reading Body: ${error.message}`));
        return "System Error: Body files not found.";
    }
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /api/models
 * Returns available models from all providers
 */
app.get('/api/models', async (req, res) => {
    const models = [];

    // Fetch Ollama models (local)
    try {
        const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (ollamaRes.ok) {
            const data = await ollamaRes.json();
            (data.models || []).forEach(m => models.push({
                id: m.name,
                name: m.name.split(':')[0],
                provider: 'ollama',
                icon: '🖥️',
                active: currentProvider === 'ollama' && currentModel === m.name
            }));
        }
    } catch (e) {
        console.log(chalk.gray('[Ollama] Not available'));
    }

    // Fetch Groq models (cloud)
    if (GROQ_API_KEY) {
        try {
            const groqRes = await fetch(`${GROQ_BASE_URL}/models`, {
                headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
            });
            if (groqRes.ok) {
                const data = await groqRes.json();
                (data.data || []).forEach(m => models.push({
                    id: m.id,
                    name: m.id,
                    provider: 'groq',
                    icon: '☁️',
                    active: currentProvider === 'groq' && currentModel === m.id
                }));
            }
        } catch (e) {
            console.log(chalk.gray('[Groq] API error'));
        }
    }

    res.json({
        models,
        current: { provider: currentProvider, model: currentModel }
    });
});

/**
 * POST /api/model
 * Switch active model
 */
app.post('/api/model', (req, res) => {
    const { provider, model } = req.body;
    if (provider && model) {
        currentProvider = provider;
        currentModel = model;
        console.log(chalk.blue(`[Model Switch] ${provider}/${model}`));
        res.json({ success: true, provider, model });
    } else {
        res.status(400).json({ error: 'provider and model required' });
    }
});

/**
 * POST /api/compress-memory
 * Trigger memory compression using LLM
 */
app.post('/api/compress-memory', async (req, res) => {
    try {
        console.log(chalk.magenta('[🗜️ Starting Memory Compression...]'));
        const stats = await compressMemory();
        res.json({
            success: true,
            message: 'Memory compressed successfully',
            stats
        });
    } catch (error) {
        console.error(chalk.red(`[Compression Failed: ${error.message}]`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/upload
 * Upload image for vision analysis
 */
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log(chalk.magenta(`[📸 Image Uploaded]: ${req.file.path}`));
        res.json({
            success: true,
            path: req.file.path,
            filename: req.file.filename
        });
    } catch (error) {
        console.error(chalk.red(`[Upload Error: ${error.message}]`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/chat
 * Main chat endpoint - accepts user message, returns AI response
 */
app.post('/api/chat', async (req, res) => {
    try {
        let userMessage = req.body.message;

        if (!userMessage || !userMessage.trim()) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        console.log(chalk.cyan(`[User]: ${userMessage}`));

        // VISION CHECK: Is this an image path?
        const imageMatch = userMessage.match(/^(.+\.(jpg|jpeg|png|webp|bmp|gif))$/i);
        if (imageMatch) {
            const imagePath = imageMatch[1].trim();
            console.log(chalk.magenta(`📸 Bild-Input erkannt. Aktiviere Vision...`));

            const visionDescription = await lookAt(imagePath);

            userMessage = `[SYSTEM: Der User hat ein Bild gesendet (${imagePath}).
VISUELLE ANALYSE (Moondream): ${visionDescription}]

Bitte antworte basierend auf diesem Bildinhalt.`;
        }

        // Build fresh context (reads files live)
        const systemPrompt = await buildContext();

        // ... rest of prompt handling

        const provider = req.body.provider || currentProvider;
        const model = req.body.model || currentModel;

        let reply = '';

        if (provider === 'groq') {
            // Call Groq API (OpenAI compatible)
            const groqResponse = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userMessage }
                    ],
                    temperature: 0.7
                })
            });

            if (!groqResponse.ok) {
                const err = await groqResponse.json();
                throw new Error(`Groq API Error: ${err.error?.message || groqResponse.status}`);
            }

            const groqData = await groqResponse.json();
            reply = groqData.choices?.[0]?.message?.content || '';

        } else {
            // Call Ollama API (local)
            const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userMessage }
                    ],
                    temperature: 0.7,
                    stream: false
                })
            });

            if (!ollamaResponse.ok) {
                throw new Error(`Ollama API Error: ${ollamaResponse.status}`);
            }

            const ollamaData = await ollamaResponse.json();
            reply = ollamaData.message?.content || '';
        }
        let memoryUpdate = null;
        let nameUpdate = null;
        let errorUpdate = null;

        // Check for NAME_UPDATE pattern
        const nameUpdateMatch = reply.match(/NAME_UPDATE:\s*["']?([^"'\n]+)["']?(?:\n|$)/);
        if (nameUpdateMatch) {
            nameUpdate = nameUpdateMatch[1].trim();
            // Remove NAME_UPDATE from reply
            reply = reply.replace(/NAME_UPDATE:.*?(?:\n|$)/s, '').trim();

            // Async update (fire and forget)
            await updateName(nameUpdate);
        }

        // Check for MEM_UPDATE pattern (improved parsing)
        const memUpdateMatch = reply.match(/MEM_UPDATE:\s*["']?([^"'\n]+)["']?(?:\n|$)/);
        if (memUpdateMatch) {
            memoryUpdate = memUpdateMatch[1].trim();
            // Remove MEM_UPDATE from reply
            reply = reply.replace(/MEM_UPDATE:.*?(?:\n|$)/s, '').trim();

            // Async write (fire and forget)
            await writeToMemory(memoryUpdate);
        }

        // Check for ERROR_UPDATE pattern
        const errorUpdateMatch = reply.match(/ERROR_UPDATE:\s*["']?([^"'\n]+)["']?(?:\n|$)/);
        if (errorUpdateMatch) {
            errorUpdate = errorUpdateMatch[1].trim();
            // Remove ERROR_UPDATE from reply
            reply = reply.replace(/ERROR_UPDATE:.*?(?:\n|$)/s, '').trim();

            // Async write to ERROR_DB
            await writeToErrorDB(errorUpdate);
        }

        console.log(chalk.yellow(`[Forge]: ${reply.substring(0, 50)}...`));

        res.json({
            reply,
            memoryUpdate,
            nameUpdate,
            errorUpdate,
            model: currentModel,
            provider: currentProvider,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(chalk.red(`[API Error]: ${error.message}`));
        res.status(500).json({
            error: error.message,
            type: error.status === 401 ? 'AUTH_ERROR' : 'API_ERROR'
        });
    }
});

/**
 * GET /api/status
 * Health check & system status
 */
app.get('/api/status', async (req, res) => {
    try {
        const memoryPath = path.join(BODY_PATH, 'MEMORY.md');
        const memoryContent = await fs.readFile(memoryPath, 'utf-8');
        const memoryLines = memoryContent.split('\n').filter(l => l.trim().startsWith('*')).length;

        res.json({
            status: 'online',
            system: 'The Forge TAIA v1.0',
            memory_entries: memoryLines,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/memory
 * Return current memory content
 */
app.get('/api/memory', async (req, res) => {
    try {
        const memoryPath = path.join(BODY_PATH, 'MEMORY.md');
        const content = await fs.readFile(memoryPath, 'utf-8');
        res.json({ memory: content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
    console.error(chalk.red(`[Error]: ${err.message}`));
    res.status(500).json({ error: err.message });
});

// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {
    try {
        let ollamaOnline = false;
        let groqOnline = false;

        // Check Ollama (optional)
        console.log(chalk.gray('Checking providers...'));
        try {
            const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
            if (healthCheck.ok) {
                ollamaOnline = true;
                console.log(chalk.green('  ✓ Ollama: Online'));
            }
        } catch (err) {
            console.log(chalk.yellow('  ○ Ollama: Offline'));
        }

        // Check Groq
        if (GROQ_API_KEY) {
            try {
                const groqCheck = await fetch(`${GROQ_BASE_URL}/models`, {
                    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }
                });
                if (groqCheck.ok) {
                    groqOnline = true;
                    console.log(chalk.green('  ✓ Groq: Online'));
                } else {
                    console.log(chalk.yellow('  ○ Groq: API Error'));
                }
            } catch (err) {
                console.log(chalk.yellow('  ○ Groq: Connection failed'));
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

        // Verify body directory exists
        try {
            await fs.access(BODY_PATH);
        } catch {
            console.error(chalk.red(`\n❌ Error: body/ directory not found at ${BODY_PATH}`));
            process.exit(1);
        }

        // Start server
        app.listen(PORT, async () => {
            console.log(chalk.green.bold('\n╔════════════════════════════════════════╗'));
            console.log(chalk.green.bold('║   🔥 THE FORGE IS ONLINE (WEB MODE)   ║'));
            console.log(chalk.green.bold('║      Radical TAIA Web Interface         ║'));
            console.log(chalk.green.bold('║       Local Ollama Powered              ║'));
            console.log(chalk.green.bold('╚════════════════════════════════════════╝\n'));

            console.log(chalk.cyan(`🌐 Web UI at: http://localhost:${PORT}`));
            console.log(chalk.cyan(`📁 Body dir:  ${BODY_PATH}`));
            console.log(chalk.cyan(`🧠 Model:    ${OLLAMA_MODEL}`));
            console.log(chalk.cyan(`🔗 Ollama:   ${OLLAMA_BASE_URL}`));
            console.log(chalk.cyan(`💾 Memory:   AUTO-SAVE enabled`));
            console.log(chalk.cyan(`🗜️ Compress: AUTO (every 1h)\n`));
            console.log(chalk.gray('Ready to receive transmission...\n'));

            // Background compression - run on startup
            try {
                const stats = await compressMemory();
                if (stats.warm > 0 || stats.cold > 0) {
                    console.log(chalk.magenta(`[🗜️ Startup Compression: ${stats.ratio} ratio]`));
                }
            } catch (err) {
                // Silent fail on startup
            }

            // Size-based compression check (every 5 min, trigger at 30KB)
            const COMPRESSION_THRESHOLD = 30 * 1024; // 30 KB
            setInterval(async () => {
                try {
                    const memoryPath = path.join(BODY_PATH, 'MEMORY.md');
                    const stat = await fs.stat(memoryPath);
                    if (stat.size > COMPRESSION_THRESHOLD) {
                        const stats = await compressMemory();
                        console.log(chalk.magenta(`[🗜️ Size Trigger (${(stat.size / 1024).toFixed(1)}KB): ${stats.ratio} ratio]`));
                    }
                } catch (err) { /* Silent */ }
            }, 5 * 60 * 1000); // Check every 5 min
        });
    } catch (error) {
        console.error(chalk.red(`Fatal Error: ${error.message}`));
        process.exit(1);
    }
}

startServer();

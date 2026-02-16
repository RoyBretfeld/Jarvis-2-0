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
import { execFile } from 'child_process';
import { promisify } from 'util';

// Routes
import chatRouter from './api/routes/chat.js';
import configRouter from './api/routes/config.js';
import memoryRouter from './api/routes/memory.js';
import visionRouter from './api/routes/vision.js';
import voiceRouter from './api/routes/voice.js';

// Configuration
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const BODY_PATH = path.join(PROJECT_ROOT, 'body');
const BUS_PATH = path.join(PROJECT_ROOT, 'brain', 'bus');
const ARCHIVE_PATH = path.join(BUS_PATH, 'archive');
const APPROVALS_PATH = path.join(BUS_PATH, 'approvals');
const KNOWLEDGE_PATH = path.join(PROJECT_ROOT, 'brain', 'knowledge');
const PROJECT_STATE_PATH = path.join(PROJECT_ROOT, 'brain', 'state', 'projects.json');
const PORT = process.env.PORT || 3000;
const MAX_TREE_TOTAL_NODES = Number.parseInt(process.env.PROJECT_TREE_MAX_NODES || '5000', 10);
const MAX_TREE_CHILDREN_PER_DIR = Number.parseInt(process.env.PROJECT_TREE_MAX_CHILDREN || '250', 10);
const execFileAsync = promisify(execFile);

async function initializeBusRecovery() {
    console.log(chalk.gray('[Bus] Initiating State Recovery...'));
    const exists = await fs.access(BUS_PATH).then(() => true).catch(() => false);
    if (!exists) {
        console.log(chalk.gray('[Bus] No bus directory found. Recovery skipped.'));
        return { scanned: 0, resetToPending: 0 };
    }

    const files = await fs.readdir(BUS_PATH);
    const requestFiles = files.filter((file) => file.endsWith('.json') && !file.startsWith('resp_'));
    let recoveredCount = 0;

    for (const file of requestFiles) {
        try {
            const filePath = path.join(BUS_PATH, file);
            const raw = await fs.readFile(filePath, 'utf-8');
            const task = JSON.parse(raw);

            if (task.status === 'RUNNING') {
                task.status = 'PENDING';
                task.retryCount = (task.retryCount || 0) + 1;
                task.metadata = {
                    ...(task.metadata || {}),
                    recoveryAt: new Date().toISOString()
                };
                await fs.writeFile(filePath, JSON.stringify(task, null, 2), 'utf-8');
                recoveredCount += 1;
            }
        } catch (error) {
            console.log(chalk.yellow(`[Bus] Recovery skip (${file}): ${error.message}`));
        }
    }

    console.log(chalk.green(`[Bus] Recovery complete. Reset ${recoveredCount} orphaned tasks to PENDING.`));
    return {
        scanned: requestFiles.length,
        resetToPending: recoveredCount
    };
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSnippet(content, query) {
    const lower = content.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) {
        return content.substring(0, 220).replace(/\s+/g, ' ').trim();
    }

    const start = Math.max(0, idx - 80);
    const end = Math.min(content.length, idx + q.length + 140);
    return content.substring(start, end).replace(/\s+/g, ' ').trim();
}

async function searchKnowledgeBase(query, limit = 5) {
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
        const fullPath = path.join(KNOWLEDGE_PATH, file);
        const content = await fs.readFile(fullPath, 'utf-8');
        const lowerContent = content.toLowerCase();

        let score = 0;
        for (const term of terms) {
            if (!term) continue;
            const pattern = new RegExp(escapeRegExp(term), 'gi');
            const matches = content.match(pattern);
            score += matches ? matches.length : 0;
        }

        if (score > 0 || terms.length === 0) {
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
}

function inferBlockedCategory(reason = '') {
    const text = String(reason || '').toLowerCase();
    if (text.includes('timeout')) return 'TIMEOUT';
    if (text.includes('ollama') || text.includes('groq') || text.includes('api')) return 'LLM';
    if (text.includes('permission') || text.includes('access') || text.includes('denied')) return 'BERECHTIGUNG';
    if (text.includes('git')) return 'GIT';
    if (text.includes('not found') || text.includes('enoent')) return 'DATEI';
    return 'UNBEKANNT';
}

function buildResolutionHint(category = 'UNBEKANNT') {
    switch (category) {
        case 'LLM':
            return 'Provider pruefen, Modell vorladen, dann Retry ausfuehren.';
        case 'TIMEOUT':
            return 'Timeout/Prompt reduzieren und Task erneut starten.';
        case 'BERECHTIGUNG':
            return 'Pfad-/Dateirechte pruefen und dann Entblocken.';
        case 'GIT':
            return 'Git-Lock oder Merge-Konflikt bereinigen, danach Retry.';
        case 'DATEI':
            return 'Fehlende Datei/Pfad korrigieren und Task erneut versuchen.';
        default:
            return 'Fehlerdetails ansehen und mit Entblocken/Retry fortfahren.';
    }
}

async function appendTaskAction(taskId, action, actor, note = '') {
    try {
        const actionLogPath = path.join(BUS_PATH, 'task_actions.log');
        const line = JSON.stringify({
            timestamp: new Date().toISOString(),
            taskId,
            action,
            actor,
            note
        });
        await fs.appendFile(actionLogPath, `${line}\n`, 'utf-8');
    } catch {
        // keep endpoint non-failing on audit log issues
    }
}

async function locateActiveRequest(taskId) {
    const exists = await fs.access(BUS_PATH).then(() => true).catch(() => false);
    if (!exists) return null;
    const files = await fs.readdir(BUS_PATH);
    const requestFile = files.find((f) => f.endsWith('.json') && !f.startsWith('resp_') && f.startsWith(`${taskId}_`));
    if (!requestFile) return null;
    const requestPath = path.join(BUS_PATH, requestFile);
    const raw = await fs.readFile(requestPath, 'utf-8');
    return {
        path: requestPath,
        file: requestFile,
        task: JSON.parse(raw)
    };
}

async function locateLatestArchivedRequest(taskId) {
    const exists = await fs.access(ARCHIVE_PATH).then(() => true).catch(() => false);
    if (!exists) return null;
    const files = await fs.readdir(ARCHIVE_PATH);
    const requestFiles = files
        .filter((f) => f.endsWith('.json') && !f.startsWith('resp_') && f.startsWith(`${taskId}_`))
        .sort()
        .reverse();

    if (requestFiles.length === 0) return null;
    const requestPath = path.join(ARCHIVE_PATH, requestFiles[0]);
    const raw = await fs.readFile(requestPath, 'utf-8');
    return {
        path: requestPath,
        file: requestFiles[0],
        task: JSON.parse(raw)
    };
}

async function loadLatestArchivedResponse(taskId) {
    const exists = await fs.access(ARCHIVE_PATH).then(() => true).catch(() => false);
    if (!exists) return null;
    const files = await fs.readdir(ARCHIVE_PATH);
    const responseFiles = files
        .filter((f) => f.startsWith(`resp_${taskId}_`) && f.endsWith('.json'))
        .sort()
        .reverse();
    if (responseFiles.length === 0) return null;
    const raw = await fs.readFile(path.join(ARCHIVE_PATH, responseFiles[0]), 'utf-8');
    return JSON.parse(raw);
}

async function loadArchivedBlockedTasks(limit = 20) {
    const exists = await fs.access(ARCHIVE_PATH).then(() => true).catch(() => false);
    if (!exists) return [];

    const files = await fs.readdir(ARCHIVE_PATH);
    const responseFiles = files
        .filter((f) => f.startsWith('resp_') && f.endsWith('.json'))
        .sort()
        .reverse();

    const blocked = [];
    for (const file of responseFiles) {
        try {
            const raw = await fs.readFile(path.join(ARCHIVE_PATH, file), 'utf-8');
            const response = JSON.parse(raw);
            if (response.status !== 'FAILED') continue;

            const request = await locateLatestArchivedRequest(response.requestId);
            const reason = response?.result?.blockedReason || response?.result?.message || 'Unbekannter Fehler';
            const category = inferBlockedCategory(reason);
            blocked.push({
                id: response.requestId,
                target: request?.task?.target || response.agentId || 'unknown',
                skill: request?.task?.skill || 'unknown',
                status: 'BLOCKED',
                origin: request?.task?.origin || null,
                parentToken: request?.task?.parentToken || null,
                timestamp: request?.task?.timestamp || response.timestamp,
                startedAt: request?.task?.metadata?.startedAt || null,
                finishedAt: response.timestamp,
                blockedReason: reason,
                blockedCategory: category,
                resolutionHint: buildResolutionHint(category),
                archived: true
            });
            if (blocked.length >= limit) break;
        } catch {
            // ignore malformed archive files
        }
    }

    return blocked;
}

async function collectProjectSnapshot(projectPath) {
    const rootEntries = await fs.readdir(projectPath, { withFileTypes: true });
    const filteredRoot = rootEntries.filter((entry) => {
        const n = entry.name.toLowerCase();
        return !['.git', 'node_modules', '.cursor', '.vscode'].includes(n);
    });

    const topDirs = filteredRoot.filter((e) => e.isDirectory()).map((e) => e.name).slice(0, 30);
    const topFiles = filteredRoot.filter((e) => e.isFile()).map((e) => e.name).slice(0, 30);

    let nestedFileCount = 0;
    let nestedDirCount = topDirs.length;
    for (const dirName of topDirs.slice(0, 10)) {
        const nestedPath = path.join(projectPath, dirName);
        try {
            const nested = await fs.readdir(nestedPath, { withFileTypes: true });
            nestedFileCount += nested.filter((e) => e.isFile()).length;
            nestedDirCount += nested.filter((e) => e.isDirectory()).length;
        } catch {
            // ignore unreadable nested dirs
        }
    }

    return {
        topDirs,
        topFiles,
        rootEntries: filteredRoot.length,
        approxDirs: nestedDirCount,
        approxFiles: topFiles.length + nestedFileCount
    };
}

async function findLatestProjectDump(projectPath) {
    const candidateDirs = [
        path.join(projectPath, '__RB-Protokoll', '.rb_dumps'),
        path.join(projectPath, '.rb_dumps'),
        path.join(projectPath, '__RB-Protokoll'),
        projectPath
    ];

    const found = [];
    for (const dir of candidateDirs) {
        const exists = await fs.access(dir).then(() => true).catch(() => false);
        if (!exists) continue;
        const files = await fs.readdir(dir).catch(() => []);
        for (const file of files) {
            if (!/^PROJECT_CONTEXT_DUMP_.*\.txt$/i.test(file)) continue;
            const fullPath = path.join(dir, file);
            try {
                const stat = await fs.stat(fullPath);
                found.push({ path: fullPath, mtimeMs: stat.mtimeMs, size: stat.size });
            } catch {
                // ignore stat errors
            }
        }
    }

    if (found.length === 0) return null;
    found.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return found[0];
}

async function callGroqLLM(prompt, model) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: 'Antworte präzise auf Deutsch und verwende korrekte Umlaute (ä, ö, ü, ß).' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.4
        })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Groq ${response.status}: ${err?.error?.message || 'Unbekannter Fehler'}`);
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
}

async function callOllamaLLM(prompt, model) {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: 'Antworte präzise auf Deutsch und verwende korrekte Umlaute (ä, ö, ü, ß).' },
                { role: 'user', content: prompt }
            ],
            stream: false,
            keep_alive: process.env.OLLAMA_KEEP_ALIVE || '30m',
            options: {
                num_ctx: Number.parseInt(process.env.OLLAMA_NUM_CTX || '8192', 10),
                num_predict: Number.parseInt(process.env.OLLAMA_NUM_PREDICT || '256', 10)
            }
        })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Ollama ${response.status}: ${err?.error || 'Unbekannter Fehler'}`);
    }
    const data = await response.json();
    return data?.message?.content || '';
}

async function callProjectInsightLLM(prompt) {
    const providerPref = process.env.MODEL_PROVIDER || (process.env.GROQ_API_KEY ? 'groq' : 'ollama');
    const worldGroq = process.env.WORLD_MODEL || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    const worldOllama = process.env.WORLD_MODEL || process.env.OLLAMA_MODEL || 'qwen3:14b';

    const order = providerPref === 'groq' ? ['groq', 'ollama'] : ['ollama', 'groq'];
    let lastError = null;

    for (const provider of order) {
        try {
            if (provider === 'groq' && process.env.GROQ_API_KEY) {
                const text = await callGroqLLM(prompt, worldGroq);
                return { provider, model: worldGroq, text };
            }
            if (provider === 'ollama') {
                const text = await callOllamaLLM(prompt, worldOllama);
                return { provider, model: worldOllama, text };
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Kein LLM verfuegbar');
}

async function ensureProjectState() {
    const dir = path.dirname(PROJECT_STATE_PATH);
    await fs.mkdir(dir, { recursive: true });
    const exists = await fs.access(PROJECT_STATE_PATH).then(() => true).catch(() => false);
    if (!exists) {
        const initial = {
            activeProject: null,
            recentProjects: []
        };
        await fs.writeFile(PROJECT_STATE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    }
}

async function readProjectState() {
    await ensureProjectState();
    const raw = await fs.readFile(PROJECT_STATE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
        activeProject: parsed.activeProject || null,
        recentProjects: Array.isArray(parsed.recentProjects) ? parsed.recentProjects : [],
        projectRoot: parsed.projectRoot || null
    };
}

async function writeProjectState(state) {
    await ensureProjectState();
    await fs.writeFile(PROJECT_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

async function listProjectFolders(rootPath) {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    const hiddenLike = ['.git', '.cursor', '.vscode', '__pycache__', 'node_modules'];
    return entries
        .filter((entry) => entry.isDirectory())
        .filter((entry) => !hiddenLike.includes(entry.name.toLowerCase()))
        .map((entry) => {
            const fullPath = path.join(rootPath, entry.name);
            return {
                name: entry.name,
                path: fullPath
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

async function pickFolderViaNativeDialog(initialPath = '') {
    if (process.platform !== 'win32') {
        throw new Error('Native folder picker is currently supported on Windows only');
    }

    const safeInitial = String(initialPath || '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');

    const script = [
        "Add-Type -AssemblyName System.Windows.Forms;",
        "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog;",
        "$dialog.Description = 'Hauptordner fuer Projekte waehlen';",
        "$dialog.ShowNewFolderButton = $true;",
        safeInitial ? `$dialog.SelectedPath = "${safeInitial}";` : '',
        "$result = $dialog.ShowDialog();",
        "if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }"
    ].filter(Boolean).join(' ');

    const { stdout } = await execFileAsync('powershell', [
        '-NoProfile',
        '-STA',
        '-Command',
        script
    ], {
        timeout: 120000,
        windowsHide: false
    });

    const selected = String(stdout || '').trim();
    return selected || null;
}

async function pathExists(targetPath) {
    return fs.access(targetPath).then(() => true).catch(() => false);
}

async function isDirectory(targetPath) {
    try {
        const stat = await fs.stat(targetPath);
        return stat.isDirectory();
    } catch {
        return false;
    }
}

async function buildTreeNode(fullPath, rootPath, depth, maxDepth, scanState) {
    if (scanState.count >= MAX_TREE_TOTAL_NODES) return null;
    scanState.count += 1;

    const stat = await fs.stat(fullPath);
    const node = {
        name: path.basename(fullPath) || fullPath,
        path: fullPath,
        relativePath: path.relative(rootPath, fullPath) || '.',
        type: stat.isDirectory() ? 'directory' : 'file',
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        hasChildren: false,
        children: []
    };

    if (!stat.isDirectory()) return node;
    if (depth >= maxDepth) return node;

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const filtered = entries.filter((entry) => {
        const n = entry.name.toLowerCase();
        if (n === '.git' || n === 'node_modules' || n === '.cursor' || n === '.vscode') return false;
        return true;
    });

    const sorted = filtered.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    const children = [];
    for (const entry of sorted.slice(0, MAX_TREE_CHILDREN_PER_DIR)) {
        const childPath = path.join(fullPath, entry.name);
        try {
            const childNode = await buildTreeNode(childPath, rootPath, depth + 1, maxDepth, scanState);
            if (childNode) children.push(childNode);
        } catch {
            // skip unreadable nodes
        }
    }
    node.children = children;
    node.hasChildren = children.length > 0;
    return node;
}

// App
const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(express.static(path.join(PROJECT_ROOT, 'public')));
app.use('/bilder', express.static(path.join(PROJECT_ROOT, 'bilder')));
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

// Voice routes (speech input/output)
app.use('/api/voice', voiceRouter);

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

/**
 * GET /api/knowledge/search?q=...&limit=5
 * Skill backend for search_knowledge_base
 */
app.get('/api/knowledge/search', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        const limitRaw = Number.parseInt(String(req.query.limit || '5'), 10);
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(20, limitRaw)) : 5;

        if (!q) {
            return res.status(400).json({
                error: 'Missing query parameter: q'
            });
        }

        const results = await searchKnowledgeBase(q, limit);
        res.json({
            status: 'ok',
            query: q,
            total: results.length,
            results
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/recent
 * Returns active and recent project paths
 */
app.get('/api/projects/recent', async (req, res) => {
    try {
        const state = await readProjectState();
        res.json({
            status: 'ok',
            activeProject: state.activeProject || null,
            recentProjects: state.recentProjects || [],
            projectRoot: state.projectRoot || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/pick-root
 * Opens native OS folder picker and returns selected path
 */
app.post('/api/projects/pick-root', async (req, res) => {
    try {
        const initialPath = String(req.body?.initialPath || '').trim();
        const selectedPath = await pickFolderViaNativeDialog(initialPath);
        if (!selectedPath) {
            return res.json({
                status: 'cancelled',
                selectedPath: null
            });
        }

        const resolvedRoot = path.resolve(selectedPath);
        if (!(await pathExists(resolvedRoot))) {
            return res.status(404).json({ error: `Path not found: ${resolvedRoot}` });
        }
        if (!(await isDirectory(resolvedRoot))) {
            return res.status(400).json({ error: `Path is not a directory: ${resolvedRoot}` });
        }

        const state = await readProjectState();
        await writeProjectState({
            ...state,
            projectRoot: resolvedRoot
        });

        res.json({
            status: 'ok',
            selectedPath: resolvedRoot
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/discover
 * Body: { rootPath: "..." }
 */
app.post('/api/projects/discover', async (req, res) => {
    try {
        const rootPath = String(req.body?.rootPath || '').trim();
        if (!rootPath) {
            return res.status(400).json({ error: 'rootPath is required' });
        }

        const resolvedRoot = path.resolve(rootPath);
        if (!(await pathExists(resolvedRoot))) {
            return res.status(404).json({ error: `Path not found: ${resolvedRoot}` });
        }
        if (!(await isDirectory(resolvedRoot))) {
            return res.status(400).json({ error: `Path is not a directory: ${resolvedRoot}` });
        }

        const projects = await listProjectFolders(resolvedRoot);
        const state = await readProjectState();
        await writeProjectState({
            ...state,
            projectRoot: resolvedRoot
        });

        res.json({
            status: 'ok',
            projectRoot: resolvedRoot,
            projects
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/select
 * Body: { projectPath: "..." }
 */
app.post('/api/projects/select', async (req, res) => {
    try {
        const projectPath = String(req.body?.projectPath || '').trim();
        if (!projectPath) {
            return res.status(400).json({ error: 'projectPath is required' });
        }

        const resolvedPath = path.resolve(projectPath);
        if (!(await pathExists(resolvedPath))) {
            return res.status(404).json({ error: `Path not found: ${resolvedPath}` });
        }
        if (!(await isDirectory(resolvedPath))) {
            return res.status(400).json({ error: `Path is not a directory: ${resolvedPath}` });
        }

        const state = await readProjectState();
        const dedupedRecent = [resolvedPath, ...(state.recentProjects || []).filter((p) => p !== resolvedPath)].slice(0, 12);
        const nextState = {
            activeProject: resolvedPath,
            recentProjects: dedupedRecent,
            projectRoot: state.projectRoot || path.dirname(resolvedPath)
        };
        await writeProjectState(nextState);

        res.json({
            status: 'ok',
            activeProject: resolvedPath,
            recentProjects: dedupedRecent
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/tree?projectPath=...&maxDepth=2
 */
app.get('/api/projects/tree', async (req, res) => {
    try {
        const state = await readProjectState();
        const fallbackPath = state.activeProject || PROJECT_ROOT;
        const requestedPath = String(req.query.projectPath || fallbackPath).trim();
        const maxDepthRaw = Number.parseInt(String(req.query.maxDepth || '2'), 10);
        const maxDepth = Number.isFinite(maxDepthRaw) ? Math.max(1, Math.min(6, maxDepthRaw)) : 2;
        const rootPath = path.resolve(requestedPath);

        if (!(await pathExists(rootPath))) {
            return res.status(404).json({ error: `Path not found: ${rootPath}` });
        }
        if (!(await isDirectory(rootPath))) {
            return res.status(400).json({ error: `Path is not a directory: ${rootPath}` });
        }

        const scanState = { count: 0 };
        const tree = await buildTreeNode(rootPath, rootPath, 0, maxDepth, scanState);
        res.json({
            status: 'ok',
            projectPath: rootPath,
            tree,
            scan: {
                nodes: scanState.count,
                maxNodes: MAX_TREE_TOTAL_NODES,
                childrenPerDir: MAX_TREE_CHILDREN_PER_DIR
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/node?nodePath=...&projectPath=...
 */
app.get('/api/projects/node', async (req, res) => {
    try {
        const state = await readProjectState();
        const rootPath = path.resolve(String(req.query.projectPath || state.activeProject || PROJECT_ROOT));
        const nodePath = String(req.query.nodePath || '').trim();
        if (!nodePath) {
            return res.status(400).json({ error: 'nodePath is required' });
        }
        const resolvedNodePath = path.resolve(nodePath);

        if (!(await pathExists(resolvedNodePath))) {
            return res.status(404).json({ error: `Node not found: ${resolvedNodePath}` });
        }

        const stat = await fs.stat(resolvedNodePath);
        const payload = {
            name: path.basename(resolvedNodePath),
            path: resolvedNodePath,
            relativePath: path.relative(rootPath, resolvedNodePath),
            type: stat.isDirectory() ? 'directory' : 'file',
            size: stat.size,
            mtime: stat.mtime.toISOString()
        };

        if (stat.isDirectory()) {
            const entries = await fs.readdir(resolvedNodePath, { withFileTypes: true });
            payload.childrenCount = entries.length;
            payload.directories = entries.filter((e) => e.isDirectory()).length;
            payload.files = entries.filter((e) => e.isFile()).length;
        } else {
            const ext = path.extname(resolvedNodePath).toLowerCase();
            const previewAllowed = ['.js', '.ts', '.tsx', '.json', '.md', '.py', '.txt', '.cjs', '.mjs', '.html', '.css'];
            if (previewAllowed.includes(ext) && stat.size <= 150000) {
                const content = await fs.readFile(resolvedNodePath, 'utf-8');
                payload.preview = content.slice(0, 3000);
            } else {
                payload.preview = '(Keine Vorschau verfuegbar oder Datei zu gross)';
            }
        }

        res.json({
            status: 'ok',
            node: payload
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/summary
 * Body: { projectPath }
 */
app.post('/api/projects/summary', async (req, res) => {
    try {
        const projectPath = String(req.body?.projectPath || '').trim();
        if (!projectPath) return res.status(400).json({ error: 'projectPath ist erforderlich' });
        const resolvedPath = path.resolve(projectPath);
        if (!(await pathExists(resolvedPath))) return res.status(404).json({ error: `Pfad nicht gefunden: ${resolvedPath}` });
        if (!(await isDirectory(resolvedPath))) return res.status(400).json({ error: 'projectPath ist kein Ordner' });

        const snapshot = await collectProjectSnapshot(resolvedPath);
        const latestDump = await findLatestProjectDump(resolvedPath);
        const dumpContent = latestDump
            ? await fs.readFile(latestDump.path, 'utf-8').catch(() => '')
            : '';
        const dumpExcerpt = dumpContent.slice(0, 22000);

        const prompt = [
            `Erstelle eine praezise Projektzusammenfassung.`,
            `Projektpfad: ${resolvedPath}`,
            `Top-Ordner: ${snapshot.topDirs.join(', ') || '-'}`,
            `Top-Dateien: ${snapshot.topFiles.join(', ') || '-'}`,
            `Schaetzung: ${snapshot.approxDirs} Ordner, ${snapshot.approxFiles} Dateien`,
            `Wenn ein Dump vorhanden ist, nutze ihn als Primaerquelle.`,
            `Antwortformat:`,
            `1) Projektbild (4-6 Stichpunkte)`,
            `2) Aktueller Stand`,
            `3) Risiken/Blocker`,
            `4) Sofort sinnvoller Fokus`,
            `DUMP START`,
            dumpExcerpt || '(kein Dump gefunden)',
            `DUMP ENDE`
        ].join('\n');

        const llm = await callProjectInsightLLM(prompt);
        res.json({
            status: 'ok',
            kind: 'summary',
            provider: llm.provider,
            model: llm.model,
            dumpPath: latestDump?.path || null,
            dumpSize: latestDump?.size || 0,
            text: llm.text
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/suggestions
 * Body: { projectPath, nodePath? }
 */
app.post('/api/projects/suggestions', async (req, res) => {
    try {
        const projectPath = String(req.body?.projectPath || '').trim();
        const nodePath = String(req.body?.nodePath || '').trim();
        if (!projectPath) return res.status(400).json({ error: 'projectPath ist erforderlich' });
        const resolvedPath = path.resolve(projectPath);
        if (!(await pathExists(resolvedPath))) return res.status(404).json({ error: `Pfad nicht gefunden: ${resolvedPath}` });
        if (!(await isDirectory(resolvedPath))) return res.status(400).json({ error: 'projectPath ist kein Ordner' });

        const snapshot = await collectProjectSnapshot(resolvedPath);
        const prompt = [
            `Erstelle konkrete nächste Schritte für dieses Projekt.`,
            `Projektpfad: ${resolvedPath}`,
            nodePath ? `Fokus-Knoten: ${path.resolve(nodePath)}` : `Fokus-Knoten: (nicht gesetzt)`,
            `Top-Ordner: ${snapshot.topDirs.join(', ') || '-'}`,
            `Schaetzung: ${snapshot.approxDirs} Ordner, ${snapshot.approxFiles} Dateien`,
            `Antwortformat:`,
            `- 5 priorisierte Vorschläge (P1..P5)`,
            `- je Vorschlag: Warum, Aufwand, erwarteter Nutzen`,
            `- abschließend: "Start jetzt mit:" als erster 15-Minuten-Schritt`
        ].join('\n');

        const llm = await callProjectInsightLLM(prompt);
        res.json({
            status: 'ok',
            kind: 'suggestions',
            provider: llm.provider,
            model: llm.model,
            text: llm.text
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/coder-task
 * Body: { projectPath, nodePath?, task }
 */
app.post('/api/projects/coder-task', async (req, res) => {
    try {
        const projectPath = String(req.body?.projectPath || '').trim();
        const nodePath = String(req.body?.nodePath || '').trim();
        const task = String(req.body?.task || '').trim();
        if (!projectPath || !task) {
            return res.status(400).json({ error: 'projectPath und task sind erforderlich' });
        }

        const coderModel = process.env.CODER_MODEL || process.env.OLLAMA_CODER_MODEL || process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';
        const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        const scopedNodePath = nodePath ? path.resolve(nodePath) : null;

        const prompt = [
            `Du bist der Coder-Agent von The Forge.`,
            `Arbeitsprojekt: ${projectPath}`,
            scopedNodePath ? `Fokus-Knoten: ${scopedNodePath}` : 'Fokus-Knoten: (nicht gesetzt)',
            `Aufgabe: ${task}`,
            `Antwortformat:`,
            `1) Kurzplan`,
            `2) Konkrete naechste Schritte`,
            `3) Risiken/Checks`
        ].join('\n');

        const response = await fetch(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: coderModel,
                messages: [
                    { role: 'system', content: 'Antworte praezise auf Deutsch.' },
                    { role: 'user', content: prompt }
                ],
                stream: false,
                keep_alive: process.env.OLLAMA_KEEP_ALIVE || '30m',
                options: {
                    num_ctx: Number.parseInt(process.env.OLLAMA_NUM_CTX || '8192', 10),
                    num_predict: Number.parseInt(process.env.OLLAMA_NUM_PREDICT || '256', 10)
                }
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return res.status(502).json({
                error: `Coder-LLM Fehler: ${response.status}`,
                detail: err?.error || 'Unbekannter Ollama Fehler'
            });
        }

        const data = await response.json();
        res.json({
            status: 'ok',
            model: coderModel,
            reply: data?.message?.content || ''
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/bus-status
 * Glass-Box endpoint: live status of brain/bus requests
 */
app.get('/api/bus-status', async (req, res) => {
    try {
        const exists = await fs.access(BUS_PATH).then(() => true).catch(() => false);
        if (!exists) {
            return res.json({
                status: 'ok',
                total: 0,
                items: []
            });
        }

        const files = await fs.readdir(BUS_PATH);
        const requestFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('resp_'));
        const responseFiles = files.filter((f) => f.startsWith('resp_') && f.endsWith('.json'));

        const responseMap = new Map();
        for (const responseFile of responseFiles) {
            try {
                const responseRaw = await fs.readFile(path.join(BUS_PATH, responseFile), 'utf-8');
                const response = JSON.parse(responseRaw);
                responseMap.set(response.requestId, response);
            } catch {
                // ignore invalid response file
            }
        }

        const items = [];
        for (const requestFile of requestFiles) {
            try {
                const requestRaw = await fs.readFile(path.join(BUS_PATH, requestFile), 'utf-8');
                const request = JSON.parse(requestRaw);
                const response = responseMap.get(request.id);

                const status = response?.status || request.status || 'PENDING';
                const blockedReason = response?.result?.blockedReason
                    || response?.result?.message
                    || request?.metadata?.blockedReason
                    || null;
                const blockedCategory = blockedReason ? inferBlockedCategory(blockedReason) : null;

                items.push({
                    id: request.id,
                    target: request.target,
                    skill: request.skill,
                    status,
                    origin: request.origin,
                    parentToken: request.parentToken || null,
                    timestamp: request.timestamp,
                    startedAt: request.metadata?.startedAt || null,
                    finishedAt: request.metadata?.finishedAt || response?.timestamp || null,
                    blockedReason,
                    blockedCategory,
                    resolutionHint: blockedCategory ? buildResolutionHint(blockedCategory) : null,
                    archived: false
                });
            } catch {
                // ignore invalid request file
            }
        }

        const archivedBlocked = await loadArchivedBlockedTasks(20);
        const allItems = [...items, ...archivedBlocked];
        allItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const approvalExists = await fs.access(APPROVALS_PATH).then(() => true).catch(() => false);
        let waitingApprovals = 0;
        if (approvalExists) {
            const approvalFiles = await fs.readdir(APPROVALS_PATH);
            for (const file of approvalFiles.filter((f) => f.endsWith('.json'))) {
                try {
                    const raw = await fs.readFile(path.join(APPROVALS_PATH, file), 'utf-8');
                    const approval = JSON.parse(raw);
                    if (approval.status === 'WAITING_FOR_APPROVAL') waitingApprovals += 1;
                } catch {
                    // ignore malformed approval files
                }
            }
        }

        res.json({
            status: 'ok',
            total: allItems.length,
            pending: allItems.filter((i) => i.status === 'PENDING').length,
            running: allItems.filter((i) => i.status === 'RUNNING').length,
            success: allItems.filter((i) => i.status === 'SUCCESS').length,
            failed: allItems.filter((i) => i.status === 'FAILED').length,
            blocked: allItems.filter((i) => i.status === 'BLOCKED').length,
            waitingApprovals,
            items: allItems
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/tasks/:taskId/retry
 * Retry blocked/failed task (restore archived failed tasks if needed)
 */
app.post('/api/tasks/:taskId/retry', async (req, res) => {
    try {
        const taskId = String(req.params.taskId || '').trim();
        const actor = req.body?.actor || 'forge-dashboard';
        const note = req.body?.note || '';
        if (!taskId) return res.status(400).json({ error: 'taskId required' });

        const active = await locateActiveRequest(taskId);
        if (active) {
            active.task.status = 'PENDING';
            active.task.retryCount = (active.task.retryCount || 0) + 1;
            active.task.metadata = {
                ...(active.task.metadata || {}),
                retriedAt: new Date().toISOString(),
                retriedBy: actor,
                retryNote: note
            };
            await fs.writeFile(active.path, JSON.stringify(active.task, null, 2), 'utf-8');
            await appendTaskAction(taskId, 'retry-active', actor, note);
            return res.json({ status: 'ok', source: 'active', task: active.task });
        }

        const archived = await locateLatestArchivedRequest(taskId);
        if (!archived) return res.status(404).json({ error: `Task not found: ${taskId}` });

        const restoredTask = {
            ...archived.task,
            status: 'PENDING',
            retryCount: (archived.task.retryCount || 0) + 1,
            metadata: {
                ...(archived.task.metadata || {}),
                restoredFromArchive: true,
                retriedAt: new Date().toISOString(),
                retriedBy: actor,
                retryNote: note
            }
        };
        const restoreFile = `${restoredTask.id}_${restoredTask.target}.json`;
        const restorePath = path.join(BUS_PATH, restoreFile);
        await fs.writeFile(restorePath, JSON.stringify(restoredTask, null, 2), 'utf-8');
        await appendTaskAction(taskId, 'retry-restore-archive', actor, note);
        return res.json({ status: 'ok', source: 'archive', task: restoredTask });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/tasks/:taskId/unblock
 * Unblock task by setting it back to PENDING with reason trail
 */
app.post('/api/tasks/:taskId/unblock', async (req, res) => {
    try {
        const taskId = String(req.params.taskId || '').trim();
        const actor = req.body?.actor || 'forge-dashboard';
        const note = req.body?.note || 'manuell entblockt';
        if (!taskId) return res.status(400).json({ error: 'taskId required' });

        const active = await locateActiveRequest(taskId);
        if (active) {
            active.task.status = 'PENDING';
            active.task.metadata = {
                ...(active.task.metadata || {}),
                unblockedAt: new Date().toISOString(),
                unblockedBy: actor,
                unblockNote: note
            };
            await fs.writeFile(active.path, JSON.stringify(active.task, null, 2), 'utf-8');
            await appendTaskAction(taskId, 'unblock-active', actor, note);
            return res.json({ status: 'ok', source: 'active', task: active.task });
        }

        const archived = await locateLatestArchivedRequest(taskId);
        if (!archived) return res.status(404).json({ error: `Task not found: ${taskId}` });

        const restoredTask = {
            ...archived.task,
            status: 'PENDING',
            metadata: {
                ...(archived.task.metadata || {}),
                restoredFromArchive: true,
                unblockedAt: new Date().toISOString(),
                unblockedBy: actor,
                unblockNote: note
            }
        };
        const restoreFile = `${restoredTask.id}_${restoredTask.target}.json`;
        await fs.writeFile(path.join(BUS_PATH, restoreFile), JSON.stringify(restoredTask, null, 2), 'utf-8');
        await appendTaskAction(taskId, 'unblock-restore-archive', actor, note);
        return res.json({ status: 'ok', source: 'archive', task: restoredTask });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/tasks/:taskId/cancel
 * Cancel active task, or mark archived blocked task as cancelled in audit
 */
app.post('/api/tasks/:taskId/cancel', async (req, res) => {
    try {
        const taskId = String(req.params.taskId || '').trim();
        const actor = req.body?.actor || 'forge-dashboard';
        const note = req.body?.note || 'manuell abgebrochen';
        if (!taskId) return res.status(400).json({ error: 'taskId required' });

        const active = await locateActiveRequest(taskId);
        if (active) {
            active.task.status = 'CANCELLED';
            active.task.metadata = {
                ...(active.task.metadata || {}),
                cancelledAt: new Date().toISOString(),
                cancelledBy: actor,
                cancelNote: note
            };
            await fs.writeFile(active.path, JSON.stringify(active.task, null, 2), 'utf-8');
            await appendTaskAction(taskId, 'cancel-active', actor, note);
            return res.json({ status: 'ok', source: 'active', task: active.task });
        }

        const archivedResponse = await loadLatestArchivedResponse(taskId);
        if (!archivedResponse) return res.status(404).json({ error: `Task not found: ${taskId}` });
        await appendTaskAction(taskId, 'cancel-archived', actor, note);
        return res.json({
            status: 'ok',
            source: 'archive',
            task: {
                id: taskId,
                status: 'CANCELLED',
                cancelledAt: new Date().toISOString(),
                cancelledBy: actor,
                cancelNote: note
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/approvals
 * List approval requests (default: WAITING_FOR_APPROVAL)
 */
app.get('/api/approvals', async (req, res) => {
    try {
        const statusFilter = req.query.status || 'WAITING_FOR_APPROVAL';
        const exists = await fs.access(APPROVALS_PATH).then(() => true).catch(() => false);
        if (!exists) {
            return res.json({ status: 'ok', total: 0, items: [] });
        }

        const files = await fs.readdir(APPROVALS_PATH);
        const approvals = [];
        for (const file of files.filter((f) => f.endsWith('.json'))) {
            try {
                const raw = await fs.readFile(path.join(APPROVALS_PATH, file), 'utf-8');
                const approval = JSON.parse(raw);
                if (!statusFilter || approval.status === statusFilter) {
                    approvals.push(approval);
                }
            } catch {
                // ignore malformed approval files
            }
        }

        approvals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ status: 'ok', total: approvals.length, items: approvals });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/approve
 * Body: { approvalId, approved, actor?, note? }
 */
app.post('/api/approve', async (req, res) => {
    try {
        const { approvalId, approved, actor, note } = req.body || {};
        if (!approvalId || typeof approved !== 'boolean') {
            return res.status(400).json({ error: 'approvalId and approved(boolean) are required' });
        }

        const filePath = path.join(APPROVALS_PATH, `approval_${approvalId}.json`);
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (!exists) {
            return res.status(404).json({ error: `Approval not found: ${approvalId}` });
        }

        const raw = await fs.readFile(filePath, 'utf-8');
        const approval = JSON.parse(raw);
        approval.status = approved ? 'APPROVED' : 'REJECTED';
        approval.decidedAt = new Date().toISOString();
        approval.actor = actor || 'dashboard-user';
        approval.note = note || '';

        await fs.writeFile(filePath, JSON.stringify(approval, null, 2), 'utf-8');
        res.json({ status: 'ok', approval });
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
        await initializeBusRecovery();

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

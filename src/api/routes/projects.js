/**
 * Projects Routes - Project creation and management
 */

import express from 'express';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_FILE = path.join(__dirname, '../../../brain/state/projects.json');

// Erlaubte Root-Pfade (Whitelist)
const ALLOWED_ROOT_PATHS = [
    'E:\\_____1111____Projekte-Programmierung\\Antigravity',
    'E:\\Projekte',
    'C:\\Users',
    'D:\\Projects'
];

// Validiert und bereinigt den Projektpfad
function validateProjectPath(projectPath) {
    // Normalisiere den Pfad
    const normalized = path.normalize(projectPath);
    
    // Prüfe auf Path Traversal (..)
    if (normalized.includes('..')) {
        throw new Error('Path traversal detected: Pfad enthält unerlaubte ".." Sequenzen');
    }
    
    // Prüfe ob Pfad in Whitelist
    const isAllowed = ALLOWED_ROOT_PATHS.some(allowed => 
        normalized.toLowerCase().startsWith(allowed.toLowerCase())
    );
    
    if (!isAllowed) {
        throw new Error(`Pfad nicht erlaubt: ${normalized}. Erlaubte Pfade: ${ALLOWED_ROOT_PATHS.join(', ')}`);
    }
    
    return normalized;
}

// Lädt alle Projekte
async function loadProjects() {
    try {
        const data = await fs.readFile(PROJECTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        // Datei existiert nicht oder ist leer
        return { projects: [], lastUpdated: new Date().toISOString() };
    }
}

// Speichert Projekte
async function saveProjects(data) {
    // Stelle sicher dass das Verzeichnis existiert
    await fs.mkdir(path.dirname(PROJECTS_FILE), { recursive: true });
    data.lastUpdated = new Date().toISOString();
    await fs.writeFile(PROJECTS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * GET /api/projects
 * List all projects
 */
router.get('/', async (req, res) => {
    try {
        const data = await loadProjects();
        res.json({
            success: true,
            projects: data.projects || [],
            count: (data.projects || []).length
        });
    } catch (error) {
        console.error(chalk.red(`[Projects Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/create
 * Create a new project
 */
router.post('/create', async (req, res) => {
    try {
        const { name, targetPath, template = 'minimal', force = false } = req.body;

        // Validierung
        if (!name || !targetPath) {
            return res.status(400).json({
                error: 'name und targetPath sind erforderlich'
            });
        }

        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({
                error: 'Projektname muss zwischen 2 und 100 Zeichen lang sein'
            });
        }

        // Validiere Pfad
        const validatedPath = validateProjectPath(targetPath);
        const fullPath = path.join(validatedPath, name);

        // Prüfe ob Verzeichnis bereits existiert
        try {
            await fs.access(fullPath);
            if (!force) {
                return res.status(409).json({
                    error: `Projektverzeichnis existiert bereits: ${fullPath}`,
                    hint: 'Verwende force: true zum Überschreiben (ACHTUNG: Daten werden gelöscht!)'
                });
            }
            // Lösche existierendes Verzeichnis bei force=true
            await fs.rm(fullPath, { recursive: true, force: true });
        } catch (e) {
            // Verzeichnis existiert nicht - das ist gut
        }

        // Erstelle Projektverzeichnis
        await fs.mkdir(fullPath, { recursive: true });

        // Template-Struktur erstellen
        await createTemplateStructure(fullPath, template, name);

        // In Projektliste eintragen
        const projectsData = await loadProjects();
        const newProject = {
            id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            path: fullPath,
            template,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active'
        };

        // Prüfe ob Projekt bereits existiert
        const existingIndex = projectsData.projects.findIndex(p => p.path === fullPath);
        if (existingIndex >= 0) {
            projectsData.projects[existingIndex] = newProject;
        } else {
            projectsData.projects.push(newProject);
        }

        await saveProjects(projectsData);

        console.log(chalk.green(`[Project Created] ${name} at ${fullPath}`));

        res.json({
            success: true,
            project: newProject,
            message: `Projekt "${name}" erfolgreich erstellt`
        });

    } catch (error) {
        console.error(chalk.red(`[Project Create Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * Erstellt die Template-Struktur für ein neues Projekt
 */
async function createTemplateStructure(projectPath, template, projectName) {
    const templates = {
        minimal: {
            dirs: ['docs', 'src'],
            files: {
                'README.md': `# ${projectName}\n\nProjekt erstellt am ${new Date().toLocaleDateString('de-DE')}.\n`,
                'ROADMAP.md': `# ROADMAP: ${projectName}\n\n## Phase 1: Setup\n- [ ] Initiale Konfiguration\n- [ ] Grundstruktur aufbauen\n\n## Phase 2: Entwicklung\n- [ ] Kernfunktionalität implementieren\n\n## Phase 3: Fertigstellung\n- [ ] Testing\n- [ ] Dokumentation\n`,
                'docs/INITIAL_TASKS.md': `# Initiale Tasks\n\n1. Projekt-Setup verifizieren\n2. Erste Anforderungen definieren\n3. Architektur planen\n`
            }
        },
        'web-app': {
            dirs: ['docs', 'src', 'public', 'tests', 'config'],
            files: {
                'README.md': `# ${projectName}\n\nWeb-Applikation erstellt am ${new Date().toLocaleDateString('de-DE')}.\n\n## Technologie-Stack\n- Frontend: TBD\n- Backend: TBD\n- Datenbank: TBD\n`,
                'ROADMAP.md': `# ROADMAP: ${projectName}\n\n## Phase 1: Setup & Planung\n- [ ] Technologie-Stack festlegen\n- [ ] UI/UX Design\n- [ ] Datenbank-Schema\n\n## Phase 2: Backend\n- [ ] API-Endpoints definieren\n- [ ] Datenbank-Setup\n- [ ] Authentifizierung\n\n## Phase 3: Frontend\n- [ ] Komponenten-Struktur\n- [ ] UI Implementierung\n- [ ] State Management\n\n## Phase 4: Testing & Deployment\n- [ ] Unit Tests\n- [ ] Integration Tests\n- [ ] Deployment vorbereiten\n`,
                'docs/INITIAL_TASKS.md': `# Initiale Tasks\n\n1. Tech-Stack entscheiden (React/Vue/Angular?)\n2. Datenbank wählen\n3. Erste User Stories definieren\n4. Wireframes erstellen\n`,
                'package.json': JSON.stringify({
                    name: projectName.toLowerCase().replace(/\s+/g, '-'),
                    version: '0.1.0',
                    description: `${projectName} - Web Application`,
                    scripts: {
                        dev: 'echo "Dev-Server hier konfigurieren"',
                        build: 'echo "Build-Script hier konfigurieren"',
                        test: 'echo "Tests hier konfigurieren"'
                    },
                    keywords: [],
                    author: '',
                    license: 'ISC'
                }, null, 2)
            }
        },
        'api-only': {
            dirs: ['docs', 'src', 'tests', 'config'],
            files: {
                'README.md': `# ${projectName}\n\nAPI-Service erstellt am ${new Date().toLocaleDateString('de-DE')}.\n\n## API-Spezifikation\n- Version: 1.0.0\n- Base URL: /api/v1\n`,
                'ROADMAP.md': `# ROADMAP: ${projectName}\n\n## Phase 1: API Design\n- [ ] OpenAPI/Swagger Spec\n- [ ] Endpoint-Planung\n- [ ] Authentifizierungs-Strategie\n\n## Phase 2: Implementierung\n- [ ] Core Endpoints\n- [ ] Middleware\n- [ ] Error Handling\n\n## Phase 3: Testing & Dokumentation\n- [ ] API Tests\n- [ ] Dokumentation\n- [ ] Performance-Optimierung\n`,
                'docs/INITIAL_TASKS.md': `# Initiale Tasks\n\n1. API-Framework wählen (Express/FastAPI/etc.)\n2. Datenbank wählen\n3. Erste Endpoints definieren\n4. Auth-Strategie festlegen\n`,
                'package.json': JSON.stringify({
                    name: projectName.toLowerCase().replace(/\s+/g, '-'),
                    version: '0.1.0',
                    description: `${projectName} - API Service`,
                    main: 'src/index.js',
                    scripts: {
                        start: 'echo "Start-Script hier konfigurieren"',
                        dev: 'echo "Dev-Script hier konfigurieren"',
                        test: 'echo "Tests hier konfigurieren"'
                    },
                    keywords: ['api'],
                    author: '',
                    license: 'ISC'
                }, null, 2)
            }
        },
        'agent-skill': {
            dirs: ['docs', 'src', 'tests'],
            files: {
                'README.md': `# ${projectName}\n\nTAIA Agent Skill erstellt am ${new Date().toLocaleDateString('de-DE')}.\n\n## Skill-Typ\n- Kategorie: TBD\n- Trigger: TBD\n`,
                'SKILL.md': `# Skill Spezifikation: ${projectName}\n\n## Zweck\nBeschreibe hier, was dieser Skill tut.\n\n## Trigger\n- Keywords: []\n- Intents: []\n\n## Inputs\nBeschreibe erwartete Eingaben.\n\n## Outputs\nBeschreibe erzeugte Ausgaben.\n\n## Abhängigkeiten\n- []\n\n## Definition of Done\n- [ ] Implementierung\n- [ ] Tests\n- [ ] Dokumentation\n`,
                'ROADMAP.md': `# ROADMAP: ${projectName}\n\n## Phase 1: Skill Design\n- [ ] Zweck definieren\n- [ ] Trigger festlegen\n- [ ] Input/Output spezifizieren\n\n## Phase 2: Implementierung\n- [ ] Core-Logik\n- [ ] Error Handling\n- [ ] Logging\n\n## Phase 3: Integration\n- [ ] Agent Bus Anbindung\n- [ ] Tests\n- [ ] Dokumentation\n`,
                'docs/INITIAL_TASKS.md': `# Initiale Tasks\n\n1. Skill-Zweck definieren\n2. Trigger-Keywords festlegen\n3. Integration mit Agent Bus planen\n4. Erste Implementierung schreiben\n`
            }
        }
    };

    const selectedTemplate = templates[template] || templates.minimal;

    // Erstelle Verzeichnisse
    for (const dir of selectedTemplate.dirs) {
        await fs.mkdir(path.join(projectPath, dir), { recursive: true });
    }

    // Erstelle Dateien
    for (const [filePath, content] of Object.entries(selectedTemplate.files)) {
        const fullFilePath = path.join(projectPath, filePath);
        await fs.mkdir(path.dirname(fullFilePath), { recursive: true });
        await fs.writeFile(fullFilePath, content, 'utf8');
    }
}

/**
 * POST /api/projects/test
 * Create a test project automatically
 */
router.post('/test', async (req, res) => {
    try {
        const testProjectName = 'Testprojekt-Orchestrierung';
        const testProjectPath = 'E:\\_____1111____Projekte-Programmierung\\Antigravity';
        
        // Prüfe ob Testprojekt bereits existiert
        const projectsData = await loadProjects();
        const existingTest = projectsData.projects.find(p => 
            p.name === testProjectName || p.path.includes('Testprojekt-Orchestrierung')
        );

        if (existingTest) {
            return res.json({
                success: true,
                project: existingTest,
                message: 'Testprojekt existiert bereits',
                created: false
            });
        }

        // Erstelle Testprojekt
        req.body = {
            name: testProjectName,
            targetPath: testProjectPath,
            template: 'web-app'
        };

        // Re-use create logic
        const createHandler = router.stack.find(r => 
            r.route && r.route.path === '/create' && r.route.methods.post
        );
        
        // Manuelle Projekterstellung
        const fullPath = path.join(testProjectPath, testProjectName);
        
        try {
            await fs.access(fullPath);
            await fs.rm(fullPath, { recursive: true, force: true });
        } catch (e) {
            // Existiert nicht - gut
        }

        await fs.mkdir(fullPath, { recursive: true });
        await createTemplateStructure(fullPath, 'web-app', testProjectName);

        const newProject = {
            id: `proj_test_${Date.now()}`,
            name: testProjectName,
            path: fullPath,
            template: 'web-app',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active',
            isTestProject: true
        };

        projectsData.projects.push(newProject);
        await saveProjects(projectsData);

        console.log(chalk.green(`[Test Project Created] ${testProjectName}`));

        res.json({
            success: true,
            project: newProject,
            message: `Testprojekt "${testProjectName}" erfolgreich erstellt`,
            created: true
        });

    } catch (error) {
        console.error(chalk.red(`[Test Project Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/recent
 * Get recent projects (for project overview)
 */
router.get('/recent', async (req, res) => {
    try {
        const data = await loadProjects();
        const recent = (data.projects || [])
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 10);
        
        res.json({
            status: 'ok',
            recent
        });
    } catch (error) {
        console.error(chalk.red(`[Projects Recent Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/select
 * Select a project as active
 */
router.post('/select', async (req, res) => {
    try {
        const { projectPath } = req.body;
        if (!projectPath) {
            return res.status(400).json({ error: 'projectPath required' });
        }
        
        const data = await loadProjects();
        const project = data.projects.find(p => p.path === projectPath);
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Update last accessed
        project.updatedAt = new Date().toISOString();
        await saveProjects(data);
        
        res.json({
            status: 'ok',
            project
        });
    } catch (error) {
        console.error(chalk.red(`[Project Select Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/tree
 * Get project directory tree
 */
router.get('/tree', async (req, res) => {
    try {
        const projectPath = req.query.projectPath;
        if (!projectPath) {
            return res.status(400).json({ error: 'projectPath required' });
        }
        
        const validatedPath = validateProjectPath(projectPath);
        
        // Check if directory exists
        try {
            await fs.access(validatedPath);
        } catch {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Build tree recursively
        async function buildTree(dirPath, depth = 0, maxDepth = 3) {
            if (depth > maxDepth) return null;
            
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            const items = [];
            
            for (const entry of entries) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                
                const fullPath = path.join(dirPath, entry.name);
                const item = {
                    name: entry.name,
                    path: fullPath,
                    type: entry.isDirectory() ? 'directory' : 'file'
                };
                
                if (entry.isDirectory() && depth < maxDepth) {
                    item.children = await buildTree(fullPath, depth + 1, maxDepth);
                }
                
                items.push(item);
            }
            
            return items.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'directory' ? -1 : 1;
            });
        }
        
        const tree = await buildTree(validatedPath);
        
        res.json({
            status: 'ok',
            projectPath: validatedPath,
            tree
        });
    } catch (error) {
        console.error(chalk.red(`[Project Tree Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/projects/node
 * Get specific node info
 */
router.get('/node', async (req, res) => {
    try {
        const { projectPath, nodePath } = req.query;
        if (!nodePath) {
            return res.status(400).json({ error: 'nodePath required' });
        }
        
        const validatedPath = validateProjectPath(nodePath);
        
        try {
            await fs.access(validatedPath);
        } catch {
            return res.status(404).json({ error: 'Node not found' });
        }
        
        const stat = await fs.stat(validatedPath);
        const isDirectory = stat.isDirectory();
        
        const node = {
            name: path.basename(validatedPath),
            path: validatedPath,
            relativePath: projectPath ? path.relative(projectPath, validatedPath) : validatedPath,
            type: isDirectory ? 'directory' : 'file',
            size: stat.size,
            mtime: stat.mtime.toISOString()
        };
        
        if (isDirectory) {
            const entries = await fs.readdir(validatedPath, { withFileTypes: true });
            node.childrenCount = entries.length;
        } else {
            // Preview for text files
            const ext = path.extname(validatedPath).toLowerCase();
            const textExts = ['.js', '.ts', '.json', '.md', '.txt', '.html', '.css'];
            if (textExts.includes(ext) && stat.size < 50000) {
                node.preview = await fs.readFile(validatedPath, 'utf8');
            }
        }
        
        res.json({
            status: 'ok',
            node
        });
    } catch (error) {
        console.error(chalk.red(`[Project Node Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/projects/coder-task
 * Send a task to the coder agent
 */
router.post('/coder-task', async (req, res) => {
    try {
        const { projectPath, task, mode = 'plan' } = req.body;
        
        if (!task) {
            return res.status(400).json({ error: 'task required' });
        }
        
        // Get agent bus from app locals
        const agentBus = req.app?.locals?.agentBus;
        
        if (!agentBus) {
            return res.status(503).json({ 
                status: 'error',
                message: 'Agent Bus not available' 
            });
        }
        
        // Delegate to backend agent
        const request = await agentBus.delegateTask(
            'taia-core',
            'agent-backend',
            'WRITE_API_CODE',
            {
                projectPath,
                task,
                mode,
                timestamp: new Date().toISOString()
            }
        );
        
        res.json({
            status: 'ok',
            message: 'Task delegated to agent-backend',
            requestId: request.id
        });
    } catch (error) {
        console.error(chalk.red(`[Coder Task Error]: ${error.message}`));
        res.status(500).json({ 
            status: 'error',
            message: error.message 
        });
    }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const projectsData = await loadProjects();
        
        const projectIndex = projectsData.projects.findIndex(p => p.id === id);
        if (projectIndex === -1) {
            return res.status(404).json({ error: 'Projekt nicht gefunden' });
        }

        const project = projectsData.projects[projectIndex];

        // Lösche Verzeichnis
        try {
            await fs.rm(project.path, { recursive: true, force: true });
        } catch (e) {
            console.warn(chalk.yellow(`[Project Delete Warning]: Konnte Verzeichnis nicht löschen: ${e.message}`));
        }

        // Entferne aus Liste
        projectsData.projects.splice(projectIndex, 1);
        await saveProjects(projectsData);

        console.log(chalk.yellow(`[Project Deleted] ${project.name}`));

        res.json({
            success: true,
            message: `Projekt "${project.name}" gelöscht`
        });

    } catch (error) {
        console.error(chalk.red(`[Project Delete Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

export default router;

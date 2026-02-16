/**
 * Orchestrator Routes - Mode switching and management
 */

import express from 'express';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ORCHESTRATOR_FILE = path.join(__dirname, '../../../brain/state/orchestrator.json');

// Erlaubte Orchestrator-Modi
const ALLOWED_MODES = ['coder_llm', 'openclaw'];

/**
 * Lädt aktuelle Orchestrator-Konfiguration
 */
async function loadOrchestratorConfig() {
    try {
        const data = await fs.readFile(ORCHESTRATOR_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        // Standardkonfiguration
        return {
            mode: 'coder_llm',
            version: '1.0.0',
            lastChanged: new Date().toISOString(),
            history: []
        };
    }
}

/**
 * Speichert Orchestrator-Konfiguration
 */
async function saveOrchestratorConfig(config) {
    await fs.mkdir(path.dirname(ORCHESTRATOR_FILE), { recursive: true });
    await fs.writeFile(ORCHESTRATOR_FILE, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * GET /api/orchestrator/mode
 * Get current orchestrator mode
 */
router.get('/mode', async (req, res) => {
    try {
        const config = await loadOrchestratorConfig();
        res.json({
            success: true,
            mode: config.mode,
            availableModes: ALLOWED_MODES,
            lastChanged: config.lastChanged,
            description: getModeDescription(config.mode)
        });
    } catch (error) {
        console.error(chalk.red(`[Orchestrator Get Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/orchestrator/mode
 * Set orchestrator mode
 */
router.post('/mode', async (req, res) => {
    try {
        const { mode } = req.body;

        if (!mode) {
            return res.status(400).json({
                error: 'mode ist erforderlich',
                availableModes: ALLOWED_MODES
            });
        }

        if (!ALLOWED_MODES.includes(mode)) {
            return res.status(400).json({
                error: `Ungültiger Modus: ${mode}`,
                availableModes: ALLOWED_MODES
            });
        }

        const config = await loadOrchestratorConfig();
        const oldMode = config.mode;

        // Speichere History
        config.history.push({
            from: oldMode,
            to: mode,
            timestamp: new Date().toISOString()
        });

        // Beschränke History auf letzte 10 Einträge
        if (config.history.length > 10) {
            config.history = config.history.slice(-10);
        }

        config.mode = mode;
        config.lastChanged = new Date().toISOString();
        await saveOrchestratorConfig(config);

        console.log(chalk.blue(`[Orchestrator Switch] ${oldMode} → ${mode}`));

        res.json({
            success: true,
            mode: mode,
            previousMode: oldMode,
            message: `Orchestrator auf "${mode}" umgeschaltet`,
            description: getModeDescription(mode)
        });

    } catch (error) {
        console.error(chalk.red(`[Orchestrator Set Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/orchestrator/status
 * Get detailed orchestrator status
 */
router.get('/status', async (req, res) => {
    try {
        const config = await loadOrchestratorConfig();
        res.json({
            success: true,
            current: {
                mode: config.mode,
                description: getModeDescription(config.mode),
                version: config.version,
                lastChanged: config.lastChanged
            },
            available: ALLOWED_MODES.map(m => ({
                mode: m,
                description: getModeDescription(m)
            })),
            history: config.history || []
        });
    } catch (error) {
        console.error(chalk.red(`[Orchestrator Status Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * Beschreibung für jeden Modus
 */
function getModeDescription(mode) {
    const descriptions = {
        'coder_llm': 'Standard LLM-basierter Orchestrator. Direkte Code-Generierung und Task-Verwaltung.',
        'openclaw': 'OpenClaw-basierter Orchestrator. Modulare Agent-Orchestrierung mit Skill-Dispatch.'
    };
    return descriptions[mode] || 'Unbekannter Modus';
}

export default router;

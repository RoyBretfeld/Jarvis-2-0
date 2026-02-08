/**
 * Config Routes - Model and provider management
 */

import express from 'express';
import chalk from 'chalk';
import { llmConfig } from './chat.js';

const router = express.Router();

// State
let currentProvider = process.env.GROQ_API_KEY ? 'groq' : 'ollama';
let currentModel = process.env.GROQ_API_KEY ?
    llmConfig.groq.model : llmConfig.ollama.model;

/**
 * GET /api/models
 * List available models from all providers
 */
router.get('/models', async (req, res) => {
    try {
        const models = [];

        // Ollama models (local)
        try {
            const response = await fetch(`${llmConfig.ollama.baseUrl}/api/tags`);
            if (response.ok) {
                const data = await response.json();
                (data.models || []).forEach(m => {
                    models.push({
                        id: m.name,
                        name: m.name.split(':')[0],
                        provider: 'ollama',
                        icon: '🖥️',
                        active: currentProvider === 'ollama' && currentModel === m.name
                    });
                });
            }
        } catch (e) {
            console.log(chalk.gray('[Ollama] Not available'));
        }

        // Groq models (cloud)
        if (llmConfig.groq.apiKey) {
            try {
                const response = await fetch(`${llmConfig.groq.baseUrl}/models`, {
                    headers: {
                        'Authorization': `Bearer ${llmConfig.groq.apiKey}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    (data.data || []).forEach(m => {
                        models.push({
                            id: m.id,
                            name: m.id,
                            provider: 'groq',
                            icon: '☁️',
                            active: currentProvider === 'groq' && currentModel === m.id
                        });
                    });
                }
            } catch (e) {
                console.log(chalk.gray('[Groq] API error'));
            }
        }

        res.json({
            models,
            current: {
                provider: currentProvider,
                model: currentModel
            }
        });

    } catch (error) {
        console.error(chalk.red(`[Models Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/model
 * Switch active model
 */
router.post('/model', (req, res) => {
    try {
        const { provider, model } = req.body;

        if (!provider || !model) {
            return res.status(400).json({
                error: 'provider and model required'
            });
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

    } catch (error) {
        console.error(chalk.red(`[Model Switch Error]: ${error.message}`));
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/config
 * Get current configuration
 */
router.get('/config', (req, res) => {
    res.json({
        current_provider: currentProvider,
        current_model: currentModel,
        providers: {
            ollama: {
                url: llmConfig.ollama.baseUrl,
                available: !!llmConfig.ollama.baseUrl
            },
            groq: {
                url: llmConfig.groq.baseUrl,
                available: !!llmConfig.groq.apiKey
            }
        }
    });
});

export default router;
export { currentProvider, currentModel };

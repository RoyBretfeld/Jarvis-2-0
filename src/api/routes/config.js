/**
 * Config Routes - Model and provider management
 */

import express from 'express';
import chalk from 'chalk';
import { llmConfig, getActiveLLMSelection, setActiveLLMSelection } from './chat.js';

const router = express.Router();

/**
 * GET /api/models
 * List available models from all providers
 */
router.get('/models', async (req, res) => {
    try {
        const models = [];
        const seen = new Set();
        const activeSelection = getActiveLLMSelection();

        // Ollama models (local)
        try {
            const response = await fetch(`${llmConfig.ollama.baseUrl}/api/tags`);
            if (response.ok) {
                const data = await response.json();
                (data.models || []).forEach(m => {
                    const key = `ollama:${m.name}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    models.push({
                        id: m.name,
                        name: m.name,
                        provider: 'ollama',
                        icon: '🖥️',
                        active: activeSelection.provider === 'ollama' && activeSelection.model === m.name
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
                    const key = `groq:${m.id}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                        models.push({
                            id: m.id,
                            name: m.id,
                            provider: 'groq',
                            icon: '☁️',
                        active: activeSelection.provider === 'groq' && activeSelection.model === m.id
                        });
                    });
                }
            } catch (e) {
                console.log(chalk.gray('[Groq] API error'));
            }
        }

        res.json({
            models,
            current: activeSelection
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

        setActiveLLMSelection(provider, model);

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
    const activeSelection = getActiveLLMSelection();
    res.json({
        current_provider: activeSelection.provider,
        current_model: activeSelection.model,
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

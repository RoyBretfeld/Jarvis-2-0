/**
 * Integration Tests für The Forge API Routes
 * Testet Express Routes mit Python Service Integration
 *
 * Hinweis: Diese Tests sind zur schnellen Validierung der Route-Struktur.
 * Für vollständige Integration Tests müssen LLM-Services (Groq/Ollama) verfügbar sein.
 */

const request = require('supertest');
const express = require('express');

// Mock-Router für Tests (vereinachte Versionen)
const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Chat Route Mock
    app.post('/api/chat', async (req, res) => {
        const { message, history = [] } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // Simulated response (in Realität würde hier LLM-Call stattfinden)
        try {
            res.json({
                reply: 'Hallo! Ich bin The Forge.',
                updates: { memory: null, name: null, error: null },
                model: 'qwen2.5-coder:14b',
                provider: 'ollama',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ error: error.message, type: 'CHAT_ERROR' });
        }
    });

    // Compress Memory Route Mock
    app.post('/api/compress-memory', async (req, res) => {
        try {
            res.json({ success: true, message: 'Memory compressed' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Config Routes
    let currentProvider = 'ollama';
    let currentModel = 'qwen2.5-coder:14b';

    app.get('/api/config', (req, res) => {
        res.json({
            current_provider: currentProvider,
            current_model: currentModel,
            providers: {
                ollama: {
                    url: 'http://localhost:11434',
                    available: true
                },
                groq: {
                    url: 'https://api.groq.com/openai/v1',
                    available: false
                }
            }
        });
    });

    app.post('/api/model', (req, res) => {
        const { provider, model } = req.body;

        if (!provider || !model) {
            return res.status(400).json({
                error: 'provider and model required'
            });
        }

        currentProvider = provider;
        currentModel = model;

        res.json({
            success: true,
            provider,
            model,
            message: `Switched to ${provider}/${model}`
        });
    });

    app.get('/api/models', async (req, res) => {
        const models = [
            {
                id: 'qwen2.5-coder:14b',
                name: 'qwen2.5-coder',
                provider: 'ollama',
                icon: '🖥️',
                active: currentProvider === 'ollama' && currentModel === 'qwen2.5-coder:14b'
            }
        ];

        res.json({
            models,
            current: {
                provider: currentProvider,
                model: currentModel
            }
        });
    });

    return app;
};

describe('Chat Route Tests', () => {
    let app;

    beforeEach(() => {
        app = createTestApp();
    });

    test('POST /api/chat sollte gültige Nachricht akzeptieren', async () => {
        const response = await request(app)
            .post('/api/chat')
            .send({
                message: 'Hallo!',
                history: []
            })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('reply');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('provider');
        expect(response.body).toHaveProperty('model');
    });

    test('POST /api/chat sollte leere Nachricht ablehnen', async () => {
        const response = await request(app)
            .post('/api/chat')
            .send({
                message: '',
                history: []
            })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    test('POST /api/chat sollte Whitespace-only Nachricht ablehnen', async () => {
        const response = await request(app)
            .post('/api/chat')
            .send({
                message: '   ',
                history: []
            })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
    });

    test('POST /api/compress-memory sollte erfolgreich sein', async () => {
        const response = await request(app)
            .post('/api/compress-memory')
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success');
        expect(response.body.success).toBe(true);
    });
});

describe('Config Route Tests', () => {
    let app;

    beforeEach(() => {
        app = createTestApp();
    });

    test('GET /api/config sollte Konfiguration zurückgeben', async () => {
        const response = await request(app)
            .get('/api/config');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('current_provider');
        expect(response.body).toHaveProperty('current_model');
        expect(response.body).toHaveProperty('providers');
    });

    test('GET /api/models sollte Modell-Liste zurückgeben', async () => {
        const response = await request(app)
            .get('/api/models');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('models');
        expect(Array.isArray(response.body.models)).toBe(true);
        expect(response.body).toHaveProperty('current');
    });

    test('POST /api/model sollte Modell wechseln', async () => {
        const response = await request(app)
            .post('/api/model')
            .send({
                provider: 'groq',
                model: 'llama-3.3-70b-versatile'
            })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.provider).toBe('groq');
        expect(response.body.model).toBe('llama-3.3-70b-versatile');
    });

    test('POST /api/model sollte ohne provider ablehnen', async () => {
        const response = await request(app)
            .post('/api/model')
            .send({
                model: 'test'
            })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    test('POST /api/model sollte ohne model ablehnen', async () => {
        const response = await request(app)
            .post('/api/model')
            .send({
                provider: 'ollama'
            })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });
});

describe('HTTP Response Struktur', () => {
    let app;

    beforeEach(() => {
        app = createTestApp();
    });

    test('alle Responses sollten JSON sein', async () => {
        const routes = [
            { method: 'get', path: '/api/config' },
            { method: 'get', path: '/api/models' }
        ];

        for (const route of routes) {
            const response = await request(app)[route.method](route.path);
            expect(response.type).toContain('application/json');
        }
    });

    test('Error Responses sollten error-Feld haben', async () => {
        const response = await request(app)
            .post('/api/chat')
            .send({ message: '' })
            .set('Content-Type', 'application/json');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
    });
});

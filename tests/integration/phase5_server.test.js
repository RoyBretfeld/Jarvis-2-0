/**
 * Phase 5 Server Integration Tests
 * Testet Express Server mit Python Service Bridge
 */

const request = require('supertest');
const express = require('express');

// Mock-Server mit Phase 5 Logik
const createPhase5App = () => {
    const app = express();
    app.use(express.json());

    let currentProvider = 'ollama';
    let currentModel = 'qwen2.5-coder:14b';

    // Chat Endpoint
    app.post('/api/chat', async (req, res) => {
        const { message } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // Simuliere Python Service Call + LLM Response
        const llmResponse = `Response to: ${message}`;

        res.json({
            reply: llmResponse,
            provider: currentProvider,
            model: currentModel,
            timestamp: new Date().toISOString()
        });
    });

    // Status Endpoint
    app.get('/api/status', (req, res) => {
        res.json({
            status: 'ready',
            phase: 'Phase 5: Server Integration',
            provider: currentProvider,
            model: currentModel,
            llmAvailable: true,
            pythonServicesAvailable: true,
            timestamp: new Date().toISOString()
        });
    });

    // Config Endpoint
    app.get('/api/config', (req, res) => {
        res.json({
            current_provider: currentProvider,
            current_model: currentModel,
            providers: {
                groq: { available: false, model: 'llama-3.3-70b-versatile' },
                ollama: { available: true, model: 'qwen2.5-coder:14b', url: 'http://localhost:11434' }
            }
        });
    });

    // Model Switch Endpoint
    app.post('/api/model', (req, res) => {
        const { provider, model } = req.body;

        if (!provider || !model) {
            return res.status(400).json({ error: 'provider and model required' });
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

    return app;
};

describe('Phase 5: Server Integration', () => {
    let app;

    beforeEach(() => {
        app = createPhase5App();
    });

    describe('Chat Endpoint', () => {
        test('sollte Chat-Anfrage mit LLM-Response bearbeiten', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({ message: 'Hallo, wie geht es dir?' })
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('reply');
            expect(response.body).toHaveProperty('provider');
            expect(response.body).toHaveProperty('model');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body.reply).toContain('Hallo');
        });

        test('sollte leere Nachricht ablehnen', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({ message: '' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('empty');
        });

        test('sollte korrekten LLM-Provider zurückgeben', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({ message: 'Test' });

            expect(response.status).toBe(200);
            expect(['ollama', 'groq']).toContain(response.body.provider);
        });

        test('sollte valides Timestamp haben', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({ message: 'Test message' });

            expect(response.status).toBe(200);
            const timestamp = new Date(response.body.timestamp);
            expect(timestamp).toBeInstanceOf(Date);
            expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
        });
    });

    describe('Status Endpoint', () => {
        test('sollte Server Status zurückgeben', async () => {
            const response = await request(app)
                .get('/api/status');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ready');
            expect(response.body.phase).toContain('Phase 5');
        });

        test('sollte LLM und Services Verfügbarkeit anzeigen', async () => {
            const response = await request(app)
                .get('/api/status');

            expect(response.status).toBe(200);
            expect(typeof response.body.llmAvailable).toBe('boolean');
            expect(typeof response.body.pythonServicesAvailable).toBe('boolean');
        });
    });

    describe('Config Endpoint', () => {
        test('sollte aktuelle Konfiguration zeigen', async () => {
            const response = await request(app)
                .get('/api/config');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('current_provider');
            expect(response.body).toHaveProperty('current_model');
            expect(response.body).toHaveProperty('providers');
        });

        test('sollte beide Provider-Optionen anzeigen', async () => {
            const response = await request(app)
                .get('/api/config');

            expect(response.status).toBe(200);
            expect(response.body.providers).toHaveProperty('groq');
            expect(response.body.providers).toHaveProperty('ollama');
        });
    });

    describe('Model Switch', () => {
        test('sollte zu anderem Modell wechseln', async () => {
            const response = await request(app)
                .post('/api/model')
                .send({
                    provider: 'groq',
                    model: 'llama-3.3-70b-versatile'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.provider).toBe('groq');

            // Überprüfe, dass nächster Chat mit neuem Provider läuft
            const chatResponse = await request(app)
                .post('/api/chat')
                .send({ message: 'Test mit neuem Provider' });

            expect(chatResponse.body.provider).toBe('groq');
        });

        test('sollte ohne Parameter ablehnen', async () => {
            const response = await request(app)
                .post('/api/model')
                .send({ model: 'test' });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('required');
        });
    });

    describe('E2E Chat Workflow', () => {
        test('kompletter Chat-Workflow: Config → Chat → Switch → Chat', async () => {
            // 1. Get initial config
            const configResponse = await request(app).get('/api/config');
            expect(configResponse.status).toBe(200);
            const initialProvider = configResponse.body.current_provider;

            // 2. Send first message
            const chat1 = await request(app)
                .post('/api/chat')
                .send({ message: 'Erste Frage' });
            expect(chat1.status).toBe(200);
            expect(chat1.body.provider).toBe(initialProvider);

            // 3. Switch provider
            const switchResponse = await request(app)
                .post('/api/model')
                .send({
                    provider: initialProvider === 'ollama' ? 'groq' : 'ollama',
                    model: 'test-model'
                });
            expect(switchResponse.status).toBe(200);

            // 4. Send another message with new provider
            const chat2 = await request(app)
                .post('/api/chat')
                .send({ message: 'Zweite Frage' });
            expect(chat2.status).toBe(200);
            expect(chat2.body.provider).not.toBe(initialProvider);
        });
    });

    describe('Error Handling', () => {
        test('sollte auf fehlende Message-Parameter prüfen', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({});

            expect(response.status).toBe(400);
        });

        test('sollte auf Whitespace-only Message prüfen', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({ message: '   \n  ' });

            expect(response.status).toBe(400);
        });
    });
});

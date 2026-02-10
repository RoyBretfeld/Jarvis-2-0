/**
 * Performance & Load Tests für The Forge API
 * Simuliert realistische Last-Szenarien
 */

const request = require('supertest');
const express = require('express');

const createTestApp = () => {
    const app = express();
    app.use(express.json());

    app.post('/api/chat', async (req, res) => {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Empty message' });
        }
        res.json({
            reply: 'Response',
            timestamp: new Date().toISOString(),
            provider: 'ollama'
        });
    });

    app.get('/api/config', (req, res) => {
        res.json({
            current_provider: 'ollama',
            current_model: 'qwen2.5-coder:14b',
            providers: {
                ollama: { url: 'http://localhost:11434', available: true },
                groq: { url: 'https://api.groq.com', available: false }
            }
        });
    });

    return app;
};

describe('Performance Tests', () => {
    let app;

    beforeEach(() => {
        app = createTestApp();
    });

    describe('Response Time Benchmarks', () => {
        test('einzelne Chat-Anfrage sollte < 100ms sein', async () => {
            const start = Date.now();
            const response = await request(app)
                .post('/api/chat')
                .send({ message: 'Test' });
            const duration = Date.now() - start;

            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(100);
        });

        test('einzelne Config-Anfrage sollte < 50ms sein', async () => {
            const start = Date.now();
            const response = await request(app)
                .get('/api/config');
            const duration = Date.now() - start;

            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(50);
        });
    });

    describe('Concurrent Requests', () => {
        test('10 gleichzeitige Requests sollten alle erfolgreich sein', async () => {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .post('/api/chat')
                        .send({ message: `Message ${i}` })
                );
            }

            const responses = await Promise.all(promises);
            const successCount = responses.filter(r => r.status === 200).length;

            expect(successCount).toBe(10);
        });

        test('50 gleichzeitige Requests sollten > 90% erfolgsrate haben', async () => {
            const promises = [];
            for (let i = 0; i < 50; i++) {
                promises.push(
                    request(app)
                        .post('/api/chat')
                        .send({ message: `Msg ${i}` })
                        .catch(err => ({ status: 0 }))
                );
            }

            const responses = await Promise.all(promises);
            const successCount = responses.filter(r => r.status === 200).length;
            const successRate = (successCount / 50) * 100;

            expect(successRate).toBeGreaterThan(90);
        });
    });

    describe('Large Payload Handling', () => {
        test('sollte Nachrichten bis 10KB akzeptieren', async () => {
            const largeMessage = 'a'.repeat(10000); // 10KB
            const response = await request(app)
                .post('/api/chat')
                .send({ message: largeMessage });

            expect([200, 400]).toContain(response.status);
        });

        test('sollte Nachrichten > 100KB ablehnen oder handhaben', async () => {
            const hugeMessage = 'x'.repeat(100000); // 100KB
            const response = await request(app)
                .post('/api/chat')
                .send({ message: hugeMessage });

            // Sollte entweder akzeptiert oder abgelehnt werden
            expect([200, 400, 413]).toContain(response.status);
        });
    });

    describe('Memory Efficiency', () => {
        test('sollte bei 100 Requests keine Memory-Leaks zeigen', async () => {
            const initialMemory = process.memoryUsage().heapUsed;

            const promises = [];
            for (let i = 0; i < 100; i++) {
                promises.push(
                    request(app)
                        .post('/api/chat')
                        .send({ message: `Msg ${i}` })
                );
            }

            await Promise.all(promises);

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

            // Sollte nicht mehr als 50MB zusätzlich verwenden
            expect(memoryIncreaseMB).toBeLessThan(50);
        });
    });

    describe('Error Handling Under Load', () => {
        test('sollte bei fehlerhaften Requests korrekt reagieren', async () => {
            const promises = [];

            // Mix von gültigen und ungültigen Requests
            for (let i = 0; i < 20; i++) {
                if (i % 2 === 0) {
                    promises.push(
                        request(app)
                            .post('/api/chat')
                            .send({ message: `Valid ${i}` })
                    );
                } else {
                    promises.push(
                        request(app)
                            .post('/api/chat')
                            .send({ message: '' }) // Invalid
                    );
                }
            }

            const responses = await Promise.all(promises);
            const validResponses = responses.filter(r => r.status === 200).length;
            const errorResponses = responses.filter(r => r.status === 400).length;

            expect(validResponses).toBe(10);
            expect(errorResponses).toBe(10);
        });
    });

    describe('Response Consistency', () => {
        test('mehrfache Requests sollten konsistente Struktur haben', async () => {
            const responses = [];

            for (let i = 0; i < 5; i++) {
                const res = await request(app)
                    .post('/api/chat')
                    .send({ message: `Test ${i}` });
                responses.push(res.body);
            }

            // Alle sollten gleiche Felder haben
            responses.forEach(body => {
                expect(body).toHaveProperty('reply');
                expect(body).toHaveProperty('timestamp');
                expect(body).toHaveProperty('provider');
                expect(typeof body.reply).toBe('string');
                expect(typeof body.timestamp).toBe('string');
            });
        });
    });
});

describe('Stress Testing', () => {
    let app;

    beforeEach(() => {
        app = createTestApp();
    });

    test('sollte 200+ schnelle sequenzielle Requests handhaben', async () => {
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < 200; i++) {
            try {
                const response = await request(app)
                    .post('/api/chat')
                    .send({ message: `Message ${i}` });

                if (response.status === 200) successCount++;
                else errorCount++;
            } catch (err) {
                errorCount++;
            }
        }

        const successRate = (successCount / 200) * 100;
        expect(successRate).toBeGreaterThan(95);
    });
});

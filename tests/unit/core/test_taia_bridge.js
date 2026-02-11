/**
 * Tests für TAIA Bridge (v0.1)
 * Validiert Glass-Box Auditing, Checkpointing, und Menschliche Hoheit
 */

const { TAIABridge } = require('../../../src/core/taia_bridge');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

describe('TAIABridge', () => {
    let bridge;
    let testDir;

    beforeEach(async () => {
        // Erstelle ein temporäres Verzeichnis für Tests
        testDir = path.join(os.tmpdir(), `taia-test-${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });

        bridge = new TAIABridge({
            namespace: 'test.sentinel',
            auditLog: path.join(testDir, 'AUDIT_LOG.md')
        });
    });

    afterEach(async () => {
        // Cleanup
        try {
            await fs.rm(testDir, { recursive: true });
        } catch (e) {
            // Ignoriere Fehler bei Cleanup
        }
    });

    describe('Gesetz 1: Glass-Box Auditing', () => {
        test('sollte Tool-Aufrufe ins Audit-Log schreiben', async () => {
            const toolLogic = async (args) => `Result for ${args.name}`;

            const result = await bridge.wrapToolCall('test-tool', { name: 'test' }, toolLogic);

            expect(result).toBe('Result for test');

            // Überprüfe Audit-Log
            const auditContent = await fs.readFile(bridge.auditLog, 'utf8');
            expect(auditContent).toContain('TOOL: test-tool');
            expect(auditContent).toContain('SUCCESS');
        });

        test('sollte Fehler im Audit-Log dokumentieren', async () => {
            const toolLogic = async () => {
                throw new Error('Test error');
            };

            await expect(
                bridge.wrapToolCall('failing-tool', {}, toolLogic)
            ).rejects.toThrow('Test error');

            const auditContent = await fs.readFile(bridge.auditLog, 'utf8');
            expect(auditContent).toContain('ERROR');
            expect(auditContent).toContain('Test error');
        });

        test('sollte Args und Results loggen', async () => {
            const args = { file: 'test.js', severity: 'HIGH' };
            const toolLogic = async (a) => ({ processed: true, args: a });

            await bridge.wrapToolCall('process-file', args, toolLogic);

            const auditContent = await fs.readFile(bridge.auditLog, 'utf8');
            expect(auditContent).toContain('test.js');
            expect(auditContent).toContain('HIGH');
        });
    });

    describe('Gesetz 2: Git Checkpoint (Undo is King)', () => {
        test('sollte Checkpoint dokumentieren', async () => {
            const result = await bridge.gitCheckpoint('Testing Feature X');

            expect(result.checkpoint).toContain('Testing Feature X');
            expect(result.status).toMatch(/ready|skipped/);
        });

        test('sollte Checkpoint ins Audit-Log schreiben', async () => {
            await bridge.gitCheckpoint('Memory Tiering Refactor');

            const auditContent = await fs.readFile(bridge.auditLog, 'utf8');
            expect(auditContent).toContain('CHECKPOINT');
            expect(auditContent).toContain('Memory Tiering Refactor');
        });
    });

    describe('Gesetz 4: Menschliche Hoheit', () => {
        test('sollte BLOCKER-Level Findings blocken', () => {
            const finding = {
                severity: 'BLOCKER',
                message: 'Critical security issue',
                file: 'src/core/security.js'
            };

            const result = bridge.requireHumanApproval(finding);

            expect(result.blocked).toBe(true);
            expect(result.requiresApproval).toBe(true);
        });

        test('sollte CRITICAL-Level Findings blocken', () => {
            const finding = {
                severity: 'CRITICAL',
                message: 'Database injection vulnerability',
                file: 'src/api/database.js'
            };

            const result = bridge.requireHumanApproval(finding);

            expect(result.blocked).toBe(true);
            expect(result.requiresApproval).toBe(true);
        });

        test('sollte WARNING-Level Findings NICHT blocken', () => {
            const finding = {
                severity: 'WARNING',
                message: 'Unused variable',
                file: 'src/utils/helper.js'
            };

            const result = bridge.requireHumanApproval(finding);

            expect(result.blocked).toBe(false);
            expect(result.requiresApproval).toBe(false);
        });

        test('sollte INFO-Level Findings NICHT blocken', () => {
            const finding = {
                severity: 'INFO',
                message: 'Code style note',
                file: 'src/core/logger.js'
            };

            const result = bridge.requireHumanApproval(finding);

            expect(result.blocked).toBe(false);
            expect(result.requiresApproval).toBe(false);
        });
    });

    describe('Security Finding Handler', () => {
        test('sollte BLOCKER Security Findings blocken', async () => {
            const finding = {
                type: 'VULNERABILITY',
                severity: 'BLOCKER',
                file: 'src/auth.js',
                message: 'Hardcoded API key detected'
            };

            const result = await bridge.handleSecurityFinding(finding);

            expect(result.action).toBe('BLOCK');
            expect(result.requiresApproval).toBe(undefined); // Not set in this version
        });

        test('sollte LOW Security Findings erlauben', async () => {
            const finding = {
                type: 'STYLE',
                severity: 'INFO',
                file: 'src/utils.js',
                message: 'Prefer const over let'
            };

            const result = await bridge.handleSecurityFinding(finding);

            expect(result.action).toBe('ALLOW');
        });

        test('sollte Security Findings ins Audit-Log schreiben', async () => {
            const finding = {
                type: 'XSS',
                severity: 'CRITICAL',
                file: 'src/api/routes.js',
                message: 'Unsanitized user input'
            };

            await bridge.handleSecurityFinding(finding);

            const auditContent = await fs.readFile(bridge.auditLog, 'utf8');
            expect(auditContent).toContain('SECURITY_FINDING');
            expect(auditContent).toContain('XSS');
            expect(auditContent).toContain('CRITICAL');
        });
    });

    describe('Phase Management', () => {
        test('sollte Phase-Start loggen', async () => {
            await bridge.logPhaseStart('Phase 5: Server Integration', 'Express + LLM setup');

            const auditContent = await fs.readFile(bridge.auditLog, 'utf8');
            expect(auditContent).toContain('PHASE START');
            expect(auditContent).toContain('Phase 5: Server Integration');
        });

        test('sollte Phase-Complete mit Metriken loggen', async () => {
            const metrics = {
                testsPass: 50,
                coverage: 95,
                performanceScore: 98
            };

            await bridge.logPhaseComplete('Phase 5: Server Integration', metrics);

            const auditContent = await fs.readFile(bridge.auditLog, 'utf8');
            expect(auditContent).toContain('PHASE COMPLETE');
            expect(auditContent).toContain('95');
        });
    });

    describe('Audit Log Integrity', () => {
        test('sollte mehrere Einträge korrekt appenden', async () => {
            await bridge.logPhaseStart('Test Phase 1', 'First');
            await bridge.gitCheckpoint('Checkpoint 1');
            await bridge.logPhaseComplete('Test Phase 1', { status: 'ok' });

            const auditContent = await fs.readFile(bridge.auditLog, 'utf8');

            expect(auditContent).toContain('PHASE START');
            expect(auditContent).toContain('CHECKPOINT');
            expect(auditContent).toContain('PHASE COMPLETE');
        });

        test('sollte korrekte Timestamps haben', async () => {
            const before = new Date().toISOString();
            await bridge.appendAuditLog('\n## TEST');
            const after = new Date().toISOString();

            const auditContent = await fs.readFile(bridge.auditLog, 'utf8');

            // Überprüfe, dass es einen ISO-String enthält
            expect(auditContent).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });
    });
});

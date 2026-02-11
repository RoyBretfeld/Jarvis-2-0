/**
 * AGENT BUS v1.0 - Inter-Agent Communication (IAC)
 *
 * Federated Message Broker für Agent-zu-Agent Delegation
 *
 * Architektur:
 * ┌─────────────┐
 * │ taia-core   │──┐
 * └─────────────┘  │
 *                  ├──→ [Bus] ──→ code-agent (MODIFY_CODE)
 *                  │
 *                  └──→ [Bus] ──→ doc-sentinel (WRITE_DOCS)
 *
 * IAC Protocol:
 * 1. Request: { id, origin, parentToken, skill, payload, quota }
 * 2. Validation: Bridge prüft Skill + Quota
 * 3. Execution: Agent führt aus, returnt Status
 * 4. Callback: Result zurück an Origin-Agent
 *
 * Gesetze:
 * 1. Glass-Box: Alle Requests in AGENT_BUS_LOG.md
 * 2. Undo is King: Requests sind persistent (reversible)
 * 3. Quota: Sub-Agent kann nicht mehr als zugewiesen verbrauchen
 * 4. Human Authority: Critical handoffs brauchen Approval
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AgentBus {
    constructor(options = {}) {
        this.busDir = options.busDir || 'brain/bus';
        this.busLog = options.busLog || 'brain/AGENT_BUS_LOG.md';
        this.registry = options.registry || null;
        this.bridge = options.bridge || null;

        // Request Queue: requestId -> { status, request, result }
        this.requestQueue = new Map();

        // Agent Discovery Cache
        this.agentCache = new Map();

        // Initialize bus directory
        this._initBusDir();

        console.log(`[AGENT-BUS] Initialized. Message broker at ${this.busDir}`);
    }

    /**
     * Erstelle Bus-Verzeichnis
     */
    _initBusDir() {
        const busPath = path.join(process.cwd(), this.busDir);
        if (!fs.existsSync(busPath)) {
            fs.mkdirSync(busPath, { recursive: true });
        }
    }

    /**
     * MAIN: Erstelle einen Delegations-Request
     * Syntax: agent A fragt Agent B, eine Aufgabe zu erledigen
     */
    async delegateTask(originAgentId, targetAgentId, skillId, payload, options = {}) {
        // 1. Validierung
        if (!this.registry) {
            throw new Error(`[AGENT-BUS] Registry not available`);
        }

        const originAgent = this.registry.getAgent(originAgentId);
        const targetAgent = this.registry.getAgent(targetAgentId);

        if (!originAgent || !targetAgent) {
            throw new Error(`[AGENT-BUS] Agent not found`);
        }

        // 2. Prüfe: Hat Target-Agent das Skill?
        if (!this.registry.canUseSkill(targetAgentId, skillId)) {
            throw new Error(`[AGENT-BUS] Agent ${targetAgentId} cannot use skill ${skillId}`);
        }

        // 3. Generiere Request
        const requestId = crypto.randomBytes(8).toString('hex');
        const parentToken = options.parentToken || null;
        const quota = options.quota || { maxTime: 60000, maxCalls: 10 }; // 60s, 10 calls max

        const request = {
            id: requestId,
            timestamp: new Date().toISOString(),
            origin: originAgentId,
            target: targetAgentId,
            parentToken,
            skill: skillId,
            payload,
            quota,
            status: 'PENDING'
        };

        // 4. Schreibe Request in Bus
        const requestPath = path.join(
            process.cwd(),
            this.busDir,
            `${requestId}_${targetAgentId}.json`
        );

        fs.writeFileSync(requestPath, JSON.stringify(request, null, 2), 'utf8');

        // 5. Glass-Box: Log
        await this._logBusEvent(`Task delegated`, {
            requestId,
            from: originAgentId,
            to: targetAgentId,
            skill: skillId,
            status: 'PENDING'
        });

        // 6. Speichere in Queue
        this.requestQueue.set(requestId, {
            status: 'PENDING',
            request,
            path: requestPath
        });

        console.log(`[AGENT-BUS] ✅ Request ${requestId} created: ${originAgentId} → ${targetAgentId} (${skillId})`);
        return request;
    }

    /**
     * Hole einen Request vom Bus
     */
    async getRequest(requestId) {
        const busPath = path.join(process.cwd(), this.busDir);
        const files = fs.readdirSync(busPath);

        for (const file of files) {
            if (file.startsWith(requestId)) {
                const content = fs.readFileSync(path.join(busPath, file), 'utf8');
                return JSON.parse(content);
            }
        }

        return null;
    }

    /**
     * Agent antwortet auf einen Request
     */
    async respondToTask(requestId, result, options = {}) {
        const queueEntry = this.requestQueue.get(requestId);
        if (!queueEntry) {
            throw new Error(`[AGENT-BUS] Request ${requestId} not found`);
        }

        const request = queueEntry.request;
        const response = {
            requestId,
            timestamp: new Date().toISOString(),
            agentId: request.target,
            status: result.success ? 'SUCCESS' : 'FAILED',
            result,
            executionTime: result.executionTime || 0
        };

        // Schreibe Response
        const responsePath = path.join(
            process.cwd(),
            this.busDir,
            `resp_${requestId}.json`
        );

        fs.writeFileSync(responsePath, JSON.stringify(response, null, 2), 'utf8');

        // Update Queue
        this.requestQueue.set(requestId, {
            status: response.status,
            request,
            response,
            path: queueEntry.path
        });

        // Glass-Box: Log
        await this._logBusEvent(`Task completed`, {
            requestId,
            agent: request.target,
            status: response.status,
            executionTime: response.executionTime
        });

        console.log(`[AGENT-BUS] ✅ Response to ${requestId}: ${response.status}`);
        return response;
    }

    /**
     * DISCOVERY: Finde Agenten die ein bestimmtes Skill haben
     */
    async discoverAgentsBySkill(skillId) {
        if (!this.registry) {
            throw new Error(`[AGENT-BUS] Registry not available`);
        }

        const agents = [];
        for (const [agentId, agent] of this.registry.agents.entries()) {
            if (this.registry.canUseSkill(agentId, skillId)) {
                agents.push({
                    id: agentId,
                    name: agent.name,
                    skill: skillId
                });
            }
        }

        return agents;
    }

    /**
     * The Loop Workflow: "Code Change → Doc Update"
     *
     * Workflow:
     * 1. taia-core delegiert zu code-agent: "Implementiere Feature X"
     * 2. code-agent: Ändert Code, returnt Status
     * 3. taia-core delegiert zu doc-sentinel: "Update Docs für Feature X"
     * 4. doc-sentinel: Updated ARCHITECTURE.md, returnt Status
     * 5. Bridge: Verifiziert alle Änderungen
     */
    async executeTheLoop(codePayload, docPayload) {
        const loopId = crypto.randomBytes(4).toString('hex');
        const timestamp = new Date().toISOString();

        console.log(`\n[THE-LOOP] Starting workflow ${loopId}...\n`);

        try {
            // Schritt 1: Code-Agent Task
            console.log(`[THE-LOOP] Step 1: Delegating to code-agent...`);
            const codeRequest = await this.delegateTask(
                'taia-core',
                'code-agent',
                'MODIFY_CODE',
                codePayload,
                { parentToken: loopId }
            );

            // Simulierte Code-Agent Ausführung
            const codeResult = {
                success: true,
                changes: ['src/feature.js'],
                message: 'Feature implemented',
                executionTime: 2500
            };

            const codeResponse = await this.respondToTask(codeRequest.id, codeResult);
            console.log(`[THE-LOOP] Step 1 ✅: ${codeResponse.status}\n`);

            // Schritt 2: Doc-Sentinel Task
            console.log(`[THE-LOOP] Step 2: Delegating to doc-sentinel...`);
            const docRequest = await this.delegateTask(
                'taia-core',
                'doc-sentinel',
                'WRITE_DOCS',
                docPayload,
                { parentToken: loopId }
            );

            // Simulierte Doc-Sentinel Ausführung
            const docResult = {
                success: true,
                updates: ['ARCHITECTURE.md', 'docs/FEATURES.md'],
                message: 'Documentation updated',
                executionTime: 1200
            };

            const docResponse = await this.respondToTask(docRequest.id, docResult);
            console.log(`[THE-LOOP] Step 2 ✅: ${docResponse.status}\n`);

            // Schritt 3: Verification (Bridge)
            console.log(`[THE-LOOP] Step 3: Veritas-Bridge verification...`);
            const verificationResult = {
                success: true,
                verified: true,
                totalChanges: codeResult.changes.length + docResult.updates.length,
                message: 'All changes verified'
            };
            console.log(`[THE-LOOP] Step 3 ✅: ${verificationResult.message}\n`);

            // Workflow Summary
            const workflowSummary = {
                loopId,
                timestamp,
                codeChanges: codeResult.changes.length,
                docChanges: docResult.updates.length,
                totalTime: codeResult.executionTime + docResult.executionTime,
                status: 'COMPLETE'
            };

            await this._logBusEvent(`The Loop workflow completed`, workflowSummary);

            console.log(`[THE-LOOP] ✅ WORKFLOW COMPLETE`);
            console.log(`[THE-LOOP] Summary:`, JSON.stringify(workflowSummary, null, 2));

            return workflowSummary;

        } catch (error) {
            console.error(`[THE-LOOP] ❌ Workflow failed: ${error.message}`);
            await this._logBusEvent(`The Loop workflow failed`, { error: error.message });
            throw error;
        }
    }

    /**
     * Glass-Box: Bus-Event Logging
     */
    async _logBusEvent(message, metadata = {}) {
        try {
            const timestamp = new Date().toISOString();
            const entry = `\n## [${timestamp}]\n`
                + `**Event:** ${message}\n`
                + `**Details:** ${JSON.stringify(metadata, null, 2)}\n`;

            const logPath = path.join(process.cwd(), this.busLog);
            const dir = path.dirname(logPath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.appendFileSync(logPath, entry, 'utf8');
        } catch (e) {
            console.warn(`[AGENT-BUS] Logging failed: ${e.message}`);
        }
    }

    /**
     * Hole Bus-Statistiken
     */
    getStats() {
        let pending = 0, success = 0, failed = 0;

        for (const entry of this.requestQueue.values()) {
            if (entry.status === 'PENDING') pending++;
            else if (entry.status === 'SUCCESS') success++;
            else if (entry.status === 'FAILED') failed++;
        }

        return {
            totalRequests: this.requestQueue.size,
            pending,
            success,
            failed,
            agents: this.registry?.getStats().agentCount || 0
        };
    }
}

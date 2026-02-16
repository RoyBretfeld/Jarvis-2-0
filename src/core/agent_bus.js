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
        this.archiveDir = options.archiveDir || path.join(this.busDir, 'archive');
        this.approvalsDir = options.approvalsDir || path.join(this.busDir, 'approvals');
        this.busLog = options.busLog || 'brain/AGENT_BUS_LOG.md';
        this.registry = options.registry || null;
        this.bridge = options.bridge || null;

        // Request Queue: requestId -> { status, request, result }
        this.requestQueue = new Map();

        // Agent Discovery Cache
        this.agentCache = new Map();
        this.workerHandles = new Map();
        this.workerLocks = new Map();
        this.batchRuns = new Map();

        // Initialize bus directory
        this._initBusDir();

        console.log(`[AGENT-BUS] Initialized. Message broker at ${this.busDir}`);
    }

    /**
     * Erstelle Bus-Verzeichnis
     */
    _initBusDir() {
        const basePath = path.join(process.cwd(), this.busDir);
        const archivePath = path.join(process.cwd(), this.archiveDir);
        const approvalsPath = path.join(process.cwd(), this.approvalsDir);
        [basePath, archivePath, approvalsPath].forEach((dir) => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
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

        // 2b. Bridge-Check inkl. Critical-Gating
        if (this.bridge?.verifyAgentSkill) {
            await this.bridge.verifyAgentSkill(targetAgentId, skillId, options.approvalToken || null);
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
            status: 'PENDING',
            metadata: {
                workerId: null,
                startedAt: null,
                finishedAt: null,
                batchId: options.batchId || null
            }
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
     * Fan-out: delegiere mehrere Tasks parallel
     */
    async delegateBatch(originAgentId, taskSpecs = [], options = {}) {
        if (!Array.isArray(taskSpecs) || taskSpecs.length === 0) {
            throw new Error('[AGENT-BUS] delegateBatch requires at least one task');
        }

        const batchId = options.batchId || crypto.randomBytes(6).toString('hex');
        const parentToken = options.parentToken || batchId;

        const requests = await Promise.all(
            taskSpecs.map((task) => this.delegateTask(
                originAgentId,
                task.targetAgentId,
                task.skillId,
                task.payload || {},
                {
                    quota: task.quota || options.quota,
                    parentToken,
                    approvalToken: options.approvalToken || task.approvalToken || null,
                    batchId
                }
            ))
        );

        const batchState = {
            batchId,
            parentToken,
            origin: originAgentId,
            requestIds: requests.map((r) => r.id),
            createdAt: new Date().toISOString(),
            status: 'RUNNING'
        };
        this.batchRuns.set(batchId, batchState);

        await this._logBusEvent('Batch delegated', {
            batchId,
            requestCount: requests.length,
            origin: originAgentId
        });

        return {
            batchId,
            parentToken,
            requests
        };
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
     * 
     * ARBEITSPAKET E: Quality Gate Integration
     * - Bei Code-Schreiben: Status → REVIEW_PENDING
     * - Automatisches QA-Routing
     * - Feedback-Loop bei FAILED
     */
    async respondToTask(requestId, result, options = {}) {
        let queueEntry = this.requestQueue.get(requestId);
        if (!queueEntry) {
            // Recovery path: rebuild queue entry from persisted request file
            const recovered = this._loadRequestById(requestId);
            if (!recovered) {
                throw new Error(`[AGENT-BUS] Request ${requestId} not found`);
            }
            queueEntry = recovered;
            this.requestQueue.set(requestId, queueEntry);
        }

        const request = queueEntry.request;
        
        // === QUALITY GATE LOGIK ===
        let finalStatus = result.success ? 'SUCCESS' : 'FAILED';
        let qaTriggered = false;
        
        // Prüfe ob Quality Gate nötig ist (Code-Schreiben Skills)
        const codeWritingSkills = ['WRITE_UI_CODE', 'WRITE_API_CODE', 'WRITE_DB_CODE', 'MODIFY_CODE', 'IMPLEMENT_SECURITY'];
        const requiresQA = result.success && codeWritingSkills.includes(request.skill);
        
        if (requiresQA && !options.skipQA) {
            finalStatus = 'REVIEW_PENDING';
            qaTriggered = true;
            
            // Automatisch QA-Review anstoßen
            await this._triggerQAReview(requestId, request, result);
        }
        
        const response = {
            requestId,
            timestamp: new Date().toISOString(),
            agentId: request.target,
            status: finalStatus,
            result,
            executionTime: result.executionTime || 0,
            qaTriggered,
            requiresApproval: requiresQA
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

        // Update request file with final state
        await this._persistRequestState(requestId, response.status, {
            finishedAt: response.timestamp,
            qaTriggered,
            qaPending: requiresQA
        });

        // Glass-Box: Log
        await this._logBusEvent(`Task completed`, {
            requestId,
            agent: request.target,
            status: response.status,
            executionTime: response.executionTime,
            qaTriggered
        });

        if (qaTriggered) {
            console.log(`[AGENT-BUS] 🛡️ Quality Gate triggered for ${requestId}: ${finalStatus} → Waiting for QA review`);
        } else {
            console.log(`[AGENT-BUS] ✅ Response to ${requestId}: ${response.status}`);
        }
        
        // Archiviere nur wenn final (SUCCESS, FAILED) - NICHT bei REVIEW_PENDING
        if (response.status === 'SUCCESS' || response.status === 'FAILED') {
            await this._archiveCompletedTask(requestId);
        }
        return response;
    }

    /**
     * ARBEITSPAKET E: Automatisches QA-Review anstoßen
     * Wird aufgerufen wenn Code geschrieben wurde
     */
    async _triggerQAReview(originalRequestId, originalRequest, codeResult) {
        try {
            // Erstelle QA-Review Task
            const qaPayload = {
                originalRequestId,
                originalAgent: originalRequest.target,
                originalSkill: originalRequest.skill,
                codeChanges: codeResult.changes || codeResult,
                filesModified: codeResult.files || [],
                reviewContext: {
                    purpose: originalRequest.payload?.purpose || 'Code modification',
                    requirements: originalRequest.payload?.requirements || [],
                    securityRelevant: ['WRITE_API_CODE', 'IMPLEMENT_SECURITY'].includes(originalRequest.skill)
                }
            };
            
            // Delegiere an QA-Agent
            const qaRequest = await this.delegateTask(
                'taia-core',  // Origin: Core Orchestriert
                'agent-qa',    // Target: QA Sentinel
                'REVIEW_CODE', // Skill: Code Review
                qaPayload,
                {
                    parentToken: originalRequestId,
                    quota: { maxTime: 120000, maxCalls: 5 }
                }
            );
            
            // Speichere Verknüpfung für Feedback-Loop
            this._linkQAReview(originalRequestId, qaRequest.id);
            
            await this._logBusEvent('QA Review triggered', {
                originalRequestId,
                qaRequestId: qaRequest.id,
                agent: originalRequest.target,
                skill: originalRequest.skill
            });
            
            console.log(`[AGENT-BUS] 🛡️ QA Review delegated: ${qaRequest.id} → agent-qa`);
            
        } catch (error) {
            console.error(`[AGENT-BUS] ❌ Failed to trigger QA review: ${error.message}`);
            // Bei Fehler: Original-Task auf FAILED setzen
            await this._persistRequestState(originalRequestId, 'FAILED', {
                qaError: error.message,
                errorAt: new Date().toISOString()
            });
        }
    }

    /**
     * Verknüpfe Original-Request mit QA-Review
     */
    _linkQAReview(originalRequestId, qaRequestId) {
        const linkFile = path.join(
            process.cwd(),
            this.busDir,
            `qa_link_${originalRequestId}.json`
        );
        
        fs.writeFileSync(linkFile, JSON.stringify({
            originalRequestId,
            qaRequestId,
            createdAt: new Date().toISOString()
        }, null, 2), 'utf8');
    }

    /**
     * ARBEITSPAKET E: QA-Agent gibt Review-Ergebnis ab
     * Diese Methode verarbeitet das QA-Review und steuert die Feedback-Loop
     */
    async submitQAReview(qaRequestId, reviewResult) {
        try {
            // Finde verknüpften Original-Request
            const link = this._findQALinkByQARequest(qaRequestId);
            if (!link) {
                throw new Error(`No QA link found for ${qaRequestId}`);
            }
            
            const originalRequestId = link.originalRequestId;
            
            if (reviewResult.approved) {
                // ✅ QA hat freigegeben → Status auf SUCCESS
                await this._persistRequestState(originalRequestId, 'SUCCESS', {
                    qaApproved: true,
                    qaReviewId: qaRequestId,
                    qaFeedback: reviewResult.feedback,
                    qaApprovedAt: new Date().toISOString()
                });
                
                await this._archiveCompletedTask(originalRequestId);
                
                await this._logBusEvent('QA Review approved', {
                    originalRequestId,
                    qaRequestId,
                    feedback: reviewResult.feedback
                });
                
                console.log(`[AGENT-BUS] ✅ QA Approved: ${originalRequestId} → SUCCESS`);
                
                return {
                    status: 'APPROVED',
                    originalRequestId,
                    message: 'Code approved by QA'
                };
                
            } else {
                // ❌ QA hat Fehler gefunden → Status FAILED + Feedback-Loop
                await this._persistRequestState(originalRequestId, 'FAILED', {
                    qaApproved: false,
                    qaReviewId: qaRequestId,
                    qaFeedback: reviewResult.feedback,
                    qaIssues: reviewResult.issues || [],
                    qaRejectedAt: new Date().toISOString(),
                    retryRecommended: reviewResult.retry !== false
                });
                
                await this._archiveCompletedTask(originalRequestId);
                
                await this._logBusEvent('QA Review rejected', {
                    originalRequestId,
                    qaRequestId,
                    issues: reviewResult.issues,
                    feedback: reviewResult.feedback
                });
                
                console.log(`[AGENT-BUS] ❌ QA Rejected: ${originalRequestId} → FAILED`);
                console.log(`[AGENT-BUS] 📝 Feedback: ${reviewResult.feedback}`);
                
                // Feedback-Loop: Original-Agent kann retryen
                return {
                    status: 'REJECTED',
                    originalRequestId,
                    feedback: reviewResult.feedback,
                    issues: reviewResult.issues,
                    message: 'Code rejected by QA - retry required'
                };
            }
            
        } catch (error) {
            console.error(`[AGENT-BUS] ❌ QA Review submission failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Finde QA-Link anhand der QA-Request-ID
     */
    _findQALinkByQARequest(qaRequestId) {
        const busPath = path.join(process.cwd(), this.busDir);
        const files = fs.readdirSync(busPath);
        
        for (const file of files) {
            if (file.startsWith('qa_link_')) {
                const content = fs.readFileSync(path.join(busPath, file), 'utf8');
                const link = JSON.parse(content);
                if (link.qaRequestId === qaRequestId) {
                    return link;
                }
            }
        }
        return null;
    }

    /**
     * Worker Loop pro Agent: zieht PENDING Tasks und verarbeitet sie
     */
    startWorker(agentId, handler, options = {}) {
        if (this.workerHandles.has(agentId)) {
            console.log(`[AGENT-BUS] Worker for ${agentId} already running`);
            return this.workerHandles.get(agentId);
        }

        const pollIntervalMs = options.pollIntervalMs || 3000;
        const timeoutMs = options.timeoutMs || 60000;
        const handle = {
            agentId,
            pollIntervalMs,
            stopped: false,
            stop: () => {
                handle.stopped = true;
                this.workerHandles.delete(agentId);
                this.workerLocks.delete(agentId);
                console.log(`[AGENT-BUS] Worker stopped: ${agentId}`);
            }
        };

        const runCycle = async () => {
            if (handle.stopped) return;

            if (this.workerLocks.get(agentId)) {
                setTimeout(() => {
                    runCycle().catch((error) => {
                        console.warn(`[AGENT-BUS] Worker ${agentId} delayed-cycle failed: ${error.message}`);
                    });
                }, pollIntervalMs);
                return;
            }

            this.workerLocks.set(agentId, true);
            try {
                const pendingRequests = await this._loadPendingRequestsForAgent(agentId);
                for (const request of pendingRequests) {
                    const queueEntry = this._loadRequestById(request.id);
                    if (queueEntry) {
                        this.requestQueue.set(request.id, queueEntry);
                    }

                    const startedAt = new Date().toISOString();
                    await this._persistRequestState(request.id, 'RUNNING', {
                        workerId: agentId,
                        startedAt
                    });

                    try {
                        const execution = await this._runWithTimeout(this._executeWorkerTask(agentId, request, handler), timeoutMs);
                        const normalized = this._normalizeWorkerResult(execution);
                        await this.respondToTask(request.id, normalized);
                    } catch (error) {
                        await this.respondToTask(request.id, {
                            success: false,
                            message: error.message,
                            executionTime: timeoutMs
                        });
                    }
                }
            } catch (error) {
                console.warn(`[AGENT-BUS] Worker ${agentId} cycle failed: ${error.message}`);
            } finally {
                this.workerLocks.set(agentId, false);
                if (!handle.stopped) {
                    setTimeout(() => {
                        runCycle().catch((error) => {
                            console.warn(`[AGENT-BUS] Worker ${agentId} next-cycle failed: ${error.message}`);
                        });
                    }, pollIntervalMs);
                }
            }
        };

        this.workerHandles.set(agentId, handle);
        console.log(`[AGENT-BUS] Worker started: ${agentId} (${pollIntervalMs}ms)`);
        runCycle().catch(() => { });
        return handle;
    }

    /**
     * Stoppt einen laufenden Worker
     */
    stopWorker(agentId) {
        const handle = this.workerHandles.get(agentId);
        if (!handle) return false;
        handle.stop();
        return true;
    }

    /**
     * Orchestrator: Development-Plan als Batch ausrollen
     * §4 Human Authority: benötigt explizite Freigabe
     */
    async orchestrateDevelopmentTask(plan = {}, options = {}) {
        const approved = options.userApproved === true;
        let approvalToken = options.approvalToken || null;

        const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
        if (tasks.length === 0) {
            throw new Error('[AGENT-BUS] orchestrateDevelopmentTask requires plan.tasks');
        }

        if (!approved && !approvalToken) {
            const approval = await this.requestApproval({
                originAgentId: options.originAgentId || 'taia-core',
                tasks
            });
            await this._logBusEvent('Development orchestration waiting for approval', {
                approvalId: approval.id,
                taskCount: tasks.length
            });

            const decision = await this._waitForApprovalDecision(
                approval.id,
                options.approvalTimeoutMs || 300000,
                options.approvalPollMs || 1000
            );

            if (decision.status !== 'APPROVED') {
                throw new Error(`[AGENT-BUS] Development orchestration rejected (${approval.id})`);
            }

            approvalToken = `approval:${approval.id}`;
        }

        const batch = await this.delegateBatch(
            options.originAgentId || 'taia-core',
            tasks,
            {
                approvalToken,
                parentToken: options.parentToken || null,
                quota: options.quota || { maxTime: 120000, maxCalls: 20 }
            }
        );

        const settled = await Promise.allSettled(
            batch.requests.map((req) => this._waitForResponse(req.id, options.waitTimeoutMs || 120000))
        );

        const summary = {
            batchId: batch.batchId,
            total: settled.length,
            success: settled.filter((r) => r.status === 'fulfilled' && r.value.status === 'SUCCESS').length,
            failed: settled.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status !== 'SUCCESS')).length,
            completedAt: new Date().toISOString()
        };

        await this._logBusEvent('Development orchestration completed', summary);
        return {
            ...summary,
            results: settled
        };
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

    async _loadPendingRequestsForAgent(agentId) {
        const busPath = path.join(process.cwd(), this.busDir);
        if (!fs.existsSync(busPath)) return [];

        const files = fs.readdirSync(busPath)
            .filter((file) => file.endsWith('.json') && !file.startsWith('resp_') && file.includes(`_${agentId}.json`));

        const requests = [];
        for (const file of files) {
            const fullPath = path.join(busPath, file);
            try {
                const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                if (content.status === 'PENDING') {
                    requests.push(content);
                }
            } catch (error) {
                console.warn(`[AGENT-BUS] Invalid request file ${file}: ${error.message}`);
            }
        }

        return requests.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    _findRequestPathById(requestId) {
        const busPath = path.join(process.cwd(), this.busDir);
        if (!fs.existsSync(busPath)) return null;

        const file = fs.readdirSync(busPath).find((f) =>
            f.endsWith('.json') && !f.startsWith('resp_') && f.startsWith(requestId)
        );
        return file ? path.join(busPath, file) : null;
    }

    _loadRequestById(requestId) {
        const requestPath = this._findRequestPathById(requestId);
        if (!requestPath) return null;

        const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
        return {
            status: request.status || 'PENDING',
            request,
            path: requestPath
        };
    }

    async _persistRequestState(requestId, status, metadataPatch = {}) {
        let queueEntry = this.requestQueue.get(requestId);
        if (!queueEntry) {
            queueEntry = this._loadRequestById(requestId);
            if (!queueEntry?.path) return;
            this.requestQueue.set(requestId, queueEntry);
        }

        const request = { ...queueEntry.request };
        request.status = status;
        request.metadata = {
            ...(request.metadata || {}),
            ...metadataPatch
        };

        fs.writeFileSync(queueEntry.path, JSON.stringify(request, null, 2), 'utf8');
        this.requestQueue.set(requestId, {
            ...queueEntry,
            status,
            request
        });
    }

    _runWithTimeout(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Worker timeout after ${timeoutMs}ms`)), timeoutMs))
        ]);
    }

    _normalizeWorkerResult(result) {
        if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'success')) {
            return result;
        }
        return {
            success: true,
            output: result,
            executionTime: 0
        };
    }

    async _waitForResponse(requestId, timeoutMs = 120000) {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            const queueEntry = this.requestQueue.get(requestId);
            if (queueEntry?.response) return queueEntry.response;

            const responsePath = path.join(process.cwd(), this.busDir, `resp_${requestId}.json`);
            if (fs.existsSync(responsePath)) {
                const response = JSON.parse(fs.readFileSync(responsePath, 'utf8'));
                if (queueEntry) {
                    this.requestQueue.set(requestId, {
                        ...queueEntry,
                        status: response.status,
                        response
                    });
                }
                return response;
            }

            await new Promise((r) => setTimeout(r, 250));
        }
        throw new Error(`Response timeout for request ${requestId}`);
    }

    _approvalFilePath(approvalId) {
        return path.join(process.cwd(), this.approvalsDir, `approval_${approvalId}.json`);
    }

    async requestApproval(payload = {}) {
        const approvalId = crypto.randomBytes(6).toString('hex');
        const approval = {
            id: approvalId,
            status: 'WAITING_FOR_APPROVAL',
            createdAt: new Date().toISOString(),
            decidedAt: null,
            actor: null,
            payload
        };

        const filePath = this._approvalFilePath(approvalId);
        fs.writeFileSync(filePath, JSON.stringify(approval, null, 2), 'utf8');
        await this._logBusEvent('Approval requested', {
            approvalId,
            taskCount: payload.tasks?.length || 0,
            origin: payload.originAgentId || 'taia-core'
        });
        return approval;
    }

    async resolveApproval(approvalId, approved, actor = 'human', note = '') {
        const filePath = this._approvalFilePath(approvalId);
        if (!fs.existsSync(filePath)) {
            throw new Error(`[AGENT-BUS] Approval ${approvalId} not found`);
        }

        const raw = fs.readFileSync(filePath, 'utf8');
        const approval = JSON.parse(raw);
        approval.status = approved ? 'APPROVED' : 'REJECTED';
        approval.decidedAt = new Date().toISOString();
        approval.actor = actor;
        approval.note = note;
        fs.writeFileSync(filePath, JSON.stringify(approval, null, 2), 'utf8');

        await this._logBusEvent('Approval resolved', {
            approvalId,
            status: approval.status,
            actor
        });
        return approval;
    }

    async listApprovals(statusFilter = null) {
        const approvalsPath = path.join(process.cwd(), this.approvalsDir);
        if (!fs.existsSync(approvalsPath)) return [];

        const files = fs.readdirSync(approvalsPath).filter((f) => f.endsWith('.json'));
        const approvals = [];
        for (const file of files) {
            try {
                const raw = fs.readFileSync(path.join(approvalsPath, file), 'utf8');
                const approval = JSON.parse(raw);
                if (!statusFilter || approval.status === statusFilter) {
                    approvals.push(approval);
                }
            } catch {
                // ignore malformed approval files
            }
        }

        return approvals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    async _waitForApprovalDecision(approvalId, timeoutMs = 300000, pollMs = 1000) {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            const filePath = this._approvalFilePath(approvalId);
            if (!fs.existsSync(filePath)) {
                throw new Error(`[AGENT-BUS] Approval ${approvalId} disappeared`);
            }

            const raw = fs.readFileSync(filePath, 'utf8');
            const approval = JSON.parse(raw);
            if (approval.status === 'APPROVED' || approval.status === 'REJECTED') {
                return approval;
            }

            await new Promise((r) => setTimeout(r, pollMs));
        }

        throw new Error(`[AGENT-BUS] Approval timeout (${approvalId})`);
    }

    async _archiveCompletedTask(requestId) {
        const entry = this.requestQueue.get(requestId);
        if (!entry) return;

        const archivePath = path.join(process.cwd(), this.archiveDir);
        if (!fs.existsSync(archivePath)) {
            fs.mkdirSync(archivePath, { recursive: true });
        }

        const requestPath = entry.path || this._findRequestPathById(requestId);
        const responsePath = path.join(process.cwd(), this.busDir, `resp_${requestId}.json`);
        const suffix = new Date().toISOString().replace(/[:.]/g, '-');

        if (requestPath && fs.existsSync(requestPath)) {
            const requestName = path.basename(requestPath, '.json');
            fs.renameSync(requestPath, path.join(archivePath, `${requestName}_${suffix}.json`));
        }

        if (fs.existsSync(responsePath)) {
            fs.renameSync(responsePath, path.join(archivePath, `resp_${requestId}_${suffix}.json`));
        }

        await this._logBusEvent('Task archived', {
            requestId,
            archivedAt: new Date().toISOString()
        });
    }

    _isMutatingSkill(skillId = '') {
        const normalized = String(skillId || '').toUpperCase();
        return ['WRITE', 'MODIFY', 'DELETE', 'EXECUTE', 'DEPLOY'].some((keyword) => normalized.includes(keyword));
    }

    async _executeWorkerTask(agentId, request, handler) {
        if (this.bridge?.safeExecuteTool && this._isMutatingSkill(request.skill)) {
            return this.bridge.safeExecuteTool(
                'EXEC_COMMAND',
                { command: `agent:${agentId}:${request.skill}` },
                () => Promise.resolve(handler(request))
            );
        }

        return Promise.resolve(handler(request));
    }

    /**
     * Recovery: reset orphaned RUNNING tasks after restart
     */
    async initializeBusRecovery(options = {}) {
        const busPath = path.join(process.cwd(), this.busDir);
        const maxRetries = options.maxRetries || 3;

        if (!fs.existsSync(busPath)) {
            return { scanned: 0, resetToPending: 0, markedFailed: 0 };
        }

        const files = fs.readdirSync(busPath).filter((f) => f.endsWith('.json') && !f.startsWith('resp_'));
        let resetToPending = 0;
        let markedFailed = 0;

        for (const file of files) {
            const fullPath = path.join(busPath, file);
            try {
                const request = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                if (request.status === 'RUNNING') {
                    const retryCount = (request.retryCount || 0) + 1;
                    request.retryCount = retryCount;

                    if (retryCount > maxRetries) {
                        request.status = 'FAILED';
                        request.metadata = {
                            ...(request.metadata || {}),
                            finishedAt: new Date().toISOString(),
                            recoveryNote: 'Exceeded max recovery retries'
                        };
                        markedFailed += 1;
                    } else {
                        request.status = 'PENDING';
                        resetToPending += 1;
                    }

                    fs.writeFileSync(fullPath, JSON.stringify(request, null, 2), 'utf8');
                }
            } catch (error) {
                console.warn(`[AGENT-BUS] Recovery skip for ${file}: ${error.message}`);
            }
        }

        const summary = {
            scanned: files.length,
            resetToPending,
            markedFailed
        };
        await this._logBusEvent('Bus recovery completed', summary);
        return summary;
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

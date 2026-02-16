/**
 * TAIA BRIDGE v1.0 (Veritas-Ebene)
 * Nadelöhr für alle KI-Aktionen
 *
 * Implementiert RB-Protokoll + Veritas-Ebene:
 * - Gesetz 1: Glass-Box Auditing
 * - Gesetz 2: Git Checkpoint before Changes
 * - Gesetz 3: Progressive Escalation
 * - Gesetz 4: Menschliche Hoheit bei kritischen Entscheidungen
 * - VERITAS: Physische Beweise für alle Aktionen (kein Schwindel)
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TAIABridge {
    constructor(options = {}) {
        this.namespace = options.namespace || 'taia.default';
        this.auditLog = options.auditLog || 'brain/AUDIT_LOG.md';
        this.integrityAudit = options.integrityAudit || 'brain/INTEGRITY_AUDIT.md';
        this.requireApprovalOn = options.requireApprovalOn || ['BLOCKER', 'CRITICAL'];
        this.protectedZones = ['src', 'brain', 'config'];
        this.version = '1.0.0-veritas+registry';

        // Registry reference (injected later to avoid circular deps)
        this.registry = options.registry || null;
        this.ioQueue = Promise.resolve();
        this.ioQueueDepth = 0;

        console.log(chalk.blue(`[TAIA-INIT] Bridge v${this.version} initialized: ${this.namespace}`));
        console.log(chalk.yellow(`[VERITAS] Integrity checks ENABLED - no simulations allowed`));
        if (this.registry) {
            const stats = this.registry.getStats();
            console.log(chalk.cyan(`[REGISTRY] Federation integrated - ${stats.agentCount} agents active`));
        }
    }

    /**
     * Injiziere Registry nachträglich (für Circular Dependency Vermeidung)
     */
    setRegistry(registry) {
        this.registry = registry;
        console.log(chalk.cyan(`[BRIDGE] Registry injected - federation ready`));
    }

    /**
     * Agent-gestützte Aktion: Prüfe Agent Skill-Berechtigung
     * Gesetz 4: Kritische Skills brauchen Approval
     */
    async verifyAgentSkill(agentId, skillId, approvalToken = null) {
        if (!this.registry) {
            throw new Error(`[BRIDGE] Registry not available`);
        }

        if (!this.registry.canUseSkill(agentId, skillId)) {
            const message = `[BRIDGE] Agent ${agentId} cannot use skill ${skillId} (not assigned)`;
            console.error(message);
            throw new Error(message);
        }

        // Wenn Skill kritisch ist und kein Token vorhanden
        const skill = this.registry.skills.get(skillId);
        if (skill && skill.level >= 9 && !approvalToken) {
            const message = `[BRIDGE] Skill ${skillId} (level ${skill.level}) requires human approval`;
            console.warn(chalk.red(message));
            throw new Error(message);
        }

        return {
            allowed: true,
            agentId,
            skillId,
            skillLevel: skill?.level || 0
        };
    }

    /**
     * VERITAS-EBENE: Verifiziere Aktionen gegen Realität
     * Kein Schwindel - Physische Beweise erforderlich
     */
    async verifyAction(actionType, targetPath, context = {}) {
        const result = {
            allowed: false,
            reason: '',
            physicalProof: {},
            gitProof: {},
            timestamp: new Date().toISOString(),
            callId: Math.random().toString(36).substr(2, 9)
        };

        // 1. ZONE-CHECK: Ist es eine geschützte Zone?
        if (['DELETE', 'REMOVE', 'UNLINK'].includes(actionType)) {
            const isProtected = this.protectedZones.some(zone =>
                targetPath.includes(`/${zone}/`) || targetPath.includes(`\\${zone}\\`)
            );

            if (isProtected) {
                result.reason = `[VERITAS-BLOCK] ${actionType} in protected zone (${path.dirname(targetPath)}) forbidden`;
                await this._logIntegrityAudit(result);
                return result;
            }
        }

        // 2. EXISTENZ-CHECK: Ist das Objekt physisch vorhanden?
        if (!fs.existsSync(targetPath)) {
            result.reason = `[VERITAS-HONEST] Target does not exist: ${targetPath}. Simulation blocked.`;
            result.physicalProof = { exists: false };
            await this._logIntegrityAudit(result);
            return result;
        }

        // 3. PHYSISCHER BEWEIS: Sammle File-Info
        try {
            const stat = fs.statSync(targetPath);
            result.physicalProof = {
                exists: true,
                size: stat.size,
                type: stat.isDirectory() ? 'directory' : 'file',
                modified: stat.mtime.toISOString()
            };
        } catch (e) {
            result.reason = `[VERITAS-ERROR] Cannot stat file: ${e.message}`;
            await this._logIntegrityAudit(result);
            return result;
        }

        // 4. GIT-PROOF: Ist die Datei trackbar?
        try {
            const gitHash = execSync(`git hash-object "${targetPath}"`).toString().trim();
            result.gitProof = {
                tracked: true,
                hash: gitHash,
                recoverable: true
            };
        } catch (e) {
            result.gitProof = { tracked: false };
        }

        // ✅ AKTION ERLAUBT - mit vollständigen Beweisen
        result.allowed = true;
        result.reason = `[VERITAS-OK] Action permitted. Physical + Git proof collected.`;
        await this._logIntegrityAudit(result);
        return result;
    }

    /**
     * SAFE-DELETE: Archiviere statt zu löschen (Gesetz 2)
     */
    async safeDelete(targetPath) {
        const verification = await this.verifyAction('DELETE', targetPath);

        if (!verification.allowed) {
            throw new Error(`[INTEGRITY-BLOCK] ${verification.reason}`);
        }

        // Archiviere statt zu löschen
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = path.join(
            process.cwd(),
            'archive',
            `${timestamp}_${path.basename(targetPath)}`
        );

        try {
            const archiveDir = path.dirname(archivePath);
            if (!fs.existsSync(archiveDir)) {
                fs.mkdirSync(archiveDir, { recursive: true });
            }

            fs.renameSync(targetPath, archivePath);

            const auditEntry = `\n## [${verification.timestamp}] SAFE-DELETE (ID: ${verification.callId})
- **From:** ${targetPath}
- **To:** ${archivePath}
- **Proof:** ${verification.gitProof.tracked ? `Git Hash: ${verification.gitProof.hash}` : 'Untracked'}
- **Status:** ARCHIVED (recoverable)
`;
            await this.appendAuditLog(auditEntry);

            return {
                action: 'ARCHIVED',
                from: targetPath,
                to: archivePath,
                proof: verification
            };
        } catch (error) {
            throw new Error(`[SAFE-DELETE-ERROR] ${error.message}`);
        }
    }

    /**
     * Integrität-Audit schreiben
     */
    async _logIntegrityAudit(result) {
        try {
            const entry = `\n## [${result.timestamp}] ACTION: ${result.actionType || 'VERIFY'} (ID: ${result.callId})
- **Result:** ${result.reason}
- **Physical:** ${JSON.stringify(result.physicalProof)}
- **Git:** ${JSON.stringify(result.gitProof)}
- **Allowed:** ${result.allowed ? '✅' : '❌'}
`;

            const auditPath = path.join(process.cwd(), this.integrityAudit);
            const dir = path.dirname(auditPath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.appendFileSync(auditPath, entry, 'utf8');
        } catch (e) {
            // Silent fail for audit
        }
    }

    /**
     * Wrapper für jeden Tool-Aufruf
     * Erzwingt Glass-Box Auditing (Gesetz 1)
     */
    async wrapToolCall(toolName, args, toolLogic) {
        const timestamp = new Date().toISOString();
        const callId = Math.random().toString(36).substr(2, 9);

        // Auditlog Entry START
        const auditEntry = `\n## [${timestamp}] TOOL: ${toolName} (ID: ${callId})
- **Namespace:** ${this.namespace}
- **Args:** ${JSON.stringify(args, null, 2)}
- **Status:** STARTED
`;
        await this.appendAuditLog(auditEntry);

        try {
            console.log(chalk.cyan(`[TAIA-CALL] ${toolName} (${callId})`));
            const runLogic = async () => toolLogic(args);

            // Mutating calls are serialized to avoid race conditions (git index.lock, overwrite conflicts)
            const result = this._isMutatingTool(toolName)
                ? await this._enqueueMutatingOperation(toolName, runLogic)
                : await runLogic();

            // Auditlog Entry SUCCESS
            await this.appendAuditLog(`- **Status:** SUCCESS\n- **Result:** ${JSON.stringify(result).substring(0, 200)}...\n`);

            return result;

        } catch (error) {
            // Auditlog Entry ERROR
            await this.appendAuditLog(`- **Status:** ERROR\n- **Error:** ${error.message}\n`);

            console.error(chalk.red(`[TAIA-ERROR] ${toolName}: ${error.message}`));
            throw error;
        }
    }

    /**
     * Checkpoint vor Code-Änderungen (Gesetz 2: Undo is King)
     * Erstellt einen Git-Checkpoint bevor kritischer Code verändert wird
     */
    async gitCheckpoint(description) {
        try {
            const timestamp = new Date().toISOString();
            const checkpointMsg = `[TAIA-CHECKPOINT] ${description} (${timestamp})`;

            console.log(chalk.yellow(`[TAIA-CHECKPOINT] ${description}`));

            // Nur checken, ob Git verfügbar ist (nicht commiten - das ist User-Job)
            execSync('git status', { stdio: 'ignore' });

            const auditEntry = `\n## [${timestamp}] CHECKPOINT: ${description}
- **Type:** GIT_CHECKPOINT
- **Status:** READY (awaiting user commit)
`;
            await this.appendAuditLog(auditEntry);

            return { checkpoint: checkpointMsg, status: 'ready' };

        } catch (error) {
            console.warn(chalk.yellow(`[TAIA-WARN] Git not available for checkpoint`));
            return { checkpoint: description, status: 'skipped', reason: error.message };
        }
    }

    /**
     * Menschliche Hoheit erzwingen (Gesetz 4)
     * Bei kritischen Findings muss ein Mensch approve
     */
    requireHumanApproval(finding) {
        const isCritical = this.requireApprovalOn.some(level =>
            finding.severity && finding.severity.includes(level)
        );

        if (isCritical) {
            const message = `
${chalk.red('🚨 [TAIA-BLOCK] MENSCHLICHE HOHEIT ERFORDERLICH')}

Befund: ${finding.message}
Severity: ${finding.severity}
Datei: ${finding.file}

${chalk.yellow('Aktion erforderlich: Benutzer muss diesen Fund bestätigen oder beheben')}
`;
            console.log(message);

            return {
                blocked: true,
                message: finding.message,
                requiresApproval: true,
                severity: finding.severity
            };
        }

        return { blocked: false, requiresApproval: false };
    }

    /**
     * Audit-Log schreiben (Gesetz 1: Glass-Box)
     */
    async appendAuditLog(entry) {
        try {
            const logPath = path.join(process.cwd(), this.auditLog);

            // Stelle sicher, dass das Verzeichnis existiert
            await fsPromises.mkdir(path.dirname(logPath), { recursive: true });

            // Append zum Log
            await fsPromises.appendFile(logPath, entry, 'utf8');
        } catch (error) {
            console.warn(chalk.yellow(`[TAIA-WARN] Could not write audit log: ${error.message}`));
        }
    }

    _isMutatingTool(toolName = '') {
        const normalized = String(toolName || '').toLowerCase();
        const mutatingTools = [
            'write_file',
            'writefile',
            'apply_patch',
            'applypatch',
            'edit',
            'delete',
            'command',
            'shell',
            'git'
        ];

        return mutatingTools.some((name) => normalized.includes(name));
    }

    async _enqueueMutatingOperation(label, operation) {
        this.ioQueueDepth += 1;
        const position = this.ioQueueDepth;
        console.log(chalk.yellow(`[TAIA-QUEUE] ${label} queued (position=${position})`));

        const next = this.ioQueue
            .then(async () => {
                console.log(chalk.yellow(`[TAIA-QUEUE] ${label} started`));
                return operation();
            })
            .finally(() => {
                this.ioQueueDepth = Math.max(0, this.ioQueueDepth - 1);
            });

        // Keep chain alive even when a task fails
        this.ioQueue = next.catch(() => { });
        return next;
    }

    checkSentinelBlacklist(command = '') {
        const normalized = String(command || '').toLowerCase();
        const blocked = [
            'rm -rf /',
            'git reset --hard',
            'format c:',
            'del /f /q',
            'shutdown /s'
        ];

        if (blocked.some((entry) => normalized.includes(entry))) {
            throw new Error(`[SENTINEL] Command blocked by blacklist: ${command}`);
        }
    }

    /**
     * Liberty-Enforcer: einzige sichere Ausführungsschiene für Worker-IO
     */
    async safeExecuteTool(type, payload = {}, executor = null) {
        const label = `${type}:${payload.path || payload.command || 'n/a'}`;

        return this._enqueueMutatingOperation(label, async () => {
            // §2 Revidierbarkeit: Git checkpoint vor mutierenden Aktionen
            if (type === 'WRITE_FILE' || type === 'EXEC_COMMAND') {
                await this.gitCheckpoint(`[SAFE-EXEC] ${label}`);
            }

            if (type === 'EXEC_COMMAND') {
                this.checkSentinelBlacklist(payload.command || '');
            }

            if (typeof executor === 'function') {
                return executor();
            }

            // Default: no-op if no executor function was provided
            return { success: true, type, payload };
        });
    }

    /**
     * Sentinel-Integration: Security Finding Handler
     */
    async handleSecurityFinding(finding) {
        const timestamp = new Date().toISOString();

        // Glass-Box Logging
        const auditEntry = `\n## [${timestamp}] SECURITY_FINDING
- **Type:** ${finding.type}
- **Severity:** ${finding.severity}
- **File:** ${finding.file}
- **Message:** ${finding.message}
`;
        await this.appendAuditLog(auditEntry);

        // Menschliche Hoheit erzwingen bei kritischen Befunden
        const approval = this.requireHumanApproval(finding);

        if (approval.requiresApproval) {
            console.log(chalk.red(`[TAIA-SENTINEL] 🚨 ${finding.message}`));
            return {
                action: 'BLOCK',
                reason: 'Requires human approval',
                finding
            };
        }

        console.log(chalk.green(`[TAIA-SENTINEL] ✅ ${finding.message}`));
        return {
            action: 'ALLOW',
            reason: 'Passed security check',
            finding
        };
    }

    /**
     * Phase-Status: Schreibe Phase-Info ins Audit-Log
     */
    async logPhaseStart(phaseName, description) {
        const timestamp = new Date().toISOString();
        const entry = `\n# [${timestamp}] PHASE START: ${phaseName}

**Description:** ${description}

---
`;
        await this.appendAuditLog(entry);
        console.log(chalk.blue(`\n[TAIA-PHASE] Starting: ${phaseName}\n`));
    }

    /**
     * Phase-Status: Schreibe Phase-Completion ins Audit-Log
     */
    async logPhaseComplete(phaseName, metrics = {}) {
        const timestamp = new Date().toISOString();
        const entry = `\n## [${timestamp}] PHASE COMPLETE: ${phaseName}

**Metrics:** ${JSON.stringify(metrics, null, 2)}

---
`;
        await this.appendAuditLog(entry);
        console.log(chalk.green(`\n[TAIA-PHASE] Completed: ${phaseName}\n`));
    }
}

export { TAIABridge };

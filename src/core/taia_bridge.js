/**
 * TAIA MINIMAL BRIDGE (v0.1)
 * Schnittstelle zwischen Claude Code und TAIA-Standard
 *
 * Implementiert RB-Protokoll:
 * - Gesetz 1: Glass-Box Auditing
 * - Gesetz 2: Git Checkpoint before Changes
 * - Gesetz 4: Menschliche Hoheit bei kritischen Entscheidungen
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

class TAIABridge {
    constructor(options = {}) {
        this.namespace = options.namespace || 'taia.default';
        this.auditLog = options.auditLog || 'brain/AUDIT_LOG.md';
        this.requireApprovalOn = options.requireApprovalOn || ['BLOCKER', 'CRITICAL'];
        this.version = '0.1.0';

        console.log(chalk.blue(`[TAIA-INIT] Bridge initialized: ${this.namespace} v${this.version}`));
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

            // Führe das Tool aus
            const result = await toolLogic(args);

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
            await fs.mkdir(path.dirname(logPath), { recursive: true });

            // Append zum Log
            await fs.appendFile(logPath, entry, 'utf8');
        } catch (error) {
            console.warn(chalk.yellow(`[TAIA-WARN] Could not write audit log: ${error.message}`));
        }
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

module.exports = { TAIABridge };

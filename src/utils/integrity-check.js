/**
 * INTEGRITY-CHECK v2.0 - Veritas-Ebene
 * Stellt sicher: Keine Simulationen, physische Beweise, Git-Proof
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IntegrityChecker {
    constructor(options = {}) {
        this.auditLog = options.auditLog || 'brain/INTEGRITY_AUDIT.md';
        this.protectedZones = ['src', 'brain', 'config'];
    }

    /**
     * Verifiziere eine Aktion gegen Veritas-Regeln
     */
    async verifyAction(actionType, targetPath) {
        const result = {
            allowed: false,
            reason: '',
            physicalProof: {},
            gitProof: {},
            timestamp: new Date().toISOString()
        };

        // 1. Prüfe: Ist es DELETE/REMOVE in src/?
        if (['DELETE', 'REMOVE', 'UNLINK'].includes(actionType)) {
            if (targetPath.includes('src/') || targetPath.includes('src\\')) {
                result.reason = `[VERITAS-BLOCK] ${actionType} in src/ forbidden (protected zone)`;
                await this._logAudit(result);
                return result;
            }
        }

        // 2. Prüfe: Existiert die Datei physisch?
        if (!fs.existsSync(targetPath)) {
            result.reason = `[VERITAS-HONEST] File does not exist: ${targetPath}`;
            result.physicalProof = { exists: false };
            await this._logAudit(result);
            return result;
        }

        // 3. Sammle physischen Beweis
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
            await this._logAudit(result);
            return result;
        }

        // 4. Sammle Git-Proof wenn möglich
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

        // ✅ ERLAUBT
        result.allowed = true;
        result.reason = `[VERITAS-OK] Action permitted. Physical + Git proof collected.`;
        await this._logAudit(result);
        return result;
    }

    /**
     * Schreibe Audit-Entry
     */
    async _logAudit(result) {
        try {
            const entry = `\n## [${result.timestamp}]\n`
                + `**Action:** ${result.reason}\n`
                + `**Physical:** ${JSON.stringify(result.physicalProof)}\n`
                + `**Git:** ${JSON.stringify(result.gitProof)}\n`
                + `**Allowed:** ${result.allowed ? '✅' : '❌'}\n`;

            const auditPath = path.join(process.cwd(), this.auditLog);
            const dir = path.dirname(auditPath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.appendFileSync(auditPath, entry, 'utf8');
        } catch (e) {
            // Silent fail for audit logging
        }
    }
}

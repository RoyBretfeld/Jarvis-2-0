/**
 * DOC-SENTINEL v1.0
 * Sub-Agent für Dokumentations-Synchronisation
 *
 * Mission: Halten Dokumentation mit Code-Änderungen synchron
 * Trigger: Git post-commit hooks
 * Scope: /docs/*, README.md, ARCHITECTURE.md
 *
 * Privilege Level: 8 (WRITE_DOCS) - mittleres Privileg
 * Constraint: Nur .md Dateien in erlaubtem Scope
 *
 * Gesetze:
 * 1. Glass-Box: Alle Änderungen in AUDIT_LOG.md
 * 2. Undo is King: Commits für Doc-Änderungen
 * 4. Human Authority: PRs statt direkte Commits
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DocSentinel {
    constructor(options = {}) {
        this.agentId = 'doc-sentinel';  // Muss Registry ID matchen
        this.name = 'Documentation Sentinel';
        this.bridge = options.bridge || null;
        this.registry = options.registry || null;

        // Scope - erlaubte Verzeichnisse
        this.allowedDirs = [
            'docs/',
            './',  // Root für README.md, ARCHITECTURE.md
        ];

        // Erlaubte Dateitypen
        this.allowedExtensions = ['.md', '.MD'];

        // Doc-Templates
        this.templates = {
            architecture: 'ARCHITECTURE.md',
            changelog: 'CHANGELOG.md',
            readme: 'README.md'
        };

        // Audit log
        this.auditLog = options.auditLog || 'brain/DOC_SENTINEL_LOG.md';

        console.log(`[DOC-SENTINEL] Initialized: ${this.name}`);
    }

    /**
     * Hauptjob: Synchronisiere Doku mit Code-Änderungen
     * Trigger: Nach Git-Commits
     */
    async syncDocumentation(commitHash) {
        const timestamp = new Date().toISOString();

        try {
            // 1. Prüfe Skill-Berechtigung
            if (!this._canExecuteJob()) {
                throw new Error(`[DOC-SENTINEL] Missing skill permissions`);
            }

            // 2. Hole die geänderten Dateien aus dem Commit
            const changedFiles = this._getChangedFiles(commitHash);

            if (changedFiles.length === 0) {
                await this._logAudit(`No files changed in ${commitHash}`, { status: 'SKIPPED' });
                return { status: 'skipped', reason: 'No changes detected' };
            }

            // 3. Analysiere Code-Änderungen
            const analysis = await this._analyzeChanges(changedFiles);

            // 4. Generiere Dokumentations-Updates
            const docUpdates = await this._generateDocUpdates(analysis);

            // 5. Prüfe auf Veritas-Konflikte
            const verification = await this._verifyDocChanges(docUpdates);

            if (!verification.allowed) {
                await this._logAudit(`Documentation verification failed`, verification);
                return {
                    status: 'blocked',
                    reason: verification.reason,
                    verification
                };
            }

            // 6. Wende Updates an
            const result = await this._applyDocUpdates(docUpdates);

            // 7. Glass-Box: Log alles
            await this._logAudit(`Documentation synchronized`, {
                commit: commitHash,
                filesChanged: changedFiles.length,
                docUpdates: result.updated,
                status: 'SUCCESS'
            });

            return {
                status: 'success',
                updated: result.updated,
                summary: result.summary
            };

        } catch (error) {
            await this._logAudit(`Sync failed: ${error.message}`, {
                error: error.message,
                status: 'ERROR'
            });
            throw error;
        }
    }

    /**
     * Prüfe ob Doc-Sentinel die notwendigen Skills hat
     */
    _canExecuteJob() {
        if (!this.registry) return false;

        const canRead = this.registry.canUseSkill(this.agentId, 'READ_CODE');
        const canWrite = this.registry.canUseSkill(this.agentId, 'WRITE_DOCS');

        return canRead && canWrite;
    }

    /**
     * Hole geänderte Dateien aus einem Commit
     */
    _getChangedFiles(commitHash) {
        try {
            const output = execSync(`git diff-tree --no-commit-id --name-only -r ${commitHash}`)
                .toString()
                .trim()
                .split('\n')
                .filter(f => f.length > 0);

            return output;
        } catch (e) {
            console.warn(`[DOC-SENTINEL] Could not get changed files: ${e.message}`);
            return [];
        }
    }

    /**
     * Analysiere die Code-Änderungen
     */
    async _analyzeChanges(files) {
        const analysis = {
            newFeatures: [],
            bugFixes: [],
            refactoring: [],
            architecture: [],
            apis: [],
            timestamp: new Date().toISOString()
        };

        for (const file of files) {
            // Kategorisiere nach Dateityp
            if (file.includes('src/core/')) {
                analysis.architecture.push(file);
            } else if (file.includes('src/api/') || file.includes('routes/')) {
                analysis.apis.push(file);
            } else if (file.includes('src/utils/')) {
                analysis.refactoring.push(file);
            }
        }

        return analysis;
    }

    /**
     * Generiere Dokumentations-Updates
     */
    async _generateDocUpdates(analysis) {
        const updates = [];

        // ARCHITECTURE.md Update
        if (analysis.architecture.length > 0) {
            updates.push({
                file: 'ARCHITECTURE.md',
                type: 'architecture',
                summary: `Updated architecture docs for: ${analysis.architecture.join(', ')}`
            });
        }

        // API Docs Update
        if (analysis.apis.length > 0) {
            updates.push({
                file: 'docs/API.md',
                type: 'api',
                summary: `Updated API documentation: ${analysis.apis.length} changes`
            });
        }

        // CHANGELOG Entry
        updates.push({
            file: 'CHANGELOG.md',
            type: 'changelog',
            summary: `Auto-generated changelog entry: ${new Date().toISOString().split('T')[0]}`
        });

        return updates;
    }

    /**
     * Verifiziere Doc-Änderungen mit Veritas-Bridge
     */
    async _verifyDocChanges(docUpdates) {
        const result = {
            allowed: true,
            reason: '',
            violations: []
        };

        for (const update of docUpdates) {
            // 1. Prüfe Dateiname
            if (!this._isAllowedFile(update.file)) {
                result.allowed = false;
                result.violations.push(`File ${update.file} not in allowed scope`);
            }

            // 2. Prüfe Dateityp
            const ext = path.extname(update.file);
            if (!this.allowedExtensions.includes(ext)) {
                result.allowed = false;
                result.violations.push(`Extension ${ext} not allowed (only .md)`);
            }
        }

        if (!result.allowed) {
            result.reason = `Veritas: ${result.violations.join('; ')}`;
        }

        return result;
    }

    /**
     * Prüfe ob Datei im erlaubten Scope liegt
     */
    _isAllowedFile(filePath) {
        const allowed = [
            'ARCHITECTURE.md',
            'README.md',
            'CHANGELOG.md',
            /^docs\/.+\.md$/
        ];

        for (const pattern of allowed) {
            if (typeof pattern === 'string') {
                if (filePath === pattern) return true;
            } else if (pattern instanceof RegExp) {
                if (pattern.test(filePath)) return true;
            }
        }

        return false;
    }

    /**
     * Wende Dokumentations-Updates an
     */
    async _applyDocUpdates(docUpdates) {
        const updated = [];
        const timestamp = new Date().toISOString();

        for (const update of docUpdates) {
            try {
                const filePath = path.join(process.cwd(), update.file);

                // Erstelle Verzeichnis falls nötig
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                // Generiere Inhalt basierend auf Typ
                let content = '';
                if (update.type === 'changelog') {
                    content = `\n## [${timestamp}]\n${update.summary}\n`;
                    if (fs.existsSync(filePath)) {
                        const existing = fs.readFileSync(filePath, 'utf8');
                        content = content + existing;
                    }
                } else {
                    content = `# ${update.file}\n\n${update.summary}\n\n*Last updated: ${timestamp}*\n`;
                }

                // Schreibe Datei
                fs.writeFileSync(filePath, content, 'utf8');
                updated.push(update.file);

            } catch (error) {
                console.error(`[DOC-SENTINEL] Failed to update ${update.file}: ${error.message}`);
            }
        }

        return {
            updated,
            summary: `Updated ${updated.length} documentation files`
        };
    }

    /**
     * Glass-Box: Audit-Log schreiben
     */
    async _logAudit(message, metadata = {}) {
        try {
            const timestamp = new Date().toISOString();
            const entry = `\n## [${timestamp}] ${this.agentId}\n`
                + `**Action:** ${message}\n`
                + `**Metadata:** ${JSON.stringify(metadata, null, 2)}\n`;

            const logPath = path.join(process.cwd(), this.auditLog);
            const dir = path.dirname(logPath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.appendFileSync(logPath, entry, 'utf8');
        } catch (e) {
            console.warn(`[DOC-SENTINEL] Audit logging failed: ${e.message}`);
        }
    }

    /**
     * Status / Health Check
     */
    getStatus() {
        return {
            agentId: this.agentId,
            name: this.name,
            status: 'OPERATIONAL',
            skillsAvailable: {
                READ_CODE: this.registry?.canUseSkill(this.agentId, 'READ_CODE'),
                WRITE_DOCS: this.registry?.canUseSkill(this.agentId, 'WRITE_DOCS')
            },
            allowedDirs: this.allowedDirs,
            allowedExtensions: this.allowedExtensions
        };
    }
}

/**
 * TAIA CORE REGISTRY v1.0 - Agent Federation
 *
 * Zentrale Verwaltung der Agenten-Föderation:
 * - Agent-Registrierung mit kryptographischen Tokens
 * - Skill-Permissions mit Least-Privilege Prinzip
 * - Human Authority Gating für kritische Zuweisungen
 * - Bridge-Integration für Veritas-Checks
 *
 * Architektur-Ansatz:
 * TAIA ist nicht ein Agent, sondern ein Orchester von Spezialisten.
 * Jeder Sub-Agent hat:
 * - Eindeutige ID
 * - Token (für Veritas-Signierung)
 * - Erlaubte Skills (granular)
 * - Audit-Trail (Glass-Box)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TaiaRegistry {
    constructor(options = {}) {
        this.registryLog = options.registryLog || 'brain/REGISTRY_LOG.md';
        this.permissionsFile = options.permissionsFile || 'brain/PERMISSIONS.json';

        // Agents Map: agentId -> { name, capabilities, token, status, createdAt }
        this.agents = new Map();

        // Skills Map: skillId -> { name, type, requires, level }
        // types: 'read', 'write', 'execute', 'critical'
        // level: 0-10 (0=low, 10=critical)
        this.skills = new Map();

        // Permissions Map: `${agentId}:${skillId}` -> true/false
        this.permissions = new Map();

        // Critical Skills (require human approval)
        this.criticalSkills = new Set([
            'DELETE_CODE',
            'MODIFY_BRAIN',
            'EXECUTE_SHELL',
            'DEPLOY_PRODUCTION',
            'MODIFY_REGISTRY'
        ]);

        // Initialize default agents
        this._initializeDefaultAgents();
        this._loadPermissions();

        console.log(`[REGISTRY] Initialized with ${this.agents.size} agents`);
    }

    /**
     * Registriere einen neuen Agenten
     * Gesetz 4: Kritische Agenten-Registrierung muss geloggt werden
     */
    registerAgent(agentId, config = {}) {
        if (this.agents.has(agentId)) {
            throw new Error(`[REGISTRY] Agent ${agentId} already registered`);
        }

        // Generiere eindeutiges Token (für Veritas-Signierung)
        const token = crypto.randomBytes(32).toString('hex');
        const timestamp = new Date().toISOString();

        const agent = {
            id: agentId,
            name: config.name || agentId,
            description: config.description || '',
            capabilities: config.capabilities || [],
            token: token,
            status: 'IDLE',
            createdAt: timestamp,
            lastActivity: timestamp,
            skillCount: 0
        };

        this.agents.set(agentId, agent);

        // Glass-Box: Log die Registrierung
        this._logRegistry(`Agent registered: ${agentId}`, {
            token: token.substring(0, 16) + '...', // Nur Prefix zeigen
            capabilities: config.capabilities,
            timestamp
        });

        console.log(`✅ [REGISTRY] Agent ${agentId} registered with token ${token.substring(0, 8)}...`);
        return agent;
    }

    /**
     * Weise einen Skill einem Agenten zu
     * Mit Human Authority Gating für kritische Skills
     */
    async assignSkill(agentId, skillId, approvalToken = null) {
        if (!this.agents.has(agentId)) {
            throw new Error(`[REGISTRY] Agent ${agentId} not found`);
        }

        if (!this.skills.has(skillId)) {
            throw new Error(`[REGISTRY] Skill ${skillId} not found`);
        }

        // Gesetz 4: Kritische Skills brauchen Approval
        if (this.criticalSkills.has(skillId) && !approvalToken) {
            const message = `\n🚨 [REGISTRY] HUMAN APPROVAL REQUIRED\n`
                + `Agent: ${agentId}\n`
                + `Skill: ${skillId} (CRITICAL)\n`
                + `\nApprove with: registry.assignSkill("${agentId}", "${skillId}", "<approval-token>")\n`;
            console.error(message);
            throw new Error(`Critical skill assignment requires approval token`);
        }

        // Grant permission
        const permKey = `${agentId}:${skillId}`;
        this.permissions.set(permKey, true);

        // Update agent skill count
        const agent = this.agents.get(agentId);
        agent.skillCount = (agent.skillCount || 0) + 1;
        agent.lastActivity = new Date().toISOString();

        // Glass-Box: Log die Skill-Zuweisung
        this._logRegistry(`Skill assigned to agent`, {
            agent: agentId,
            skill: skillId,
            critical: this.criticalSkills.has(skillId),
            timestamp: new Date().toISOString()
        });

        return {
            status: 'assigned',
            agent: agentId,
            skill: skillId,
            permissionKey: permKey
        };
    }

    /**
     * Prüfe, ob ein Agent einen Skill nutzen darf
     * Gesetz 1: Glass-Box - Alles wird geloggt
     */
    canUseSkill(agentId, skillId) {
        const permKey = `${agentId}:${skillId}`;
        const allowed = this.permissions.get(permKey) === true;

        if (!allowed) {
            this._logRegistry(`Permission denied`, {
                agent: agentId,
                skill: skillId,
                reason: 'Not assigned',
                timestamp: new Date().toISOString()
            });
        }

        return allowed;
    }

    /**
     * Registriere einen neuen Skill
     */
    registerSkill(skillId, config = {}) {
        if (this.skills.has(skillId)) {
            throw new Error(`[REGISTRY] Skill ${skillId} already exists`);
        }

        const skill = {
            id: skillId,
            name: config.name || skillId,
            type: config.type || 'execute', // read, write, execute, critical
            level: config.level || 5,
            requires: config.requires || [],
            description: config.description || '',
            createdAt: new Date().toISOString()
        };

        this.skills.set(skillId, skill);

        console.log(`✅ [REGISTRY] Skill ${skillId} registered (level: ${skill.level})`);
        return skill;
    }

    /**
     * Hole Agent-Info
     */
    getAgent(agentId) {
        return this.agents.get(agentId) || null;
    }

    /**
     * Hole alle Skills für einen Agenten
     */
    getAgentSkills(agentId) {
        const skills = [];
        for (const [permKey, allowed] of this.permissions.entries()) {
            const [aId, skillId] = permKey.split(':');
            if (aId === agentId && allowed) {
                skills.push(this.skills.get(skillId));
            }
        }
        return skills;
    }

    /**
     * Registry-Log schreiben (Glass-Box)
     */
    _logRegistry(message, metadata = {}) {
        try {
            const timestamp = new Date().toISOString();
            const entry = `\n## [${timestamp}]\n`
                + `**Event:** ${message}\n`
                + `**Metadata:** ${JSON.stringify(metadata, null, 2)}\n`;

            const logPath = path.join(process.cwd(), this.registryLog);
            const dir = path.dirname(logPath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.appendFileSync(logPath, entry, 'utf8');
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Speichere Permissions persistiert
     */
    _savePermissions() {
        try {
            const permObj = {};
            for (const [key, value] of this.permissions.entries()) {
                permObj[key] = value;
            }

            const permPath = path.join(process.cwd(), this.permissionsFile);
            const dir = path.dirname(permPath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(permPath, JSON.stringify(permObj, null, 2), 'utf8');
        } catch (e) {
            console.warn(`[REGISTRY] Could not save permissions: ${e.message}`);
        }
    }

    /**
     * Lade Permissions
     */
    _loadPermissions() {
        try {
            const permPath = path.join(process.cwd(), this.permissionsFile);
            if (fs.existsSync(permPath)) {
                const permObj = JSON.parse(fs.readFileSync(permPath, 'utf8'));
                for (const [key, value] of Object.entries(permObj)) {
                    this.permissions.set(key, value);
                }
            }
        } catch (e) {
            console.warn(`[REGISTRY] Could not load permissions: ${e.message}`);
        }
    }

    /**
     * Initialisiere Standard-Agenten
     */
    _initializeDefaultAgents() {
        // TAIA Hauptagent (das Koordinatorensystem)
        this.registerAgent('taia-core', {
            name: 'TAIA Core Coordinator',
            description: 'Zentrale Koordinations-Instanz aller Sub-Agenten',
            capabilities: ['orchestration', 'routing', 'decision-making']
        });

        // Doc-Sentinel (erstes Sub-Agenten-Beispiel)
        this.registerAgent('doc-sentinel', {
            name: 'Documentation Sentinel',
            description: 'Überwacht und synchronisiert technische Dokumentation',
            capabilities: ['documentation', 'monitoring', 'synchronization']
        });

        // Initialisiere Standard-Skills
        this.registerSkill('READ_CODE', {
            name: 'Read Source Code',
            type: 'read',
            level: 1,
            description: 'Lese Quellcode-Dateien'
        });

        this.registerSkill('WRITE_DOCS', {
            name: 'Write Documentation',
            type: 'write',
            level: 3,
            description: 'Schreibe .md Dokumentation'
        });

        this.registerSkill('MODIFY_CODE', {
            name: 'Modify Source Code',
            type: 'write',
            level: 7,
            requires: ['READ_CODE'],
            description: 'Ändere Quellcode (high privilege)'
        });

        this.registerSkill('DELETE_CODE', {
            name: 'Delete Source Code',
            type: 'critical',
            level: 10,
            requires: ['MODIFY_CODE'],
            description: 'Lösche Quellcode (KRITISCH!)'
        });

        this.registerSkill('EXECUTE_SHELL', {
            name: 'Execute Shell Commands',
            type: 'critical',
            level: 9,
            description: 'Führe Shell-Befehle aus'
        });

        // Gib Doc-Sentinel seine Skills
        this.assignSkill('doc-sentinel', 'READ_CODE');
        this.assignSkill('doc-sentinel', 'WRITE_DOCS');

        // Gib TAIA-Core alle Skills (außer CRITICAL - die brauchen Approval)
        this.assignSkill('taia-core', 'READ_CODE');
        this.assignSkill('taia-core', 'WRITE_DOCS');
        this.assignSkill('taia-core', 'MODIFY_CODE');

        this._savePermissions();
    }

    /**
     * Gib Registry-Statistiken
     */
    getStats() {
        return {
            agentCount: this.agents.size,
            skillCount: this.skills.size,
            permissionCount: this.permissions.size,
            agents: Array.from(this.agents.values()).map(a => ({
                id: a.id,
                name: a.name,
                skillCount: a.skillCount,
                status: a.status
            }))
        };
    }
}

export { TaiaRegistry };

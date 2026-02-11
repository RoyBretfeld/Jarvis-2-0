/**
 * SENTINEL TAIA WRAPPER
 * Integration des Security Sentinel mit TAIA-Bridge
 *
 * Nutzt TAIA-Bridge für:
 * - Glass-Box Auditing (Gesetz 1)
 * - Git Checkpointing (Gesetz 2)
 * - Menschliche Hoheit bei kritischen Befunden (Gesetz 4)
 */

const { TAIABridge } = require('./taia_bridge');

class SentinelTAIAWrapper {
    constructor() {
        this.bridge = new TAIABridge({
            namespace: 'taia.security.sentinel',
            auditLog: 'brain/SENTINEL_AUDIT.md',
            requireApprovalOn: ['BLOCKER', 'CRITICAL']
        });
    }

    /**
     * Scan mit TAIA-Integration
     */
    async scanWithTAIA(filePath, scanLogic) {
        return await this.bridge.wrapToolCall(
            'sentinel-scan',
            { file: filePath },
            async (args) => {
                const findings = await scanLogic(args.file);
                return findings;
            }
        );
    }

    /**
     * Verarbeite Security-Finding mit TAIA-Gatekeeper
     */
    async processFinding(finding) {
        return await this.bridge.handleSecurityFinding({
            type: finding.type,
            severity: finding.severity,
            file: finding.file,
            message: finding.message
        });
    }

    /**
     * Starte Scan mit Checkpoint-Sicherung
     */
    async scanWithCheckpoint(filePath, description, scanLogic) {
        // Checkpoint vor dem Scan
        await this.bridge.gitCheckpoint(`Before scan: ${description}`);

        // Führe Scan aus
        const findings = await this.scanWithTAIA(filePath, scanLogic);

        // Verarbeite Findings
        const processedFindings = [];
        for (const finding of findings) {
            const result = await this.processFinding(finding);
            processedFindings.push({
                ...finding,
                taiaResult: result
            });
        }

        return processedFindings;
    }

    /**
     * Phase-Integration: Log Phase-Start/End
     */
    async withPhaseGuard(phaseName, phaseDescription, executePhase) {
        await this.bridge.logPhaseStart(phaseName, phaseDescription);

        try {
            const result = await executePhase();

            await this.bridge.logPhaseComplete(phaseName, {
                status: 'SUCCESS',
                result: typeof result === 'string' ? result.substring(0, 100) : result
            });

            return result;
        } catch (error) {
            await this.bridge.logPhaseComplete(phaseName, {
                status: 'ERROR',
                error: error.message
            });

            throw error;
        }
    }
}

module.exports = { SentinelTAIAWrapper };

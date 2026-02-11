/**
 * METRICS BRIDGE - The Observability Layer
 *
 * Collects real-time metrics from:
 * - TAIA-Bridge (Audit Trail)
 * - Memory System (Hot/Warm/Cold/Archive)
 * - LLM Provider (Ollama/Groq stats)
 * - Python Services (Execution time, status)
 *
 * Implements Glass-Box (Gesetz 1): Everything is visible
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class MetricsBridge {
    constructor(options = {}) {
        this.auditLogPath = options.auditLog || 'brain/SENTINEL_AUDIT.md';
        this.metricsPath = options.metricsPath || 'brain/METRICS.json';
        this.collectionInterval = options.collectionInterval || 10000; // 10s

        this.metrics = {
            timestamp: new Date().toISOString(),
            audit: {
                entriesTotal: 0,
                findingsCount: 0,
                blockedActions: 0
            },
            memory: {
                hotSize: 0,
                warmSize: 0,
                coldSize: 0,
                archiveSize: 0,
                totalSize: 0
            },
            system: {
                nodeMemory: 0,
                pythonProcesses: 0,
                uptime: 0
            },
            llm: {
                provider: 'ollama',
                model: 'qwen2.5-coder:14b',
                latency: 0,
                requestCount: 0,
                errorCount: 0
            },
            phases: {
                current: 'Phase 5: Server Integration',
                completed: [],
                inProgress: true
            }
        };
    }

    /**
     * Sammle Metriken von Audit Trail
     */
    async collectAuditMetrics() {
        try {
            const auditContent = await fs.readFile(
                path.join(process.cwd(), this.auditLogPath),
                'utf8'
            );

            const lines = auditContent.split('\n');
            const toolCalls = lines.filter(l => l.includes('[TAIA-LOG]')).length;
            const blockings = lines.filter(l => l.includes('BLOCK')).length;
            const findings = lines.filter(l => l.includes('SECURITY_FINDING')).length;

            return {
                entriesTotal: lines.length,
                findingsCount: findings,
                blockedActions: blockings,
                toolCalls: toolCalls
            };
        } catch (e) {
            return { entriesTotal: 0, findingsCount: 0, blockedActions: 0 };
        }
    }

    /**
     * Sammle Memory System Metriken
     */
    async collectMemoryMetrics() {
        try {
            const brain = path.join(process.cwd(), 'brain');

            // Berechne Größen der Memory-Tiers
            const getSize = async (file) => {
                try {
                    const stat = await fs.stat(path.join(brain, file));
                    return stat.size;
                } catch {
                    return 0;
                }
            };

            const hotSize = await getSize('MEMORY.md');
            const warmSize = await getSize('MEMORY_COMPRESSED.md');
            const coldSize = await getSize('MEMORY_ARCHIVED.md');

            // Archiv-Größe
            let archiveSize = 0;
            try {
                const archiveDir = path.join(brain, 'archives');
                const files = await fs.readdir(archiveDir);
                for (const file of files) {
                    const stat = await fs.stat(path.join(archiveDir, file));
                    archiveSize += stat.size;
                }
            } catch {
                archiveSize = 0;
            }

            const totalSize = hotSize + warmSize + coldSize + archiveSize;

            return {
                hotSize: Math.round(hotSize / 1024), // KB
                warmSize: Math.round(warmSize / 1024),
                coldSize: Math.round(coldSize / 1024),
                archiveSize: Math.round(archiveSize / 1024),
                totalSize: Math.round(totalSize / 1024),
                tierDistribution: {
                    hot: ((hotSize / totalSize) * 100).toFixed(1) + '%',
                    warm: ((warmSize / totalSize) * 100).toFixed(1) + '%',
                    cold: ((coldSize / totalSize) * 100).toFixed(1) + '%',
                    archive: ((archiveSize / totalSize) * 100).toFixed(1) + '%'
                }
            };
        } catch (e) {
            return {
                hotSize: 0,
                warmSize: 0,
                coldSize: 0,
                archiveSize: 0,
                totalSize: 0
            };
        }
    }

    /**
     * Sammle System Metriken (Node.js Process)
     */
    collectSystemMetrics() {
        const memUsage = process.memoryUsage();

        return {
            nodeMemory: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
            uptime: Math.round(process.uptime()),
            platform: os.platform(),
            cpuCount: os.cpus().length
        };
    }

    /**
     * Schreibe Metriken ins JSON File
     */
    async writeMetrics() {
        try {
            const metricsPath = path.join(process.cwd(), this.metricsPath);

            await fs.writeFile(
                metricsPath,
                JSON.stringify(this.metrics, null, 2),
                'utf8'
            );
        } catch (e) {
            console.warn(`[Metrics] Write failed: ${e.message}`);
        }
    }

    /**
     * Sammel alle Metriken (Periodic Collection)
     */
    async collectAll() {
        this.metrics.timestamp = new Date().toISOString();
        this.metrics.audit = await this.collectAuditMetrics();
        this.metrics.memory = await this.collectMemoryMetrics();
        this.metrics.system = this.collectSystemMetrics();

        await this.writeMetrics();

        return this.metrics;
    }

    /**
     * Start periodisches Sammeln
     */
    startCollection() {
        setInterval(() => {
            this.collectAll().catch(e =>
                console.warn(`[Metrics] Collection error: ${e.message}`)
            );
        }, this.collectionInterval);

        console.log(`[Metrics] Collection started (every ${this.collectionInterval}ms)`);
    }

    /**
     * Gib aktuellen Status als Markdown zurück
     */
    getMarkdownReport() {
        const m = this.metrics;

        return `# The Forge - Real-Time Metrics

**Generated:** ${m.timestamp}

## 🧠 Memory System
- **Hot:** ${m.memory.hotSize} KB (${m.memory.tierDistribution?.hot || 'N/A'})
- **Warm:** ${m.memory.warmSize} KB (${m.memory.tierDistribution?.warm || 'N/A'})
- **Cold:** ${m.memory.coldSize} KB (${m.memory.tierDistribution?.cold || 'N/A'})
- **Archive:** ${m.memory.archiveSize} KB (${m.memory.tierDistribution?.archive || 'N/A'})
- **Total:** ${m.memory.totalSize} KB

## 📊 Audit Trail
- **Total Entries:** ${m.audit.entriesTotal}
- **Security Findings:** ${m.audit.findingsCount}
- **Blocked Actions:** ${m.audit.blockedActions}
- **Tool Calls:** ${m.audit.toolCalls || 0}

## 💾 System Resources
- **Node Memory:** ${m.system.nodeMemory} MB / ${m.system.heapTotal} MB
- **Uptime:** ${Math.floor(m.system.uptime / 60)} min
- **CPU Cores:** ${m.system.cpuCount}
- **Platform:** ${m.system.platform}

## 🤖 LLM Provider
- **Provider:** ${m.llm.provider}
- **Model:** ${m.llm.model}
- **Requests:** ${m.llm.requestCount}
- **Errors:** ${m.llm.errorCount}

## 📍 Phase Status
- **Current:** ${m.phases.current}
- **Status:** ${m.phases.inProgress ? '🟢 Running' : '⏸️ Complete'}
`;
    }

    /**
     * Gib kompakten Status zurück (für HTTP Endpoints)
     */
    getStatusJSON() {
        return {
            status: 'operational',
            timestamp: this.metrics.timestamp,
            memory: this.metrics.memory,
            audit: this.metrics.audit,
            system: {
                heapUsed: this.metrics.system.nodeMemory,
                uptime: this.metrics.system.uptime
            },
            phase: this.metrics.phases.current
        };
    }
}

module.exports = { MetricsBridge };

/**
 * THE FORGE - MINIMAL DASHBOARD
 *
 * Live Monitoring Dashboard für:
 * - Memory Tiering System (Hot/Warm/Cold/Archive)
 * - Audit Trail (Findings, Blockings)
 * - LLM Performance
 * - System Health
 *
 * Glass-Box Implementation (Gesetz 1): What you see is what is happening
 */

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { MetricsBridge } from './core/metrics_bridge.js';

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;
const BUS_PATH = path.join(process.cwd(), 'brain', 'bus');

// Initialize metrics collector
const metrics = new MetricsBridge({
    collectionInterval: 5000 // 5 seconds
});

// Start metric collection
metrics.startCollection();

async function getBusStatusPayload() {
    const exists = await fs.access(BUS_PATH).then(() => true).catch(() => false);
    if (!exists) {
        return {
            total: 0,
            pending: 0,
            running: 0,
            success: 0,
            failed: 0,
            items: []
        };
    }

    const files = await fs.readdir(BUS_PATH);
    const requestFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('resp_'));
    const responseFiles = files.filter((f) => f.startsWith('resp_') && f.endsWith('.json'));

    const responseMap = new Map();
    for (const responseFile of responseFiles) {
        try {
            const responseRaw = await fs.readFile(path.join(BUS_PATH, responseFile), 'utf-8');
            const response = JSON.parse(responseRaw);
            responseMap.set(response.requestId, response);
        } catch {
            // ignore malformed response files
        }
    }

    const items = [];
    for (const requestFile of requestFiles) {
        try {
            const requestRaw = await fs.readFile(path.join(BUS_PATH, requestFile), 'utf-8');
            const request = JSON.parse(requestRaw);
            const response = responseMap.get(request.id);

            items.push({
                id: request.id,
                target: request.target,
                skill: request.skill,
                status: response?.status || request.status || 'PENDING',
                timestamp: request.timestamp
            });
        } catch {
            // ignore malformed request files
        }
    }

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
        total: items.length,
        pending: items.filter((i) => i.status === 'PENDING').length,
        running: items.filter((i) => i.status === 'RUNNING').length,
        success: items.filter((i) => i.status === 'SUCCESS').length,
        failed: items.filter((i) => i.status === 'FAILED').length,
        items
    };
}

// Middleware
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './src/views');

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * GET /
 * Main dashboard HTML
 */
app.get('/', async (req, res) => {
    const status = metrics.getStatusJSON();
    const bus = await getBusStatusPayload();

    res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Forge - Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
            background: #0d1117;
            color: #c9d1d9;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        h1 {
            text-align: center;
            margin-bottom: 40px;
            color: #58a6ff;
            font-size: 2em;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .metric-card {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.3s ease;
        }

        .metric-card:hover {
            border-color: #58a6ff;
            box-shadow: 0 0 10px rgba(88, 166, 255, 0.1);
        }

        .metric-card h3 {
            color: #58a6ff;
            margin-bottom: 15px;
            font-size: 1.2em;
            border-bottom: 1px solid #30363d;
            padding-bottom: 10px;
        }

        .metric-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #21262d;
        }

        .metric-item:last-child {
            border-bottom: none;
        }

        .metric-label {
            color: #8b949e;
            font-size: 0.9em;
        }

        .metric-value {
            color: #f0883e;
            font-weight: bold;
            font-family: 'Courier New', monospace;
        }

        .status-good {
            color: #3fb950;
        }

        .status-warning {
            color: #f0883e;
        }

        .status-critical {
            color: #f85149;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: #21262d;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3fb950, #58a6ff);
            transition: width 0.3s ease;
        }

        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 5px;
        }

        .status-operational {
            background: #3fb950;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .footer {
            text-align: center;
            color: #8b949e;
            font-size: 0.9em;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #30363d;
        }

        .memory-tier {
            margin: 10px 0;
            padding: 10px;
            background: #21262d;
            border-radius: 4px;
            border-left: 3px solid #58a6ff;
        }

        .memory-tier.hot {
            border-left-color: #f85149;
        }

        .memory-tier.warm {
            border-left-color: #f0883e;
        }

        .memory-tier.cold {
            border-left-color: #58a6ff;
        }

        .memory-tier.archive {
            border-left-color: #3fb950;
        }

        .status-pill {
            display: inline-block;
            border-radius: 12px;
            padding: 2px 10px;
            font-size: 0.75rem;
            font-weight: 700;
        }

        .pill-pending { background: #f0883e33; color: #f0883e; }
        .pill-running { background: #58a6ff33; color: #58a6ff; }
        .pill-success { background: #3fb95033; color: #3fb950; }
        .pill-failed { background: #f8514933; color: #f85149; }

        .bus-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 0.85rem;
        }

        .bus-table th,
        .bus-table td {
            text-align: left;
            border-bottom: 1px solid #21262d;
            padding: 6px 4px;
        }

        .bus-table th {
            color: #8b949e;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 The Forge - Real-Time Dashboard</h1>

        <div class="metrics-grid">
            <!-- Memory System -->
            <div class="metric-card">
                <h3>🧠 Memory System</h3>
                <div class="memory-tier hot">
                    <div class="metric-item">
                        <span class="metric-label">Hot (Active)</span>
                        <span class="metric-value">${status.memory.hotSize} KB</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${status.memory.tierDistribution?.hot || 25}"></div>
                    </div>
                </div>
                <div class="memory-tier warm">
                    <div class="metric-item">
                        <span class="metric-label">Warm (Recent)</span>
                        <span class="metric-value">${status.memory.warmSize} KB</span>
                    </div>
                </div>
                <div class="memory-tier cold">
                    <div class="metric-item">
                        <span class="metric-label">Cold (Old)</span>
                        <span class="metric-value">${status.memory.coldSize} KB</span>
                    </div>
                </div>
                <div class="memory-tier archive">
                    <div class="metric-item">
                        <span class="metric-label">Archive</span>
                        <span class="metric-value">${status.memory.archiveSize} KB</span>
                    </div>
                </div>
                <div class="metric-item" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #30363d;">
                    <span class="metric-label" style="font-weight: bold;">Total Memory</span>
                    <span class="metric-value">${status.memory.totalSize} KB</span>
                </div>
            </div>

            <!-- Security Audit -->
            <div class="metric-card">
                <h3>🔐 Security Audit</h3>
                <div class="metric-item">
                    <span class="metric-label">Audit Trail Entries</span>
                    <span class="metric-value status-good">${status.audit.entriesTotal}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Security Findings</span>
                    <span class="metric-value ${status.audit.findingsCount > 5 ? 'status-warning' : 'status-good'}">${status.audit.findingsCount}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Blocked Actions</span>
                    <span class="metric-value ${status.audit.blockedActions > 0 ? 'status-critical' : 'status-good'}">${status.audit.blockedActions}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Tool Calls</span>
                    <span class="metric-value">${status.audit.toolCalls || 0}</span>
                </div>
            </div>

            <!-- System Health -->
            <div class="metric-card">
                <h3>💾 System Health</h3>
                <div class="metric-item">
                    <span class="metric-label">Node Memory</span>
                    <span class="metric-value">${status.system.heapUsed} MB</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value">${Math.floor(status.system.uptime / 60)} min</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Status</span>
                    <span class="metric-value">
                        <span class="status-indicator status-operational"></span>
                        Operational
                    </span>
                </div>
            </div>

            <!-- Agent Bus Live -->
            <div class="metric-card" style="grid-column: 1 / -1;">
                <h3>🧵 Agent Bus Live (Glass-Box)</h3>
                <div class="metrics-grid" style="margin-bottom: 10px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
                    <div class="metric-item"><span class="metric-label">Total</span><span class="metric-value">${bus.total}</span></div>
                    <div class="metric-item"><span class="metric-label">Pending</span><span class="metric-value status-warning">${bus.pending}</span></div>
                    <div class="metric-item"><span class="metric-label">Running</span><span class="metric-value">${bus.running}</span></div>
                    <div class="metric-item"><span class="metric-label">Success</span><span class="metric-value status-good">${bus.success}</span></div>
                    <div class="metric-item"><span class="metric-label">Failed</span><span class="metric-value status-critical">${bus.failed}</span></div>
                </div>
                <table class="bus-table">
                    <thead>
                        <tr>
                            <th>Agent</th>
                            <th>Skill</th>
                            <th>Status</th>
                            <th>Zeit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bus.items.slice(0, 12).map((item) => `
                        <tr>
                            <td>${item.target || '-'}</td>
                            <td>${item.skill || '-'}</td>
                            <td>
                                <span class="status-pill ${item.status === 'SUCCESS' ? 'pill-success' : item.status === 'FAILED' ? 'pill-failed' : item.status === 'RUNNING' ? 'pill-running' : 'pill-pending'}">
                                    ${item.status}
                                </span>
                            </td>
                            <td>${new Date(item.timestamp).toLocaleTimeString('de-DE')}</td>
                        </tr>
                        `).join('')}
                        ${bus.items.length === 0 ? '<tr><td colspan="4" style="color:#8b949e;">Keine Bus-Requests gefunden.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="footer">
            <p>
                <strong>Phase:</strong> ${status.phase}
                | <strong>Last Update:</strong> ${new Date(status.timestamp).toLocaleTimeString('de-DE')}
                | <strong>Auto-refresh: 5s</strong>
            </p>
            <p style="margin-top: 10px; font-size: 0.8em;">
                🛡️ Powered by TAIA-Bridge (Glass-Box Transparency) | Sentinel Active
            </p>
        </div>
    </div>

    <script>
        // Auto-refresh metrics + bus status
        setInterval(() => {
            location.reload();
        }, 5000);
    </script>
</body>
</html>
    `);
});

/**
 * GET /api/metrics
 * JSON Metrics Endpoint (für externe Tools)
 */
app.get('/api/metrics', (req, res) => {
    res.json(metrics.getStatusJSON());
});

/**
 * GET /api/metrics/markdown
 * Markdown Report (für Dokumentation)
 */
app.get('/api/metrics/markdown', (req, res) => {
    res.header('Content-Type', 'text/markdown');
    res.send(metrics.getMarkdownReport());
});

/**
 * GET /api/bus-status
 * JSON Agent Bus Status Endpoint
 */
app.get('/api/bus-status', async (req, res) => {
    try {
        const payload = await getBusStatusPayload();
        res.json({
            status: 'ok',
            ...payload
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /health
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
    const status = metrics.getStatusJSON();
    const healthy = status.audit.blockedActions < 10; // Simple health check

    res.json({
        status: healthy ? 'healthy' : 'degraded',
        timestamp: status.timestamp,
        memory_kb: status.memory.totalSize,
        audit_entries: status.audit.entriesTotal
    });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
    console.error('[Dashboard Error]', err);
    res.status(500).json({ error: err.message });
});

// ============================================================================
// START DASHBOARD
// ============================================================================

const server = app.listen(PORT, () => {
    console.log(`\n✅ Dashboard running at http://localhost:${PORT}`);
    console.log(`📊 API Metrics: http://localhost:${PORT}/api/metrics`);
    console.log(`📄 Markdown Report: http://localhost:${PORT}/api/metrics/markdown`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health\n`);
});

export default server;

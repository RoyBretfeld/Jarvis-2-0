import fs from 'fs';
import path from 'path';

const rootPath = 'E:/_____1111____Projekte-Programmierung/Antigravity/The Forge';
const blueprintsPath = path.join(rootPath, 'src/skills/blueprints.json');
const generatorPath = path.join(rootPath, 'src/skill-generator.js');
const k8sPath = path.join(rootPath, 'K8S_STATUS.md');

console.log("💓 SYSTEM PULSE CHECK START 💓");
console.log("---------------------------------------------------");

// 1. Integrity Check: blueprints.json
try {
    if (fs.existsSync(blueprintsPath)) {
        const content = fs.readFileSync(blueprintsPath, 'utf8');
        const json = JSON.parse(content);
        const keys = Object.keys(json);
        console.log(`✅ Blueprints Integrity: OK (${keys.length} Skills loaded)`);
    } else {
        console.error("❌ Blueprints file NOT FOUND!");
    }
} catch (e) {
    console.error("❌ Blueprints Syntax Error:", e.message);
}

// 2. Pathing info
if (fs.existsSync(generatorPath)) {
    console.log("✅ Generator Path: OK");
} else {
    console.error("❌ Generator file NOT FOUND!");
}

// 3. Hardware/Ollama Sync
console.log("📡 Testing Hardware Link (Ollama)...");
try {
    const start = Date.now();
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
        const duration = Date.now() - start;
        console.log(`✅ Hardware Sync: OK (Latency: ${duration}ms)`);
    } else {
        console.error(`❌ Hardware Error: Status ${response.status}`);
    }
} catch (e) {
    console.error("❌ Hardware Unreachable:", e.message);
}

// 4. Log Rotation
try {
    if (fs.existsSync(k8sPath)) {
        const status = fs.readFileSync(k8sPath, 'utf8').trim();
        console.log(`📝 Log Status: '${status}'`);
        if (status.includes('[SYSTEM_STATUS: READY]')) {
            console.log("✅ Log Rotation: READY");
        } else {
            console.warn("⚠️ Log Rotation: Not in READY state");
        }
    } else {
        console.error("❌ Log file NOT FOUND!");
    }
} catch (e) {
    console.error("❌ Log Check Failed:", e.message);
}

console.log("---------------------------------------------------");
console.log("🏥 DIAGNOSTIC COMPLETE");

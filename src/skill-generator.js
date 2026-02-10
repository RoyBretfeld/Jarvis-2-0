/**
 * 🛡️ ANTIGRAVITY AUTONOMOUS SKILL GENERATOR [PRODUCTION]
 * 
 * Diese Engine überwacht den K8S_STATUS.md auf Fehler und generiert
 * selbstständig Reparatur-Skripte (Skills) via DeepSeek/Ollama.
 * 
 * @module skill-generator
 * @version 1.0.0 [Stable]
 */
import fs from 'fs';
import path from 'path';

export const skillGenerator = async () => {
    const rootPath = 'E:/_____1111____Projekte-Programmierung/Antigravity/The Forge';
    const k8sStatusPath = path.join(rootPath, 'K8S_STATUS.md');
    const generatedPath = path.join(rootPath, 'src/skills/generated');

    console.log("🚀 Starte autonomen Skill-Generator...");

    try {
        const content = fs.readFileSync(k8sStatusPath, 'utf8');
        console.log("DEBUG: Suche nach Fehlern in...", k8sStatusPath);
        const errorMatch = content.match(/Error: .*/g);

        if (!errorMatch) {
            console.log("ℹ️ Keine Fehler in K8S_STATUS.md gefunden.");
            return;
        }
        const lastError = errorMatch[errorMatch.length - 1];
        console.log(`🔍 Analysiere Fehler: ${lastError}`);

        // Blueprint-Logik laden
        const blueprintsPath = path.join(rootPath, 'src/skills/blueprints.json');
        let blueprintPrompt = "";

        if (fs.existsSync(blueprintsPath)) {
            try {
                const blueprints = JSON.parse(fs.readFileSync(blueprintsPath, 'utf8'));
                // Suche nach Matching Keys im Fehler-String
                const matchingKey = Object.keys(blueprints).find(key => lastError.includes(key));

                if (matchingKey) {
                    console.log(`📘 Blueprint gefunden für: ${matchingKey}`);
                    const bp = blueprints[matchingKey];
                    blueprintPrompt = `\n\nNUTZE DIESES TEMPLATE ALS BASIS (passe es an den Fehler an):\n${bp.template}\n\nBeschreibung: ${bp.description}`;
                }
            } catch (bpError) {
                console.warn("⚠️ Konnte Blueprints nicht laden:", bpError.message);
            }
        }

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'deepseek-coder:6.7b',
                prompt: `Du bist eine autonome Engine. Deine Antwort darf NUR aus validem JavaScript (ESM) bestehen. Keine Entschuldigungen, keine Erklärungen. Wenn du den Fehler nicht genau kennst, schreibe einen generischen Reconnect-Wrapper mit setInterval. Beginne mit: // Auto-Fix for Database Timeout. Kontext-Fehler: ${lastError} ${blueprintPrompt}`,
                stream: false
            })
        });
        const result = await response.json();
        let rawCode = result.response;
        let cleanCode;

        // 1. Regex Extraction: Suche nach Code-Block
        const codeBlockMatch = rawCode.match(/```javascript([\s\S]*?)```/);

        if (codeBlockMatch && codeBlockMatch[1]) {
            console.log("✅ Code-Block im Markdown gefunden. Extrahiere...");
            cleanCode = codeBlockMatch[1].trim();
        } else {
            console.log("⚠️ Kein Markdown-Block gefunden. Nutze Fallback (Raw String cleanup)...");
            // Fallback: Entferne Backticks am Anfang/Ende, falls vorhanden
            cleanCode = rawCode.replace(/^```javascript/, '').replace(/^```/, '').replace(/```$/, '').trim();
        }

        const fileName = `fix_${Date.now()}.js`;
        const fullPath = path.join(generatedPath, fileName);
        fs.writeFileSync(fullPath, cleanCode);
        console.log(`✅ Sovereign Fix generiert: ${fullPath}`);

        // Learning Trigger
        console.log("---------------------------------------------------");
        console.log(`🧠 LEARNING TRIGGER: Soll dieser Fix für '${lastError}'`);
        console.log(`   als neuer Blueprint gespeichert werden?`);
        console.log(`   >> Vorschlag: Manuelle Prüfung von ${fileName}`);
        console.log("---------------------------------------------------");
    } catch (error) {
        console.error("❌ Kritischer Fehler im Generator:", error.message);
    }
};

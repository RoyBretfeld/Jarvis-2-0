import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chalk from 'chalk';
import readline from 'readline';

dotenv.config();

// Path setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BODY_PATH = path.join(__dirname, '../body');

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';

// ============================================================================
// TOOL: Gedächtnis schreiben (Die Fähigkeit zu lernen)
// ============================================================================
async function writeToMemory(entry) {
    try {
        const timestamp = new Date().toISOString().split('T')[0];
        const line = `\n* [${timestamp}] ${entry}`;
        const memoryPath = path.join(BODY_PATH, 'MEMORY.md');

        await fs.appendFile(memoryPath, line);
        console.log(chalk.gray(`[🧠 Memory updated: ${entry}]`));
    } catch (error) {
        console.error(chalk.red(`[Memory error: ${error.message}]`));
    }
}

// ============================================================================
// CONTEXT LOAD: Jedes Mal frisch lesen!
// ============================================================================
async function buildContext() {
    try {
        const soul = await fs.readFile(path.join(BODY_PATH, 'SOUL.md'), 'utf-8');
        const memory = await fs.readFile(path.join(BODY_PATH, 'MEMORY.md'), 'utf-8');
        const identity = await fs.readFile(path.join(BODY_PATH, 'IDENTITY.md'), 'utf-8');

        return `
=== SYSTEM IDENTITY (SOUL) ===
${soul}

=== USER PROFILE (IDENTITY) ===
${identity}

=== LONG TERM MEMORY ===
${memory}

=== INSTRUCTION ===
Du bist ein "True AI Agent" genannt "Forge". Du hast Zugriff auf dein Gedächtnis.
- Lese SOUL.md und antworte konsistent damit
- Lese IDENTITY.md und verstehe Roys Anforderungen
- Lese MEMORY.md und beziehe dich auf vergangene Learnings

Wenn du etwas Wichtiges lernst (neues Projekt, User-Wunsch, technische Lösung), antworte am Ende deiner Nachricht mit:
MEM_UPDATE: "Der Inhalt des Eintrags"

Beispiele für wichtige Updates:
- MEM_UPDATE: "Roy arbeitet an Project X"
- MEM_UPDATE: "Neue Anforderung: Y-Feature ist wichtig"
- MEM_UPDATE: "Lösung gefunden: Z-Problem wird so gelöst"
`;
    } catch (error) {
        console.error(chalk.red(`Context error: ${error.message}`));
        throw error;
    }
}

// ============================================================================
// DER LOOP (Herzschlag)
// ============================================================================
async function startLoop() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log(chalk.green.bold("\n🔥 THE FORGE IS ONLINE.\n"));
    console.log(chalk.gray("Loading body & consciousness..."));
    console.log(chalk.gray("================================\n"));

    const ask = (query) => new Promise((resolve) => {
        rl.question(query, resolve);
    });

    // Main loop
    while (true) {
        try {
            // 1. Input holen
            const userInput = await ask(chalk.cyan("Roy > "));

            // Check for exit commands
            if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
                console.log(chalk.yellow("\n🛑 The Forge shutting down..."));
                rl.close();
                process.exit(0);
            }

            if (!userInput.trim()) {
                continue;
            }

            // 2. Kontext bauen (LIVE!)
            console.log(chalk.gray('[Loading context...]'));
            const systemPrompt = await buildContext();

            // 3. Denken (API Call)
            process.stdout.write(chalk.yellow("Forge > "));

            try {
                const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: OLLAMA_MODEL,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userInput }
                        ],
                        temperature: 0.7,
                        stream: false
                    })
                });

                if (!ollamaResponse.ok) {
                    throw new Error(`Ollama error: ${ollamaResponse.status}`);
                }

                const ollamaData = await ollamaResponse.json();
                const response = ollamaData.message?.content || "";

                // Clear the "Thinking..." line
                readline.clearLine(process.stdout, 0);
                readline.cursorTo(process.stdout, 0);

                // 4. Antwort analysieren (Hat er was gelernt?)
                const memUpdateMatch = response.match(/MEM_UPDATE:\s*["']?([^"'\n]+)["']?(?:\n|$)/);
                if (memUpdateMatch) {
                    const memEntry = memUpdateMatch[1].trim();
                    const publicText = response.replace(/MEM_UPDATE:.*?(?:\n|$)/s, '').trim();

                    console.log(chalk.white(publicText));
                    console.log("");

                    if (memEntry) {
                        await writeToMemory(memEntry);
                    }
                } else {
                    console.log(chalk.white(response));
                    console.log("");
                }

            } catch (apiError) {
                console.error(chalk.red(`\n❌ Ollama Error: ${apiError.message}`));
                console.log(chalk.yellow("Make sure Ollama is running: ollama serve"));
                console.log("");
            }

        } catch (error) {
            if (error.code === 'ERR_USE_AFTER_CLOSE') {
                // Readline closed, exit gracefully
                break;
            }
            console.error(chalk.red(`\n⚠️  Error: ${error.message}`));
        }
    }
}

// ============================================================================
// STARTUP
// ============================================================================
console.log(chalk.bold.magenta(`
╔════════════════════════════════════════╗
║          🔥 THE FORGE 1.0.0            ║
║  Radical True AI Agent Architecture    ║
║     Local Ollama Powered (CLI)          ║
║        Geist trifft Körper             ║
╚════════════════════════════════════════╝
`));

// Verify Ollama connection
async function verifyOllama() {
    try {
        console.log(chalk.gray("Checking Ollama connection..."));
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!response.ok) {
            throw new Error('Ollama not responding');
        }
        console.log(chalk.green(`✅ Ollama connected at ${OLLAMA_BASE_URL}`));
        console.log(chalk.green(`✅ Model: ${OLLAMA_MODEL}\n`));
        return true;
    } catch (error) {
        console.error(chalk.red("\n❌ Error: Ollama is not running"));
        console.error(chalk.yellow("Start Ollama with: ollama serve"));
        console.error(chalk.cyan(`Expected at: ${OLLAMA_BASE_URL}\n`));
        process.exit(1);
    }
}

// Start the app
(async () => {
    await verifyOllama();
    startLoop().catch(error => {
        console.error(chalk.red("Fatal Error:"), error);
        process.exit(1);
    });
})();

import ollama from 'ollama';
import fs from 'fs';
import chalk from 'chalk';

/**
 * THE EYE (Vision Sense)
 * Nutzt das LOKALE Moondream Modell via Ollama.
 * Schnell, effizient, bereits installiert.
 */
export async function lookAt(imagePath, prompt = "Beschreibe dieses Bild kurz und präzise.") {
    // 1. Validierung: Existiert das Bild überhaupt?
    if (!fs.existsSync(imagePath)) {
        console.warn(chalk.yellow(`👁️  Auge kann Bild nicht finden: ${imagePath}`));
        return "Systemfehler: Bilddatei nicht gefunden.";
    }

    console.log(chalk.cyan(`👁️  Fokussiere Moondream auf: ${imagePath}`));
    const start = performance.now();

    try {
        // 2. Der Blick (API Call an lokales Ollama)
        const response = await ollama.chat({
            model: 'moondream',
            messages: [{
                role: 'user',
                content: prompt,
                images: [imagePath]
            }]
        });

        const duration = ((performance.now() - start) / 1000).toFixed(2);
        const description = response.message.content;

        console.log(chalk.green(`👁️  Erkannt in ${duration}s: "${description.substring(0, 50)}..."`));

        return description;

    } catch (error) {
        console.error(chalk.red(`❌ Vision Error (Blind): ${error.message}`));
        return `Fehler im Vision-Modul: ${error.message}`;
    }
}

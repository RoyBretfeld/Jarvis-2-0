import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// Helper for paths in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..');

// Kofiguration: Wo läuft dein Stable Diffusion?
const SD_API_URL = process.env.SD_API_URL || 'http://127.0.0.1:7860';
const GALLERY_PATH = path.join(PROJECT_ROOT, 'public', 'gallery');

export async function paint(prompt) {
    if (!fs.existsSync(GALLERY_PATH)) {
        fs.mkdirSync(GALLERY_PATH, { recursive: true });
    }

    console.log(chalk.magenta(`🎨 Der Maler beginnt: "${prompt}"`));

    // Payload für Standard Stable Diffusion API
    const payload = {
        prompt: prompt,
        negative_prompt: "ugly, blurry, low quality, distorted, bad anatomy",
        steps: 20,
        width: 512,
        height: 512,
        cfg_scale: 7
    };

    try {
        const response = await fetch(`${SD_API_URL}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`SD API Error: ${response.status}`);

        const data = await response.json();
        const base64Image = data.images[0];

        // Speichern
        const filename = `paint_${Date.now()}.png`;
        const filepath = path.join(GALLERY_PATH, filename);

        fs.writeFileSync(filepath, base64Image, 'base64');

        console.log(chalk.green(`🎨 Bild fertiggestellt: ${filename}`));

        // Return relative path for web usage
        return `/gallery/${filename}`;

    } catch (error) {
        console.error(chalk.red(`❌ Mal-Fehler (Ist SD gestartet?): ${error.message}`));
        return null;
    }
}

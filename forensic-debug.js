import fs from 'fs';
import path from 'path';

const root = 'E:/_____1111____Projekte-Programmierung/Antigravity/The Forge';
const k8sPath = path.join(root, 'K8S_STATUS.md');
const genPath = path.join(root, 'src/skills/generated');

console.log("--- 🕵️ FORENSIC START ---");
console.log("Prüfe Root-Pfad:", root);

// Schritt A: Existiert die Status-Datei?
if (fs.existsSync(k8sPath)) {
    const content = fs.readFileSync(k8sPath, 'utf8');
    console.log("✅ K8S_STATUS.md gefunden.");
    console.log("Inhalt (letzte 100 Zeichen):", content.slice(-100));
    const hasError = content.includes('Error:');
    console.log("Fehler-Tag gefunden?:", hasError ? "JA" : "NEIN");
} else {
    console.error("❌ K8S_STATUS.md NICHT GEFUNDEN unter:", k8sPath);
}

// Schritt B: Schreib-Test
try {
    if (!fs.existsSync(genPath)) {
        fs.mkdirSync(genPath, { recursive: true });
        console.log("📁 Ordner wurde neu erstellt.");
    }
    const testFile = path.join(genPath, 'debug_test.txt');
    fs.writeFileSync(testFile, 'Disk Access Check: OK');
    console.log("✅ Test-Datei erfolgreich geschrieben:", testFile);
} catch (err) {
    console.error("❌ SCHREIBFEHLER:", err.message);
}
console.log("--- 🕵️ FORENSIC ENDE ---");

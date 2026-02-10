import { skillGenerator } from './src/skill-generator.js';

console.log("-----------------------------------------");
console.log("🛠️ ANTIGRAVITY AUTONOMY: START");
console.log("-----------------------------------------");

skillGenerator()
    .then(() => {
        console.log("-----------------------------------------");
        console.log("🏁 REPARATUR-ZYKLUS ABGESCHLOSSEN");
        console.log("-----------------------------------------");
    })
    .catch(err => {
        console.error("❌ ABBRUCH:", err);
    });

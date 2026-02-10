import fs from 'fs';
const k8sPath = 'E:/_____1111____Projekte-Programmierung/Antigravity/The Forge/K8S_STATUS.md';
const errorLine = `\n[${new Date().toISOString()}] Error: Database_Connection_Timeout_In_Auth_Service`;
fs.appendFileSync(k8sPath, errorLine);
console.log("✅ Fehler-Trigger wurde physisch in K8S_STATUS.md geschrieben.");

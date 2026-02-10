async function testBridge() {
    console.log("🧪 Testing Ollama Bridge (Native Fetch Mode)");

    try {
        // 1. Check if Ollama is reachable
        console.log("Test 1: Checking Ollama Server...");
        const tagResponse = await fetch('http://localhost:11434/api/tags');
        const tags = await tagResponse.json();

        const models = tags.models || [];
        console.log("✅ Ollama is running. Available models:", models.map(m => m.name).join(', '));

        // 2. Simple Chat Test
        console.log("\nTest 2: Sending test prompt to DeepSeek...");
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            body: JSON.stringify({
                model: 'deepseek-coder:6.7b',
                prompt: 'Antworte mit einem Wort: Funktioniert die Verbindung?',
                stream: false
            })
        });

        const data = await response.json();
        console.log("🧠 Agent Response:", data.response);
        console.log("✅ Response received successfully.");

        console.log("\n🎉 All tests passed! Your local engine is ready.");

    } catch (error) {
        console.error("\n❌ Fehler bei der Brücken-Prüfung:");
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
            console.error("Der Ollama Server läuft nicht auf Port 11434. Bitte 'ollama serve' starten.");
        } else {
            console.error(error.message);
        }
    }
}

testBridge();
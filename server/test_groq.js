require('dotenv').config();
const groqService = require('./services/groqService');

async function run() {
    try {
        console.log("Testing Groq general text completion...");
        const result = await groqService.generateChatCompletion("Say 'hello' in exactly one word.");
        console.log("✅ SUCCESS text completion:", result.trim());
    } catch (e) {
        console.error("❌ FAILED text completion:", e.message);
    }

    try {
        console.log("Testing Groq JSON mode completion...");
        const systemInstruction = "Reply in JSON with key 'greeting'.";
        const result = await groqService.generateChatCompletion("Say hello", systemInstruction, true);
        console.log("✅ SUCCESS JSON completion:", result.trim());
    } catch (e) {
        console.error("❌ FAILED JSON completion:", e.message);
    }
}
run();

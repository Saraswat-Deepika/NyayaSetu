require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        console.log("Testing gemini-3.1-flash-lite...");
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
        const result = await model.generateContent('hello');
        console.log("✅ SUCCESS with gemini-3.1-flash-lite:", result.response.text().trim());
    } catch (e) {
        console.error("❌ FAILED with gemini-3.1-flash-lite:", e.message);
    }

    try {
        console.log("Testing gemini-2.5-flash-lite...");
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const result = await model.generateContent('hello');
        console.log("✅ SUCCESS with gemini-2.5-flash-lite:", result.response.text().trim());
    } catch (e) {
        console.error("❌ FAILED with gemini-2.5-flash-lite:", e.message);
    }
}
run();

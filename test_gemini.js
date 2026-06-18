require('dotenv').config({ path: 'server/.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
    try {
        const systemInstruction = "You are a test assistant.";
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-pro',
            systemInstruction: systemInstruction 
        });

        const prompt = `Test question.`;
        const result = await model.generateContent(prompt);
        console.log("Success:", result.response.text());
    } catch (error) {
        console.error("Error:", error);
    }
}
test();

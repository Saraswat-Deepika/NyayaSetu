require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Wait, the official Node SDK doesn't have a built-in listModels method easily accessible without google.auth or it might have.
        // Let's use fetch instead to call the REST API.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        console.log(data.models.map(m => m.name).join(', '));
    } catch (error) {
        console.error("Error fetching models:", error);
    }
}
listModels();

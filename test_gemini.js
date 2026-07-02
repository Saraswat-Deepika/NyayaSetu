require('dotenv').config({ path: 'server/.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-1.5-flash'
];

async function test() {
    for (const modelName of modelsToTest) {
        try {
            console.log(`Testing model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ 
                model: modelName
            });

            const result = await model.generateContent("Say hello");
            console.log(`✅ Success with ${modelName}:`, result.response.text().trim());
        } catch (error) {
            console.error(`❌ Failed with ${modelName}:`, error.message);
        }
    }
}
test();

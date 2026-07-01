const { getGenAI, getGeminiModel } = require('../../config/gemini');

const generateAnswer = async (prompt) => {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: getGeminiModel() });
    
    const result = await model.generateContent(prompt);
    return result.response.text();
};

module.exports = { generateAnswer };

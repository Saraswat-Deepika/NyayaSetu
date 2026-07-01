const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');

const getGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const getGeminiModel = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash';

const getEmbeddingsModel = () => {
    return new GoogleGenerativeAIEmbeddings({
        modelName: "gemini-embedding-001",
        apiKey: process.env.GEMINI_API_KEY
    });
};

module.exports = {
    getGenAI,
    getGeminiModel,
    getEmbeddingsModel
};

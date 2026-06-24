const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Chat' },
    messages: [{
        role: { type: String, enum: ['user', 'ai'], required: true },
        content: { type: String, required: true },
        queryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' }, // references Case for feedback/MAB
        strategy: { type: String }, // strategy name (RAG, GeminiLLM, etc.)
        feedback: { type: String, enum: ['none', 'helpful', 'not-helpful'], default: 'none' },
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', chatSessionSchema);

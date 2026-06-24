const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['Property Law', 'Criminal Law', 'Consumer Rights', 'Family Law', 'Employment Law', 'RTI', 'Other'],
        default: 'Other'
    },
    status: { 
        type: String, 
        enum: ['open', 'in-progress', 'closed'], 
        default: 'open' 
    },
    aiSummary: { type: String },
    language: { type: String },
    selectedStrategy: { 
        type: String, 
        enum: ['RAG', 'GeminiLLM', 'LegalTemplate', 'SimilarCase', 'None'], 
        default: 'None' 
    },
    feedbackStatus: { 
        type: String, 
        enum: ['none', 'helpful', 'not-helpful'], 
        default: 'none' 
    },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }]
}, { timestamps: true });

module.exports = mongoose.model('Case', caseSchema);

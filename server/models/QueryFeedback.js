const mongoose = require('mongoose');

const queryFeedbackSchema = new mongoose.Schema({
    queryId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Case', 
        required: true 
    },
    category: { 
        type: String, 
        required: true,
        enum: ['Property Law', 'Criminal Law', 'Consumer Rights', 'Family Law', 'Employment Law']
    },
    strategy: { 
        type: String, 
        required: true,
        enum: ['RAG', 'GeminiLLM', 'LegalTemplate', 'SimilarCase']
    },
    feedback: { 
        type: String, 
        required: true,
        enum: ['helpful', 'not-helpful']
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('QueryFeedback', queryFeedbackSchema);

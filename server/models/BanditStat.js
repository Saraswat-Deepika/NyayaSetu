const mongoose = require('mongoose');

const banditStatSchema = new mongoose.Schema({
    category: { 
        type: String, 
        required: true,
        enum: ['Property Law', 'Criminal Law', 'Consumer Rights', 'Family Law', 'Employment Law']
    },
    armName: { 
        type: String, 
        required: true,
        enum: ['RAG', 'GeminiLLM', 'LegalTemplate', 'SimilarCase']
    },
    totalSelections: { 
        type: Number, 
        default: 0 
    },
    totalReward: { 
        type: Number, 
        default: 0 
    },
    averageReward: { 
        type: Number, 
        default: 0.0 
    }
}, { timestamps: true });

// Prevent duplicate bandit records for same category and arm
banditStatSchema.index({ category: 1, armName: 1 }, { unique: true });

module.exports = mongoose.model('BanditStat', banditStatSchema);

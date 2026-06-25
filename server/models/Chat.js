const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    history: [{
        role: { type: String, enum: ['user', 'model'], required: true },
        content: { type: String, required: true },
        citations: [{
            text: String
        }],
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);

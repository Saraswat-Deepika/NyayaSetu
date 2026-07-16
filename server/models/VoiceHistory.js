const mongoose = require('mongoose');

const VoiceHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    language: {
        type: String,
        required: true,
        default: 'English'
    },
    audioUrl: {
        type: String, // E.g., S3 url or local path for the recording
        default: null
    },
    transcript: {
        type: String,
        required: true
    },
    responseSummary: {
        response: String,
        acts: [String],
        sections: [String],
        nextSteps: [String],
        confidenceScore: Number,
        citations: [String]
    },
    status: {
        type: String,
        enum: ['Pending', 'Processed', 'Error'],
        default: 'Pending'
    },
    duration: {
        type: Number, // duration of the audio in seconds
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('VoiceHistory', VoiceHistorySchema);

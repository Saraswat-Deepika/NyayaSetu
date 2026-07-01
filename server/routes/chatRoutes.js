const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { 
    askLegalQuestion, getChatSessions, getChatSessionById, deleteChatSession,
    handleVoiceUpload, translateText, getBanditStats, getBanditStatsByCategory, submitFeedback
} = require('../controllers/chatController');

// Standard chat (was /api/legal)
router.post('/legal/ask', protect, askLegalQuestion);
router.get('/legal/sessions', protect, getChatSessions);
router.get('/legal/sessions/:id', protect, getChatSessionById);
router.delete('/legal/sessions/:id', protect, deleteChatSession);

// Voice (was /api/voice/transcribe)
router.post('/voice/transcribe', protect, upload.single('audio'), handleVoiceUpload);

// Translation (was /api/translate)
router.post('/translate', protect, translateText);

// Bandit stats & feedback (was /api/bandit/...)
router.get('/bandit/stats', protect, getBanditStats);
router.get('/bandit/stats/:category', protect, getBanditStatsByCategory);
router.post('/bandit/feedback', protect, submitFeedback);

module.exports = router;

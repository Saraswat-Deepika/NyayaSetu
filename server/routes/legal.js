const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    askLegalQuestion,
    getChatSessions,
    getChatSessionById,
    deleteChatSession
} = require('../controllers/legalController');

// @route   POST /api/legal/ask
// @desc    Ask a legal question
// @access  Private
router.post('/ask', protect, askLegalQuestion);

// @route   GET /api/legal/sessions
// @desc    Get all chat sessions for user
// @access  Private
router.get('/sessions', protect, getChatSessions);

// @route   GET /api/legal/sessions/:id
// @desc    Get details of a specific chat session
// @access  Private
router.get('/sessions/:id', protect, getChatSessionById);

// @route   DELETE /api/legal/sessions/:id
// @desc    Delete a specific chat session
// @access  Private
router.delete('/sessions/:id', protect, deleteChatSession);

module.exports = router;

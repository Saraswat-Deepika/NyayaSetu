const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    askLegalQuestion,
    getChatSessions,
    getChatSessionById,
    deleteChatSession,
    findNearbyHelpController,
    getRelevantLawsController,
    detectEmergencyController
} = require('../controllers/legalController');

// @route   POST /api/legal/ask
// @desc    Ask a legal question
// @access  Private
router.post('/ask', protect, askLegalQuestion);

// @route   POST /api/legal/nearby-help
// @desc    Find nearby legal assistance
// @access  Private
router.post('/nearby-help', protect, findNearbyHelpController);

// @route   POST /api/legal/laws
// @desc    Retrieve relevant laws for a query
// @access  Private
router.post('/laws', protect, getRelevantLawsController);

// @route   POST /api/legal/detect-emergency
// @desc    Detect emergency triggers in a query
// @access  Private
router.post('/detect-emergency', protect, detectEmergencyController);

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

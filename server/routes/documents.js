const express = require('express');
const router = express.Router();
const { 
    uploadDocument, 
    getDocumentSummary, 
    getDocumentAnalytics, 
    chatWithDocument, 
    translateDocument 
} = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// @route   GET /api/documents/analytics
// @desc    Get dashboard metrics for documents
// @access  Private
router.get('/analytics', protect, getDocumentAnalytics);

// @route   POST /api/documents/upload
// @desc    Upload a PDF document and process it
// @access  Private
router.post('/upload', protect, upload.single('document'), uploadDocument);

// @route   GET /api/documents/summary/:id
// @desc    Get summary of a specific document
// @access  Private
router.get('/summary/:id', protect, getDocumentSummary);

// @route   POST /api/documents/:id/chat
// @desc    Chat with the uploaded document (RAG)
// @access  Private
router.post('/:id/chat', protect, chatWithDocument);

// @route   POST /api/documents/:id/translate
// @desc    Translate the document summary dynamically
// @access  Private
router.post('/:id/translate', protect, translateDocument);

module.exports = router;

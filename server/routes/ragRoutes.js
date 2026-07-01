const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getDocumentSummary, chatWithDocument, translateDocument } = require('../controllers/ragController');

router.get('/documents/summary/:id', protect, getDocumentSummary);
router.post('/documents/:id/chat', protect, chatWithDocument);
router.post('/documents/:id/translate', protect, translateDocument);

module.exports = router;

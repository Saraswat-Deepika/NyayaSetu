const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadDocument, getDocumentAnalytics } = require('../controllers/uploadController');

router.post('/documents/upload', protect, upload.single('document'), uploadDocument);
router.get('/documents/analytics', protect, getDocumentAnalytics);

module.exports = router;

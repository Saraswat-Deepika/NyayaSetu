const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { submitFeedback } = require('../controllers/banditController');

// Registered under /api (e.g. app.use('/api', banditRoutes))
router.post('/feedback', protect, submitFeedback);

module.exports = router;

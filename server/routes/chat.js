const express = require('express');
const router = express.Router();
const { getChatHistory } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:appointmentId', protect, getChatHistory);

module.exports = router;

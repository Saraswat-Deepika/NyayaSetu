const express = require('express');
const router = express.Router();
const { transcribeAudioOnly, processVoiceQuery, getVoiceHistory, deleteVoiceHistory } = require('../controllers/voiceController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/start', protect, (req, res) => res.json({ success: true, message: 'Voice session started' }));
router.post('/transcribe', protect, upload.single('audio'), transcribeAudioOnly);
router.post('/process', protect, processVoiceQuery);
router.get('/history', protect, getVoiceHistory);
router.delete('/history/:id', protect, deleteVoiceHistory);

module.exports = router;

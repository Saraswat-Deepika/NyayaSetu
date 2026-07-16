const express = require('express');
const router = express.Router();
const { getLawyers, getLawyerById, seedLawyers, getPendingLawyers, approveLawyer, rejectLawyer } = require('../controllers/lawyerController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/seed', seedLawyers); // For testing only
router.get('/test-enum', (req, res) => {
    const User = require('../models/User');
    res.json({ enum: User.schema.path('role').enumValues });
});

// Admin routes
router.get('/admin/pending', protect, admin, getPendingLawyers);
router.put('/admin/:id/approve', protect, admin, approveLawyer);
router.put('/admin/:id/reject', protect, admin, rejectLawyer);

router.get('/', getLawyers);
router.get('/:id', protect, getLawyerById);

module.exports = router;

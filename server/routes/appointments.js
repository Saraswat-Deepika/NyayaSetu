const express = require('express');
const router = express.Router();
const { bookAppointment, getMyAppointments, updateAppointmentStatus } = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/book', protect, bookAppointment);
router.get('/my-appointments', protect, getMyAppointments);
router.patch('/:id/status', protect, updateAppointmentStatus);

module.exports = router;

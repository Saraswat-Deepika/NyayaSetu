const Appointment = require('../models/Appointment');
const Lawyer = require('../models/Lawyer');

exports.bookAppointment = async (req, res) => {
    try {
        const { lawyerId, date, timeSlot, consultationType, notes } = req.body;
        
        // Assume userId comes from auth middleware, for now let's say it's mocked or from req.user
        const userId = req.user ? req.user.id : req.body.userId;
        
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const lawyer = await Lawyer.findById(lawyerId);
        if (!lawyer) {
            return res.status(404).json({ success: false, message: 'Lawyer not found' });
        }

        const appointment = await Appointment.create({
            userId,
            lawyerId,
            date,
            timeSlot,
            consultationType,
            notes,
            status: 'Pending'
        });

        res.status(201).json({ success: true, data: appointment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getMyAppointments = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : req.query.userId;
        const role = req.user ? req.user.role : req.query.role; // Mocked

        let query = {};
        if (role === 'lawyer') {
            const lawyer = await Lawyer.findOne({ userId });
            if (lawyer) {
                query = { lawyerId: lawyer._id };
            }
        } else {
            query = { userId };
        }

        const appointments = await Appointment.find(query)
            .populate('lawyerId', 'userId specialization consultationFee averageRating')
            .populate({ path: 'lawyerId', populate: { path: 'userId', select: 'name profilePicture' } })
            .populate('userId', 'name email profilePicture')
            .sort({ date: 1 });

        res.status(200).json({ success: true, count: appointments.length, data: appointments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
        
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        res.status(200).json({ success: true, data: appointment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

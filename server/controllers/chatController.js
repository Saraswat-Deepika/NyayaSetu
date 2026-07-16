const Message = require('../models/Message');
const Appointment = require('../models/Appointment');

exports.getChatHistory = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user.id;

        // Verify user is part of the appointment
        const appointment = await Appointment.findById(appointmentId).populate('lawyerId');
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        const isClient = appointment.userId.toString() === userId;
        const isLawyer = appointment.lawyerId.userId.toString() === userId;

        if (!isClient && !isLawyer) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this chat' });
        }

        const messages = await Message.find({ appointmentId }).sort({ createdAt: 1 });
        
        // Mark as read
        await Message.updateMany(
            { appointmentId, receiverId: userId, isRead: false },
            { $set: { isRead: true } }
        );

        res.status(200).json({ success: true, data: messages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

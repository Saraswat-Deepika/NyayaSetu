const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lawyer',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String, // e.g., '10:00 AM - 11:00 AM'
        required: true
    },
    consultationType: {
        type: String,
        enum: ['Chat', 'Voice', 'Video'],
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    notes: {
        type: String,
        trim: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Refunded'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Appointment', appointmentSchema);

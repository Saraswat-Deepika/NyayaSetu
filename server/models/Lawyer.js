const mongoose = require('mongoose');

const lawyerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'suspended'],
        default: 'pending'
    },
    profileStatus: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'inactive'
    },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    dob: { type: Date },
    address: { type: String },
    state: { type: String },
    pincode: { type: String },
    barCouncilNumber: { type: String },
    barCouncilState: { type: String },
    courtLevels: [{ type: String }],
    lawFirm: { type: String },
    documents: [{
        title: { type: String },
        url: { type: String },
        publicId: { type: String }
    }],
    onlineConsultation: { type: Boolean, default: false },
    offlineConsultation: { type: Boolean, default: false },
    emergencyConsultation: { type: Boolean, default: false },
    totalCasesHandled: { type: Number, default: 0 },
    specialization: [{
        type: String,
        trim: true
    }],
    experienceYears: {
        type: Number,
        required: true,
        min: 0
    },
    consultationFee: {
        type: Number,
        required: true,
        min: 0
    },
    about: {
        type: String,
        trim: true
    },
    education: [{
        degree: String,
        institution: String,
        year: Number
    }],
    languages: [{
        type: String,
        trim: true
    }],
    availableTimeSlots: [{
        day: {
            type: String, // e.g., 'Monday'
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        startTime: String, // e.g., '10:00 AM'
        endTime: String    // e.g., '05:00 PM'
    }],
    city: {
        type: String,
        trim: true
    },
    averageRating: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lawyer', lawyerSchema);

const Lawyer = require('../models/Lawyer');
const User = require('../models/User');

exports.getLawyers = async (req, res) => {
    try {
        const { search, specialization, city, minExp, maxFee, language, minRating } = req.query;
        let query = { verificationStatus: 'approved' };

        if (specialization) query.specialization = { $in: [new RegExp(specialization, 'i')] };
        if (city) query.city = new RegExp(city, 'i');
        if (minExp) query.experienceYears = { $gte: Number(minExp) };
        if (maxFee) query.consultationFee = { $lte: Number(maxFee) };
        if (language) query.languages = { $in: [new RegExp(language, 'i')] };
        if (minRating) query.averageRating = { $gte: Number(minRating) };

        let lawyers = await Lawyer.find(query).populate('userId', 'name email profilePicture').lean();

        // Manual search by user name if search param provided
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            lawyers = lawyers.filter(l => l.userId && l.userId.name && searchRegex.test(l.userId.name));
        }

        res.status(200).json({ success: true, count: lawyers.length, data: lawyers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getLawyerById = async (req, res) => {
    try {
        const lawyer = await Lawyer.findById(req.params.id).populate('userId', 'name email profilePicture');
        if (!lawyer) {
            return res.status(404).json({ success: false, message: 'Lawyer not found' });
        }
        res.status(200).json({ success: true, data: lawyer });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Seeder logic for testing
exports.seedLawyers = async (req, res) => {
    try {
        const mockLawyers = [
            { name: 'Adv. Ramesh Sharma', email: 'ramesh@lawyer.com', spec: ['Property Law', 'Family Law'], exp: 12, fee: 1500, city: 'Delhi' },
            { name: 'Adv. Sneha Gupta', email: 'sneha@lawyer.com', spec: ['Criminal Law', 'Cyber Law'], exp: 8, fee: 2000, city: 'Mumbai' },
            { name: 'Adv. Vikram Singh', email: 'vikram@lawyer.com', spec: ['Corporate Law', 'Employment Law'], exp: 15, fee: 3000, city: 'Bangalore' }
        ];

        for (let l of mockLawyers) {
            let user = await User.findOne({ email: l.email });
            if (!user) {
                user = await User.create({ name: l.name, email: l.email, password: 'password123', role: 'lawyer' });
            }
            
            const existingLawyer = await Lawyer.findOne({ userId: user._id });
            if (!existingLawyer) {
                await Lawyer.create({
                    userId: user._id,
                    verificationStatus: 'approved',
                    profileStatus: 'active',
                    specialization: l.spec,
                    experienceYears: l.exp,
                    consultationFee: l.fee,
                    city: l.city,
                    about: `Experienced advocate dealing in ${l.spec.join(', ')} with over ${l.exp} years of practice.`,
                    languages: ['English', 'Hindi'],
                    availableTimeSlots: [
                        { day: 'Monday', startTime: '10:00 AM', endTime: '02:00 PM' },
                        { day: 'Wednesday', startTime: '02:00 PM', endTime: '06:00 PM' }
                    ]
                });
            }
        }
        res.status(200).json({ success: true, message: 'Dummy lawyers seeded successfully' });
    } catch (err) {
        console.error(err);
        res.status(200).json({ success: false, message: 'Server error during seeding', error: err.message, stack: err.stack });
    }
};

// Admin endpoints
exports.getPendingLawyers = async (req, res) => {
    try {
        const lawyers = await Lawyer.find({ verificationStatus: 'pending' })
            .populate('userId', 'name email phone')
            .lean();
        res.status(200).json({ success: true, count: lawyers.length, data: lawyers });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.approveLawyer = async (req, res) => {
    try {
        const lawyer = await Lawyer.findByIdAndUpdate(req.params.id, { verificationStatus: 'approved', profileStatus: 'active' }, { new: true });
        if (!lawyer) {
            return res.status(404).json({ success: false, message: 'Lawyer not found' });
        }
        res.status(200).json({ success: true, message: 'Lawyer approved', data: lawyer });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.rejectLawyer = async (req, res) => {
    try {
        const lawyer = await Lawyer.findByIdAndUpdate(req.params.id, { verificationStatus: 'rejected' }, { new: true });
        if (!lawyer) {
            return res.status(404).json({ success: false, message: 'Lawyer not found' });
        }
        res.status(200).json({ success: true, message: 'Lawyer rejected', data: lawyer });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

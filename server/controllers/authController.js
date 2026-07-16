const User = require('../models/User');
const Lawyer = require('../models/Lawyer');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({ name, email, password });
        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const registerLawyer = async (req, res) => {
    try {
        const { 
            name, email, password, phone, gender, dob, address, state, pincode, city,
            barCouncilNumber, barCouncilState, lawFirm, 
            experienceYears, consultationFee, about,
            onlineConsultation, offlineConsultation, emergencyConsultation
        } = req.body;
        
        // Arrays might come as strings if sent via FormData, need to parse them
        let specialization = [];
        let languages = [];
        let courtLevels = [];
        let availableTimeSlots = [];
        
        try { specialization = JSON.parse(req.body.specialization); } catch(e) { specialization = req.body.specialization ? [req.body.specialization] : []; }
        try { languages = JSON.parse(req.body.languages); } catch(e) { languages = req.body.languages ? [req.body.languages] : []; }
        try { courtLevels = JSON.parse(req.body.courtLevels); } catch(e) { courtLevels = req.body.courtLevels ? [req.body.courtLevels] : []; }
        try { availableTimeSlots = JSON.parse(req.body.availableTimeSlots); } catch(e) { availableTimeSlots = []; }

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({ name, email, password, phone, role: 'lawyer', gender, dob });
        
        if (user) {
            // Handle documents from Multer
            const documents = [];
            if (req.files) {
                const addDoc = (fileArray, title) => {
                    if (fileArray && fileArray.length > 0) {
                        documents.push({ title, url: `/uploads/lawyers/${fileArray[0].filename}`, publicId: fileArray[0].filename });
                    }
                };
                addDoc(req.files.barCouncilCert, 'Bar Council Certificate');
                addDoc(req.files.idProof, 'Government ID Proof');
                addDoc(req.files.advocateId, 'Advocate Identity Card');
            }

            // Create Lawyer profile
            await Lawyer.create({
                userId: user._id,
                verificationStatus: 'pending',
                profileStatus: 'inactive',
                gender,
                dob,
                address,
                city,
                state,
                pincode,
                barCouncilNumber,
                barCouncilState,
                courtLevels,
                lawFirm,
                documents,
                specialization,
                experienceYears: Number(experienceYears) || 0,
                consultationFee: Number(consultationFee) || 0,
                about: about || '',
                languages,
                availableTimeSlots,
                onlineConsultation: onlineConsultation === 'true' || onlineConsultation === true,
                offlineConsultation: offlineConsultation === 'true' || offlineConsultation === true,
                emergencyConsultation: emergencyConsultation === 'true' || emergencyConsultation === true
            });

            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                message: 'Registration successful. Profile pending verification.',
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, registerLawyer };

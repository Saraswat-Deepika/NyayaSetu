const express = require('express');
const router = express.Router();
const { registerUser, loginUser, registerLawyer } = require('../controllers/authController');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads/lawyers');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.post('/register', registerUser);
router.post(
    '/register-lawyer',
    upload.fields([
        { name: 'barCouncilCert', maxCount: 1 },
        { name: 'idProof', maxCount: 1 },
        { name: 'advocateId', maxCount: 1 },
        { name: 'profileImage', maxCount: 1 }
    ]),
    registerLawyer
);
router.post('/login', loginUser);

module.exports = router;

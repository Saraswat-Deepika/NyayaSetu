const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});

const checkFileType = (file, cb) => {
  // ✅ webm, mp3, wav, pdf, images sab allow karo
  const allowedTypes = /jpeg|jpg|png|pdf|webm|mp3|wav|ogg|mp4|m4a/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) ||
    file.mimetype.startsWith('audio/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype === 'application/octet-stream'; // browser sometimes sends this

  if (extname || mimetype) {
    return cb(null, true);
  }
  cb(new Error(`File type not allowed: ${file.mimetype}`));
};

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => checkFileType(file, cb)
});

module.exports = upload;

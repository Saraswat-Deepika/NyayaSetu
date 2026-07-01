const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');

const pdfDir = path.join(__dirname, '../uploads/pdfs');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, pdfDir);
    } else {
      cb(null, os.tmpdir()); // Store audio in temp dir to keep uploads/ only for PDFs
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  }
});

const checkFileType = (file, cb) => {
  const allowedTypes = /pdf|webm|mp3|wav|ogg|mp4|m4a/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || 
                   file.mimetype === 'application/pdf' || 
                   file.mimetype.startsWith('audio/') || 
                   file.mimetype.startsWith('video/') ||
                   file.mimetype === 'application/octet-stream';

  if (extname || mimetype) {
    return cb(null, true);
  }
  cb(new Error(`File type not allowed: ${file.mimetype}`));
};

module.exports = { storage, checkFileType };

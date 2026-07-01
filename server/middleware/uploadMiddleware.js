const multer = require('multer');
const { storage, checkFileType } = require('../config/multer');

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => checkFileType(file, cb)
});

module.exports = upload;

const multer = require('multer');
const { MAX_FILE_SIZE_BYTES } = require('../services/fileExtractionService');

const uploadDocumentFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
    fields: 2,
    parts: 4,
    fieldSize: 10_000,
  },
}).single('file');

const handleDocumentUpload = (req, res, next) => {
  uploadDocumentFile(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        code: 'DOCUMENT_FILE_TOO_LARGE',
        message: 'The uploaded file exceeds the 5 MB limit.',
      });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        code: 'DOCUMENT_UPLOAD_INVALID',
        message: 'Upload exactly one file using the file field.',
      });
    }
    return next(error);
  });
};

module.exports = handleDocumentUpload;

const multer = require("multer");
const { MAX_BYTES } = require("../utils/reportFiles");

/**
 * Report PDF upload (multipart field "report").
 *
 * Held in memory, not written by multer: the controller checks the bytes
 * really are a PDF and then saves them under a server-generated name
 * (utils/reportFiles.js). The previous version wrote straight to the
 * public folder under a name built from the uploader's file extension.
 *
 * Limits: one file, 10 MB, a handful of small text fields.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 5, fieldSize: 10 * 1024 },
  fileFilter: (req, file, cb) => {
    // First check only; the content check in reportFiles.isPdf is the real one.
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(Object.assign(new Error("Only PDF files are allowed."), { statusCode: 400 }), false);
  },
});

/** upload.single("report"), with multer's errors turned into clear 400/413 answers. */
const singleReport = (req, res, next) =>
  upload.single("report")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const tooBig = err.code === "LIMIT_FILE_SIZE";
      return res.status(tooBig ? 413 : 400).json({
        success: false,
        message: tooBig ? "The PDF must be 10 MB or smaller." : "Upload one PDF file in the \"report\" field.",
      });
    }
    return res.status(err.statusCode || 400).json({ success: false, message: err.message });
  });

module.exports = { singleReport };

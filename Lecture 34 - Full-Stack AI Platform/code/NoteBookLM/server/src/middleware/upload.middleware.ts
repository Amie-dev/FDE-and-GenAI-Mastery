import multer from "multer";
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fieldSize: MAX_PDF_SIZE_BYTES },
  fileFilter: (req, file, callback) => {
    if (file.mimetype === "application/pdf") {
      return callback(null, true);
    }
    callback(new Error("Only Pdf File are allows"));
  },
});

export const uploadSignlePdf = pdfUpload.single("file");

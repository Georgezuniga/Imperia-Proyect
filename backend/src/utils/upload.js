import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "checks");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${ext || ""}`);
  },
});

function fileFilter(req, file, cb) {
  const ok = file.mimetype?.startsWith("image/");
  if (!ok) return cb(new Error("Solo se permiten imágenes"));
  cb(null, true);
}

export const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});
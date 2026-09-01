import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { HttpError } from "./errorHandler.js";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "products");
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

// Armazenamento em disco local: simples para rodar hoje, mas não
// sobrevive a um redeploy/rebuild em muitas plataformas de hospedagem
// (disco efêmero). Antes de produção, trocar por um bucket (S3,
// Cloudinary etc.) — é só reescrever este arquivo, nada mais no
// sistema depende de como a imagem é guardada.
export const uploadProductPhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new HttpError(415, "Apenas imagens JPEG, PNG ou WEBP são aceitas"));
      return;
    }
    cb(null, true);
  },
}).single("photo");


import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const destinationDir = path.join(__dirname, '..', 'public', 'images', 'products');
fs.mkdirSync(destinationDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, destinationDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
    cb(null, `product_${req.params.id || 'new'}_${Date.now()}_${Math.round(Math.random()*1e6)}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
  cb(ok ? null : new Error('Dozwolone są tylko pliki PNG/JPG/WEBP'), ok);
};

const options = {
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
};

export const uploadProductImage = multer(options);
export const uploadProductGalleryImages = multer(options);

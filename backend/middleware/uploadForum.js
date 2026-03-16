import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const forumDir = path.join(__dirname, '..', 'public', 'images', 'forum');
fs.mkdirSync(forumDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, forumDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `forum_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
  cb(ok ? null : new Error('Dozwolone są tylko pliki PNG/JPG/WEBP'), ok);
};

export const uploadForumImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 4,
  },
});

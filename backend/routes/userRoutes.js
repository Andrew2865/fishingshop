import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getMe, updateMe, changePassword, setAvatar } from '../controllers/userController.js';
import { uploadAvatar } from '../middleware/upload.js';

const router = express.Router();

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/me/password', protect, changePassword);
router.post('/me/avatar', protect, uploadAvatar.single('avatar'), setAvatar);

export default router;

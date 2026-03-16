import express from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadCategoryImage } from '../middleware/uploadCategories.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/', protect, admin, uploadCategoryImage.single('image'), createCategory);
router.put('/:id', protect, admin, uploadCategoryImage.single('image'), updateCategory);
router.delete('/:id', protect, admin, deleteCategory);

export default router;

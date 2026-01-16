import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin
  , setProductImage
} from '../controllers/productController.js';
import { uploadProductImage } from '../middleware/uploadProducts.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/admin/all', protect, admin, getAllProductsAdmin);
router.get('/:id', getProductById);
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);
router.post('/:id/image', protect, admin, uploadProductImage.single('image'), setProductImage);

export default router;
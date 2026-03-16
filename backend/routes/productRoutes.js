import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  setProductImage,
  updateProductStock,
  getProductStockMovements,
  getProductReviews,
  addOrUpdateProductReview,
  addProductGalleryImages,
  deleteProductGalleryImage,
} from '../controllers/productController.js';
import { uploadProductImage, uploadProductGalleryImages } from '../middleware/uploadProducts.js';
import { protect, admin, adminOrWarehouse } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/admin/all', protect, admin, getAllProductsAdmin);
router.get('/warehouse/all', protect, adminOrWarehouse, getAllProductsAdmin);
router.get('/:id/stock-movements', protect, adminOrWarehouse, getProductStockMovements);
router.patch('/:id/stock', protect, adminOrWarehouse, updateProductStock);
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', protect, addOrUpdateProductReview);
router.post('/:id/gallery-images', protect, admin, uploadProductGalleryImages.array('images', 8), addProductGalleryImages);
router.delete('/:id/gallery-images/:imageId', protect, admin, deleteProductGalleryImage);
router.get('/:id', getProductById);
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);
router.post('/:id/image', protect, admin, uploadProductImage.single('image'), setProductImage);

export default router;

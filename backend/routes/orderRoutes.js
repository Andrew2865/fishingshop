import express from 'express';
import {
  createOrder,
  getOrders,
  createGuestOrder,
  getOrderHistory,
  getAdminOrders,
  updateOrderAdmin,
} from '../controllers/orderController.js';
import { protect, admin, adminOrWarehouse } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createOrder);
router.post('/guest', createGuestOrder);
router.get('/', protect, getOrders);
router.get('/history', protect, getOrderHistory);
router.get('/admin/all', protect, admin, getAdminOrders);
router.put('/admin/:id', protect, admin, updateOrderAdmin);
router.get('/warehouse/all', protect, adminOrWarehouse, getAdminOrders);
router.put('/warehouse/:id', protect, adminOrWarehouse, updateOrderAdmin);

export default router;

import express from 'express';
import { createOrder, createGuestOrder, getOrders, getOrderHistory } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/', protect, getOrders);
router.get('/history', protect, getOrderHistory);

router.post('/guest', createGuestOrder);

export default router;

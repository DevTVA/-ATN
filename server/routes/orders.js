import express from 'express';
import * as c from '../controllers/orderController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, c.getOrders);
router.get('/:id', protect, c.getOrder);
router.post('/', protect, c.createOrder);
router.put('/:id', protect, c.updateOrder);
router.delete('/:id', protect, adminOnly, c.deleteOrder);

export default router;

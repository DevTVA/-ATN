import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { getRevenue, getProductStatistics } from '../controllers/revenueController.js';

const router = express.Router();

router.get('/', protect, adminOnly, getRevenue);
router.get('/products', protect, adminOnly, getProductStatistics);

export default router;

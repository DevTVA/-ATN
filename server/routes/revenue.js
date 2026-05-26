import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { getRevenue } from '../controllers/revenueController.js';

const router = express.Router();

router.get('/', protect, adminOnly, getRevenue);

export default router;

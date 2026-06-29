import express from 'express';
import * as c from '../controllers/tableController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, c.getTables);
router.get('/:id', protect, c.getTable);
router.post('/', protect, c.createTable);
router.put('/:id', protect, c.updateTable);
router.delete('/:id', protect, c.deleteTable);

export default router;

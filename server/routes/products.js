import express from 'express';
import * as c from '../controllers/productController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, c.getProducts);
router.get('/categories', protect, c.getCategories);
router.post('/categories', protect, adminOnly, c.createCategory);
router.put('/categories/:id', protect, adminOnly, c.updateCategory);
router.delete('/categories/:id', protect, adminOnly, c.deleteCategory);
router.get('/:id', protect, c.getProduct);
router.post('/', protect, adminOnly, c.createProduct);
router.put('/:id', protect, adminOnly, c.updateProduct);
router.delete('/:id', protect, adminOnly, c.deleteProduct);

export default router;

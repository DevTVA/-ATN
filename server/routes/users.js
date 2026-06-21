import express from 'express';
import * as c from '../controllers/userController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, adminOnly, c.getUsers);
router.get('/roles', protect, adminOnly, c.getRoles);
router.get('/:id', protect, adminOnly, c.getUser);
router.post('/', protect, adminOnly, c.createUser);
router.put('/:id', protect, adminOnly, c.updateUser);
router.put('/:id/reset-password', protect, adminOnly, c.resetPassword);
router.delete('/:id', protect, adminOnly, c.deleteUser);

export default router;

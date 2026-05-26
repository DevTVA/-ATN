import express from 'express';
import * as c from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', c.login);
router.post('/register', c.register);
router.get('/me', protect, c.getMe);
router.put('/change-password', protect, c.changePassword);

export default router;

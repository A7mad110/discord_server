import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';
import {
  register, login, verifyEmail, forgotPassword, resetPassword,
  getMe, updateProfile, changePassword, logout,
} from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, uploadAvatar, updateProfile);
router.patch('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

export default router;

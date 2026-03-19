// ============================================
// routes/auth.js - Authentication Routes
// ============================================

const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword, logout, deleteAccount, exportMyData } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateRegister, validateLogin } = require('../middleware/validator');

// Public routes (No login required)
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/logout', logout);

// Protected routes (Login required)
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.delete('/me', protect, deleteAccount);
router.get('/me/export', protect, exportMyData);

module.exports = router;

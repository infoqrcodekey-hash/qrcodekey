// ============================================
// routes/faceVerification.js - Face Verification Routes
// ============================================

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  enrollFace,
  verifyFace,
  getPendingVerifications,
  reviewVerification,
  getEnrollmentStatus,
  getVerificationStats
} = require('../controllers/faceVerificationController');

// All routes require authentication
router.use(protect);

// Enroll a member's face
router.post('/enroll', authorize('admin', 'teacher'), enrollFace);

// Verify face during attendance
router.post('/verify', verifyFace);

// Get pending verifications for admin review
router.get('/pending/:organizationId', authorize('admin', 'teacher'), getPendingVerifications);

// Manual review (approve/reject)
router.put('/review', authorize('admin', 'teacher'), reviewVerification);

// Get enrollment status for org
router.get('/status/:organizationId', getEnrollmentStatus);

// Get verification stats
router.get('/stats/:organizationId', authorize('admin', 'teacher'), getVerificationStats);

module.exports = router;

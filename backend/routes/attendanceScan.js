// ============================================
// routes/attendanceScan.js - Attendance Scan Routes
// ============================================
// GPS-validated QR attendance system

const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const {
  scanAttendance,
  getAttendanceDashboard,
  getMemberHistory,
  viewerAccess,
  generateTempPassword,
  bulkGenerateQR,
  getGroupAttendanceToday,
  exportAttendanceReport,
  updateOrgLocation,
  setGroupPassword,
  verifyAttendance
} = require('../controllers/attendanceScanController');

// ── Public Routes ──
router.post('/scan', optionalAuth, scanAttendance);         // QR scan (clock-in/out)
router.post('/viewer-access', viewerAccess);                 // Parent/viewer access
router.post('/verify', verifyAttendance);                    // Verify with QR ID + group password

// ── Protected Routes (Login Required) ──
router.get('/dashboard/:orgId', protect, getAttendanceDashboard);    // Admin dashboard
router.get('/member/:memberId/history', protect, getMemberHistory);  // Member history
router.get('/group/:groupId/today', protect, getGroupAttendanceToday); // Today's group attendance
router.get('/export/:groupId', protect, exportAttendanceReport);     // Export CSV

// ── Admin/Teacher Routes ──
router.post('/temp-password', protect, generateTempPassword);        // Generate temp password
router.post('/bulk-qr/:groupId', protect, bulkGenerateQR);          // Bulk generate QR codes
router.put('/org/:orgId/location', protect, updateOrgLocation);      // Update GPS location
router.put('/group/:groupId/password', protect, setGroupPassword);   // Set group master password

module.exports = router;

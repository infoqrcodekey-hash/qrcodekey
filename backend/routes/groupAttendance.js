// -----------------------------------------------
// routes/groupAttendance.js
// -----------------------------------------------
// Group Attendance routes

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const {
  createGroup,
  getMyGroups,
  getGroup,
  addMember,
  removeMember,
  toggleAttendance,
  processScan,
  getRecentScans,
  getAttendanceSummary,
  getMonthlyReport,
  exportCSV,
  deleteGroup
} = require('../controllers/groupAttendanceController');

// All routes require authentication
router.use(protect);

// Group CRUD
router.post('/create', createGroup);
router.get('/my-groups', getMyGroups);
router.get('/:id', getGroup);
router.delete('/:id', deleteGroup);

// Member management
router.post('/:id/add-member', addMember);
router.delete('/:id/remove-member/:memberId', removeMember);

// Attendance
router.put('/:id/toggle', toggleAttendance);
router.post('/:id/scan', processScan);
router.get('/:id/recent-scans', getRecentScans);

// Reports
router.get('/:id/summary', getAttendanceSummary);
router.get('/:id/monthly-report', getMonthlyReport);
router.get('/:id/export-csv', exportCSV);

module.exports = router;

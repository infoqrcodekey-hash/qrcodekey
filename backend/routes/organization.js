// ============================================
// routes/organization.js
// ============================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const org = require('../controllers/organizationController');
const att = require('../controllers/attendanceController');

// ====== Organization CRUD ======
router.post('/', protect, org.createOrganization);
router.get('/', protect, org.getMyOrganizations);

// ====== Shared Dashboard (public with password) - MUST be before /:id route ======
router.post('/shared/access', org.sharedDashboardAccess);

// ====== Organization Detail Routes (these come AFTER /shared/access) ======
router.get('/:id', protect, org.getOrganization);
router.put('/:id', protect, org.updateOrganization);
router.delete('/:id', protect, org.deleteOrganization);

// ====== Group Management ======
router.post('/:orgId/groups', protect, org.createGroup);
router.get('/groups/:groupId', protect, org.getGroup);
router.put('/groups/:groupId', protect, org.updateGroup);
router.delete('/groups/:groupId', protect, org.deleteGroup);

// ====== Member Management ======
router.post('/groups/:groupId/members', protect, org.addMember);
router.post('/groups/:groupId/members/bulk', protect, org.addMembers);
router.put('/members/:memberId', protect, org.updateMember);
router.delete('/members/:memberId', protect, org.removeMember);

// ====== Attendance ======
router.get('/attendance/scan/:groupId', att.getGroupForScan);        // Public
router.post('/attendance/mark/:groupId', att.markAttendanceByQR);    // Public (password protected)
router.get('/attendance/:groupId', protect, att.getGroupAttendance);
router.put('/attendance/:groupId', protect, att.updateAttendance);
router.post('/attendance/:groupId/lock', protect, att.lockAttendance);
router.get('/attendance/:groupId/report', protect, att.getAttendanceReport);

module.exports = router;

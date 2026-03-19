// ============================================
// routes/teams.js - Team Routes
// ============================================

const express = require('express');
const router = express.Router();
const {
  createTeam, getMyTeams, getTeam, joinTeam,
  leaveTeam, removeMember, getTeamQRCodes, deleteTeam
} = require('../controllers/teamController');
const { protect } = require('../middleware/auth');

// All routes need login
router.use(protect);

router.post('/create', createTeam);
router.get('/my', getMyTeams);
router.post('/join', joinTeam);
router.get('/:teamId', getTeam);
router.post('/:teamId/leave', leaveTeam);
router.delete('/:teamId/members/:userId', removeMember);
router.get('/:teamId/qr-codes', getTeamQRCodes);
router.delete('/:teamId', deleteTeam);

module.exports = router;

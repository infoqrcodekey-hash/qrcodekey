// ============================================
// controllers/teamController.js - Team Management
// ============================================

const Team = require('../models/Team');
const User = require('../models/User');
const QRCode = require('../models/QRCode');

// ====== CREATE TEAM ======
exports.createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Team name zaroori hai' });

    let inviteCode = Team.generateInviteCode();
    while (await Team.findOne({ inviteCode })) { inviteCode = Team.generateInviteCode(); }

    const team = await Team.create({
      name, description, owner: req.user._id,
      inviteCode,
      members: [{ user: req.user._id, role: 'admin' }]
    });

    res.status(201).json({ success: true, message: 'Team ban gayi! 🎉', data: team });
  } catch (error) {
    console.error('Create Team Error:', error);
    res.status(500).json({ success: false, message: 'Team create karne mein error' });
  }
};

// ====== GET MY TEAMS ======
exports.getMyTeams = async (req, res) => {
  try {
    const teams = await Team.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      isActive: true
    }).populate('owner', 'name email').populate('members.user', 'name email').lean();

    res.status(200).json({ success: true, count: teams.length, data: teams });
  } catch (error) {
    console.error('Get Teams Error:', error);
    res.status(500).json({ success: false, message: 'Teams load nahi hui' });
  }
};

// ====== GET TEAM DETAILS ======
exports.getTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .lean();

    if (!team) return res.status(404).json({ success: false, message: 'Team nahi mili' });

    const isMember = team.members.some(m => m.user?._id?.toString() === req.user._id);
    const isOwner = team.owner?._id?.toString() === req.user._id;
    if (!isMember && !isOwner) return res.status(403).json({ success: false, message: 'Is team ka access nahi hai' });

    res.status(200).json({ success: true, data: team });
  } catch (error) {
    console.error('Get Team Error:', error);
    res.status(500).json({ success: false, message: 'Team details load nahi hui' });
  }
};

// ====== JOIN TEAM (via invite code) ======
exports.joinTeam = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ success: false, message: 'Invite code daalo' });

    const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase(), isActive: true, inviteEnabled: true });
    if (!team) return res.status(404).json({ success: false, message: 'Galat invite code hai ya expired ho gaya' });

    // Already member?
    const alreadyMember = team.members.some(m => m.user?.toString() === req.user._id);
    if (alreadyMember) return res.status(400).json({ success: false, message: 'Aap pehle se is team mein hain' });

    team.members.push({ user: req.user._id, role: 'member' });
    await team.save();

    res.status(200).json({ success: true, message: `"${team.name}" team mein join ho gaye! 🎉`, data: { teamId: team._id, teamName: team.name } });
  } catch (error) {
    console.error('Join Team Error:', error);
    res.status(500).json({ success: false, message: 'Join karne mein error aaya' });
  }
};

// ====== LEAVE TEAM ======
exports.leaveTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team nahi mili' });

    if (team.owner.toString() === req.user._id) {
      return res.status(400).json({ success: false, message: 'Owner team nahi chhod sakta. Pehle ownership transfer karo ya team delete karo.' });
    }

    team.members = team.members.filter(m => m.user?.toString() !== req.user._id);
    await team.save();

    res.status(200).json({ success: true, message: 'Team chhod di' });
  } catch (error) {
    console.error('Leave Team Error:', error);
    res.status(500).json({ success: false, message: 'Leave karne mein error' });
  }
};

// ====== REMOVE MEMBER (Owner only) ======
exports.removeMember = async (req, res) => {
  try {
    const team = await Team.findOne({ _id: req.params.teamId, owner: req.user._id });
    if (!team) return res.status(403).json({ success: false, message: 'Sirf owner hi member remove kar sakta hai' });

    const { userId } = req.params;
    if (userId === req.user._id) return res.status(400).json({ success: false, message: 'Aap khud ko remove nahi kar sakte' });

    team.members = team.members.filter(m => m.user?.toString() !== userId);
    await team.save();

    res.status(200).json({ success: true, message: 'Member remove ho gaya' });
  } catch (error) {
    console.error('Remove Member Error:', error);
    res.status(500).json({ success: false, message: 'Remove karne mein error' });
  }
};

// ====== GET TEAM QR CODES ======
exports.getTeamQRCodes = async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team nahi mili' });

    const isMember = team.members.some(m => m.user?.toString() === req.user._id);
    const isOwner = team.owner.toString() === req.user._id;
    if (!isMember && !isOwner) return res.status(403).json({ success: false, message: 'Access denied' });

    // Get QR codes of all team members
    const memberIds = team.members.map(m => m.user);
    const qrCodes = await QRCode.find({ owner: { $in: memberIds } })
      .select('-qrPassword')
      .populate('owner', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, count: qrCodes.length, data: qrCodes });
  } catch (error) {
    console.error('Team QR Error:', error);
    res.status(500).json({ success: false, message: 'Team QR codes load nahi hue' });
  }
};

// ====== DELETE TEAM (Owner only) ======
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findOne({ _id: req.params.teamId, owner: req.user._id });
    if (!team) return res.status(403).json({ success: false, message: 'Sirf owner hi team delete kar sakta hai' });

    await Team.deleteOne({ _id: team._id });
    res.status(200).json({ success: true, message: 'Team delete ho gayi' });
  } catch (error) {
    console.error('Delete Team Error:', error);
    res.status(500).json({ success: false, message: 'Delete karne mein error' });
  }
};

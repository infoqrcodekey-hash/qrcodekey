// ============================================
// controllers/organizationController.js
// ============================================

const Organization = require('../models/Organization');
const Group = require('../models/Group');
const Member = require('../models/Member');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');

// ====== CREATE ORGANIZATION ======
exports.createOrganization = async (req, res) => {
  try {
    const { name, type, description, sharedPassword, address, phone, email, settings } = req.body;

    if (!name || !type || !sharedPassword) {
      return res.status(400).json({ success: false, message: 'Name, type, and shared password are required' });
    }

    // Hash shared password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(sharedPassword, salt);

    const org = await Organization.create({
      name, type, description,
      sharedPassword: hashedPassword,
      address, phone, email,
      owner: req.user._id,
      admins: [req.user._id],
      settings: settings || {}
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: { ...org.toJSON(), sharedPassword: undefined }
    });
  } catch (err) {
    console.error('Create org error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== GET MY ORGANIZATIONS ======
exports.getMyOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.find({
      $or: [
        { owner: req.user._id },
        { admins: req.user._id }
      ],
      isActive: true
    }).select('-sharedPassword').sort('-createdAt');

    // Get group counts for each org
    const orgIds = orgs.map(o => o._id);
    const groupCounts = await Group.aggregate([
      { $match: { organization: { $in: orgIds }, isActive: true } },
      { $group: { _id: '$organization', count: { $sum: 1 } } }
    ]);
    const memberCounts = await Member.aggregate([
      { $match: { organization: { $in: orgIds }, isActive: true } },
      { $group: { _id: '$organization', count: { $sum: 1 } } }
    ]);

    const gcMap = {};
    groupCounts.forEach(g => { gcMap[g._id.toString()] = g.count; });
    const mcMap = {};
    memberCounts.forEach(m => { mcMap[m._id.toString()] = m.count; });

    const data = orgs.map(o => ({
      ...o.toJSON(),
      groupCount: gcMap[o._id.toString()] || 0,
      memberCount: mcMap[o._id.toString()] || 0
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== GET ORGANIZATION DETAIL ======
exports.getOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id)
      .select('-sharedPassword')
      .populate('owner', 'name email')
      .populate('admins', 'name email');

    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Check access
    const isOwner = org.owner._id.toString() === req.user._id.toString();
    const isAdmin = org.admins.some(a => a._id.toString() === req.user._id.toString());
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get groups with member counts
    const groups = await Group.find({ organization: org._id, isActive: true }).sort('name');
    const memberCounts = await Member.aggregate([
      { $match: { organization: org._id, isActive: true } },
      { $group: { _id: '$group', count: { $sum: 1 } } }
    ]);
    const mcMap = {};
    memberCounts.forEach(m => { mcMap[m._id.toString()] = m.count; });

    const groupsData = groups.map(g => ({
      ...g.toJSON(),
      memberCount: mcMap[g._id.toString()] || 0
    }));

    res.json({
      success: true,
      data: { ...org.toJSON(), groups: groupsData }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== UPDATE ORGANIZATION ======
exports.updateOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    if (org.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only owner can update' });
    }

    const { name, description, address, phone, email, settings, sharedPassword } = req.body;
    if (name) org.name = name;
    if (description !== undefined) org.description = description;
    if (address !== undefined) org.address = address;
    if (phone !== undefined) org.phone = phone;
    if (email !== undefined) org.email = email;
    if (settings) org.settings = { ...org.settings, ...settings };
    if (sharedPassword) {
      const salt = await bcrypt.genSalt(10);
      org.sharedPassword = await bcrypt.hash(sharedPassword, salt);
    }

    await org.save();
    res.json({ success: true, message: 'Organization updated', data: { ...org.toJSON(), sharedPassword: undefined } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== DELETE ORGANIZATION ======
exports.deleteOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });
    if (org.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only owner can delete' });
    }

    org.isActive = false;
    await org.save();

    // Deactivate all groups and members
    await Group.updateMany({ organization: org._id }, { isActive: false });
    await Member.updateMany({ organization: org._id }, { isActive: false });

    res.json({ success: true, message: 'Organization deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== SHARED DASHBOARD ACCESS (no login needed) ======
exports.sharedDashboardAccess = async (req, res) => {
  try {
    const { inviteCode, password } = req.body;
    if (!inviteCode || !password) {
      return res.status(400).json({ success: false, message: 'Invite code and password required' });
    }

    const org = await Organization.findOne({ inviteCode, isActive: true });
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    const isMatch = await bcrypt.compare(password, org.sharedPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid password' });

    // Get groups and today's attendance
    const groups = await Group.find({ organization: org._id, isActive: true }).sort('name');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAttendance = await Attendance.find({
      organization: org._id,
      date: today
    }).populate('records.member', 'name rollNumber');

    const attMap = {};
    todayAttendance.forEach(a => { attMap[a.group.toString()] = a; });

    const memberCounts = await Member.aggregate([
      { $match: { organization: org._id, isActive: true } },
      { $group: { _id: '$group', count: { $sum: 1 } } }
    ]);
    const mcMap = {};
    memberCounts.forEach(m => { mcMap[m._id.toString()] = m.count; });

    const data = {
      orgName: org.name,
      orgType: org.type,
      groups: groups.map(g => ({
        _id: g._id,
        name: g.name,
        type: g.type,
        memberCount: mcMap[g._id.toString()] || 0,
        todayAttendance: attMap[g._id.toString()]?.summary || null
      }))
    };

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== GET ALL GROUPS IN ORG ======
exports.getOrgGroups = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    const groups = await Group.find({ organization: org._id, isActive: true }).sort('name');
    const memberCounts = await Member.aggregate([
      { $match: { organization: org._id, isActive: true } },
      { $group: { _id: '$group', count: { $sum: 1 } } }
    ]);
    const mcMap = {};
    memberCounts.forEach(m => { mcMap[m._id.toString()] = m.count; });

    const data = groups.map(g => ({
      ...g.toJSON(),
      memberCount: mcMap[g._id.toString()] || 0
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== GET GROUP MEMBERS ======
exports.getGroupMembers = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('organization', 'owner admins');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const org = group.organization;
    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    const members = await Member.find({ group: group._id, isActive: true }).sort('name');
    res.json({ success: true, data: members });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== CREATE GROUP ======
exports.createGroup = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    const { name, type, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Group name is required' });

    const group = await Group.create({
      name, type: type || 'other', description,
      organization: org._id,
      createdBy: req.user._id
    });

    // Generate QR code for attendance
    const qrId = `ATT-${org._id.toString().slice(-4)}-${group._id.toString().slice(-4)}`.toUpperCase();
    const scanUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/attendance/scan/${group._id}`;
    const qrImage = await QRCode.toDataURL(scanUrl, {
      width: 300, margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' }
    });

    group.qrCode = qrId;
    group.qrImage = qrImage;
    await group.save();

    res.status(201).json({
      success: true,
      message: 'Group created with QR code',
      data: group
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== GET GROUP WITH MEMBERS ======
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('organization', 'name type owner admins');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const org = group.organization;
    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    const members = await Member.find({ group: group._id, isActive: true }).sort('name');

    res.json({
      success: true,
      data: { ...group.toJSON(), members }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== UPDATE GROUP ======
exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('organization', 'owner admins');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const org = group.organization;
    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    const { name, type, description } = req.body;
    if (name) group.name = name;
    if (type) group.type = type;
    if (description !== undefined) group.description = description;

    await group.save();
    res.json({ success: true, message: 'Group updated', data: group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== DELETE GROUP ======
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('organization', 'owner admins');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const org = group.organization;
    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    group.isActive = false;
    await group.save();
    await Member.updateMany({ group: group._id }, { isActive: false });

    res.json({ success: true, message: 'Group deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== ADD MEMBER ======
exports.addMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('organization', 'owner admins');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const org = group.organization;
    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    const { name, rollNumber, email, phone, role } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Member name is required' });

    const member = await Member.create({
      name, rollNumber, email, phone,
      role: role || 'other',
      group: group._id,
      organization: group.organization._id
    });

    res.status(201).json({ success: true, message: 'Member added', data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== ADD MULTIPLE MEMBERS ======
exports.addMembers = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId).populate('organization', 'owner admins');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const org = group.organization;
    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    const { members } = req.body;
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ success: false, message: 'Members array is required' });
    }

    const memberDocs = members.map(m => ({
      name: m.name,
      rollNumber: m.rollNumber || '',
      email: m.email || '',
      phone: m.phone || '',
      role: m.role || 'other',
      group: group._id,
      organization: group.organization._id
    }));

    const created = await Member.insertMany(memberDocs);
    res.status(201).json({ success: true, message: `${created.length} members added`, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== UPDATE MEMBER ======
exports.updateMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.memberId)
      .populate({ path: 'organization', select: 'owner admins' });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const org = member.organization;
    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    const { name, rollNumber, email, phone, role } = req.body;
    if (name) member.name = name;
    if (rollNumber !== undefined) member.rollNumber = rollNumber;
    if (email !== undefined) member.email = email;
    if (phone !== undefined) member.phone = phone;
    if (role) member.role = role;

    await member.save();
    res.json({ success: true, message: 'Member updated', data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== REMOVE MEMBER ======
exports.removeMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.memberId)
      .populate({ path: 'organization', select: 'owner admins' });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const org = member.organization;
    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    member.isActive = false;
    await member.save();
    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

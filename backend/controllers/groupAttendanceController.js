// -----------------------------------------------
// controllers/groupAttendanceController.js
// -----------------------------------------------
// Group Attendance Module — Admin-controlled, location-based QR attendance

const { Group, GroupScanLog } = require('../models/Group');

// Helper: Haversine distance in meters
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// @desc    Create a new group
// @route   POST /api/group-attendance/create
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const { name, category, fixedAddress } = req.body;
    const user = req.user;

    if (!name || !fixedAddress || !fixedAddress.address || fixedAddress.latitude == null || fixedAddress.longitude == null) {
      return res.status(400).json({ success: false, message: 'Name and full address (address, latitude, longitude) are required' });
    }

    // Get user's QR number from their profile
    const User = require('../models/User');
    const fullUser = await User.findById(user.id);
    if (!fullUser || !fullUser.qrNumber) {
      return res.status(400).json({ success: false, message: 'You must have a Personal QR number to create a group' });
    }

    const group = await Group.create({
      admin: user.id,
      adminQrNumber: fullUser.qrNumber,
      adminName: fullUser.name || fullUser.email,
      name: name.trim(),
      category: category || 'other',
      fixedAddress: {
        address: fixedAddress.address,
        latitude: fixedAddress.latitude,
        longitude: fixedAddress.longitude
      },
      attendanceEnabled: false,
      members: []
    });

    res.status(201).json({ success: true, data: group });
  } catch (error) {
    console.error('createGroup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all groups for current user (admin or member)
// @route   GET /api/group-attendance/my-groups
// @access  Private
exports.getMyGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    // Groups where user is admin
    const adminGroups = await Group.find({ admin: userId, isActive: true }).sort({ createdAt: -1 });

    // Groups where user is a member
    const memberGroups = await Group.find({ 'members.user': userId, isActive: true }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        adminGroups,
        memberGroups
      }
    });
  } catch (error) {
    console.error('getMyGroups error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single group details
// @route   GET /api/group-attendance/:id
// @access  Private (admin only)
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate('members.user', 'name email qrNumber');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Only admin can view full group details
    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only group admin can view details' });
    }

    res.json({ success: true, data: group });
  } catch (error) {
    console.error('getGroup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Add a member to group
// @route   POST /api/group-attendance/:id/add-member
// @access  Private (admin only)
exports.addMember = async (req, res) => {
  try {
    const { qrNumber } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only group admin can add members' });
    }

    // Find user by QR number
    const User = require('../models/User');
    const memberUser = await User.findOne({ qrNumber });

    if (!memberUser) {
      return res.status(404).json({ success: false, message: 'No user found with this QR number. They must have a Personal QR first.' });
    }

    // Check if already a member
    const alreadyMember = group.members.find(m => m.user.toString() === memberUser._id.toString());
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already a member of this group' });
    }

    // Cannot add self (admin)
    if (memberUser._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'Admin cannot be added as a member' });
    }

    group.members.push({
      user: memberUser._id,
      qrNumber: memberUser.qrNumber,
      name: memberUser.name || memberUser.email,
      isPresent: false,
      lastScanTime: null
    });

    await group.save();

    res.json({ success: true, data: group });
  } catch (error) {
    console.error('addMember error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Remove a member from group
// @route   DELETE /api/group-attendance/:id/remove-member/:memberId
// @access  Private (admin only)
exports.removeMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only group admin can remove members' });
    }

    group.members = group.members.filter(m => m.user.toString() !== req.params.memberId);
    await group.save();

    res.json({ success: true, data: group });
  } catch (error) {
    console.error('removeMember error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Toggle attendance ON/OFF for entire group
// @route   PUT /api/group-attendance/:id/toggle
// @access  Private (admin only)
exports.toggleAttendance = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only group admin can toggle attendance' });
    }

    group.attendanceEnabled = !group.attendanceEnabled;

    // If turning OFF, reset all members to not present
    if (!group.attendanceEnabled) {
      group.members.forEach(m => {
        m.isPresent = false;
      });
    }

    await group.save();

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`group_${group._id}`).emit('attendance_toggled', {
        groupId: group._id,
        attendanceEnabled: group.attendanceEnabled
      });
    }

    res.json({ success: true, data: group });
  } catch (error) {
    console.error('toggleAttendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Process a QR scan for attendance
// @route   POST /api/group-attendance/:id/scan
// @access  Private
exports.processScan = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, address, qrId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check attendance is enabled
    if (!group.attendanceEnabled) {
      return res.status(400).json({ success: false, message: 'Attendance is not currently active for this group' });
    }

    // Check GPS accuracy
    if (!accuracy || accuracy > 15) {
      return res.status(400).json({ success: false, message: 'GPS accuracy too low. Please enable GPS/WiFi and try again. Required: 15m or better.' });
    }

    // Find the member
    const memberIndex = group.members.findIndex(m => m.user.toString() === req.user.id);
    if (memberIndex === -1) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    // Calculate distance from group fixed address
    const distance = haversineDistance(
      latitude, longitude,
      group.fixedAddress.latitude, group.fixedAddress.longitude
    );

    const MAX_DISTANCE = 12; // 12 meters radius
    const isValid = distance <= MAX_DISTANCE;

    // Determine action (toggle: if present -> clock_out, if absent -> clock_in)
    const member = group.members[memberIndex];
    const action = member.isPresent ? 'clock_out' : 'clock_in';

    // Log the scan
    const scanLog = await GroupScanLog.create({
      group: group._id,
      member: req.user.id,
      qrId: qrId || '',
      action,
      location: {
        latitude,
        longitude,
        accuracy,
        address: address || ''
      },
      distanceFromGroup: Math.round(distance * 100) / 100,
      isValid
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: `You are ${Math.round(distance)}m away. Must be within ${MAX_DISTANCE}m of the group location.`,
        data: { distance: Math.round(distance), maxDistance: MAX_DISTANCE, scanLog: scanLog._id }
      });
    }

    // Toggle presence
    group.members[memberIndex].isPresent = !member.isPresent;
    group.members[memberIndex].lastScanTime = new Date();
    await group.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`group_${group._id}`).emit('member_scan', {
        groupId: group._id,
        memberId: req.user.id,
        memberName: member.name,
        action,
        isPresent: group.members[memberIndex].isPresent,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: action === 'clock_in' ? 'Clocked in successfully' : 'Clocked out successfully',
      data: {
        action,
        isPresent: group.members[memberIndex].isPresent,
        distance: Math.round(distance * 100) / 100,
        scanLog: scanLog._id
      }
    });
  } catch (error) {
    console.error('processScan error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get attendance summary for a group
// @route   GET /api/group-attendance/:id/summary
// @access  Private (admin only)
exports.getAttendanceSummary = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only group admin can view summary' });
    }

    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    // Get all valid scan logs for the period
    const logs = await GroupScanLog.find({
      group: group._id,
      isValid: true,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 });

    // Build per-member summary
    const memberSummaries = group.members.map(member => {
      const memberLogs = logs.filter(l => l.member.toString() === member.user.toString());
      const daysPresent = new Set();

      memberLogs.forEach(log => {
        if (log.action === 'clock_in') {
          const day = log.timestamp.getDate();
          daysPresent.add(day);
        }
      });

      const totalDays = endDate.getDate();
      const presentDays = daysPresent.size;
      const absentDays = totalDays - presentDays;
      const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      return {
        userId: member.user,
        name: member.name,
        qrNumber: member.qrNumber,
        presentDays,
        absentDays,
        totalDays,
        percentage,
        clockIns: memberLogs.filter(l => l.action === 'clock_in').length,
        clockOuts: memberLogs.filter(l => l.action === 'clock_out').length
      };
    });

    res.json({
      success: true,
      data: {
        groupName: group.name,
        month: m,
        year: y,
        totalMembers: group.members.length,
        members: memberSummaries
      }
    });
  } catch (error) {
    console.error('getAttendanceSummary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get monthly report (for chart data)
// @route   GET /api/group-attendance/:id/monthly-report
// @access  Private (admin only)
exports.getMonthlyReport = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only group admin can view reports' });
    }

    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);
    const totalDaysInMonth = endDate.getDate();

    const logs = await GroupScanLog.find({
      group: group._id,
      isValid: true,
      action: 'clock_in',
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Daily attendance count
    const dailyData = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayLogs = logs.filter(l => l.timestamp.getDate() === d);
      const uniqueMembers = new Set(dayLogs.map(l => l.member.toString()));
      dailyData.push({
        day: d,
        date: new Date(y, m - 1, d).toISOString().split('T')[0],
        presentCount: uniqueMembers.size,
        totalMembers: group.members.length
      });
    }

    res.json({
      success: true,
      data: {
        groupName: group.name,
        month: m,
        year: y,
        dailyData
      }
    });
  } catch (error) {
    console.error('getMonthlyReport error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Export attendance as CSV
// @route   GET /api/group-attendance/:id/export-csv
// @access  Private (admin only)
exports.exportCSV = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only group admin can export data' });
    }

    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59, 999);

    const logs = await GroupScanLog.find({
      group: group._id,
      isValid: true,
      timestamp: { $gte: startDate, $lte: endDate }
    }).populate('member', 'name email qrNumber').sort({ timestamp: 1 });

    // Build CSV
    let csv = 'Date,Time,Member Name,QR Number,Action,Latitude,Longitude,Distance(m)\n';

    logs.forEach(log => {
      const date = log.timestamp.toISOString().split('T')[0];
      const time = log.timestamp.toISOString().split('T')[1].split('.')[0];
      const memberName = log.member?.name || 'Unknown';
      const qrNum = log.member?.qrNumber || '';
      csv += `${date},${time},${memberName},${qrNum},${log.action},${log.location.latitude},${log.location.longitude},${log.distanceFromGroup}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${group.name}-${y}-${m}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('exportCSV error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a group
// @route   DELETE /api/group-attendance/:id
// @access  Private (admin only)
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    if (group.admin.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only group admin can delete the group' });
    }

    group.isActive = false;
    await group.save();

    // Also clean up scan logs
    await GroupScanLog.deleteMany({ group: group._id });

    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    console.error('deleteGroup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

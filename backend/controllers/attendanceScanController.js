// ============================================
// controllers/attendanceScanController.js
// ============================================
// GPS-validated QR attendance: Clock-In / Clock-Out

const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const Group = require('../models/Group');
const Organization = require('../models/Organization');
const TemporaryPassword = require('../models/TemporaryPassword');
const { validateGPSLocation } = require('../utils/gpsValidator');

// ──────────────────────────────────
// @desc    Scan QR for attendance (Clock-In or Clock-Out)
// @route   POST /api/attendance-scan/scan
// @access  Public (anyone with a scanner)
// ──────────────────────────────────
exports.scanAttendance = async (req, res) => {
  try {
    const { qrId, lat, lng, timestamp } = req.body;

    if (!qrId) {
      return res.status(400).json({ success: false, message: 'QR ID is required' });
    }

    // 1. Find member by QR ID
    const member = await Member.findOne({ qrId, isActive: true });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive QR code' });
    }

    // 2. Get organization
    const org = await Organization.findById(member.organization);
    if (!org || !org.isActive) {
      return res.status(404).json({ success: false, message: 'Organization not found or inactive' });
    }

    // 3. GPS Validation
    const gpsResult = validateGPSLocation(
      { lat, lng },
      org.location,
      org.allowedRadius
    );

    if (!gpsResult.isValid) {
      return res.status(403).json({
        success: false,
        message: gpsResult.message,
        distance: gpsResult.distance,
        allowedRadius: gpsResult.allowedRadius
      });
    }

    // 4. Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 5. Find or create today's attendance record for this group
    let attendance = await Attendance.findOne({
      group: member.group,
      organization: member.organization,
      date: today
    });

    if (!attendance) {
      // Create new attendance for today
      const groupMembers = await Member.find({ group: member.group, isActive: true });
      attendance = new Attendance({
        group: member.group,
        organization: member.organization,
        date: today,
        records: groupMembers.map(m => ({
          member: m._id,
          status: 'absent',
          markedBy: 'auto_absent'
        }))
      });
    }

    if (attendance.isLocked) {
      return res.status(403).json({ success: false, message: 'Attendance is locked for today' });
    }

    // 6. Find this member's record
    let record = attendance.records.find(r => r.member.toString() === member._id.toString());
    if (!record) {
      // Member was added after attendance was created
      attendance.records.push({
        member: member._id,
        status: 'absent',
        markedBy: 'auto_absent'
      });
      record = attendance.records[attendance.records.length - 1];
    }

    // 7. Clock-In / Clock-Out Logic
    const now = new Date();
    let action = '';

    if (!record.clockIn || !record.clockIn.time) {
      // CLOCK IN
      record.clockIn = { time: now, lat, lng };
      record.markedAt = now;
      record.markedBy = 'qr_scan';
      if (req.user) record.scannedBy = req.user._id;

      // Determine status (present or late)
      const startTime = org.settings.attendanceStartTime || '09:00';
      const [startH, startM] = startTime.split(':').map(Number);
      const lateThreshold = org.settings.lateThreshold || 15;
      const lateTime = new Date(today);
      lateTime.setHours(startH, startM + lateThreshold, 0, 0);

      record.status = now <= lateTime ? 'present' : 'late';
      action = 'clock_in';

    } else if (!record.clockOut || !record.clockOut.time) {
      // CLOCK OUT
      record.clockOut = { time: now, lat, lng };

      // Calculate total hours
      const clockInTime = new Date(record.clockIn.time);
      const diffMs = now - clockInTime;
      record.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

      action = 'clock_out';

    } else {
      // Already clocked in and out
      return res.status(400).json({
        success: false,
        message: 'Already clocked in and out for today',
        clockIn: record.clockIn.time,
        clockOut: record.clockOut.time
      });
    }

    // 8. Recalculate summary
    attendance.calculateSummary();

    // 9. Save
    await attendance.save();

    // 10. Emit real-time event
    if (req.io) {
      req.io.to(`org_${member.organization}`).emit('attendance_update', {
        memberId: member._id,
        memberName: member.name,
        groupId: member.group,
        action,
        time: now,
        status: record.status,
        gpsDistance: gpsResult.distance
      });
    }

    res.status(200).json({
      success: true,
      message: action === 'clock_in' ? `Clock-In successful for ${member.name}` : `Clock-Out successful for ${member.name}`,
      data: {
        action,
        member: {
          name: member.name,
          rollNumber: member.rollNumber,
          qrId: member.qrId
        },
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        status: record.status,
        totalHours: record.totalHours,
        gpsDistance: gpsResult.distance,
        time: now
      }
    });

  } catch (error) {
    console.error('Scan attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error during scan' });
  }
};

// ──────────────────────────────────
// @desc    Get attendance dashboard for organization
// @route   GET /api/attendance-scan/dashboard/:orgId
// @access  Protected (admin/teacher)
// ──────────────────────────────────
exports.getAttendanceDashboard = async (req, res) => {
  try {
    const { orgId } = req.params;

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Check access
    if (org.owner.toString() !== req.user._id.toString() && !org.admins.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's attendance across all groups
    const todayAttendance = await Attendance.find({
      organization: orgId,
      date: today
    }).populate('group', 'name type');

    // Calculate totals
    let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalMembers = 0;
    const groupBreakdown = [];

    for (const att of todayAttendance) {
      const summary = att.summary || {};
      totalPresent += (summary.present || 0);
      totalAbsent += (summary.absent || 0);
      totalLate += (summary.late || 0);
      totalMembers += (summary.total || 0);

      groupBreakdown.push({
        groupId: att.group._id,
        groupName: att.group.name,
        groupType: att.group.type,
        total: summary.total || 0,
        present: summary.present || 0,
        absent: summary.absent || 0,
        late: summary.late || 0
      });
    }

    // Weekly trend (last 7 days)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyData = await Attendance.aggregate([
      { $match: { organization: org._id, date: { $gte: weekAgo, $lte: today } } },
      { $group: {
        _id: '$date',
        totalPresent: { $sum: '$summary.present' },
        totalAbsent: { $sum: '$summary.absent' },
        totalLate: { $sum: '$summary.late' },
        totalMembers: { $sum: '$summary.total' }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Recent scans (last 10)
    const recentAttendance = await Attendance.findOne({
      organization: orgId,
      date: today
    }).populate('records.member', 'name rollNumber qrId');

    const recentScans = [];
    if (recentAttendance) {
      for (const record of recentAttendance.records) {
        if (record.clockIn && record.clockIn.time) {
          recentScans.push({
            memberName: record.member ? record.member.name : 'Unknown',
            rollNumber: record.member ? record.member.rollNumber : '',
            action: record.clockOut && record.clockOut.time ? 'clock_out' : 'clock_in',
            time: record.clockOut && record.clockOut.time ? record.clockOut.time : record.clockIn.time,
            status: record.status
          });
        }
      }
    }

    // Sort recent scans by time (newest first)
    recentScans.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.status(200).json({
      success: true,
      data: {
        today: {
          totalMembers,
          totalPresent,
          totalAbsent,
          totalLate,
          attendanceRate: totalMembers > 0 ? Math.round((totalPresent / totalMembers) * 100) : 0
        },
        groupBreakdown,
        weeklyTrend: weeklyData.map(d => ({
          date: d._id,
          present: d.totalPresent,
          absent: d.totalAbsent,
          late: d.totalLate,
          total: d.totalMembers
        })),
        recentScans: recentScans.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ──────────────────────────────────
// @desc    Get member attendance history
// @route   GET /api/attendance-scan/member/:memberId/history
// @access  Protected
// ──────────────────────────────────
exports.getMemberHistory = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { startDate, endDate } = req.query;

    const member = await Member.findById(memberId).populate('group', 'name');
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    // Date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const attendances = await Attendance.find({
      group: member.group._id,
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });

    const history = [];
    let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalHours = 0;

    for (const att of attendances) {
      const record = att.records.find(r => r.member.toString() === memberId);
      if (record) {
        history.push({
          date: att.date,
          status: record.status,
          clockIn: record.clockIn,
          clockOut: record.clockOut,
          totalHours: record.totalHours || 0
        });

        if (record.status === 'present') totalPresent++;
        else if (record.status === 'late') totalLate++;
        else totalAbsent++;
        totalHours += record.totalHours || 0;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        member: { name: member.name, rollNumber: member.rollNumber, group: member.group.name },
        summary: {
          totalDays: history.length,
          present: totalPresent,
          absent: totalAbsent,
          late: totalLate,
          totalHours: Math.round(totalHours * 100) / 100,
          attendanceRate: history.length > 0 ? Math.round(((totalPresent + totalLate) / history.length) * 100) : 0
        },
        history
      }
    });

  } catch (error) {
    console.error('Member history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ──────────────────────────────────
// @desc    Viewer access with temporary password
// @route   POST /api/attendance-scan/viewer-access
// @access  Public
// ──────────────────────────────────
exports.viewerAccess = async (req, res) => {
  try {
    const { qrId, password } = req.body;

    if (!qrId || !password) {
      return res.status(400).json({ success: false, message: 'QR ID and password are required' });
    }

    // Find member by QR ID
    const member = await Member.findOne({ qrId }).populate('group', 'name').populate('organization', 'name');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Invalid QR ID' });
    }

    // Find valid temporary password
    const tempPasswords = await TemporaryPassword.find({
      organization: member.organization._id,
      group: member.group._id,
      isActive: true,
      expiresAt: { $gt: new Date() },
      $or: [
        { member: member._id },
        { member: null } // group-wide password
      ]
    }).select('+password');

    let validPass = null;
    for (const tp of tempPasswords) {
      const isMatch = await tp.matchPassword(password);
      if (isMatch) {
        validPass = tp;
        break;
      }
    }

    if (!validPass) {
      return res.status(401).json({ success: false, message: 'Invalid or expired password' });
    }

    // Update usage
    validPass.usageCount += 1;
    validPass.lastUsedAt = new Date();
    await validPass.save();

    // Get attendance history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const attendances = await Attendance.find({
      group: member.group._id,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: -1 });

    const history = [];
    let totalPresent = 0, totalAbsent = 0, totalLate = 0;

    for (const att of attendances) {
      const record = att.records.find(r => r.member.toString() === member._id.toString());
      if (record) {
        history.push({
          date: att.date,
          status: record.status,
          clockIn: record.clockIn ? record.clockIn.time : null,
          clockOut: record.clockOut ? record.clockOut.time : null,
          totalHours: record.totalHours || 0
        });

        if (record.status === 'present') totalPresent++;
        else if (record.status === 'late') totalLate++;
        else totalAbsent++;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        member: {
          name: member.name,
          rollNumber: member.rollNumber,
          group: member.group.name,
          organization: member.organization.name
        },
        summary: {
          totalDays: history.length,
          present: totalPresent,
          absent: totalAbsent,
          late: totalLate,
          attendanceRate: history.length > 0 ? Math.round(((totalPresent + totalLate) / history.length) * 100) : 0
        },
        history,
        accessExpiresAt: validPass.expiresAt
      }
    });

  } catch (error) {
    console.error('Viewer access error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ──────────────────────────────────
// @desc    Generate temporary password for viewer
// @route   POST /api/attendance-scan/temp-password
// @access  Protected (admin/teacher)
// ──────────────────────────────────
exports.generateTempPassword = async (req, res) => {
  try {
    const { groupId, memberId, label, expiresInHours } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, message: 'Group ID is required' });
    }

    const group = await Group.findById(groupId).populate('organization');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Check authorization
    const org = await Organization.findById(group.organization);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    const isAdmin = org.owner.toString() === req.user._id.toString() || org.admins.includes(req.user._id);
    const isSupervisor = group.supervisor && group.supervisor.toString() === req.user._id.toString();

    if (!isAdmin && !isSupervisor) {
      return res.status(403).json({ success: false, message: 'Not authorized to generate passwords for this group' });
    }

    // Generate password
    const plainPassword = TemporaryPassword.generatePassword();
    const hours = expiresInHours || 24;

    const tempPass = await TemporaryPassword.create({
      password: plainPassword,
      passwordHint: plainPassword.slice(-4),
      organization: org._id,
      group: group._id,
      member: memberId || null,
      generatedBy: req.user._id,
      label: label || `Viewer access for ${group.name}`,
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000)
    });

    res.status(201).json({
      success: true,
      message: 'Temporary password generated',
      data: {
        password: plainPassword, // Show only once!
        label: tempPass.label,
        group: group.name,
        expiresAt: tempPass.expiresAt,
        expiresInHours: hours,
        note: 'Share this password with the parent/viewer. It will expire automatically.'
      }
    });

  } catch (error) {
    console.error('Generate temp password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ──────────────────────────────────
// @desc    Bulk generate QR codes for group members
// @route   POST /api/attendance-scan/bulk-qr/:groupId
// @access  Protected (admin/teacher)
// ──────────────────────────────────
exports.bulkGenerateQR = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const org = await Organization.findById(group.organization);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Check authorization
    const isAdmin = org.owner.toString() === req.user._id.toString() || org.admins.includes(req.user._id);
    const isSupervisor = group.supervisor && group.supervisor.toString() === req.user._id.toString();
    if (!isAdmin && !isSupervisor) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Get all members without QR data
    const members = await Member.find({ group: groupId, isActive: true });

    const QRCode = require('qrcode');
    const results = [];

    for (const member of members) {
      // Create QR payload
      const payload = JSON.stringify({
        v: 1,
        orgId: org._id.toString(),
        grp: group.name,
        name: member.name,
        qrId: member.qrId,
        ts: Date.now()
      });

      // Generate QR code as data URL
      const qrImage = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      // Update member
      member.qrData = payload;
      member.qrImageUrl = qrImage;
      await member.save();

      results.push({
        memberId: member._id,
        name: member.name,
        rollNumber: member.rollNumber,
        qrId: member.qrId,
        qrImageUrl: qrImage
      });
    }

    res.status(200).json({
      success: true,
      message: `Generated QR codes for ${results.length} members`,
      data: results
    });

  } catch (error) {
    console.error('Bulk QR error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ──────────────────────────────────
// @desc    Get group attendance for today
// @route   GET /api/attendance-scan/group/:groupId/today
// @access  Protected
// ──────────────────────────────────
exports.getGroupAttendanceToday = async (req, res) => {
  try {
    const { groupId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      group: groupId,
      date: today
    }).populate('records.member', 'name rollNumber qrId photo');

    if (!attendance) {
      return res.status(200).json({
        success: true,
        data: { records: [], summary: { total: 0, present: 0, absent: 0, late: 0 } }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        records: attendance.records.map(r => ({
          member: r.member,
          status: r.status,
          clockIn: r.clockIn,
          clockOut: r.clockOut,
          totalHours: r.totalHours,
          markedBy: r.markedBy
        })),
        summary: attendance.summary,
        isLocked: attendance.isLocked
      }
    });

  } catch (error) {
    console.error('Group attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ──────────────────────────────────
// @desc    Export attendance report (CSV)
// @route   GET /api/attendance-scan/export/:groupId
// @access  Protected
// ──────────────────────────────────
exports.exportAttendanceReport = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { startDate, endDate } = req.query;

    const group = await Group.findById(groupId).populate('organization', 'name');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const attendances = await Attendance.find({
      group: groupId,
      date: { $gte: start, $lte: end }
    }).populate('records.member', 'name rollNumber').sort({ date: 1 });

    // Build CSV
    let csv = 'Date,Name,Roll Number,Status,Clock In,Clock Out,Total Hours\n';

    for (const att of attendances) {
      const dateStr = att.date.toISOString().split('T')[0];
      for (const record of att.records) {
        if (!record.member) continue;
        const clockIn = record.clockIn && record.clockIn.time ? new Date(record.clockIn.time).toLocaleTimeString('en-IN') : '-';
        const clockOut = record.clockOut && record.clockOut.time ? new Date(record.clockOut.time).toLocaleTimeString('en-IN') : '-';
        csv += `${dateStr},${record.member.name},${record.member.rollNumber || '-'},${record.status},${clockIn},${clockOut},${record.totalHours || 0}\n`;
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${group.name}-${start.toISOString().split('T')[0]}.csv`);
    res.status(200).send(csv);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ──────────────────────────────────
// @desc    Update organization GPS location
// @route   PUT /api/attendance-scan/org/:orgId/location
// @access  Protected (admin only)
// ──────────────────────────────────
exports.updateOrgLocation = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { lat, lng, allowedRadius } = req.body;

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    if (org.owner.toString() !== req.user._id.toString() && !org.admins.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (lat !== undefined && lng !== undefined) {
      org.location = { lat, lng };
    }
    if (allowedRadius !== undefined) {
      org.allowedRadius = allowedRadius;
    }

    await org.save();

    res.status(200).json({
      success: true,
      message: 'Location updated',
      data: { location: org.location, allowedRadius: org.allowedRadius }
    });

  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ──────────────────────────────────
// @desc    Set group master password
// @route   PUT /api/attendance-scan/group/:groupId/password
// @access  Protected (admin/supervisor)
// ──────────────────────────────────
exports.setGroupPassword = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });
    }

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const org = await Organization.findById(group.organization);
    const isAdmin = org.owner.toString() === req.user._id.toString() || org.admins.includes(req.user._id);
    const isSupervisor = group.supervisor && group.supervisor.toString() === req.user._id.toString();

    if (!isAdmin && !isSupervisor) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    group.masterPassword = password;
    await group.save();

    res.status(200).json({ success: true, message: 'Group master password updated' });

  } catch (error) {
    console.error('Set group password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ──────────────────────────────────
// @desc    Verify attendance with QR ID + Group Password
// @route   POST /api/attendance-scan/verify
// @access  Public
// ──────────────────────────────────
exports.verifyAttendance = async (req, res) => {
  try {
    const { qrId, groupPassword } = req.body;

    if (!qrId || !groupPassword) {
      return res.status(400).json({ success: false, message: 'QR ID and group password are required' });
    }

    const member = await Member.findOne({ qrId }).populate('group', 'name');
    if (!member) return res.status(404).json({ success: false, message: 'Invalid QR ID' });

    const group = await Group.findById(member.group._id).select('+masterPassword');
    if (!group || !group.masterPassword) {
      return res.status(400).json({ success: false, message: 'Group password not configured' });
    }

    const isMatch = await group.matchMasterPassword(groupPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid group password' });
    }

    // Get last 7 days attendance
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const attendances = await Attendance.find({
      group: member.group._id,
      date: { $gte: weekAgo }
    }).sort({ date: -1 });

    const history = [];
    for (const att of attendances) {
      const record = att.records.find(r => r.member.toString() === member._id.toString());
      if (record) {
        history.push({
          date: att.date,
          status: record.status,
          clockIn: record.clockIn ? record.clockIn.time : null,
          clockOut: record.clockOut ? record.clockOut.time : null,
          totalHours: record.totalHours || 0
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        member: { name: member.name, rollNumber: member.rollNumber, group: member.group.name },
        history
      }
    });

  } catch (error) {
    console.error('Verify attendance error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

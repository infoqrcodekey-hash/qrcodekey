// ============================================
// controllers/attendanceController.js
// ============================================
// QR-based attendance marking and reports

const Attendance = require('../models/Attendance');
const Group = require('../models/Group');
const Member = require('../models/Member');
const Organization = require('../models/Organization');
const bcrypt = require('bcryptjs');

// ====== GET GROUP INFO FOR QR SCAN PAGE (PUBLIC) ======
exports.getGroupForScan = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('organization', 'name type settings');
    if (!group || !group.isActive) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    res.json({
      success: true,
      data: {
        groupId: group._id,
        groupName: group.name,
        groupType: group.type,
        orgName: group.organization.name,
        orgType: group.organization.type
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== MARK ATTENDANCE VIA QR SCAN (PUBLIC with password) ======
exports.markAttendanceByQR = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { password, memberIds } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password required' });
    }

    const group = await Group.findById(groupId).populate('organization');
    if (!group || !group.isActive) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Verify organization shared password
    const org = group.organization;
    const isMatch = await bcrypt.compare(password, org.sharedPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    // Get today's date (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find or create today's attendance
    let attendance = await Attendance.findOne({ group: groupId, date: today });

    if (!attendance) {
      // Get all active members
      const members = await Member.find({ group: groupId, isActive: true });
      const records = members.map(m => ({
        member: m._id,
        status: 'absent',
        markedAt: null,
        markedBy: 'auto_absent'
      }));

      attendance = await Attendance.create({
        group: groupId,
        organization: org._id,
        date: today,
        records,
        sessionQrCode: group.qrCode
      });
    }

    if (attendance.isLocked) {
      return res.status(400).json({ success: false, message: 'Attendance is locked for today' });
    }

    // Mark specified members as present, or all if none specified
    const now = new Date();
    const lateTime = org.settings?.autoAbsentAfter || '10:00';
    const [lateH, lateM] = lateTime.split(':').map(Number);
    const isLate = now.getHours() > lateH || (now.getHours() === lateH && now.getMinutes() > lateM);

    let markedCount = 0;
    attendance.records.forEach(record => {
      const memberId = record.member.toString();
      const shouldMark = !memberIds || memberIds.length === 0 || memberIds.includes(memberId);

      if (shouldMark && record.status === 'absent') {
        record.status = isLate ? 'late' : 'present';
        record.markedAt = now;
        record.markedBy = 'qr_scan';
        markedCount++;
      }
    });

    attendance.calculateSummary();
    await attendance.save();

    // Emit socket event if available
    if (req.io) {
      req.io.to(`org_${org._id}`).emit('attendance_update', {
        groupId, date: today, summary: attendance.summary
      });
    }

    res.json({
      success: true,
      message: `${markedCount} member(s) marked as ${isLate ? 'late' : 'present'}`,
      data: { summary: attendance.summary, markedCount }
    });
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== GET TODAY'S ATTENDANCE FOR A GROUP ======
exports.getGroupAttendance = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ group: groupId, date: targetDate })
      .populate('records.member', 'name rollNumber email phone role');

    if (!attendance) {
      // Return empty with member list
      const members = await Member.find({ group: groupId, isActive: true }).sort('name');
      return res.json({
        success: true,
        data: {
          date: targetDate,
          records: members.map(m => ({
            member: m,
            status: 'absent',
            markedAt: null,
            markedBy: null
          })),
          summary: { total: members.length, present: 0, absent: members.length, late: 0, excused: 0 },
          isLocked: false
        }
      });
    }

    res.json({ success: true, data: attendance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== MANUAL ATTENDANCE UPDATE ======
exports.updateAttendance = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberId, status, note, date } = req.body;

    const group = await Group.findById(groupId).populate('organization', 'owner admins');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const org = group.organization;
    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ group: groupId, date: targetDate });

    if (!attendance) {
      const members = await Member.find({ group: groupId, isActive: true });
      attendance = await Attendance.create({
        group: groupId,
        organization: org._id,
        date: targetDate,
        records: members.map(m => ({
          member: m._id, status: 'absent', markedAt: null, markedBy: 'auto_absent'
        })),
        createdBy: req.user._id
      });
    }

    // Update specific member
    const record = attendance.records.find(r => r.member.toString() === memberId);
    if (!record) return res.status(404).json({ success: false, message: 'Member not found in attendance' });

    record.status = status;
    record.markedAt = new Date();
    record.markedBy = 'manual';
    if (note) record.note = note;

    attendance.calculateSummary();
    await attendance.save();

    res.json({ success: true, message: 'Attendance updated', data: attendance.summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== LOCK/UNLOCK ATTENDANCE ======
exports.lockAttendance = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { date, lock } = req.body;

    const group = await Group.findById(groupId).populate('organization', 'owner admins');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const org = group.organization;
    const isAdmin = org.owner.toString() === req.user._id.toString() ||
      org.admins.some(a => a.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Access denied' });

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ group: groupId, date: targetDate });
    if (!attendance) return res.status(404).json({ success: false, message: 'No attendance found for this date' });

    attendance.isLocked = lock !== false;
    await attendance.save();

    res.json({ success: true, message: `Attendance ${attendance.isLocked ? 'locked' : 'unlocked'}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== ATTENDANCE REPORT (Weekly/Monthly) ======
exports.getAttendanceReport = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { startDate, endDate } = req.query;

    const group = await Group.findById(groupId).populate('organization', 'owner admins name');
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const attendances = await Attendance.find({
      group: groupId,
      date: { $gte: start, $lte: end }
    }).populate('records.member', 'name rollNumber').sort('date');

    // Build member-wise report
    const members = await Member.find({ group: groupId, isActive: true }).sort('name');
    const memberReport = members.map(m => {
      let present = 0, absent = 0, late = 0, excused = 0;
      attendances.forEach(att => {
        const rec = att.records.find(r => r.member && r.member._id.toString() === m._id.toString());
        if (rec) {
          if (rec.status === 'present') present++;
          else if (rec.status === 'absent') absent++;
          else if (rec.status === 'late') late++;
          else if (rec.status === 'excused') excused++;
        }
      });
      const totalDays = attendances.length;
      return {
        member: { _id: m._id, name: m.name, rollNumber: m.rollNumber },
        present, absent, late, excused,
        totalDays,
        percentage: totalDays > 0 ? Math.round(((present + late) / totalDays) * 100) : 0
      };
    });

    // Daily summary
    const dailySummary = attendances.map(att => ({
      date: att.date,
      summary: att.summary,
      isLocked: att.isLocked
    }));

    res.json({
      success: true,
      data: {
        groupName: group.name,
        orgName: group.organization.name,
        period: { start, end },
        totalDays: attendances.length,
        memberReport,
        dailySummary
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

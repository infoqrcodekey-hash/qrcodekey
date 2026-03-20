// ============================================
// controllers/reportController.js
// ============================================
const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const Group = require('../models/Group');
const { Leave } = require('../models/Leave');
const Holiday = require('../models/Holiday');
const Organization = require('../models/Organization');
const { Overtime } = require('../models/Shift');

// @desc    Generate monthly attendance report
// @route   GET /api/reports/monthly/:orgId
exports.getMonthlyReport = async (req, res) => {
  try {
    const { month, year, groupId } = req.query;
    const orgId = req.params.orgId;

    const m = parseInt(month) - 1; // JS months are 0-indexed
    const y = parseInt(year);
    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 0); // last day of month
    const totalDays = endDate.getDate();

    // Get members
    const memberQuery = { organization: orgId, isActive: true };
    if (groupId) memberQuery.group = groupId;
    const members = await Member.find(memberQuery).populate('group', 'name').lean();

    // Get attendance records
    const attendances = await Attendance.find({
      organization: orgId,
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    // Get holidays
    const holidays = await Holiday.find({
      organization: orgId,
      date: { $gte: startDate, $lte: endDate },
      isActive: true
    }).lean();
    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

    // Get leaves
    const leaves = await Leave.find({
      organization: orgId,
      status: 'approved',
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    }).lean();

    // Build report per member
    const report = members.map(member => {
      let present = 0, absent = 0, late = 0, halfDay = 0, onLeave = 0, holidayCount = 0;
      let totalHours = 0;

      for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const currentDate = new Date(y, m, d);
        const dayOfWeek = currentDate.getDay();

        // Skip weekends (0=Sun, 6=Sat)
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        // Check holiday
        if (holidayDates.has(dateStr)) { holidayCount++; continue; }

        // Check leave
        const memberLeave = leaves.find(l =>
          l.member.toString() === member._id.toString() &&
          new Date(l.startDate) <= currentDate && new Date(l.endDate) >= currentDate
        );
        if (memberLeave) { onLeave++; continue; }

        // Check attendance
        const dayAtt = attendances.find(a => {
          const attDate = new Date(a.date);
          return attDate.getFullYear() === y && attDate.getMonth() === m && attDate.getDate() === d;
        });

        if (dayAtt) {
          const record = dayAtt.records.find(r => r.member.toString() === member._id.toString());
          if (record) {
            if (record.status === 'present') present++;
            else if (record.status === 'late') { late++; present++; }
            else if (record.status === 'half-day') halfDay++;
            else absent++;
            totalHours += record.totalHours || 0;
          } else {
            absent++;
          }
        } else {
          absent++;
        }
      }

      const workingDays = totalDays - holidayCount - (Math.floor(totalDays / 7) * 2); // approx
      const attendancePercentage = workingDays > 0 ? Math.round(((present + halfDay * 0.5) / workingDays) * 100) : 0;

      return {
        member: { _id: member._id, name: member.name, rollNumber: member.rollNumber, group: member.group?.name || 'N/A' },
        present, absent, late, halfDay, onLeave, holidayCount,
        totalHours: parseFloat(totalHours.toFixed(1)),
        attendancePercentage: Math.min(100, attendancePercentage)
      };
    });

    // Summary
    const summary = {
      totalMembers: members.length,
      avgAttendance: report.length > 0 ? Math.round(report.reduce((a, r) => a + r.attendancePercentage, 0) / report.length) : 0,
      totalHolidays: holidays.length,
      month: `${year}-${String(month).padStart(2, '0')}`,
      generatedAt: new Date()
    };

    res.json({ success: true, data: { report, summary, holidays } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get attendance summary for date range
// @route   GET /api/reports/summary/:orgId
exports.getAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const orgId = req.params.orgId;

    const attendances = await Attendance.find({
      organization: orgId,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).lean();

    let totalPresent = 0, totalAbsent = 0, totalLate = 0;
    attendances.forEach(a => {
      totalPresent += a.summary?.present || 0;
      totalAbsent += a.summary?.absent || 0;
      totalLate += a.summary?.late || 0;
    });

    // Daily breakdown
    const dailyBreakdown = attendances.map(a => ({
      date: a.date,
      present: a.summary?.present || 0,
      absent: a.summary?.absent || 0,
      late: a.summary?.late || 0,
      total: a.summary?.total || 0
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: { totalPresent, totalAbsent, totalLate, totalDays: attendances.length, dailyBreakdown }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get member individual report
// @route   GET /api/reports/member/:memberId
exports.getMemberReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const memberId = req.params.memberId;

    const member = await Member.findById(memberId).populate('group', 'name').populate('organization', 'name').lean();
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    const attendances = await Attendance.find({
      organization: member.organization._id,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }).lean();

    const records = [];
    let present = 0, absent = 0, late = 0, totalHours = 0;

    attendances.forEach(a => {
      const record = a.records.find(r => r.member.toString() === memberId);
      if (record) {
        records.push({
          date: a.date, status: record.status,
          clockIn: record.clockIn?.time, clockOut: record.clockOut?.time,
          totalHours: record.totalHours || 0
        });
        if (record.status === 'present' || record.status === 'late') present++;
        if (record.status === 'late') late++;
        if (record.status === 'absent') absent++;
        totalHours += record.totalHours || 0;
      } else {
        records.push({ date: a.date, status: 'absent', clockIn: null, clockOut: null, totalHours: 0 });
        absent++;
      }
    });

    // Get leaves
    const leaves = await Leave.find({
      member: memberId, status: 'approved',
      startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) }
    }).lean();

    // Get overtime
    const overtime = await Overtime.find({
      member: memberId,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'approved'
    }).lean();

    const totalOvertimeHours = overtime.reduce((a, o) => a + o.overtimeHours, 0);

    res.json({
      success: true,
      data: {
        member: { name: member.name, rollNumber: member.rollNumber, group: member.group?.name, organization: member.organization?.name },
        summary: { present, absent, late, totalHours: parseFloat(totalHours.toFixed(1)), totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(1)), totalLeaves: leaves.length },
        records: records.sort((a, b) => new Date(a.date) - new Date(b.date)),
        leaves, overtime
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

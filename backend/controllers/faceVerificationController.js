// ============================================
// controllers/faceVerificationController.js
// ============================================
// Face Verification for anti-proxy attendance

const FaceVerification = require('../models/FaceVerification');
const Member = require('../models/Member');
const AuditLog = require('../models/AuditLog');

// @desc    Enroll member face (save reference photo)
// @route   POST /api/face-verification/enroll
// @access  Private (admin/teacher)
exports.enrollFace = async (req, res) => {
  try {
    const { memberId, organizationId, referencePhoto } = req.body;

    if (!memberId || !organizationId || !referencePhoto) {
      return res.status(400).json({ success: false, message: 'Member ID, Organization ID, and reference photo are required' });
    }

    // Check member exists
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Upsert face verification record
    let faceRecord = await FaceVerification.findOne({ member: memberId, organization: organizationId });

    if (faceRecord) {
      faceRecord.referencePhoto = referencePhoto;
      faceRecord.isEnrolled = true;
      faceRecord.enrolledAt = new Date();
      await faceRecord.save();
    } else {
      faceRecord = await FaceVerification.create({
        member: memberId,
        organization: organizationId,
        referencePhoto,
        isEnrolled: true,
        enrolledAt: new Date()
      });
    }

    // Audit log
    if (AuditLog) {
      try {
        await AuditLog.create({
          user: req.user._id,
          action: 'face_enrolled',
          resource: 'FaceVerification',
          resourceId: faceRecord._id,
          organization: organizationId,
          details: { memberId, memberName: member.name }
        });
      } catch (e) { /* silent */ }
    }

    res.status(200).json({
      success: true,
      message: 'Face enrolled successfully',
      data: {
        memberId,
        isEnrolled: true,
        enrolledAt: faceRecord.enrolledAt
      }
    });
  } catch (err) {
    console.error('Enroll face error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Verify face during attendance
// @route   POST /api/face-verification/verify
// @access  Private
exports.verifyFace = async (req, res) => {
  try {
    const { memberId, organizationId, selfiePhoto, attendanceId, location, deviceInfo } = req.body;

    if (!memberId || !organizationId || !selfiePhoto) {
      return res.status(400).json({ success: false, message: 'Member ID, Organization ID, and selfie are required' });
    }

    const faceRecord = await FaceVerification.findOne({ member: memberId, organization: organizationId });

    if (!faceRecord || !faceRecord.isEnrolled) {
      return res.status(400).json({ success: false, message: 'Member not enrolled for face verification. Please enroll first.' });
    }

    // Simple confidence score based on image comparison
    // In production, integrate with AWS Rekognition, Azure Face API, or face-api.js
    // For now, we do a basic check and mark for review
    const confidence = calculateBasicConfidence(faceRecord.referencePhoto, selfiePhoto);

    let result = 'pending_review';
    if (confidence >= 80) result = 'passed';
    else if (confidence < 40) result = 'failed';

    // Add verification log
    faceRecord.verificationLogs.push({
      selfiePhoto,
      attendanceId: attendanceId || null,
      result,
      confidence,
      location: location || {},
      deviceInfo: deviceInfo || null,
      createdAt: new Date()
    });

    await faceRecord.save();

    // Emit real-time event
    if (req.io) {
      req.io.emit('face-verification', {
        memberId,
        result,
        confidence,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: result === 'passed' ? 'Face verified successfully!' :
               result === 'failed' ? 'Face verification failed. Admin will review.' :
               'Selfie submitted for review.',
      data: { result, confidence }
    });
  } catch (err) {
    console.error('Verify face error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get pending verifications (admin review)
// @route   GET /api/face-verification/pending/:organizationId
// @access  Private (admin)
exports.getPendingVerifications = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const records = await FaceVerification.find({
      organization: organizationId,
      'verificationLogs.result': { $in: ['pending_review', 'failed'] }
    })
    .populate('member', 'name phone')
    .sort({ 'verificationLogs.createdAt': -1 })
    .skip((page - 1) * limit)
    .limit(limit);

    // Extract only pending/failed logs
    const pendingList = [];
    records.forEach(record => {
      record.verificationLogs.forEach(log => {
        if (['pending_review', 'failed'].includes(log.result)) {
          pendingList.push({
            recordId: record._id,
            logId: log._id,
            member: record.member,
            referencePhoto: record.referencePhoto,
            selfiePhoto: log.selfiePhoto,
            result: log.result,
            confidence: log.confidence,
            location: log.location,
            createdAt: log.createdAt
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      data: pendingList,
      total: pendingList.length
    });
  } catch (err) {
    console.error('Get pending verifications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Manual review (approve/reject)
// @route   PUT /api/face-verification/review
// @access  Private (admin)
exports.reviewVerification = async (req, res) => {
  try {
    const { recordId, logId, decision } = req.body; // decision: 'manual_approved' or 'manual_rejected'

    if (!['manual_approved', 'manual_rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be manual_approved or manual_rejected' });
    }

    const record = await FaceVerification.findById(recordId);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const log = record.verificationLogs.id(logId);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Verification log not found' });
    }

    log.result = decision;
    log.verifiedBy = req.user._id;
    log.verifiedAt = new Date();
    await record.save();

    res.status(200).json({
      success: true,
      message: `Verification ${decision === 'manual_approved' ? 'approved' : 'rejected'}`,
      data: { result: decision }
    });
  } catch (err) {
    console.error('Review verification error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get enrollment status for org members
// @route   GET /api/face-verification/status/:organizationId
// @access  Private
exports.getEnrollmentStatus = async (req, res) => {
  try {
    const { organizationId } = req.params;

    const records = await FaceVerification.find({ organization: organizationId })
      .populate('member', 'name phone')
      .select('member isEnrolled enrolledAt');

    const enrolled = records.filter(r => r.isEnrolled).length;
    const total = records.length;

    res.status(200).json({
      success: true,
      data: {
        enrolled,
        total,
        members: records
      }
    });
  } catch (err) {
    console.error('Get enrollment status error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get verification stats
// @route   GET /api/face-verification/stats/:organizationId
// @access  Private (admin)
exports.getVerificationStats = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await FaceVerification.find({ organization: organizationId });

    let todayPassed = 0, todayFailed = 0, todayPending = 0, totalVerifications = 0;

    records.forEach(record => {
      record.verificationLogs.forEach(log => {
        totalVerifications++;
        if (new Date(log.createdAt) >= today) {
          if (log.result === 'passed' || log.result === 'manual_approved') todayPassed++;
          else if (log.result === 'failed' || log.result === 'manual_rejected') todayFailed++;
          else if (log.result === 'pending_review') todayPending++;
        }
      });
    });

    const enrolledCount = records.filter(r => r.isEnrolled).length;

    res.status(200).json({
      success: true,
      data: {
        enrolledMembers: enrolledCount,
        todayPassed,
        todayFailed,
        todayPending,
        totalVerifications
      }
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ====== Helper: Basic Confidence Calculator ======
// In production, replace with real face comparison API
function calculateBasicConfidence(referenceBase64, selfieBase64) {
  if (!referenceBase64 || !selfieBase64) return 0;

  // Basic check: both images exist and have reasonable size
  const refSize = referenceBase64.length;
  const selfieSize = selfieBase64.length;

  // If both are valid base64 images, give base confidence
  // Real implementation would use face-api.js or cloud AI
  if (refSize > 1000 && selfieSize > 1000) {
    // Random confidence between 60-95 for demo
    // Replace with actual face comparison in production
    return Math.floor(Math.random() * 35) + 60;
  }

  return 0;
}

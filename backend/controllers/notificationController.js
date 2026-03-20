// ============================================
// controllers/notificationController.js
// ============================================
const Notification = require('../models/Notification');
const Member = require('../models/Member');
const Organization = require('../models/Organization');
const nodemailer = require('nodemailer');

// Email transporter (configured via env vars)
let transporter = null;
const getTransporter = () => {
  if (!transporter && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
};

// @desc    Get user notifications
// @route   GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { 'recipients.userId': req.user._id };
    if (unreadOnly === 'true') {
      query['recipients.read'] = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('member', 'name qrId')
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      'recipients.userId': req.user._id,
      'recipients.read': false
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, 'recipients.userId': req.user._id },
      { $set: { 'recipients.$.read': true, 'recipients.$.readAt': new Date() } }
    );
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { 'recipients.userId': req.user._id, 'recipients.read': false },
      { $set: { 'recipients.$.read': true, 'recipients.$.readAt': new Date() } }
    );
    res.json({ success: true, message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get notification settings for org
// @route   GET /api/notifications/settings/:orgId
exports.getSettings = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Return default settings (can be enhanced to store per-org)
    res.json({
      success: true,
      data: {
        clockInAlert: true,
        clockOutAlert: true,
        lateAlert: true,
        absentAlert: true,
        leaveAlert: true,
        emailEnabled: !!process.env.SMTP_HOST,
        smsEnabled: false,
        pushEnabled: false
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Send emergency broadcast
// @route   POST /api/notifications/emergency
exports.sendEmergencyBroadcast = async (req, res) => {
  try {
    const { orgId, title, message, priority = 'urgent' } = req.body;

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Check admin
    if (org.owner.toString() !== req.user._id.toString() && !org.admins.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only admins can send emergency broadcasts' });
    }

    // Get all members
    const members = await Member.find({ organization: orgId, isActive: true });

    // Create notification for all
    const recipients = [];
    if (org.owner) recipients.push({ userId: org.owner });
    org.admins.forEach(a => recipients.push({ userId: a }));

    const notification = await Notification.create({
      organization: orgId,
      type: 'emergency',
      title: title || 'EMERGENCY ALERT',
      message,
      recipients,
      channels: { inApp: true, email: true, sms: true, push: true },
      priority
    });

    // Emit real-time notification
    if (req.io) {
      req.io.to(`org_${orgId}`).emit('emergency_broadcast', {
        title: notification.title,
        message: notification.message,
        priority,
        timestamp: new Date()
      });
    }

    // Send emails if SMTP configured
    const smtp = getTransporter();
    if (smtp) {
      const emailPromises = members
        .filter(m => m.email || m.parentEmail)
        .map(m => {
          const toEmail = m.parentEmail || m.email;
          return smtp.sendMail({
            from: process.env.SMTP_FROM || 'noreply@qrcodekey.com',
            to: toEmail,
            subject: `🚨 ${notification.title} - ${org.name}`,
            html: `<h2 style="color:red">${notification.title}</h2><p>${notification.message}</p><p>- ${org.name}</p>`
          }).catch(err => console.error('Email error:', err.message));
        });
      await Promise.allSettled(emailPromises);
    }

    res.json({ success: true, data: notification, recipientCount: members.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      'recipients.userId': req.user._id,
      'recipients.read': false
    });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ====== Helper: Create notification (used by other controllers) ======
exports.createNotification = async ({ organization, member, user, type, title, message, recipients, channels, priority, metadata }) => {
  try {
    const notification = await Notification.create({
      organization, member, user, type, title, message,
      recipients: recipients || [],
      channels: channels || { inApp: true },
      priority: priority || 'normal',
      metadata: metadata || {}
    });
    return notification;
  } catch (err) {
    console.error('Create notification error:', err.message);
    return null;
  }
};
